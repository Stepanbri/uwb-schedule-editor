// src/services/CourseClass.js
import CourseEventClass from './CourseEventClass';

const EVENT_TYPE_TO_KEY_MAP = {
    'přednáška': 'lecture',
    'lecture': 'lecture',
    'př': 'lecture',
    'cv': 'practical',
    'cvičení': 'practical',
    'practical': 'practical',
    'seminář': 'seminar',
    'seminar': 'seminar',
};

const ENROLLMENT_KEYS_ORDER = ['lecture', 'practical', 'seminar'];

class CourseClass {
    constructor({
                    stagId = null,
                    name,
                    departmentCode,
                    courseCode,
                    credits,
                    neededEnrollments = {},
                    events = [],
                    semester = '', // např. ZS, LS
                    year = '',     // např. 2023/2024
                    source = 'prod',
                    color = null
                }) {
        // ID je nyní jen KATEDRA/KOD_PREDMETU
        this.id = `${departmentCode}/${courseCode}`;
        this.stagId = stagId; // Může se měnit při přepisu, pokud STAG má jiné ID pro jiný rok/semestr
        this.name = name;
        this.departmentCode = departmentCode;
        this.courseCode = courseCode;
        this.credits = credits;
        this.neededEnrollments = {
            lecture: parseInt(neededEnrollments.lecture || 0, 10),
            practical: parseInt(neededEnrollments.practical || 0, 10),
            seminar: parseInt(neededEnrollments.seminar || 0, 10),
        };
        // Atributy roku a semestru jsou důležité pro data předmětu
        this.year = year;
        this.semester = semester;
        this.source = source;
        this.color = color;
        // Události jsou vždy vázány na aktuální rok a semestr předmětu
        this.events = events.map(eventData => eventData instanceof CourseEventClass ? eventData : new CourseEventClass({...eventData, courseId: this.id, courseCode: this.getShortCode(), departmentCode: this.departmentCode, year: this.year, semester: this.semester }));
    }

    serialize() {
        return {
            id: this.id,
            stagId: this.stagId,
            name: this.name,
            departmentCode: this.departmentCode,
            courseCode: this.courseCode,
            credits: this.credits,
            neededEnrollments: this.neededEnrollments, // Je to již prostý objekt
            // Zajistíme, že každá událost je také serializována, pokud má metodu serialize
            // Jinak uložíme událost tak, jak je (měla by být prostý objekt, pokud není instance CourseEventClass)
            events: this.events.map(event => {
                if (event && typeof event.serialize === 'function') {
                    return event.serialize();
                }
                // Pokud event není instance s metodou serialize, ale je to objekt (např. po importu ze starého JSON),
                // je potřeba ho převést na instanci CourseEventClass, aby se správně serializoval
                // nebo zajistit, že CourseEventClass.constructor správně zachází s těmito daty.
                // Prozatím, pokud nemá serialize, vrátíme ho tak, jak je, ale toto může být zdroj problémů při deserializaci,
                // pokud se nespoléháme na to, že this.events jsou VŽDY instance CourseEventClass.
                // Bezpečnější by bylo zajistit, že this.events jsou vždy instance CourseEventClass, což konstruktor dělá.
                return event; // Předpokládáme, že konstruktor zajistil, že this.events jsou instance CourseEventClass
            }),
            semester: this.semester,
            year: this.year,
            source: this.source,
            color: this.color,
        };
    }

    _hasEventsOfType(typeKeyToCheck) {
        if (!this.events || this.events.length === 0) return false;
        return this.events.some(event => {
            const key = EVENT_TYPE_TO_KEY_MAP[event.type?.toLowerCase()];
            return key === typeKeyToCheck;
        });
    }

    isSpecialLectureSubstitutionCase() {
        return (this.neededEnrollments.lecture > 0 && !this._hasEventsOfType('lecture') && this._hasEventsOfType('practical'));
    }

    getShortCode() {
        return `${this.departmentCode}/${this.courseCode}`;
    }

    addCourseEvent(eventData) {
        const newEvent = eventData instanceof CourseEventClass
            ? eventData
            : new CourseEventClass({
                ...eventData,
                courseId: this.id,
                courseCode: this.getShortCode(),
                departmentCode: this.departmentCode,
                year: this.year, // Události by měly mít stejný rok/semestr jako předmět
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
        if (filters.instructor) {
            filteredEvents = filteredEvents.filter(event => event.instructor === filters.instructor || (typeof event.instructor === 'object' && event.instructor.name === filters.instructor));
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
        if (filters.type) {
            const filterTypeKey = EVENT_TYPE_TO_KEY_MAP[filters.type.toLowerCase()] || filters.type.toLowerCase();
            filteredEvents = filteredEvents.filter(event => {
                const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[event.type.toLowerCase()];
                return eventTypeKey === filterTypeKey;
            });
        }
        return filteredEvents;
    }

    getEnrolledCounts(allEnrolledEventIdsInSchedule) {
        const counts = { lecture: 0, practical: 0, seminar: 0, total: 0 };
        if (!allEnrolledEventIdsInSchedule || allEnrolledEventIdsInSchedule.size === 0) {
            return counts;
        }
        const useSubstitution = this.isSpecialLectureSubstitutionCase();
        this.events.forEach(event => {
            if (allEnrolledEventIdsInSchedule.has(event.id)) {
                let countAsKey = EVENT_TYPE_TO_KEY_MAP[event.type?.toLowerCase()];
                if (useSubstitution && countAsKey === 'practical') {
                    countAsKey = 'lecture';
                }
                if (countAsKey && Object.prototype.hasOwnProperty.call(counts, countAsKey)) {
                    counts[countAsKey]++;
                }
                counts.total++;
            }
        });
        return counts;
    }

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

    isEnrollmentTypeRequirementMet(enrollmentKey, allEnrolledEventIdsInSchedule) {
        const enrolledCounts = this.getEnrolledCounts(allEnrolledEventIdsInSchedule);
        return enrolledCounts[enrollmentKey] >= (this.neededEnrollments[enrollmentKey] || 0);
    }

    areAllEnrollmentRequirementsMet(allEnrolledEventIdsInSchedule) {
        const needed = this.getDisplayableNeededEnrollments(allEnrolledEventIdsInSchedule);
        return ENROLLMENT_KEYS_ORDER.every(key => needed[key] === 0);
    }

    generateDummyCourseEvents(count = 2) {
        // ... (implementace jako dříve, ale zajistit, že courseId a context roku/semestru jsou správně předány do CourseEventClass)
        const types = ['PŘEDNÁŠKA', 'CVIČENÍ', 'SEMINÁŘ'];
        const days = [0, 1, 2, 3, 4];
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
                    startTime, endTime, day,
                    recurrence: 'KAŽDÝ TÝDEN',
                    courseId: this.id, // ID předmětu (KATEDRA/KOD)
                    courseCode: this.getShortCode(),
                    departmentCode: this.departmentCode,
                    room: rooms[Math.floor(Math.random() * rooms.length)],
                    type: type,
                    instructor: instructors[Math.floor(Math.random() * instructors.length)],
                    currentCapacity: Math.floor(Math.random() * 20),
                    maxCapacity: 20 + Math.floor(Math.random() * 30),
                    year: this.year, // Rok a semestr z instance CourseClass
                    semester: this.semester,
                    note: `Dummy ${type} ${i+1}`
                }));
            }
        });
    }
}

export default CourseClass;
export { ENROLLMENT_KEYS_ORDER, EVENT_TYPE_TO_KEY_MAP };