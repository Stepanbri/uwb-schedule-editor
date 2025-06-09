/**
 * @file Tento soubor definuje WorkspaceService, hlavní službu pro správu stavu aplikace pro plánování rozvrhu.
 * Zodpovídá za správu předmětů, generování rozvrhů, uživatelských preferencí a perzistenci dat.
 * Je implementována jako Singleton, aby byl zajištěn jediný zdroj pravdy v celé aplikaci.
 */

// Hlavní služba pro správu dat aplikace
// Spravuje předměty, rozvrhy, preference a poskytuje rozhraní pro operace s nimi
import CourseClass from './CourseClass';
import ScheduleClass from './ScheduleClass';
import CourseEventClass from './CourseEventClass';
import { getColorForCourse } from '../utils/colorUtils';
import html2canvas from 'html2canvas'; // Import pro ukládání obrázku
import { generateScheduleAlgorithm } from './scheduleGenerator';

/**
 * Klíč pro ukládání dat workspace do localStorage.
 * @type {string}
 */
export const LOCAL_STORAGE_KEY = 'schedulePlannerWorkspace_v2';

/**
 * Generuje unikátní ID pro preference.
 * @returns {string} Unikátní identifikátor.
 */
const generatePreferenceId = () =>
    `pref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

/**
 * @class WorkspaceService
 * @classdesc Singleton třída spravující veškerý stav a logiku plánovače rozvrhů.
 * Zahrnuje manipulaci s předměty, rozvrhy, preferencemi a ukládání/načítání dat.
 */
class WorkspaceService {
    /**
     * @constructor
     */
    constructor() {
        this.resetToEmptyState(); // Inicializace na prázdný stav
    }

    /**
     * Resetuje celý workspace do výchozího prázdného stavu.
     */
    resetToEmptyState() {
        this.semester = '';
        this.year = '';
        this.courses = [];
        this.preferences = {};
        this.primarySchedule = new ScheduleClass();
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;
        this.scheduleColorMode = 'type'; // Výchozí režim barev
    }

    /**
     * Vrací aktuálně aktivní rozvrh.
     * Může to být buď primární ručně sestavený rozvrh, nebo jeden z vygenerovaných.
     * @returns {ScheduleClass} Aktivní instance ScheduleClass.
     */
    getActiveSchedule() {
        if (
            this.activeScheduleIndex >= 0 &&
            this.activeScheduleIndex < this.generatedSchedules.length
        ) {
            return this.generatedSchedules[this.activeScheduleIndex];
        }
        return this.primarySchedule;
    }

    /**
     * Nastaví index aktivního rozvrhu z pole vygenerovaných rozvrhů.
     * @param {number} index - Index v poli `generatedSchedules`. Hodnota -1 označuje primární rozvrh.
     */
    setActiveScheduleIndex(index) {
        if (index >= -1 && index < this.generatedSchedules.length) {
            this.activeScheduleIndex = index;
        } else {
            this.activeScheduleIndex = -1;
        }
    }

    /**
     * Přidá nový předmět do workspace nebo aktualizuje existující.
     * Pokud předmět se stejným ID již existuje, jeho data jsou přepsána.
     * @param {object} courseData - Data nového předmětu.
     * @returns {CourseClass} Přidaná nebo aktualizovaná instance předmětu.
     */
    addCourse(courseData) {
        const courseIdentifier = `${courseData.departmentCode}/${courseData.courseCode}`;
        const existingCourse = this.courses.find(c => c.id === courseIdentifier);

        if (existingCourse) {
            const oldEventIds = existingCourse.events.map(e => e.id);
            oldEventIds.forEach(eventId => {
                this.primarySchedule.removeEventById(eventId);
                this.generatedSchedules.forEach(schedule => schedule.removeEventById(eventId));
            });

            existingCourse.stagId = courseData.stagId || existingCourse.stagId;
            existingCourse.name = courseData.name || existingCourse.name;
            existingCourse.credits =
                courseData.credits !== undefined ? courseData.credits : existingCourse.credits;
            existingCourse.neededEnrollments =
                courseData.neededEnrollments || existingCourse.neededEnrollments;
            existingCourse.year = courseData.year;
            existingCourse.semester = courseData.semester;
            existingCourse.source = courseData.source || existingCourse.source;
            existingCourse.events = [];
            if (courseData.events && Array.isArray(courseData.events)) {
                courseData.events.forEach(eventData => {
                    const eventInstanceId =
                        eventData.id ||
                        eventData.stagId ||
                        `${eventData.departmentCode}-${eventData.courseCode}-${eventData.type}-${eventData.day}-${eventData.startTime}-${Math.random().toString(16).slice(2, 7)}`;
                    existingCourse.addCourseEvent(
                        new CourseEventClass({
                            ...eventData,
                            id: eventInstanceId,
                            courseId: existingCourse.id,
                            departmentCode: existingCourse.departmentCode,
                            courseCode: existingCourse.courseCode,
                            year: existingCourse.year,
                            semester: existingCourse.semester,
                        })
                    );
                });
            }
            return existingCourse;
        }

        const course = new CourseClass(courseData);
        course.color = getColorForCourse(this.courses.length); // Přiřadí barvu novému předmětu
        this.courses.push(course);
        return course;
    }

    /**
     * Odstraní předmět z workspace na základě jeho identifikátoru.
     * Zároveň odstraní všechny související rozvrhové akce z primárního i generovaných rozvrhů.
     * @param {string} courseIdentifier - ID předmětu (např. "KIV/PPA1").
     */
    removeCourse(courseIdentifier) {
        const courseToRemove = this.courses.find(
            c => c.id === courseIdentifier || c.stagId === courseIdentifier
        );
        if (courseToRemove) {
            const eventsToRemoveFromSchedule = courseToRemove.events.map(e => e.id);
            eventsToRemoveFromSchedule.forEach(eventId =>
                this.primarySchedule.removeEventById(eventId)
            );
            this.generatedSchedules.forEach(schedule => {
                eventsToRemoveFromSchedule.forEach(eventId => schedule.removeEventById(eventId));
            });
            this.courses = this.courses.filter(c => c.id !== courseToRemove.id);
        }
    }

    /**
     * Odstraní všechny předměty z workspace a vyčistí všechny rozvrhy.
     */
    removeAllCourses() {
        this.courses = [];
        this.primarySchedule.clear();
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;
    }

    /**
     * Vrací pole všech předmětů ve workspace.
     * @returns {CourseClass[]} Kopie pole s předměty.
     */
    getAllCourses() {
        return [...this.courses];
    }

    /**
     * Najde a vrátí předmět podle jeho ID.
     * @param {string} courseId - ID předmětu.
     * @returns {CourseClass|undefined} Nalezený předmět nebo undefined.
     */
    findCourseById(courseId) {
        return this.courses.find(c => c.id === courseId);
    }

    /**
     * Najde a vrátí událost (přednášku, cvičení) napříč všemi předměty podle jejího ID.
     * @param {string} eventId - ID rozvrhové akce.
     * @returns {CourseEventClass|null} Nalezená událost nebo null.
     */
    findEventByIdGlobal(eventId) {
        for (const course of this.courses) {
            const event = course.events.find(e => e.id === eventId);
            if (event) return event;
        }
        return null;
    }

    /**
     * Normalizuje priority všech preferencí tak, aby tvořily souvislou číselnou řadu.
     * @private
     */
    _normalizePriorities() {
        const sortedPreferences = Object.values(this.preferences).sort(
            (a, b) => a.priority - b.priority
        );
        const normalizedPreferences = {};
        sortedPreferences.forEach((pref, index) => {
            normalizedPreferences[pref.id] = { ...pref, priority: index + 1 };
        });
        this.preferences = normalizedPreferences;
    }

    /**
     * Přidá novou uživatelskou preferenci.
     * @param {object} preferenceData - Data nové preference.
     */
    addPreference(preferenceData) {
        const newId = preferenceData.id || generatePreferenceId();
        const newPreference = {
            ...preferenceData,
            id: newId,
            priority:
                parseInt(preferenceData.priority, 10) || Object.keys(this.preferences).length + 1,
            isActive: preferenceData.isActive !== undefined ? preferenceData.isActive : true,
        };
        this.preferences[newId] = newPreference;
        this._normalizePriorities();
    }

    /**
     * Odstraní uživatelskou preferenci podle jejího ID.
     * @param {string} preferenceId - ID preference k odstranění.
     */
    deletePreference(preferenceId) {
        if (this.preferences[preferenceId]) {
            delete this.preferences[preferenceId];
            this._normalizePriorities();
        }
    }

    /**
     * Odstraní všechny uživatelské preference.
     */
    removeAllPreferences() {
        this.preferences = {};
    }

    /**
     * Aktualizuje data existující preference.
     * @param {string} preferenceId - ID preference k aktualizaci.
     * @param {object} updatedData - Objekt s novými daty pro preferenci.
     */
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

    /**
     * Změní prioritu preference (posune ji nahoru nebo dolů v seznamu).
     * @param {string} preferenceId - ID preference.
     * @param {'up'|'down'} direction - Směr posunu.
     */
    updatePreferencePriority(preferenceId, direction) {
        const prefsArray = Object.values(this.preferences).sort((a, b) => a.priority - b.priority);
        const index = prefsArray.findIndex(p => p.id === preferenceId);
        if (index === -1) return;

        if (direction === 'up' && index > 0) {
            [prefsArray[index].priority, prefsArray[index - 1].priority] = [
                prefsArray[index - 1].priority,
                prefsArray[index].priority,
            ];
        } else if (direction === 'down' && index < prefsArray.length - 1) {
            [prefsArray[index].priority, prefsArray[index + 1].priority] = [
                prefsArray[index + 1].priority,
                prefsArray[index].priority,
            ];
        }
        const newPreferencesObject = {};
        prefsArray.forEach(p => {
            newPreferencesObject[p.id] = p;
        });
        this.preferences = newPreferencesObject;
        this._normalizePriorities();
    }

    /**
     * Přepíná stav aktivace/deaktivace pro danou preferenci.
     * @param {string} preferenceId - ID preference.
     */
    togglePreferenceActive(preferenceId) {
        if (this.preferences[preferenceId]) {
            this.preferences[preferenceId].isActive = !this.preferences[preferenceId].isActive;
        }
    }

    /**
     * Připraví data celého workspace pro serializaci (ukládání, export).
     * @returns {object} Objekt reprezentující stav workspace.
     * @private
     */
    _getWorkspaceData() {
        return {
            semester: this.semester,
            year: this.year,
            courses: this.courses.map(course => course.serialize()), // Použijeme serialize metodu z CourseClass
            primaryScheduleEvents: this.primarySchedule
                .getAllEnrolledEvents()
                .map(event => ({ id: event.id })),
            generatedSchedules: this.generatedSchedules.map(schedule => ({
                enrolledEventIds: schedule.getAllEnrolledEvents().map(event => event.id),
            })),
            activeScheduleIndex: this.activeScheduleIndex,
            preferences: this.preferences,
            scheduleColorMode: this.scheduleColorMode,
        };
    }

    /**
     * Uloží aktuální stav workspace do localStorage.
     */
    saveWorkspace() {
        try {
            const workspaceData = this._getWorkspaceData();
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspaceData));
        } catch (error) {
            // Chyby při ukládání se tiše ignorují, aby nepadala aplikace.
        }
    }

    /**
     * Exportuje aktuální stav workspace jako soubor JSON.
     * @param {string} [filename='muj_rozvrh_workspace.json'] - Název souboru pro stažení.
     * @returns {boolean} Vrací true při úspěchu, jinak false.
     */
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
            return false;
        }
    }

    /**
     * Importuje stav workspace z JSON řetězce.
     * @param {string} jsonDataString - Data workspace ve formátu JSON.
     * @returns {boolean} Vrací true při úspěchu, jinak false.
     */
    importWorkspaceFromJson(jsonDataString) {
        try {
            const data = JSON.parse(jsonDataString);
            if (!data || typeof data !== 'object') {
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
                    if (
                        scheduleData.enrolledEventIds &&
                        Array.isArray(scheduleData.enrolledEventIds)
                    ) {
                        const eventsForGenerated = scheduleData.enrolledEventIds
                            .map(eventId => this.findEventByIdGlobal(eventId))
                            .filter(event => event !== null);
                        eventsForGenerated.forEach(event => newSchedule.addEvent(event));
                    }
                    return newSchedule;
                });
            }

            this.activeScheduleIndex =
                data.activeScheduleIndex !== undefined ? data.activeScheduleIndex : -1;

            if (typeof data.preferences === 'object' && data.preferences !== null) {
                this.preferences = data.preferences;
                this._normalizePriorities(); // Zajistíme validní priority
            }

            this.scheduleColorMode = data.scheduleColorMode === 'course' ? 'course' : 'type';

            return true;
        } catch (error) {
            this.resetToEmptyState(); // V případě chyby se vrátíme do bezpečného stavu
            return false;
        }
    }

    /**
     * Uloží snímek HTML elementu rozvrhu jako obrázek PNG.
     * @param {HTMLElement} scheduleWrapperElement - HTML element, který obsahuje rozvrh.
     * @param {string} [filename='rozvrh.png'] - Název souboru pro uložení.
     */
    async saveScheduleImage(scheduleWrapperElement, filename = 'rozvrh.png') {
        if (!scheduleWrapperElement) {
            return false;
        }
        try {
            // Najít přímý container tabulky rozvrhu
            const tableContainer = scheduleWrapperElement.querySelector('.MuiTableContainer-root');
            if (!tableContainer) {
                console.error('Nelze najít container tabulky rozvrhu');
                return false;
            }

            // Zapamatovat si původní hodnoty
            const originalStyle = {
                overflow: tableContainer.style.overflow,
                height: tableContainer.style.height,
                width: tableContainer.style.width,
                position: tableContainer.style.position,
            };

            // Zjistit skutečné rozměry včetně přetečení
            const scrollHeight = tableContainer.scrollHeight;
            const scrollWidth = tableContainer.scrollWidth;

            // Dočasně upravit styly pro zachycení
            tableContainer.style.overflow = 'visible';
            tableContainer.style.height = `${scrollHeight}px`;
            tableContainer.style.width = `${scrollWidth}px`;
            tableContainer.style.position = 'relative';

            // Vytvořit canvas, použijeme samotnou tabulku místo celého wrapperu
            const canvas = await html2canvas(tableContainer, {
                scale: 2, // Zvýšení rozlišení pro lepší kvalitu
                useCORS: true, // Povolení CORS pro případné obrázky na pozadí
                logging: false, // Vypnutí logování z html2canvas
                height: scrollHeight,
                width: scrollWidth,
                windowHeight: scrollHeight,
                windowWidth: scrollWidth,
                ignoreElements: element => {
                    // Ignorovat elementy, které by mohly způsobovat problémy
                    return (
                        element.classList &&
                        (element.classList.contains('MuiCircularProgress-root') ||
                            element.classList.contains('MuiBackdrop-root'))
                    );
                },
            });

            // Vrátit původní stav elementu
            tableContainer.style.overflow = originalStyle.overflow;
            tableContainer.style.height = originalStyle.height;
            tableContainer.style.width = originalStyle.width;
            tableContainer.style.position = originalStyle.position;

            // Uložit obrázek
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = image;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return true;
        } catch (error) {
            console.error('Error capturing schedule image:', error);
            return false;
        }
    }

    /**
     * Načte pracovní prostor z localStorage.
     * Pokud v localStorage nic není nebo jsou data poškozená, inicializuje prázdný stav.
     */
    loadWorkspace() {
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (!savedData) {
                this.resetToEmptyState();
                return;
            }

            const data = JSON.parse(savedData);

            this.year = data.year || '';
            this.semester = data.semester || '';

            // Deserializace předmětů a jejich rozvrhových akcí
            this.courses = Array.isArray(data.courses)
                ? data.courses.map(courseData => {
                      const course = new CourseClass(courseData);
                      // Přiřazení barev, pokud nejsou uloženy
                      if (!course.color) {
                          course.color = getColorForCourse(this.courses.length);
                      }
                      return course;
                  })
                : [];

            // Obnovení primárního rozvrhu
            this.primarySchedule = new ScheduleClass();
            if (data.primaryScheduleEvents && Array.isArray(data.primaryScheduleEvents)) {
                data.primaryScheduleEvents.forEach(eventRef => {
                    const event = this.findEventByIdGlobal(eventRef.id);
                    if (event) {
                        this.primarySchedule.addEvent(event);
                    }
                });
            }

            // Obnovení vygenerovaných rozvrhů
            this.generatedSchedules = Array.isArray(data.generatedSchedules)
                ? data.generatedSchedules.map(scheduleData => {
                      const schedule = new ScheduleClass();
                      if (
                          scheduleData.enrolledEventIds &&
                          Array.isArray(scheduleData.enrolledEventIds)
                      ) {
                          scheduleData.enrolledEventIds.forEach(eventId => {
                              const event = this.findEventByIdGlobal(eventId);
                              if (event) {
                                  schedule.addEvent(event);
                              }
                          });
                      }
                      return schedule;
                  })
                : [];

            this.activeScheduleIndex =
                data.activeScheduleIndex !== undefined ? data.activeScheduleIndex : -1;
            this.preferences = data.preferences || {};
            this.scheduleColorMode = data.scheduleColorMode || 'type';
        } catch (error) {
            this.resetToEmptyState(); // V případě chyby se vrátíme do bezpečného stavu
        }
    }

    /**
     * Vymaže celý pracovní prostor a volitelně i data z localStorage.
     * @param {boolean} [removeFromStorage=true] - Pokud je true, smaže i data z localStorage.
     */
    clearWorkspace(removeFromStorage = true) {
        this.resetToEmptyState();
        if (removeFromStorage) {
            try {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            } catch (error) {
                // Chyba při mazání z localStorage se tiše ignoruje
            }
        }
    }

    /**
     * Spustí algoritmus pro generování rozvrhů na základě aktuálně přidaných předmětů.
     * Výsledky uloží do `this.generatedSchedules`.
     * @param {CourseClass[]} [coursesToSchedule=this.courses] - Pole předmětů k naplánování.
     */
    generateSchedule(coursesToSchedule = this.courses) {
        console.log('WorkspaceService.generateSchedule called with:', {
            coursesCount: coursesToSchedule.length,
            preferencesCount: Object.keys(this.preferences).length,
        });

        // Použijeme externí, optimalizovaný algoritmus pro generování
        // Předáme algoritmu i uživatelské preference
        this.generatedSchedules = generateScheduleAlgorithm(coursesToSchedule, this.preferences);

        console.log('Generated schedules:', this.generatedSchedules.length);

        // Resetujeme aktivní rozvrh, primární rozvrh zůstává nedotčen
        this.activeScheduleIndex = -1;

        return this.generatedSchedules.length > 0;
    }
}

/**
 * Jediná instance služby WorkspaceService (Singleton pattern).
 * @type {WorkspaceService}
 */
const workspaceService = new WorkspaceService();
export default workspaceService;
