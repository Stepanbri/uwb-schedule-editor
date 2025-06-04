// src/services/WorkspaceService.js
import CourseClass from './CourseClass';
import ScheduleClass from './ScheduleClass';
import CourseEventClass from './CourseEventClass';
import { EVENT_TYPE_TO_KEY_MAP } from './CourseClass';
import html2canvas from 'html2canvas'; // Import pro ukládání obrázku

const MAX_GENERATED_SCHEDULES = 10;
export const LOCAL_STORAGE_KEY = 'schedulePlannerWorkspace_v2';

const generatePreferenceId = () => `pref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

class WorkspaceService {
    constructor() {
        this.semester = '';
        this.year = '';
        this.courses = [];
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
        // Identifikátor předmětu pro vyhledávání ve workspace je jen KATEDRA/KOD
        const courseIdentifier = `${courseData.departmentCode}/${courseData.courseCode}`;
        const existingCourse = this.courses.find(c => c.id === courseIdentifier);

        if (existingCourse) {
            console.warn(`Předmět ${courseIdentifier} již existuje ve workspace. Přepisuji daty pro rok ${courseData.year}, semestr ${courseData.semester}.`);

            // Před aktualizací událostí, odstraň všechny staré události tohoto předmětu z rozvrhů.
            const oldEventIds = existingCourse.events.map(e => e.id);
            oldEventIds.forEach(eventId => {
                this.primarySchedule.removeEventById(eventId);
                this.generatedSchedules.forEach(schedule => schedule.removeEventById(eventId));
            });

            // Aktualizujeme atributy existující instance předmětu
            existingCourse.stagId = courseData.stagId || existingCourse.stagId;
            existingCourse.name = courseData.name || existingCourse.name;
            existingCourse.credits = courseData.credits !== undefined ? courseData.credits : existingCourse.credits;
            existingCourse.neededEnrollments = courseData.neededEnrollments || existingCourse.neededEnrollments;
            existingCourse.year = courseData.year; // Aktualizujeme rok
            existingCourse.semester = courseData.semester; // Aktualizujeme semestr

            existingCourse.events = []; // Vyčistíme staré události z instance předmětu
            if (courseData.events && Array.isArray(courseData.events)) {
                courseData.events.forEach(eventData => {
                    // ID události by mělo být co nejvíce perzistentní (ideálně ze STAGu)
                    const eventInstanceId = eventData.id || eventData.stagId || `${eventData.departmentCode}-${eventData.courseCode}-${eventData.type}-${eventData.day}-${eventData.startTime}-${Math.random().toString(16).slice(2, 7)}`;
                    existingCourse.addCourseEvent(new CourseEventClass({ // addCourseEvent použije this.year a this.semester z existingCourse
                        ...eventData, // Rozbalíme eventData, ale explicitně přepíšeme/doplníme klíčové atributy
                        id: eventInstanceId,
                        courseId: existingCourse.id, // KATEDRA/KOD
                        departmentCode: existingCourse.departmentCode,
                        courseCode: existingCourse.courseCode,
                        year: existingCourse.year, // Rok a semestr z aktualizovaného předmětu
                        semester: existingCourse.semester
                    }));
                });
            }
            return existingCourse;
        }

        // Pokud předmět neexistuje, vytvoříme novou instanci
        // CourseClass konstruktor se postará o vytvoření ID (KATEDRA/KOD)
        // a přiřadí rok a semestr z courseData
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

    removeAllCourses() {
        this.courses = [];
        this.primarySchedule.clear();
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;
        console.log("WorkspaceService: All courses and schedule data cleared.");
        // Preferences are kept
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

    removeAllPreferences() {
        this.preferences = {};
        this._normalizePriorities(); // Effectively does nothing on empty, but good for consistency
        console.log("WorkspaceService: All preferences cleared.");
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
            const currentPriority = prefsArray[index].priority;
            prefsArray[index].priority = prefsArray[index - 1].priority;
            prefsArray[index - 1].priority = currentPriority;
        } else if (direction === 'down' && index < prefsArray.length - 1) {
            const currentPriority = prefsArray[index].priority;
            prefsArray[index].priority = prefsArray[index + 1].priority;
            prefsArray[index + 1].priority = currentPriority;
        }

        const newPreferencesObject = {};
        prefsArray.forEach(p => { newPreferencesObject[p.id] = p; });
        this.preferences = newPreferencesObject;
        this._normalizePriorities();
    }

    togglePreferenceActive(preferenceId) {
        if (this.preferences[preferenceId]) {
            this.preferences[preferenceId].isActive = !this.preferences[preferenceId].isActive;
            console.log("Preference active toggled:", this.preferences[preferenceId]);
        } else {
            console.warn("Attempted to toggle active on non-existent preference:", preferenceId);
        }
    }

    _getWorkspaceData() {
        return {
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
                    ...event, // Spread all properties of event
                    // Ensure complex objects like instructor are simplified if they are class instances
                    instructor: typeof event.instructor === 'object' && event.instructor && event.instructor.name ? event.instructor.name : event.instructor,
                })),
                semester: course.semester,
                year: course.year,
            })),
            primaryScheduleEvents: this.primarySchedule.getAllEnrolledEvents().map(event => ({ id: event.id })),
            generatedSchedules: this.generatedSchedules.map(schedule => ({
                enrolledEventIds: schedule.getAllEnrolledEvents().map(event => event.id)
            })),
            activeScheduleIndex: this.activeScheduleIndex,
            preferences: this.preferences,
        };
    }

    saveWorkspace() {
        try {
            const workspaceData = this._getWorkspaceData();
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspaceData));
        } catch (error) {
            console.error("Failed to save workspace:", error);
        }
    }

    exportWorkspaceAsJson(filename = 'muj_rozvrh_workspace.json') {
        try {
            const workspaceData = this._getWorkspaceData();
            const jsonString = JSON.stringify(workspaceData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            return true;
        } catch (error) {
            console.error("Chyba při exportu pracovní plochy do JSON:", error);
            return false;
        }
    }

    importWorkspaceFromJson(jsonDataString) {
        try {
            const parsedData = JSON.parse(jsonDataString);
            this.clearWorkspace(false); // Clear current without removing from storage yet

            this.semester = parsedData.semester || '';
            this.year = parsedData.year || '';
            this.preferences = parsedData.preferences || {};
            this.activeScheduleIndex = parsedData.activeScheduleIndex !== undefined ? parsedData.activeScheduleIndex : -1;

            this.courses = (parsedData.courses || []).map(courseData => {
                // Ensure events are instantiated as CourseEventClass
                const courseEvents = (courseData.events || []).map(eventData => {
                    // Add missing properties if not in JSON, or they will be undefined in CourseEventClass
                    return new CourseEventClass({
                        courseId: courseData.id, // Link event back to its course
                        courseCode: `${courseData.departmentCode}/${courseData.courseCode}`,
                        departmentCode: courseData.departmentCode,
                        year: courseData.year,
                        semester: courseData.semester,
                        ...eventData
                    });
                });
                return new CourseClass({ ...courseData, events: courseEvents });
            });

            this.primarySchedule = new ScheduleClass();
            if (parsedData.primaryScheduleEvents) {
                const eventRefs = parsedData.primaryScheduleEvents
                    .map(eventRef => this.findEventByIdGlobal(eventRef.id))
                    .filter(Boolean);
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
            this._normalizePriorities();

            console.log("WorkspaceService: Workspace imported from JSON.");
            // After successful import, save to localStorage to persist it
            this.saveWorkspace();
            return true;
        } catch (error) {
            console.error("Chyba při importu pracovní plochy z JSON:", error);
            return false;
        }
    }

    async saveScheduleImage(scheduleElement, filename = 'rozvrh.png') {
        if (!scheduleElement) {
            console.error("Element rozvrhu nebyl poskytnut pro uložení obrázku.");
            return false;
        }
        try {
            const canvas = await html2canvas(scheduleElement, {
                useCORS: true,
                scale: 2,
                logging: false, // Reduce console noise from html2canvas
                // Ensure background is captured if it's not a direct style of the element
                backgroundColor: window.getComputedStyle(document.body).backgroundColor,
            });
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = filename;
            link.href = image;
            link.click();
            return true;
        } catch (error) {
            console.error("Chyba při ukládání rozvrhu jako obrázku:", error);
            return false;
        }
    }


    loadWorkspace() {
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.semester = parsedData.semester || '';
                this.year = parsedData.year || '';
                this.preferences = parsedData.preferences || {};
                this.activeScheduleIndex = parsedData.activeScheduleIndex !== undefined ? parsedData.activeScheduleIndex : -1;

                this.courses = (parsedData.courses || []).map(courseData => {
                    const courseEvents = (courseData.events || []).map(eventData => new CourseEventClass({
                        courseId: courseData.id,
                        courseCode: `${courseData.departmentCode}/${courseData.courseCode}`,
                        departmentCode: courseData.departmentCode,
                        year: courseData.year,
                        semester: courseData.semester,
                        ...eventData
                    }));
                    return new CourseClass({ ...courseData, events: courseEvents });
                });

                this.primarySchedule = new ScheduleClass();
                if (parsedData.primaryScheduleEvents) {
                    const eventRefs = parsedData.primaryScheduleEvents
                        .map(eventRef => this.findEventByIdGlobal(eventRef.id))
                        .filter(Boolean);
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
                this._normalizePriorities();
                console.log("WorkspaceService: Workspace loaded from localStorage.");
                return true;
            } else {
                this._normalizePriorities();
                return this._loadHardcodedDummyData();
            }
        } catch (error) {
            console.error("Failed to load workspace from localStorage:", error);
            this.clearWorkspace(false);
            this._normalizePriorities();
            return this._loadHardcodedDummyData();
        }
    }

    _loadHardcodedDummyData() {
        console.log("WorkspaceService: Loading hardcoded dummy data.");
        const currentYearNum = new Date().getFullYear();
        const defaultYear = `${currentYearNum}/${currentYearNum + 1}`;
        const defaultSemester = 'ZS';

        this.year = defaultYear;     // Nastavíme globální rok a semestr pro workspace
        this.semester = defaultSemester;


        const course1Data = {
            stagId: 'KIV/PPA1_DUMMY_STAG',
            name: 'Počítače a programování 1 (Dummy)',
            departmentCode: 'KIV',
            courseCode: 'PPA1D', // Dummy kód
            credits: 6,
            neededEnrollments: { lecture: 1, practical: 1, seminar: 0 },
            semester: defaultSemester, // Specifický semestr pro tento dummy předmět
            year: defaultYear,         // Specifický rok pro tento dummy předmět
        };
        const course1Instance = this.addCourse(course1Data); // addCourse vytvoří správné ID a přiřadí rok/semestr
        if (course1Instance && typeof course1Instance.generateDummyCourseEvents === 'function') {
            // generateDummyCourseEvents by měl používat rok/semestr z course1Instance
            course1Instance.generateDummyCourseEvents(2);
        }

        const course2Data = {
            stagId: 'KIV/UUR_DUMMY_STAG',
            name: 'Uživatelská rozhraní (Dummy)',
            departmentCode: 'KIV',
            courseCode: 'UURD', // Dummy kód
            credits: 5,
            neededEnrollments: { lecture: 1, practical: 0, seminar: 1 },
            semester: defaultSemester,
            year: defaultYear,
            events: [
                {
                    id: 'dummy_uur_event_1', stagId: 'UUR_lec_dummy_1_stag', startTime: '10:00', endTime: '11:30', day: 0,
                    recurrence: 'KAŽDÝ TÝDEN', type: 'PŘEDNÁŠKA', room: 'EP120',
                    instructor: 'Dr. Testovací', currentCapacity: 5, maxCapacity: 50,
                    note: 'Úvodní přednáška UURD'
                    // year a semester se doplní v konstruktoru CourseEventClass z CourseClass instance
                },
                {
                    id: 'dummy_uur_event_2', stagId: 'UUR_sem_dummy_1_stag', startTime: '14:00', endTime: '15:30', day: 2,
                    recurrence: 'KAŽDÝ TÝDEN', type: 'SEMINÁŘ', room: 'UC305',
                    instructor: 'Ing. Dummy Data', currentCapacity: 2, maxCapacity: 20,
                }
            ]
        };
        this.addCourse(course2Data);

        this.addPreference({ type: 'FREE_DAY', params: { day: 'ST' } });
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
        this.preferences = {};
        if (removeFromStorage) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            console.log("WorkspaceService: Workspace cleared from localStorage.");
        }
        console.log("WorkspaceService: Workspace data cleared from memory.");
    }

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
            return event1.recurrence === event2.recurrence;

        }
        return false;
    }

    generateSchedule(coursesToSchedule = this.courses) {
        this.generatedSchedules = [];
        this.activeScheduleIndex = -1;
        const solutions = [];

        const activePreferencesList = Object.values(this.preferences)
            .filter(p => p.isActive)
            .sort((a, b) => a.priority - b.priority);

        const findSchedulesRecursive = (courseIdx, currentScheduleInProgress) => {
            if (solutions.length >= MAX_GENERATED_SCHEDULES) return;

            if (courseIdx === coursesToSchedule.length) {
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

            const generateEventCombinationsForCourse = (typeKeyIndex, tempEventsForCourse) => {
                if (typeKeyIndex === eventTypeKeys.length) {
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
                        tempEventsForCourse.forEach(event => currentScheduleInProgress.removeEventById(event.id));
                    }
                    return;
                }

                const currentTypeKey = eventTypeKeys[typeKeyIndex];
                const numNeeded = needed[currentTypeKey];

                const availableEventsOfType = course.events.filter(event => {
                    const eventTypeMapped = Object.keys(EVENT_TYPE_TO_KEY_MAP).find(key => EVENT_TYPE_TO_KEY_MAP[key] === currentTypeKey && event.type.toLowerCase().includes(key));
                    if(!eventTypeMapped) return false; // Ensure event type matches the needed type

                    for (const pref of activePreferencesList) {
                        if (pref.type === 'FREE_DAY' && event.day === CourseEventClass.dayStringToNumber(pref.params.day)) return false;
                        if (pref.type === 'AVOID_TIMES' && event.day === CourseEventClass.dayStringToNumber(pref.params.day)) {
                            const eventStartMins = parseInt(event.startTime.replace(':', ''), 10);
                            const eventEndMins = parseInt(event.endTime.replace(':', ''), 10);
                            const prefStartMins = parseInt(pref.params.startTime.replace(':', ''), 10);
                            const prefEndMins = parseInt(pref.params.endTime.replace(':', ''), 10);
                            if (Math.max(eventStartMins, prefStartMins) < Math.min(eventEndMins, prefEndMins)) return false;
                        }
                    }
                    return true;
                });

                if (availableEventsOfType.length < numNeeded) return;

                // This needs a proper combination generator (e.g., n choose k)
                // For simplicity, taking the first 'numNeeded' events if unique, or all if less.
                // This is a placeholder for a real combinatorial algorithm.
                function getCombinations(array, k) {
                    // Basic combination generator (replace with a more robust one if needed)
                    if (k === 0) return [[]];
                    if (array.length === 0) return [];
                    const first = array[0];
                    const rest = array.slice(1);
                    const combsWithoutFirst = getCombinations(rest, k);
                    const combsWithFirst = getCombinations(rest, k - 1).map(comb => [first, ...comb]);
                    return [...combsWithFirst, ...combsWithoutFirst];
                }

                const combinations = getCombinations(availableEventsOfType, numNeeded);

                for (const selectedEventsForType of combinations) {
                    let internalConflict = false;
                    for (let i = 0; i < selectedEventsForType.length; i++) {
                        for (let j = i + 1; j < selectedEventsForType.length; j++) {
                            if (this._eventsConflict(selectedEventsForType[i], selectedEventsForType[j])) {
                                internalConflict = true; break;
                            }
                        }
                        if(internalConflict) break;
                    }
                    if(!internalConflict) {
                        generateEventCombinationsForCourse(typeKeyIndex + 1, [...tempEventsForCourse, ...selectedEventsForType]);
                    }
                }
            };

            if (eventTypeKeys.length === 0) {
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

// Helper in CourseEventClass for day string to number (if not already present)
// This is a static method, so it can be called on the class itself.
// Assuming dayOptions in preferences are 'PO', 'UT', etc. matching courseEvent.monday etc. keys
CourseEventClass.dayStringToNumber = (dayString) => {
    const dayMap = {
        'PO': 0, 'Pondělí': 0, 'Monday': 0,
        'UT': 1, 'Úterý': 1,   'Tuesday': 1,
        'ST': 2, 'Středa': 2,  'Wednesday': 2,
        'CT': 3, 'Čtvrtek': 3, 'Thursday': 3,
        'PA': 4, 'Pátek': 4,   'Friday': 4,
        'SO': 5, 'Sobota': 5,  'Saturday': 5,
        'NE': 6, 'Neděle': 6,  'Sunday': 6
    };
    return dayMap[dayString] !== undefined ? dayMap[dayString] : -1; // Return -1 for unknown
};


export default WorkspaceService;