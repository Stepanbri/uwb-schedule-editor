// PROJEKT/NEW/src/services/WorkspaceService.js
import CourseClass from './CourseClass';
import ScheduleClass from './ScheduleClass';
import CourseEventClass from './CourseEventClass';

const MAX_GENERATED_SCHEDULES = 10; // Maximální počet generovaných rozvrhů
const LOCAL_STORAGE_KEY = 'schedulePlannerWorkspace_v2'; // Updated key to avoid conflicts with old versions
import { EVENT_TYPE_TO_KEY_MAP } from './CourseClass'; // Assuming export from CourseClass.js


class WorkspaceService {
    constructor() {
        this.semester = ''; // např. ZS, LS
        this.year = '';     // např. 2023/2024
        this.courses = [];  // Všechny načtené předměty (instance CourseClass)
        this.preferences = {}; // Uživatelské preference pro generování { priority: { type, params, isActive } }

        this.primarySchedule = new ScheduleClass(); // Primární, ručně upravovaný rozvrh
        this.generatedSchedules = []; // Pole vygenerovaných alternativ (ScheduleClass instance)
        this.activeScheduleIndex = -1; // -1 znamená, že aktivní je primarySchedule, jinak index v generatedSchedules
    }

    /**
     * Vrátí aktuálně aktivní rozvrh (buď primární, nebo jeden z vygenerovaných).
     * @returns {ScheduleClass}
     */
    getActiveSchedule() {
        if (this.activeScheduleIndex >= 0 && this.activeScheduleIndex < this.generatedSchedules.length) {
            return this.generatedSchedules[this.activeScheduleIndex];
        }
        return this.primarySchedule;
    }

    /**
     * Nastaví aktivní rozvrh.
     * @param {number} index - Index v poli generatedSchedules, nebo -1 pro primární rozvrh.
     */
    setActiveScheduleIndex(index) {
        if (index >= -1 && index < this.generatedSchedules.length) {
            this.activeScheduleIndex = index;
        } else {
            console.error("Neplatný index pro aktivní rozvrh:", index);
            this.activeScheduleIndex = -1; // Fallback na primární
        }
    }

    /**
     * Přidá kurz do workspace. Pokud kurz již existuje (dle stagId nebo kombinace kódů, roku a semestru),
     * aktualizuje jeho události. Jinak přidá nový kurz.
     * @param {object} courseData - Data pro vytvoření kurzu. Může obsahovat 'events' pole pro události.
     * @returns {CourseClass} Přidaný nebo aktualizovaný kurz.
     */
    addCourse(courseData) {
        const existingCourse = this.courses.find(c =>
            (courseData.stagId && c.stagId === courseData.stagId) || // Preferujeme stagId pokud je
            (c.departmentCode === courseData.departmentCode && c.courseCode === courseData.courseCode && c.year === courseData.year && c.semester === courseData.semester)
        );

        if (existingCourse) {
            console.warn("Předmět již existuje ve workspace, aktualizuji:", existingCourse.getShortCode());
            // Aktualizace existujícího kurzu, např. událostí
            if (courseData.events && courseData.events.length > 0) {
                existingCourse.events = []; // Vyčistit staré, pokud přicházejí nové
                courseData.events.forEach(eventData => {
                    // Zajistíme, že courseId, courseCode atd. jsou správně nastaveny pro CourseEventClass
                    existingCourse.addCourseEvent(new CourseEventClass({
                        ...eventData,
                        courseId: existingCourse.id, // Link to existing course's local ID
                        courseCode: existingCourse.getShortCode(),
                        departmentCode: existingCourse.departmentCode,
                        year: existingCourse.year,
                        semester: existingCourse.semester
                    }));
                });
            }
            return existingCourse;
        }

        // Pokud kurz neexistuje, vytvoříme nový
        // Konstruktor CourseClass by měl sám zpracovat pole `events` a vytvořit instance CourseEventClass
        const course = new CourseClass({
            ...courseData // events pole je předáno konstruktoru CourseClass, který vytvoří instance CourseEventClass
        });
        this.courses.push(course);
        return course;
    }


    removeCourse(courseIdentifier) { // courseIdentifier může být ID kurzu nebo stagId
        const courseToRemove = this.courses.find(c => c.id === courseIdentifier || c.stagId === courseIdentifier);
        if (courseToRemove) {
            const eventsToRemoveFromSchedule = courseToRemove.events.map(e => e.id);

            // Odebrání z primárního rozvrhu
            eventsToRemoveFromSchedule.forEach(eventId => this.primarySchedule.removeEventById(eventId));

            // Odebrání z generovaných rozvrhů
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
    // (Zde by byla logika pro přidání, odebrání, úpravu preferencí, jak je naznačeno v PropertiesBar.jsx)
    // Například:
    // addPreference(preference) { this.preferences[preference.id] = preference; this.normalizePreferences(); }
    // removePreference(preferenceId) { delete this.preferences[preferenceId]; this.normalizePreferences(); }
    // updatePreference(preferenceId, newPriority) { ... }

    // --- Persistence ---
    saveWorkspace() {
        try {
            const workspaceData = {
                semester: this.semester,
                year: this.year,
                courses: this.courses.map(course => ({ // Ukládáme jako plain objekty
                    id: course.id,
                    stagId: course.stagId,
                    name: course.name,
                    departmentCode: course.departmentCode,
                    courseCode: course.courseCode,
                    credits: course.credits,
                    neededEnrollments: course.neededEnrollments, // Ukládáme neededEnrollments
                    events: course.events.map(event => ({ // Ukládáme všechny vlastnosti EventClass
                        ...event, // Spread all properties of CourseEventClass instance
                        instructor: typeof event.instructor === 'object' ? event.instructor.name : event.instructor, // Příklad serializace
                        // courseId je již na eventu, ale nepotřebujeme course referenci
                    })),
                    semester: course.semester,
                    year: course.year,
                })),
                primaryScheduleEvents: this.primarySchedule.getAllEnrolledEvents().map(event => ({ id: event.id })), // Ukládáme jen ID referencí
                generatedSchedules: this.generatedSchedules.map(schedule => ({
                    enrolledEventIds: schedule.getAllEnrolledEvents().map(event => event.id) // Ukládáme jen ID referencí
                })),
                activeScheduleIndex: this.activeScheduleIndex,
                preferences: this.preferences, // Preference jsou již plain objekty
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspaceData));
        } catch (error) {
            console.error("Failed to save workspace:", error);
        }
    }

    /**
     * Načte pracovní plochu z localStorage. Pokud se nepodaří, načte dummy data.
     * @returns {boolean} True, pokud byla pracovní plocha úspěšně inicializována (buď z localStorage nebo dummy daty).
     */
    loadWorkspace() {
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.semester = parsedData.semester || '';
                this.year = parsedData.year || '';
                this.preferences = parsedData.preferences || {};
                this.activeScheduleIndex = parsedData.activeScheduleIndex !== undefined ? parsedData.activeScheduleIndex : -1;

                // Nejdříve vytvoříme všechny kurzy a jejich události
                this.courses = (parsedData.courses || []).map(courseData => {
                    // Konstruktor CourseClass by měl správně vytvořit instance CourseEventClass z pole courseData.events
                    return new CourseClass(courseData);
                });

                // Poté sestavíme rozvrhy s referencemi na již existující události
                this.primarySchedule = new ScheduleClass();
                if (parsedData.primaryScheduleEvents) {
                    const eventRefs = parsedData.primaryScheduleEvents.map(eventRef => this.findEventByIdGlobal(eventRef.id)).filter(Boolean);
                    this.primarySchedule.addEvents(eventRefs);
                }

                this.generatedSchedules = (parsedData.generatedSchedules || []).map(scheduleData => {
                    const schedule = new ScheduleClass();
                    if (scheduleData.enrolledEventIds) {
                        const eventRefs = scheduleData.enrolledEventIds.map(eventId => this.findEventByIdGlobal(eventId)).filter(Boolean);
                        schedule.addEvents(eventRefs);
                    }
                    return schedule;
                });
                console.log("Workspace loaded from localStorage.");
                return true; // Úspěšně načteno z localStorage
            } else {
                return this._loadHardcodedDummyData(); // Načti dummy data, pokud v localStorage nic není
            }
        } catch (error) {
            console.error("Failed to load workspace from localStorage:", error);
            this.clearWorkspace(false); // Vyčisti potenciálně poškozený stav
            return this._loadHardcodedDummyData(); // Pokus se načíst dummy data jako fallback
        }
    }

    _loadHardcodedDummyData() {
        console.log("Loading hardcoded dummy data as no saved workspace was found.");
        this.semester = 'ZS'; // Výchozí semestr
        const currentYearNum = new Date().getFullYear();
        this.year = `${currentYearNum}/${currentYearNum + 1}`; // např. 2023/2024

        const course1Data = {
            id: 'dummyCourseKIVPPA1', // Unikátní ID pro CourseClass
            stagId: 'KIV/PPA1_DUMMY_STAG',
            name: 'Počítače a programování 1 (Dummy)',
            departmentCode: 'KIV',
            courseCode: 'PPA1D',
            credits: 6,
            neededEnrollments: { lecture: 1, practical: 1, seminar: 0 },
            semester: this.semester,
            year: this.year,
            // events: [] // Necháme generateDummyCourseEvents, aby je vytvořil
        };
        const course1Instance = this.addCourse(course1Data); // addCourse nyní vrací instanci
        if (course1Instance && typeof course1Instance.generateDummyCourseEvents === 'function') {
            course1Instance.generateDummyCourseEvents(2); // Vygeneruje 2 události každého typu (P, CV, S)
        }

        const course2Data = {
            id: 'dummyCourseKIVUUR', // Unikátní ID
            stagId: 'KIV/UUR_DUMMY_STAG',
            name: 'Uživatelská rozhraní (Dummy)',
            departmentCode: 'KIV',
            courseCode: 'UURD',
            credits: 5,
            neededEnrollments: { lecture: 1, practical: 0, seminar: 1 },
            semester: this.semester,
            year: this.year,
            events: [ // Explicitně definované události
                {
                    // id bude dogenerováno v CourseEventClass, pokud není specifikováno
                    stagId: 'UUR_lec_dummy_1_stag',
                    startTime: '10:00', endTime: '11:30', day: 0, // Pondělí
                    recurrence: 'KAŽDÝ TÝDEN', type: 'PŘEDNÁŠKA', room: 'EP120',
                    instructor: 'Dr. Testovací', currentCapacity: 5, maxCapacity: 50,
                    note: 'Úvodní přednáška UURD'
                },
                {
                    stagId: 'UUR_sem_dummy_1_stag',
                    startTime: '14:00', endTime: '15:30', day: 2, // Středa
                    recurrence: 'KAŽDÝ TÝDEN', type: 'SEMINÁŘ', room: 'UC305',
                    instructor: 'Ing. Dummy Data', currentCapacity: 2, maxCapacity: 20,
                }
            ]
        };
        this.addCourse(course2Data);

        // Příklad přidání jedné události do primárního rozvrhu pro testování
        if (this.courses.length > 0 && this.courses[0].events.length > 0) {
            this.primarySchedule.addEvent(this.courses[0].events[0]);
        }
        if (this.courses.length > 0 && this.courses[0].events.length > 1) { // Přidáme i druhou, pokud existuje
            this.primarySchedule.addEvent(this.courses[0].events[1]);
        }


        console.log("Dummy data loaded and initialized primary schedule with some events.");
        this.saveWorkspace(); // Uložíme nově vygenerovaná dummy data do localStorage pro příští načtení
        return true; // Indikuje, že workspace byl inicializován
    }


    clearWorkspace(removeFromStorage = true) {
        this.semester = '';
        this.year = '';
        this.courses = [];
        this.primarySchedule.clear();
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;
        this.preferences = {};
        if (removeFromStorage) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            console.log("Workspace cleared from localStorage.");
        }
        console.log("Workspace data cleared from memory.");
    }

    // --- Schedule Generation Logic ---
    _eventsConflict(event1, event2) {
        if (event1.day !== event2.day) {
            return false;
        }
        const start1 = parseInt(event1.startTime.replace(':', ''), 10);
        const end1 = parseInt(event1.endTime.replace(':', ''), 10);
        const start2 = parseInt(event2.startTime.replace(':', ''), 10);
        const end2 = parseInt(event2.endTime.replace(':', ''), 10);

        if (start1 < end2 && start2 < end1) {
            if (event1.recurrence === 'KAŽDÝ TÝDEN' || event2.recurrence === 'KAŽDÝ TÝDEN') {
                return true;
            }
            if (event1.recurrence === event2.recurrence) {
                return true;
            }
            return false;
        }
        return false;
    }

    generateSchedule(coursesToSchedule = this.courses) { // [cite: 162, 176]
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1; // Po generování se primární rozvrh neaktivuje automaticky, ale první vygenerovaný
        const solutions = [];

        // Získání aktivních preferencí seřazených dle priority
        // Předpokládáme, že `this.preferences` je objekt, kde klíče jsou ID preferencí
        // a hodnoty obsahují { priority: number, type: string, params: object, isActive: boolean }
        const activePreferences = Object.values(this.preferences)
            .filter(p => p.isActive)
            .sort((a, b) => a.priority - b.priority); // [cite: 186] (implicitně, logika `PropertiesBar` by měla zajistit `isActive`)

        const findSchedulesRecursive = (courseIdx, currentScheduleInProgress) => {
            if (solutions.length >= MAX_GENERATED_SCHEDULES) {
                return;
            }

            if (courseIdx === coursesToSchedule.length) {
                let allCoursesConditionsMet = true;
                for (const course of coursesToSchedule) {
                    const enrolledForThisCourse = currentScheduleInProgress.getAllEnrolledEvents().filter(ev => ev.courseId === course.id);
                    if (!course.areAllEnrollmentRequirementsMet(new Set(enrolledForThisCourse.map(e => e.id)))) { // Použití Set pro areAllEnrollmentRequirementsMet
                        allCoursesConditionsMet = false;
                        break;
                    }
                }
                if (allCoursesConditionsMet) {
                    const finalSchedule = new ScheduleClass();
                    finalSchedule.addEvents(currentScheduleInProgress.getAllEnrolledEvents());
                    solutions.push(finalSchedule);
                }
                return;
            }

            const course = coursesToSchedule[courseIdx];
            const needed = course.neededEnrollments;
            const availableEventsByType = {};

            Object.keys(needed).forEach(typeKeyStandard => { // např. 'lecture', 'practical'
                // Najdeme události, které odpovídají tomuto standardizovanému typu
                availableEventsByType[typeKeyStandard] = course.events.filter(event => {
                    const eventTypeStandard = Object.keys(EVENT_TYPE_TO_KEY_MAP).find(
                        key => EVENT_TYPE_TO_KEY_MAP[key] === typeKeyStandard && event.type.toLowerCase() === key.toLowerCase()
                    );
                    if (!eventTypeStandard) return false; // Typ události neodpovídá

                    // Aplikace preferencí zde
                    let passesPreferences = true;
                    for (const pref of activePreferences) {
                        if (pref.type === 'FREE_DAY' && event.day === pref.params.day) { // [cite: 188]
                            passesPreferences = false; break;
                        }
                        if (pref.type === 'AVOID_TIMES' && event.day === pref.params.day) { // [cite: 190]
                            const eventStartMins = parseInt(event.startTime.replace(':', ''), 10);
                            const eventEndMins = parseInt(event.endTime.replace(':', ''), 10);
                            const prefStartMins = parseInt(pref.params.startTime.replace(':', ''), 10);
                            const prefEndMins = parseInt(pref.params.endTime.replace(':', ''), 10);
                            if (Math.max(eventStartMins, prefStartMins) < Math.min(eventEndMins, prefEndMins)) {
                                passesPreferences = false; break;
                            }
                        }
                        // Další typy preferencí (např. preferovaný vyučující [cite: 192])
                        if (pref.type === 'PREFER_INSTRUCTOR' && course.getShortCode() === pref.params.courseCode) {
                            // This preference is complex: it's a "preference", not a hard filter unless no other options.
                            // For a simple hard filter variant for now:
                            // if (event.instructor !== pref.params.instructorName) { passesPreferences = false; break; }
                        }
                    }
                    return passesPreferences;
                });
            });

            // ... (zbytek komplexní logiky generování kombinací a rekurze)
            // Tato část zůstává jako placeholder, jelikož její plná implementace je velmi složitá
            // a vyžaduje pokročilé algoritmy pro kombinatoriku a splňování omezení (CSP).

            const generateCombinationsRecursive = (typeKeyIndex, tempSelectedEventsForCourse) => {
                const typeKeys = Object.keys(needed).filter(key => needed[key] > 0); // Jen typy, které potřebujeme

                if (typeKeyIndex === typeKeys.length) { // Všechny potřebné typy pro tento kurz jsou pokryty
                    let conflict = false;
                    for (const newEvent of tempSelectedEventsForCourse) {
                        for (const existingEvent of currentScheduleInProgress.getAllEnrolledEvents()) {
                            if (this._eventsConflict(newEvent, existingEvent)) {
                                conflict = true;
                                break;
                            }
                        }
                        if (conflict) break;
                    }

                    if (!conflict) {
                        tempSelectedEventsForCourse.forEach(event => currentScheduleInProgress.addEvent(event));
                        findSchedulesRecursive(courseIdx + 1, currentScheduleInProgress);
                        tempSelectedEventsForCourse.forEach(event => currentScheduleInProgress.removeEventById(event.id)); // Backtrack
                    }
                    return;
                }

                const currentTypeKey = typeKeys[typeKeyIndex];
                const numNeededForType = needed[currentTypeKey];
                const candidateEvents = availableEventsByType[currentTypeKey] || [];

                if (candidateEvents.length < numNeededForType) {
                    return; // Nelze splnit požadavky pro tento typ
                }

                // Zde by měla být skutečná logika pro výběr `numNeededForType` událostí z `candidateEvents`
                // Toto je velmi zjednodušený příklad - bere první možné události.
                // Pro reálnou aplikaci byste potřebovali generátor kombinací.
                function findCombinations(startIndex, currentCombination) {
                    if (solutions.length >= MAX_GENERATED_SCHEDULES) return;

                    if (currentCombination.length === numNeededForType) {
                        // Máme platnou kombinaci pro aktuální typ, pokračujeme na další typ
                        generateCombinationsRecursive(typeKeyIndex + 1, [...tempSelectedEventsForCourse, ...currentCombination]);
                        return;
                    }
                    if (startIndex >= candidateEvents.length) {
                        return; // Nemáme dostatek událostí k vytvoření kombinace
                    }

                    // Varianta 1: Zahrneme candidateEvents[startIndex]
                    // Ověření, zda nová událost nekoliduje s již vybranými v `currentCombination` pro tento typ
                    let internalConflict = false;
                    for(const evInComb of currentCombination) {
                        if(this._eventsConflict(evInComb, candidateEvents[startIndex])) {
                            internalConflict = true;
                            break;
                        }
                    }
                    if(!internalConflict) {
                        currentCombination.push(candidateEvents[startIndex]);
                        findCombinations(startIndex + 1, currentCombination);
                        currentCombination.pop(); // Backtrack
                    }


                    // Varianta 2: Nezačleníme candidateEvents[startIndex] (pokud ještě máme dostatek zbývajících kandidátů)
                    if (candidateEvents.length - (startIndex + 1) >= numNeededForType - currentCombination.length) {
                        findCombinations(startIndex + 1, currentCombination);
                    }
                }

                findCombinations(0, []);
            };

            generateCombinationsRecursive(0, []); // Začneme s prvním typem požadavku
        };


        const initialSchedule = new ScheduleClass();
        findSchedulesRecursive(0, initialSchedule);

        this.generatedSchedules = solutions;
        if (solutions.length > 0) {
            this.activeScheduleIndex = 0; // Aktivujeme první vygenerovaný
            console.log(`Generated ${solutions.length} schedule variants.`);
            return true;
        }
        console.log("No valid schedule variants found meeting all criteria.");
        return false;
    }
}

export default WorkspaceService;