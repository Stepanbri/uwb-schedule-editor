// src/services/CourseClass.js
import CourseEventClass from './CourseEventClass';
import { getColorForCourse } from '../utils/colorUtils';

export const EVENT_TYPE_TO_KEY_MAP = {
    'přednáška': 'lecture',
    'lecture': 'lecture',
    'př': 'lecture',
    'cvičení': 'practical',
    'practical': 'practical',
    'cv': 'practical',
    'seminář': 'seminar',
    'seminar': 'seminar',
    'se': 'seminar',
    // ... další možné mapování
};

export const ENROLLMENT_KEYS_ORDER = ['lecture', 'practical', 'seminar'];

class CourseClass {
    constructor({
                    stagId = null,
                    name,
                    departmentCode,
                    courseCode,
                    credits,
                    neededHours = {},
                    events = [],
                    semester = '', // např. ZS, LS
                    year = '',     // např. 2023/2024
                    source = 'prod',
                    color = null
                }) {
        this.stagId = stagId;
        this.name = name;
        this.departmentCode = departmentCode;
        this.courseCode = courseCode;
        this.credits = credits;
        this.neededHours = { lecture: 0, practical: 0, seminar: 0, ...neededHours };
        this.events = [];
        this.id = `${departmentCode}/${courseCode}`; // Unikátní identifikátor předmětu
        this.semester = semester;
        this.year = year;
        this.source = source;
        this.color = color || getColorForCourse(0); // Výchozí barva

        if (events && Array.isArray(events)) {
            this.addCourseEvents(events);
        }
    }

    serialize() {
        return {
            stagId: this.stagId,
            name: this.name,
            departmentCode: this.departmentCode,
            courseCode: this.courseCode,
            credits: this.credits,
            neededHours: this.neededHours,
            events: this.events.map(event => event.serialize()),
            semester: this.semester,
            year: this.year,
            id: this.id,
            source: this.source,
            color: this.color
        };
    }

    // Pomocná metoda pro zjištění, zda předmět vůbec má nějaké akce daného typu
    _hasEventsOfType(typeKeyToCheck) {
        if (!typeKeyToCheck) return false;
        return this.events.some(event => {
            const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[event.type?.toLowerCase()];
            return eventTypeKey === typeKeyToCheck;
        });
    }

    // Speciální případ pro předměty, kde je např. potřeba 1 přednáška, ale nabízí se 2 (např. v ČJ a AJ)
    // a student si má vybrat jen jednu. V tomto případě se požadavek na P bere jako splněný, pokud je zapsána *jakákoliv* P.
    isSpecialLectureSubstitutionCase() {
        // Příklad: pokud jsou potřeba 2 hodiny přednášek, a existují právě dvě přednášky, každá s délkou 2 hodiny,
        // pak se jedná o substituční případ. Student si má vybrat jen jednu.
        if (this.neededHours.lecture > 0) {
            const lectureEvents = this.events.filter(e => EVENT_TYPE_TO_KEY_MAP[e.type.toLowerCase()] === 'lecture');
            const allLecturesHaveRequiredHours = lectureEvents.every(e => e.durationHours >= this.neededHours.lecture);
            return lectureEvents.length > 1 && allLecturesHaveRequiredHours;
        }
        return false;
    }

    getShortCode() {
        return `${this.departmentCode}/${this.courseCode}`;
    }

    addCourseEvent(eventData) {
        if (!eventData) return;

        // Zajistíme, aby eventData byla instance CourseEventClass
        const event = (eventData instanceof CourseEventClass) ? eventData : new CourseEventClass({
            ...eventData,
            courseId: this.id, // Předáme ID předmětu
            departmentCode: this.departmentCode,
            courseCode: this.courseCode,
            year: this.year,
            semester: this.semester
        });

        if (!this.events.some(e => e.id === event.id)) {
            this.events.push(event);
        }
    }

    addCourseEvents(eventsData) {
        if (!eventsData || !Array.isArray(eventsData)) return;
        eventsData.forEach(eventData => this.addCourseEvent(eventData));
    }

    getCourseEvents(filters = {}) {
        let filteredEvents = [...this.events];
        if (filters.type) {
            filteredEvents = filteredEvents.filter(event => event.type === filters.type);
        }
        // ... další filtry
        return filteredEvents;
    }

    // Změněno z getEnrolledCounts na getEnrolledHours
    getEnrolledHours(allEnrolledEventIdsInSchedule) {
        const enrolledHours = { lecture: 0, practical: 0, seminar: 0, total: 0 };
        if (!allEnrolledEventIdsInSchedule) {
            return enrolledHours;
        }

        this.events.forEach(event => {
            if (allEnrolledEventIdsInSchedule.has(event.id)) {
                const typeKey = EVENT_TYPE_TO_KEY_MAP[event.type?.toLowerCase()];
                if (typeKey && enrolledHours.hasOwnProperty(typeKey)) {
                    enrolledHours[typeKey] += event.durationHours || 0;
                }
            }
        });
        
        enrolledHours.total = enrolledHours.lecture + enrolledHours.practical + enrolledHours.seminar;
        return enrolledHours;
    }

    isEnrollmentTypeRequirementMet(enrollmentKey, allEnrolledEventIdsInSchedule) {
        const needed = this.neededHours[enrollmentKey] || 0;
        if (needed === 0) {
            // Pokud pro daný typ není nic potřeba, ale PŘESTO existují volitelné akce tohoto typu,
            // požadavek není "splněn" v tom smyslu, aby se blokoval zápis.
            // Ale pokud pro daný typ nejsou potřeba hodiny a ani neexistují akce, je splněn.
            return !this._hasEventsOfType(enrollmentKey);
        }

        // Speciální případ pro volitelné přednášky
        if (enrollmentKey === 'lecture' && this.isSpecialLectureSubstitutionCase()) {
            const enrolledEvents = this.events.filter(e => allEnrolledEventIdsInSchedule.has(e.id));
            const hasAnyLectureEnrolled = enrolledEvents.some(e => EVENT_TYPE_TO_KEY_MAP[e.type.toLowerCase()] === 'lecture');
            return hasAnyLectureEnrolled;
        }

        const enrolled = this.getEnrolledHours(allEnrolledEventIdsInSchedule);
        return enrolled[enrollmentKey] >= needed;
    }

    areAllEnrollmentRequirementsMet(allEnrolledEventIdsInSchedule) {
        return ENROLLMENT_KEYS_ORDER.every(key =>
            this.isEnrollmentTypeRequirementMet(key, allEnrolledEventIdsInSchedule)
        );
    }

    generateDummyCourseEvents(count = 2) {
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