// src/services/CourseClass.js
import CourseEventClass from './CourseEventClass';

// Mapping from typical event type strings (e.g., from STAG or user input) to standardized keys
// This should align with how event types are stored/named in your CourseEventClass instances
// and how neededEnrollments keys are defined.
const EVENT_TYPE_TO_KEY_MAP = {
    'přednáška': 'lecture',
    'lecture': 'lecture', // Allow for already keyed data
    'př': 'lecture',
    'cv': 'practical',
    'cvičení': 'practical',
    'practical': 'practical', // Allow for already keyed data
    'seminář': 'seminar',
    'seminar': 'seminar', // Allow for already keyed data
    // Add other mappings as needed, e.g., for "ZKOUŠKA", "ZÁPOČET" if they were to be tracked
};

const ENROLLMENT_KEYS_ORDER = ['lecture', 'practical', 'seminar']; // For consistent display

/**
 * Reprezentuje předmět (Course).
 * Každý předmět má vlastní ID v STAG systému (stagId).
 */
class CourseClass {
    constructor({
                    stagId = null,
                    name,
                    departmentCode,
                    courseCode,
                    credits,
                    neededEnrollments = {}, // e.g., { lecture: 1, practical: 2 }
                    events = [],
                    semester = '',
                    year = '',
                }) {
        this.id = departmentCode + '/'+ courseCode;
        this.stagId = stagId;
        this.name = name;
        this.departmentCode = departmentCode;
        this.courseCode = courseCode;
        this.credits = credits;
        // Ensure neededEnrollments has all standard keys, defaulting to 0
        this.neededEnrollments = {
            lecture: parseInt(neededEnrollments.lecture || 0, 10),
            practical: parseInt(neededEnrollments.practical || 0, 10),
            seminar: parseInt(neededEnrollments.seminar || 0, 10),
        };
        this.events = events.map(eventData => eventData instanceof CourseEventClass ? eventData : new CourseEventClass({...eventData, courseId: this.id, courseCode: this.getShortCode(), departmentCode: this.departmentCode }));
        this.semester = semester;
        this.year = year;
    }

    getShortCode() {
        return `${this.departmentCode}/${this.courseCode}`; // Např. KMA/MA2 [cite: 14]
    }

    addCourseEvent(eventData) {
        const newEvent = eventData instanceof CourseEventClass
            ? eventData
            : new CourseEventClass({
                ...eventData,
                courseId: this.id,
                courseCode: this.getShortCode(),
                departmentCode: this.departmentCode,
                year: this.year,
                semester: this.semester
            });

        if (!this.events.find(e => e.id === newEvent.id)) {
            this.events.push(newEvent);
        }
    }

    addCourseEvents(eventsData) {
        eventsData.forEach(eventData => this.addCourseEvent(eventData));
    }

    getCourseEvents(filters = {}) {
        let filteredEvents = this.events;
        // ... (filtering logic as in original file) ...
        if (filters.instructor) {
            filteredEvents = filteredEvents.filter(event => event.instructor === filters.instructor || (typeof event.instructor === 'object' && event.instructor.name === filters.instructor));
        }
        if (filters.semester) {
            filteredEvents = filteredEvents.filter(event => event.semester === filters.semester);
        }
        if (filters.academicYear) {
            filteredEvents = filteredEvents.filter(event => event.year === filters.academicYear);
        }
        if (filters.hasCapacity === true) {
            filteredEvents = filteredEvents.filter(event => event.currentCapacity < event.maxCapacity);
        }
        if (filters.hasCapacity === false) {
            filteredEvents = filteredEvents.filter(event => event.currentCapacity >= event.maxCapacity);
        }
        if (filters.room) {
            filteredEvents = filteredEvents.filter(event => event.room === filters.room);
        }
        if (filters.type) { // Assuming filters.type is the standardized key ('lecture', 'practical') or the display name
            const filterTypeKey = EVENT_TYPE_TO_KEY_MAP[filters.type.toLowerCase()] || filters.type.toLowerCase();
            filteredEvents = filteredEvents.filter(event => {
                const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[event.type.toLowerCase()];
                return eventTypeKey === filterTypeKey;
            });
        }
        return filteredEvents;
    }

    /**
     * Gets the counts of currently enrolled (scheduled) events for this course, by type.
     * @param {Set<string>} allEnrolledEventIdsInSchedule - A Set of IDs of all events currently in the user's schedule.
     * @returns {{lecture: number, practical: number, seminar: number, total: number}}
     */
    getEnrolledCounts(allEnrolledEventIdsInSchedule) {
        const counts = { lecture: 0, practical: 0, seminar: 0, total: 0 };
        if (!allEnrolledEventIdsInSchedule) return counts;

        this.events.forEach(event => {
            if (allEnrolledEventIdsInSchedule.has(event.id)) {
                const key = EVENT_TYPE_TO_KEY_MAP[event.type?.toLowerCase()];
                if (key && counts.hasOwnProperty(key)) {
                    counts[key]++;
                }
                counts.total++;
            }
        });
        return counts;
    }

    /**
     * Gets the number of remaining enrollments needed for each event type to meet requirements for display.
     * @param {Set<string>} allEnrolledEventIdsInSchedule - A Set of IDs of all events currently in the user's schedule.
     * @returns {{lecture: number, practical: number, seminar: number, totalNeeded: number}}
     */
    getDisplayableNeededEnrollments(allEnrolledEventIdsInSchedule) {
        const enrolledCounts = this.getEnrolledCounts(allEnrolledEventIdsInSchedule);
        const needed = { lecture: 0, practical: 0, seminar: 0, totalNeeded: 0 };
        let currentTotalNeeded = 0;

        ENROLLMENT_KEYS_ORDER.forEach(key => {
            const required = this.neededEnrollments[key] || 0;
            const currentlyEnrolled = enrolledCounts[key] || 0;
            needed[key] = Math.max(0, required - currentlyEnrolled);
            currentTotalNeeded += needed[key];
        });
        needed.totalNeeded = currentTotalNeeded;
        return needed;
    }

    /**
     * Checks if the requirement for a specific event type (e.g., 'lecture') is met for this course.
     * @param {('lecture'|'practical'|'seminar')} enrollmentKey - The key for the event type.
     * @param {Set<string>} allEnrolledEventIdsInSchedule - A Set of IDs of all events currently in the user's schedule.
     * @returns {boolean} True if the requirement for this type is met.
     */
    isEnrollmentTypeRequirementMet(enrollmentKey, allEnrolledEventIdsInSchedule) {
        const enrolledCounts = this.getEnrolledCounts(allEnrolledEventIdsInSchedule);
        return enrolledCounts[enrollmentKey] >= (this.neededEnrollments[enrollmentKey] || 0);
    }


    /**
     * Checks if all enrollment requirements for this course are met.
     * @param {Set<string>} allEnrolledEventIdsInSchedule - A Set of IDs of all events currently in the user's schedule.
     * @returns {boolean} True if all requirements are met.
     */
    areAllEnrollmentRequirementsMet(allEnrolledEventIdsInSchedule) { // Renamed from areConditionsMet for clarity
        const needed = this.getDisplayableNeededEnrollments(allEnrolledEventIdsInSchedule);
        return ENROLLMENT_KEYS_ORDER.every(key => needed[key] === 0);
    }

    generateDummyCourseEvents(count = 2) {
        // ... (implementation from original file, adapted if necessary) ...
        const types = ['PŘEDNÁŠKA', 'CVIČENÍ', 'SEMINÁŘ'];
        const days = [0, 1, 2, 3, 4]; // Po-Pá
        const startTimes = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
        const instructors = ['Dr. Novák', 'Ing. Svoboda', 'Doc. Procházka'];
        const rooms = ['UC101', 'UC102', 'UP105', 'UI30'];

        this.events = [];

        types.forEach(type => {
            for (let i = 0; i < count; i++) {
                const day = days[Math.floor(Math.random() * days.length)];
                const startTimeIndex = Math.floor(Math.random() * startTimes.length);
                const startTime = startTimes[startTimeIndex];
                const hour = parseInt(startTime.split(':')[0]);
                const endTime = `${String(hour + 1 + Math.floor(Math.random() * 2)).padStart(2, '0')}:00`;

                this.addCourseEvent(new CourseEventClass({
                    stagId: `dummyStagEv${this.courseCode}${type.substring(0,1)}${i}`,
                    startTime,
                    endTime,
                    day,
                    recurrence: 'KAŽDÝ TÝDEN', // [cite: 19]
                    courseId: this.id,
                    courseCode: this.getShortCode(),
                    departmentCode: this.departmentCode,
                    room: rooms[Math.floor(Math.random() * rooms.length)],
                    type: type, // [cite: 19]
                    instructor: instructors[Math.floor(Math.random() * instructors.length)], // [cite: 19]
                    currentCapacity: Math.floor(Math.random() * 20), // [cite: 19]
                    maxCapacity: 20 + Math.floor(Math.random() * 30), // [cite: 19]
                    year: this.year || '2023/2024', // [cite: 19]
                    semester: this.semester || 'ZS', // [cite: 19]
                    note: `Dummy ${type} ${i+1}` // [cite: 19]
                }));
            }
        });
    }
}

export default CourseClass;
export { ENROLLMENT_KEYS_ORDER, EVENT_TYPE_TO_KEY_MAP };