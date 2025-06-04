// src/services/WorkspaceService.js
import CourseClass from './CourseClass';
import ScheduleClass from './ScheduleClass';
import CourseEventClass from './CourseEventClass'; // Přidáno pro úplnost
// eslint-disable-next-line no-unused-vars
import { EVENT_TYPE_TO_KEY_MAP } from './CourseClass'; // Použito v generateSchedule


const MAX_GENERATED_SCHEDULES = 10;
export const LOCAL_STORAGE_KEY = 'schedulePlannerWorkspace_v2'; // Exportováno pro případné použití jinde

// Helper pro generování unikátních ID pro preference
const generatePreferenceId = () => `pref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;


class WorkspaceService {
    constructor() {
        this.semester = '';
        this.year = '';
        this.courses = [];
        // preferences je nyní objekt, klíčované podle ID preference
        // Příklad: { pref_abc123: { id: 'pref_abc123', type: 'FREE_DAY', priority: 1, isActive: true, params: { day: 'PO' } } }
        this.preferences = {};

        this.primarySchedule = new ScheduleClass();
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;
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
        const existingCourse = this.courses.find(c =>
            (courseData.stagId && c.stagId === courseData.stagId) ||
            (c.departmentCode === courseData.departmentCode && c.courseCode === courseData.courseCode && c.year === courseData.year && c.semester === courseData.semester)
        );

        if (existingCourse) {
            console.warn("Předmět již existuje ve workspace, aktualizuji:", existingCourse.getShortCode());
            if (courseData.events && Array.isArray(courseData.events)) {
                existingCourse.events = [];
                courseData.events.forEach(eventData => {
                    existingCourse.addCourseEvent(new CourseEventClass({
                        ...eventData,
                        courseId: existingCourse.id,
                        courseCode: existingCourse.getShortCode(),
                        departmentCode: existingCourse.departmentCode,
                        year: existingCourse.year,
                        semester: existingCourse.semester
                    }));
                });
            }
            // Aktualizace dalších vlastností, pokud je potřeba (např. name, credits)
            existingCourse.name = courseData.name || existingCourse.name;
            existingCourse.credits = courseData.credits !== undefined ? courseData.credits : existingCourse.credits;
            existingCourse.neededEnrollments = courseData.neededEnrollments || existingCourse.neededEnrollments;
            return existingCourse;
        }

        const course = new CourseClass(courseData);
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
            console.log(`Předmět ${courseToRemove.getShortCode()} odstraněn.`);
        } else {
            console.warn(`Pokus o odstranění neexistujícího předmětu: ${courseIdentifier}`);
        }
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

    // --- Metody pro práci s preferencemi ---
    _normalizePriorities() {
        const sortedPreferences = Object.values(this.preferences)
            .sort((a, b) => a.priority - b.priority);

        const normalizedPreferences = {};
        sortedPreferences.forEach((pref, index) => {
            const newPriority = index + 1;
            normalizedPreferences[pref.id] = { ...pref, priority: newPriority };
        });
        this.preferences = normalizedPreferences;
    }

    addPreference(preferenceData) {
        const newId = preferenceData.id || generatePreferenceId();
        const newPreference = {
            ...preferenceData,
            id: newId,
            // Zajistíme, že priorita je číslo, pokud přichází jako string, nebo nastavíme výchozí
            priority: parseInt(preferenceData.priority, 10) || (Object.keys(this.preferences).length + 1),
            isActive: preferenceData.isActive !== undefined ? preferenceData.isActive : true,
        };
        this.preferences[newId] = newPreference;
        this._normalizePriorities();
        console.log("Preference added:", newPreference);
    }

    deletePreference(preferenceId) {
        if (this.preferences[preferenceId]) {
            delete this.preferences[preferenceId];
            this._normalizePriorities();
            console.log("Preference deleted:", preferenceId);
        } else {
            console.warn("Attempted to delete non-existent preference:", preferenceId);
        }
    }

    updatePreference(preferenceId, updatedData) {
        if (this.preferences[preferenceId]) {
            this.preferences[preferenceId] = {
                ...this.preferences[preferenceId],
                ...updatedData,
            };
            // Pokud se mění priorita, normalizujeme
            if (updatedData.priority !== undefined) {
                this._normalizePriorities();
            }
            console.log("Preference updated:", this.preferences[preferenceId]);
        } else {
            console.warn("Attempted to update non-existent preference:", preferenceId);
        }
    }

    updatePreferencePriority(preferenceId, direction) {
        const prefsArray = Object.values(this.preferences).sort((a, b) => a.priority - b.priority);
        const index = prefsArray.findIndex(p => p.id === preferenceId);

        if (index === -1) return;

        if (direction === 'up' && index > 0) {
            // Prohodíme priority s předchozím prvkem
            const currentPriority = prefsArray[index].priority;
            prefsArray[index].priority = prefsArray[index - 1].priority;
            prefsArray[index - 1].priority = currentPriority;
        } else if (direction === 'down' && index < prefsArray.length - 1) {
            // Prohodíme priority s následujícím prvkem
            const currentPriority = prefsArray[index].priority;
            prefsArray[index].priority = prefsArray[index + 1].priority;
            prefsArray[index + 1].priority = currentPriority;
        }

        // Přestavíme this.preferences z upraveného pole a normalizujeme
        const newPreferencesObject = {};
        prefsArray.forEach(p => { newPreferencesObject[p.id] = p; });
        this.preferences = newPreferencesObject;
        this._normalizePriorities(); // Toto zajistí správné sekvenční priority 1, 2, 3...
    }

    togglePreferenceActive(preferenceId) {
        if (this.preferences[preferenceId]) {
            this.preferences[preferenceId].isActive = !this.preferences[preferenceId].isActive;
            // Normalizace priorit není nutná při změně isActive
            console.log("Preference active toggled:", this.preferences[preferenceId]);
        } else {
            console.warn("Attempted to toggle active on non-existent preference:", preferenceId);
        }
    }


    // --- Persistence ---
    saveWorkspace() {
        try {
            const workspaceData = {
                semester: this.semester,
                year: this.year,
                courses: this.courses.map(course => ({
                    id: course.id,
                    stagId: course.stagId,
                    name: course.name,
                    departmentCode: course.departmentCode,
                    courseCode: course.courseCode,
                    credits: course.credits,
                    neededEnrollments: course.neededEnrollments,
                    events: course.events.map(event => ({
                        ...event,
                        instructor: typeof event.instructor === 'object' ? event.instructor.name : event.instructor,
                    })),
                    semester: course.semester,
                    year: course.year,
                })),
                primaryScheduleEvents: this.primarySchedule.getAllEnrolledEvents().map(event => ({ id: event.id })),
                generatedSchedules: this.generatedSchedules.map(schedule => ({
                    enrolledEventIds: schedule.getAllEnrolledEvents().map(event => event.id)
                })),
                activeScheduleIndex: this.activeScheduleIndex,
                preferences: this.preferences, // Ukládáme celý objekt preferencí
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspaceData));
            // console.log("WorkspaceService: Workspace saved to localStorage.");
        } catch (error) {
            console.error("Failed to save workspace:", error);
        }
    }

    loadWorkspace() {
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.semester = parsedData.semester || '';
                this.year = parsedData.year || '';
                this.preferences = parsedData.preferences || {}; // Načteme objekt preferencí
                this.activeScheduleIndex = parsedData.activeScheduleIndex !== undefined ? parsedData.activeScheduleIndex : -1;

                this.courses = (parsedData.courses || []).map(courseData => {
                    // courseData.events by měl obsahovat všechny potřebné vlastnosti pro CourseEventClass
                    // a CourseClass konstruktor by měl vytvořit instance CourseEventClass
                    const courseEvents = (courseData.events || []).map(eventData => new CourseEventClass(eventData));
                    return new CourseClass({ ...courseData, events: courseEvents });
                });

                this.primarySchedule = new ScheduleClass();
                if (parsedData.primaryScheduleEvents) {
                    const eventRefs = parsedData.primaryScheduleEvents
                        .map(eventRef => this.findEventByIdGlobal(eventRef.id))
                        .filter(Boolean); // Odstraní null hodnoty, pokud událost nebyla nalezena
                    this.primarySchedule.addEvents(eventRefs);
                }

                this.generatedSchedules = (parsedData.generatedSchedules || []).map(scheduleData => {
                    const schedule = new ScheduleClass();
                    if (scheduleData.enrolledEventIds) {
                        const eventRefs = scheduleData.enrolledEventIds
                            .map(eventId => this.findEventByIdGlobal(eventId))
                            .filter(Boolean);
                        schedule.addEvents(eventRefs);
                    }
                    return schedule;
                });
                this._normalizePriorities(); // Zajistíme správné priority po načtení
                console.log("WorkspaceService: Workspace loaded from localStorage.");
                return true;
            } else {
                this._normalizePriorities(); // I pro dummy data
                return this._loadHardcodedDummyData();
            }
        } catch (error) {
            console.error("Failed to load workspace from localStorage:", error);
            this.clearWorkspace(false);
            this._normalizePriorities(); // I pro dummy data po chybě
            return this._loadHardcodedDummyData();
        }
    }

    _loadHardcodedDummyData() {
        console.log("WorkspaceService: Loading hardcoded dummy data.");
        this.semester = 'ZS';
        const currentYearNum = new Date().getFullYear();
        this.year = `${currentYearNum}/${currentYearNum + 1}`;

        const course1Data = {
            id: 'dummyCourseKIVPPA1D', // ID je nyní KOD_KATEDRY/KOD_PREDMETU
            stagId: 'KIV/PPA1_DUMMY_STAG',
            name: 'Počítače a programování 1 (Dummy)',
            departmentCode: 'KIV',
            courseCode: 'PPA1D',
            credits: 6,
            neededEnrollments: { lecture: 1, practical: 1, seminar: 0 },
            semester: this.semester,
            year: this.year,
        };
        const course1Instance = this.addCourse(course1Data);
        if (course1Instance && typeof course1Instance.generateDummyCourseEvents === 'function') {
            course1Instance.generateDummyCourseEvents(2);
        }

        const course2Data = {
            id: 'dummyCourseKIVUURD',
            stagId: 'KIV/UUR_DUMMY_STAG',
            name: 'Uživatelská rozhraní (Dummy)',
            departmentCode: 'KIV',
            courseCode: 'UURD',
            credits: 5,
            neededEnrollments: { lecture: 1, practical: 0, seminar: 1 },
            semester: this.semester,
            year: this.year,
            events: [
                {
                    stagId: 'UUR_lec_dummy_1_stag', startTime: '10:00', endTime: '11:30', day: 0,
                    recurrence: 'KAŽDÝ TÝDEN', type: 'PŘEDNÁŠKA', room: 'EP120',
                    instructor: 'Dr. Testovací', currentCapacity: 5, maxCapacity: 50,
                    note: 'Úvodní přednáška UURD'
                },
                {
                    stagId: 'UUR_sem_dummy_1_stag', startTime: '14:00', endTime: '15:30', day: 2,
                    recurrence: 'KAŽDÝ TÝDEN', type: 'SEMINÁŘ', room: 'UC305',
                    instructor: 'Ing. Dummy Data', currentCapacity: 2, maxCapacity: 20,
                }
            ]
        };
        this.addCourse(course2Data);

        // Příklad preferencí pro dummy data
        this.addPreference({ type: 'FREE_DAY', params: { day: 'ST' } }); // Středa volno
        this.addPreference({ type: 'AVOID_TIMES', params: { day: 'PO', startTime: '08:00', endTime: '10:00' } });


        if (this.courses.length > 0 && this.courses[0].events.length > 0) {
            this.primarySchedule.addEvent(this.courses[0].events[0]);
        }
        if (this.courses.length > 0 && this.courses[0].events.length > 1) {
            this.primarySchedule.addEvent(this.courses[0].events[1]);
        }

        console.log("WorkspaceService: Dummy data loaded and initialized primary schedule.");
        this.saveWorkspace();
        return true;
    }


    clearWorkspace(removeFromStorage = true) {
        this.semester = '';
        this.year = '';
        this.courses = [];
        this.primarySchedule.clear();
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;
        this.preferences = {}; // Vymazání preferencí
        if (removeFromStorage) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            console.log("WorkspaceService: Workspace cleared from localStorage.");
        }
        console.log("WorkspaceService: Workspace data cleared from memory.");
    }

    // --- Schedule Generation Logic ---
    _eventsConflict(event1, event2) {
        if (event1.day !== event2.day) {
            return false;
        }
        // Jednoduchá kontrola času (měla by být robustnější pro různé formáty a délky)
        const start1 = parseInt(event1.startTime.replace(':', ''), 10);
        const end1 = parseInt(event1.endTime.replace(':', ''), 10);
        const start2 = parseInt(event2.startTime.replace(':', ''), 10);
        const end2 = parseInt(event2.endTime.replace(':', ''), 10);

        // Překryv nastane, pokud start jednoho je před koncem druhého A start druhého je před koncem prvního
        if (start1 < end2 && start2 < end1) {
            // Zohlednění týdenní recurrence
            if (event1.recurrence === 'KAŽDÝ TÝDEN' || event2.recurrence === 'KAŽDÝ TÝDEN') {
                return true; // Jeden je každý týden, takže vždy kolidují, pokud se dny a časy shodují
            }
            if (event1.recurrence === event2.recurrence) {
                return true; // Oba jsou sudé nebo oba liché a časy kolidují
            }
            // Pokud jeden je sudý a druhý lichý, nekolidují v ten samý týden
            return false;
        }
        return false;
    }

    // Zjednodušená implementace generateSchedule pro demonstraci
    // Skutečný algoritmus by byl výrazně komplexnější (viz dokumentace)
    generateSchedule(coursesToSchedule = this.courses) { // [cite: 162, 176]
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;
        const solutions = [];

        const activePreferencesList = Object.values(this.preferences)
            .filter(p => p.isActive)
            .sort((a, b) => a.priority - b.priority); // [cite: 186]

        // Placeholder pro velmi zjednodušenou logiku, která vezme první možné nekolidující akce
        const findSchedulesRecursive = (courseIdx, currentScheduleInProgress) => {
            if (solutions.length >= MAX_GENERATED_SCHEDULES) return;

            if (courseIdx === coursesToSchedule.length) {
                // Zkontroluj, zda jsou splněny všechny podmínky pro všechny předměty
                let allCourseReqsMet = true;
                for (const course of coursesToSchedule) {
                    const enrolledEventIdsForCourse = new Set(
                        currentScheduleInProgress.getAllEnrolledEvents()
                            .filter(ev => ev.courseId === course.id)
                            .map(ev => ev.id)
                    );
                    if (!course.areAllEnrollmentRequirementsMet(enrolledEventIdsForCourse)) {
                        allCourseReqsMet = false;
                        break;
                    }
                }

                if (allCourseReqsMet) {
                    const finalSchedule = new ScheduleClass();
                    finalSchedule.addEvents(currentScheduleInProgress.getAllEnrolledEvents());
                    solutions.push(finalSchedule);
                }
                return;
            }

            const course = coursesToSchedule[courseIdx];
            const needed = course.neededEnrollments;
            const eventTypeKeys = Object.keys(needed).filter(typeKey => needed[typeKey] > 0);

            // Rekurzivní funkce pro generování kombinací událostí pro jeden předmět
            const generateEventCombinationsForCourse = (typeKeyIndex, tempEventsForCourse) => {
                if (typeKeyIndex === eventTypeKeys.length) {
                    // Máme vybrané události pro všechny potřebné typy tohoto kurzu
                    // Přidáme je do currentScheduleInProgress (po kontrole konfliktů) a pokračujeme na další kurz
                    let conflict = false;
                    for(const newEvent of tempEventsForCourse) {
                        for(const existingEvent of currentScheduleInProgress.getAllEnrolledEvents()) {
                            if(this._eventsConflict(newEvent, existingEvent)) {
                                conflict = true; break;
                            }
                        }
                        if(conflict) break;
                    }

                    if (!conflict) {
                        tempEventsForCourse.forEach(event => currentScheduleInProgress.addEvent(event));
                        findSchedulesRecursive(courseIdx + 1, currentScheduleInProgress);
                        tempEventsForCourse.forEach(event => currentScheduleInProgress.removeEventById(event.id)); // Backtrack
                    }
                    return;
                }

                const currentTypeKey = eventTypeKeys[typeKeyIndex]; // např. 'lecture'
                const numNeeded = needed[currentTypeKey];

                // Získání událostí daného typu, které splňují preference
                const availableEventsOfType = course.events.filter(event => {
                    const eventTypeMapped = Object.keys(EVENT_TYPE_TO_KEY_MAP).find(key => EVENT_TYPE_TO_KEY_MAP[key] === currentTypeKey && event.type.toLowerCase().includes(key));
                    if(!eventTypeMapped) return false;

                    for (const pref of activePreferencesList) {
                        if (pref.type === 'FREE_DAY' && event.getDayAsString(d => d) === pref.params.day) return false; // [cite: 188]
                        if (pref.type === 'AVOID_TIMES' && event.getDayAsString(d => d) === pref.params.day) { // [cite: 190]
                            const eventStartMins = parseInt(event.startTime.replace(':', ''), 10);
                            const eventEndMins = parseInt(event.endTime.replace(':', ''), 10);
                            const prefStartMins = parseInt(pref.params.startTime.replace(':', ''), 10);
                            const prefEndMins = parseInt(pref.params.endTime.replace(':', ''), 10);
                            if (Math.max(eventStartMins, prefStartMins) < Math.min(eventEndMins, prefEndMins)) return false;
                        }
                        // Další preference...
                    }
                    return true;
                });


                if (availableEventsOfType.length < numNeeded) return; // Nelze splnit

                // Zde by byl skutečný generátor kombinací (např. n select k)
                // Pro zjednodušení vezmeme prvních 'numNeeded' událostí
                const selectedEventsForType = availableEventsOfType.slice(0, numNeeded);

                // Zkontrolujeme, zda nově vybrané události pro tento typ nekolidují mezi sebou
                for (let i = 0; i < selectedEventsForType.length; i++) {
                    for (let j = i + 1; j < selectedEventsForType.length; j++) {
                        if (this._eventsConflict(selectedEventsForType[i], selectedEventsForType[j])) {
                            return; // Interní konflikt v rámci typu, tato větev je neplatná
                        }
                    }
                }

                generateEventCombinationsForCourse(typeKeyIndex + 1, [...tempEventsForCourse, ...selectedEventsForType]);
            };

            if (eventTypeKeys.length === 0) { // Předmět nemá žádné požadavky
                findSchedulesRecursive(courseIdx + 1, currentScheduleInProgress);
            } else {
                generateEventCombinationsForCourse(0, []);
            }
        };

        const initialSchedule = new ScheduleClass();
        findSchedulesRecursive(0, initialSchedule);

        this.generatedSchedules = solutions;
        if (solutions.length > 0) {
            this.activeScheduleIndex = 0;
            console.log(`WorkspaceService: Generated ${solutions.length} schedule variants.`);
            return true;
        }
        console.log("WorkspaceService: No valid schedule variants found meeting all criteria.");
        return false;
    }
}

export default WorkspaceService;