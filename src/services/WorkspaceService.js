// src/services/WorkspaceService.js
import CourseClass from './CourseClass';
import ScheduleClass from './ScheduleClass';
import CourseEventClass from './CourseEventClass';
import { EVENT_TYPE_TO_KEY_MAP } from './CourseClass'; // Obnovený import
import { getColorForCourse } from '../utils/colorUtils';
import html2canvas from 'html2canvas'; // Import pro ukládání obrázku

const MAX_GENERATED_SCHEDULES = 10;
export const LOCAL_STORAGE_KEY = 'schedulePlannerWorkspace_v2';

const generatePreferenceId = () => `pref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

class WorkspaceService {
    constructor() {
        this.resetToEmptyState(); // Inicializace na prázdný stav
    }

    resetToEmptyState() {
        this.semester = '';
        this.year = '';
        this.courses = [];
        this.preferences = {};
        this.primarySchedule = new ScheduleClass();
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;
        this.scheduleColorMode = 'type'; // Výchozí režim barev
        console.log("WorkspaceService: State reset to empty.");
    }

    getActiveSchedule() {
        if (this.activeScheduleIndex >= 0 && this.activeScheduleIndex < this.generatedSchedules.length) {
            return this.generatedSchedules[this.activeScheduleIndex];
        }
        return this.primarySchedule;
    }

    setActiveScheduleIndex(index) {
        if (index >= -1 && index < this.generatedSchedules.length) {
            this.activeScheduleIndex = index;
        } else {
            console.error("Neplatný index pro aktivní rozvrh:", index);
            this.activeScheduleIndex = -1;
        }
    }

    addCourse(courseData) {
        const courseIdentifier = `${courseData.departmentCode}/${courseData.courseCode}`;
        const existingCourse = this.courses.find(c => c.id === courseIdentifier);

        if (existingCourse) {
            console.warn(`Předmět ${courseIdentifier} již existuje ve workspace. Přepisuji daty pro rok ${courseData.year}, semestr ${courseData.semester}.`);
            const oldEventIds = existingCourse.events.map(e => e.id);
            oldEventIds.forEach(eventId => {
                this.primarySchedule.removeEventById(eventId);
                this.generatedSchedules.forEach(schedule => schedule.removeEventById(eventId));
            });

            existingCourse.stagId = courseData.stagId || existingCourse.stagId;
            existingCourse.name = courseData.name || existingCourse.name;
            existingCourse.credits = courseData.credits !== undefined ? courseData.credits : existingCourse.credits;
            existingCourse.neededEnrollments = courseData.neededEnrollments || existingCourse.neededEnrollments;
            existingCourse.year = courseData.year;
            existingCourse.semester = courseData.semester;
            existingCourse.source = courseData.source || existingCourse.source;
            existingCourse.events = [];
            if (courseData.events && Array.isArray(courseData.events)) {
                courseData.events.forEach(eventData => {
                    const eventInstanceId = eventData.id || eventData.stagId || `${eventData.departmentCode}-${eventData.courseCode}-${eventData.type}-${eventData.day}-${eventData.startTime}-${Math.random().toString(16).slice(2, 7)}`;
                    existingCourse.addCourseEvent(new CourseEventClass({
                        ...eventData,
                        id: eventInstanceId,
                        courseId: existingCourse.id,
                        departmentCode: existingCourse.departmentCode,
                        courseCode: existingCourse.courseCode,
                        year: existingCourse.year,
                        semester: existingCourse.semester
                    }));
                });
            }
            return existingCourse;
        }

        const course = new CourseClass(courseData);
        course.color = getColorForCourse(this.courses.length); // Přiřadí barvu novému předmětu
        this.courses.push(course);
        return course;
    }

    removeCourse(courseIdentifier) {
        const courseToRemove = this.courses.find(c => c.id === courseIdentifier || c.stagId === courseIdentifier);
        if (courseToRemove) {
            const eventsToRemoveFromSchedule = courseToRemove.events.map(e => e.id);
            eventsToRemoveFromSchedule.forEach(eventId => this.primarySchedule.removeEventById(eventId));
            this.generatedSchedules.forEach(schedule => {
                eventsToRemoveFromSchedule.forEach(eventId => schedule.removeEventById(eventId));
            });
            this.courses = this.courses.filter(c => c.id !== courseToRemove.id);
        }
    }

    removeAllCourses() {
        this.courses = [];
        this.primarySchedule.clear();
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;
    }

    getAllCourses() {
        return [...this.courses];
    }

    findCourseById(courseId) {
        return this.courses.find(c => c.id === courseId);
    }

    findEventByIdGlobal(eventId) {
        for (const course of this.courses) {
            const event = course.events.find(e => e.id === eventId);
            if (event) return event;
        }
        return null;
    }

    _normalizePriorities() {
        const sortedPreferences = Object.values(this.preferences)
            .sort((a, b) => a.priority - b.priority);
        const normalizedPreferences = {};
        sortedPreferences.forEach((pref, index) => {
            normalizedPreferences[pref.id] = { ...pref, priority: index + 1 };
        });
        this.preferences = normalizedPreferences;
    }

    addPreference(preferenceData) {
        const newId = preferenceData.id || generatePreferenceId();
        const newPreference = {
            ...preferenceData,
            id: newId,
            priority: parseInt(preferenceData.priority, 10) || (Object.keys(this.preferences).length + 1),
            isActive: preferenceData.isActive !== undefined ? preferenceData.isActive : true,
        };
        this.preferences[newId] = newPreference;
        this._normalizePriorities();
    }

    deletePreference(preferenceId) {
        if (this.preferences[preferenceId]) {
            delete this.preferences[preferenceId];
            this._normalizePriorities();
        }
    }

    removeAllPreferences() {
        this.preferences = {};
    }

    updatePreference(preferenceId, updatedData) {
        if (this.preferences[preferenceId]) {
            this.preferences[preferenceId] = {
                ...this.preferences[preferenceId],
                ...updatedData,
            };
            if (updatedData.priority !== undefined) {
                this._normalizePriorities();
            }
        }
    }

    updatePreferencePriority(preferenceId, direction) {
        const prefsArray = Object.values(this.preferences).sort((a, b) => a.priority - b.priority);
        const index = prefsArray.findIndex(p => p.id === preferenceId);
        if (index === -1) return;

        if (direction === 'up' && index > 0) {
            [prefsArray[index].priority, prefsArray[index - 1].priority] = [prefsArray[index - 1].priority, prefsArray[index].priority];
        } else if (direction === 'down' && index < prefsArray.length - 1) {
            [prefsArray[index].priority, prefsArray[index + 1].priority] = [prefsArray[index + 1].priority, prefsArray[index].priority];
        }
        const newPreferencesObject = {};
        prefsArray.forEach(p => { newPreferencesObject[p.id] = p; });
        this.preferences = newPreferencesObject;
        this._normalizePriorities();
    }

    togglePreferenceActive(preferenceId) {
        if (this.preferences[preferenceId]) {
            this.preferences[preferenceId].isActive = !this.preferences[preferenceId].isActive;
        }
    }

    _getWorkspaceData() {
        return {
            semester: this.semester,
            year: this.year,
            courses: this.courses.map(course => course.serialize()), // Použijeme serialize metodu z CourseClass
            primaryScheduleEvents: this.primarySchedule.getAllEnrolledEvents().map(event => ({ id: event.id })),
            generatedSchedules: this.generatedSchedules.map(schedule => ({
                enrolledEventIds: schedule.getAllEnrolledEvents().map(event => event.id)
            })),
            activeScheduleIndex: this.activeScheduleIndex,
            preferences: this.preferences,
            scheduleColorMode: this.scheduleColorMode,
        };
    }

    saveWorkspace() {
        try {
            const workspaceData = this._getWorkspaceData();
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspaceData));
        } catch (error) {
            console.error("Chyba při ukládání workspace do localStorage:", error);
        }
    }

    exportWorkspaceAsJson(filename = 'muj_rozvrh_workspace.json') {
        try {
            const workspaceData = this._getWorkspaceData();
            const jsonString = JSON.stringify(workspaceData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error("Chyba při exportu workspace:", error);
            return false;
        }
    }

    importWorkspaceFromJson(jsonDataString) {
        try {
            const data = JSON.parse(jsonDataString);
            if (!data || typeof data !== 'object') {
                console.error("ImportWorkspace: Neplatný formát JSON dat.");
                return false;
            }

            this.resetToEmptyState(); // Nejprve vyčistíme aktuální stav

            this.year = data.year || '';
            this.semester = data.semester || '';

            if (Array.isArray(data.courses)) {
                this.courses = data.courses.map(courseData => new CourseClass(courseData));
            }

            if (data.primaryScheduleEvents && Array.isArray(data.primaryScheduleEvents)) {
                const eventsToEnroll = data.primaryScheduleEvents
                    .map(eventRef => this.findEventByIdGlobal(eventRef.id))
                    .filter(event => event !== null);
                this.primarySchedule.clear();
                eventsToEnroll.forEach(event => this.primarySchedule.addEvent(event));
            }

            if (Array.isArray(data.generatedSchedules)) {
                this.generatedSchedules = data.generatedSchedules.map(scheduleData => {
                    const newSchedule = new ScheduleClass();
                    if (scheduleData.enrolledEventIds && Array.isArray(scheduleData.enrolledEventIds)) {
                        const eventsForGenerated = scheduleData.enrolledEventIds
                        .map(eventId => this.findEventByIdGlobal(eventId))
                            .filter(event => event !== null);
                        eventsForGenerated.forEach(event => newSchedule.addEvent(event));
                    }
                    return newSchedule;
                });
            }
            
            this.activeScheduleIndex = (typeof data.activeScheduleIndex === 'number' && data.activeScheduleIndex >= -1) ? data.activeScheduleIndex : -1;
            
            if (typeof data.preferences === 'object' && data.preferences !== null) {
                this.preferences = data.preferences;
                this._normalizePriorities(); // Zajistíme validní priority
            }

            this.scheduleColorMode = data.scheduleColorMode === 'course' ? 'course' : 'type';

            console.log("Workspace importován z JSON.");
            return true;
        } catch (error) {
            console.error("Chyba při importu workspace z JSON:", error);
            this.resetToEmptyState(); // V případě chyby vrátíme do prázdného stavu
            return false;
        }
    }

    async saveScheduleImage(scheduleWrapperElement, filename = 'rozvrh.png') {
        if (!scheduleWrapperElement) {
            console.error('Chyba: Element pro vyfocení rozvrhu nebyl poskytnut.');
            return;
        }

        const scheduleBoxPaperElement = scheduleWrapperElement.querySelector('.MuiPaper-root'); // Najdeme Paper uvnitř
        if (!scheduleBoxPaperElement) {
            console.error('Chyba: Vnitřní Paper element ScheduleBox nebyl nalezen.');
            return;
        }
        
        const scheduleContentElement = scheduleBoxPaperElement.children[0]; // Předpokládáme, že první dítě je StyledTableContainer
        if (!scheduleContentElement || !scheduleContentElement.children[0]) {
             console.error('Chyba: Vnitřní prvek obsahu ScheduleBox (StyledTableContainer nebo Table) nebyl nalezen.');
             return;
        }
        const tableElement = scheduleContentElement.children[0]; // Předpokládáme, že tabulka je první dítě StyledTableContainer

        // Uložení původních stylů
        const originalWrapperStyles = {
            overflow: scheduleWrapperElement.style.overflow,
            height: scheduleWrapperElement.style.height,
            width: scheduleWrapperElement.style.width,
            maxHeight: scheduleWrapperElement.style.maxHeight,
        };
        const originalPaperStyles = {
            overflow: scheduleBoxPaperElement.style.overflow,
            height: scheduleBoxPaperElement.style.height,
            width: scheduleBoxPaperElement.style.width,
            maxHeight: scheduleBoxPaperElement.style.maxHeight,
        };
        const originalContentStyles = {
            overflow: scheduleContentElement.style.overflow,
            height: scheduleContentElement.style.height,
            width: scheduleContentElement.style.width,
            maxHeight: scheduleContentElement.style.maxHeight,
        };

        try {
            // Dočasná úprava stylů pro plný obsah
            scheduleWrapperElement.style.overflow = 'visible';
            scheduleWrapperElement.style.height = 'auto'; // Nebo scheduleWrapperElement.scrollHeight + 'px'
            scheduleWrapperElement.style.width = 'auto';  // Nebo scheduleWrapperElement.scrollWidth + 'px'
            scheduleWrapperElement.style.maxHeight = 'none';

            scheduleBoxPaperElement.style.overflow = 'visible';
            scheduleBoxPaperElement.style.height = 'auto';
            scheduleBoxPaperElement.style.width = 'auto';
            scheduleBoxPaperElement.style.maxHeight = 'none';
            
            scheduleContentElement.style.overflow = 'visible';
            scheduleContentElement.style.height = tableElement.scrollHeight + 'px';
            scheduleContentElement.style.width = tableElement.scrollWidth + 'px';
            scheduleContentElement.style.maxHeight = 'none';

            const canvas = await html2canvas(tableElement, { // Snímat přímo tabulku
                allowTaint: true,
                useCORS: true,
                logging: true,
                scrollX: 0, // Dříve -window.scrollX
                scrollY: 0, // Dříve -window.scrollY
                x: 0, // Pozice X výřezu
                y: 0, // Pozice Y výřezu
                width: tableElement.scrollWidth, // Šířka celého obsahu elementu
                height: tableElement.scrollHeight, // Výška celého obsahu elementu
                backgroundColor: window.getComputedStyle(scheduleBoxPaperElement).backgroundColor || '#ffffff', // Barva pozadí
                scale: 2, // Zvýšení kvality obrázku
            });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = image;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Chyba při vytváření obrázku rozvrhu:', error);
        } finally {
            // Obnovení původních stylů
            scheduleWrapperElement.style.overflow = originalWrapperStyles.overflow;
            scheduleWrapperElement.style.height = originalWrapperStyles.height;
            scheduleWrapperElement.style.width = originalWrapperStyles.width;
            scheduleWrapperElement.style.maxHeight = originalWrapperStyles.maxHeight;

            scheduleBoxPaperElement.style.overflow = originalPaperStyles.overflow;
            scheduleBoxPaperElement.style.height = originalPaperStyles.height;
            scheduleBoxPaperElement.style.width = originalPaperStyles.width;
            scheduleBoxPaperElement.style.maxHeight = originalPaperStyles.maxHeight;
            
            scheduleContentElement.style.overflow = originalContentStyles.overflow;
            scheduleContentElement.style.height = originalContentStyles.height;
            scheduleContentElement.style.width = originalContentStyles.width;
            scheduleContentElement.style.maxHeight = originalContentStyles.maxHeight;
        }
    }

    loadWorkspace() {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
            try {
                const data = JSON.parse(savedData);
                // Validace základní struktury dat
                if (typeof data === 'object' && data !== null && Array.isArray(data.courses)) {
                    this.year = data.year || '';
                    this.semester = data.semester || '';
                    this.courses = data.courses.map(courseData => new CourseClass(courseData));

                this.primarySchedule = new ScheduleClass();
                    if (data.primaryScheduleEvents && Array.isArray(data.primaryScheduleEvents)) {
                        const eventsToEnroll = data.primaryScheduleEvents
                        .map(eventRef => this.findEventByIdGlobal(eventRef.id))
                            .filter(event => event !== null);
                        eventsToEnroll.forEach(event => this.primarySchedule.addEvent(event));
                    }
                    
                    this.generatedSchedules = Array.isArray(data.generatedSchedules) ? data.generatedSchedules.map(scheduleData => {
                        const newSchedule = new ScheduleClass();
                        if (scheduleData.enrolledEventIds && Array.isArray(scheduleData.enrolledEventIds)) {
                             const eventsForGenerated = scheduleData.enrolledEventIds
                            .map(eventId => this.findEventByIdGlobal(eventId))
                                .filter(event => event !== null);
                            eventsForGenerated.forEach(event => newSchedule.addEvent(event));
                        }
                        return newSchedule;
                    }) : [];
                    
                    this.activeScheduleIndex = (typeof data.activeScheduleIndex === 'number' && data.activeScheduleIndex >= -1) ? data.activeScheduleIndex : -1;
                    
                    this.preferences = (typeof data.preferences === 'object' && data.preferences !== null) ? data.preferences : {};
                    if (Object.keys(this.preferences).length > 0) {
                        this._normalizePriorities();
                    }

                    this.scheduleColorMode = data.scheduleColorMode === 'course' ? 'course' : 'type';

                console.log("WorkspaceService: Workspace loaded from localStorage.");
                    return true; // Data byla úspěšně načtena z localStorage
            } else {
                    console.warn("WorkspaceService: Data v localStorage nejsou ve validním formátu. Inicializuji prázdný workspace.");
                    this.resetToEmptyState();
                    return false; // Data nebyla validní
                }
            } catch (error) {
                console.error("WorkspaceService: Chyba při parsování dat z localStorage. Inicializuji prázdný workspace.", error);
                this.resetToEmptyState();
                return false; // Chyba při parsování
            }
        } else {
            console.log("WorkspaceService: Žádná data v localStorage. Inicializuji prázdný workspace.");
            this.resetToEmptyState(); // Toto je důležité - zajistí prázdný stav
            return false; // Nic nebylo načteno z localStorage
        }
    }

    clearWorkspace(removeFromStorage = true) {
        this.resetToEmptyState(); // Nastaví všechny vlastnosti na prázdné/výchozí
        if (removeFromStorage) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            console.log("WorkspaceService: Workspace data removed from localStorage.");
        }
    }

    _eventsConflict(event1, event2) {
        if (event1.day !== event2.day) return false;

        const start1 = this._timeToMinutes(event1.startTime);
        const end1 = this._timeToMinutes(event1.endTime);
        const start2 = this._timeToMinutes(event2.startTime);
        const end2 = this._timeToMinutes(event2.endTime);

        // Kontrola překryvu časů
        const overlap = start1 < end2 && start2 < end1;
        if (!overlap) return false;

        // Kontrola týdenní frekvence
        const freq1 = event1.recurrence; // např. "každýtýden", "sudýtýden", "lichýtýden", "jednorázově"
        const freq2 = event2.recurrence;

        if (freq1 === "jednorázově" || freq2 === "jednorázově") {
            // Pokud je alespoň jedna akce jednorázová, musíme zkontrolovat datum (pokud máme)
            // Prozatím, pokud je jedna jednorázová a druhá týdenní/periodická, považujeme za konflikt, pokud se časově kryjí v den
            // Toto by vyžadovalo přesnější logiku pro jednorázové události (např. porovnání konkrétních dat)
            // Pro zjednodušení: pokud se časy a dny kryjí, a jedna je jednorázová, považujeme za konflikt.
            return true;
        }

        if (freq1 === "každýtýden" || freq2 === "každýtýden") return true; // Každý týden koliduje s čímkoliv periodickým
        if (freq1 === freq2) return true; // Sudý se sudým, lichý s lichým

        return false; // Sudý s lichým nekoliduje
    }

    _timeToMinutes(timeStr) { // Pomocná funkce pro převod času "HH:MM" na minuty od půlnoci
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    generateSchedule(coursesToSchedule = this.courses) {
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;

        const activePreferences = Object.values(this.preferences)
            .filter(p => p.isActive)
            .sort((a, b) => a.priority - b.priority);

        const relevantCourses = coursesToSchedule.filter(course => course.events && course.events.length > 0);
        if (relevantCourses.length === 0) {
            console.log("Nebyly nalezeny žádné předměty s událostmi pro generování rozvrhu.");
            return false;
        }

        const allEventTypes = {};
        relevantCourses.forEach(course => {
            allEventTypes[course.id] = {};
            course.events.forEach(event => {
                if (!allEventTypes[course.id][event.type]) {
                    allEventTypes[course.id][event.type] = [];
                }
                allEventTypes[course.id][event.type].push(event);
            });
        });
        
        let solutionsFound = 0;

        const findSchedulesRecursive = (courseIdx, currentScheduleInProgress) => {
            if (solutionsFound >= MAX_GENERATED_SCHEDULES) {
                return;
            }

            if (courseIdx === relevantCourses.length) {
                this.generatedSchedules.push(currentScheduleInProgress.clone());
                solutionsFound++;
                return;
            }

            const course = relevantCourses[courseIdx];
            const eventTypesForCourse = allEventTypes[course.id];
            const typeKeys = Object.keys(eventTypesForCourse);

            const generateEventCombinationsForCourse = (typeKeyIndex, tempEventsForCourse) => {
                if (solutionsFound >= MAX_GENERATED_SCHEDULES) return;

                if (typeKeyIndex === typeKeys.length) {
                    const nextScheduleCandidate = currentScheduleInProgress.clone();
                    let possibleToAddAll = true;
                    for (const eventToAdd of tempEventsForCourse) {
                        if (nextScheduleCandidate.conflictsWith(eventToAdd, this._eventsConflict.bind(this))) {
                            possibleToAddAll = false;
                            break;
                        }
                        nextScheduleCandidate.addEvent(eventToAdd);
                    }

                    if (possibleToAddAll) {
                        findSchedulesRecursive(courseIdx + 1, nextScheduleCandidate);
                    }
                    return;
                }

                const currentEventTypeKey = typeKeys[typeKeyIndex];
                const eventsOfThisType = eventTypesForCourse[currentEventTypeKey];
                const neededCount = course.neededEnrollments[EVENT_TYPE_TO_KEY_MAP[currentEventTypeKey]] || 0;

                if (neededCount === 0) {
                    generateEventCombinationsForCourse(typeKeyIndex + 1, tempEventsForCourse);
                    return;
                }

                function getCombinations(array, k) {
                    if (k === 0) return [[]];
                    if (array.length < k) return [];
                    const first = array[0];
                    const withoutFirst = array.slice(1);
                    const combsWithFirst = getCombinations(withoutFirst, k - 1).map(comb => [first, ...comb]);
                    const combsWithoutFirst = getCombinations(withoutFirst, k);
                    return [...combsWithFirst, ...combsWithoutFirst];
                }

                const combinations = getCombinations(eventsOfThisType, neededCount);

                for (const combination of combinations) {
                    if (solutionsFound >= MAX_GENERATED_SCHEDULES) return;
                    generateEventCombinationsForCourse(typeKeyIndex + 1, [...tempEventsForCourse, ...combination]);
                }
            }

            generateEventCombinationsForCourse(0, []);
        }
        
        findSchedulesRecursive(0, new ScheduleClass());

        console.log(`Generování dokončeno. Nalezeno ${this.generatedSchedules.length} rozvrhů.`);
        return this.generatedSchedules.length > 0;
    }
}

export default WorkspaceService;