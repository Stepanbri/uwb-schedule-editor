// src/services/CourseEventClass.js
class CourseEventClass {
    constructor({
                    id, // Mělo by být stagId, pokud je dostupné
                    stagId = null,
                    startTime,
                    endTime,
                    day,
                    recurrence,
                    validityStart = null,
                    validityEnd = null,
                    courseId, // Unikátní ID předmětu (department/code_year_semester)
                    courseCode,
                    room = '',
                    type,
                    instructor = '',
                    currentCapacity = 0,
                    maxCapacity = 0,
                    note = '',
                    isVirtual = false,
                    year = '',
                    semester = '',
                    groupId = null,
                    departmentCode = ''
                }) {
        // Použijeme stagId jako primární id, pokud je dostupné, jinak dodané id, jinak generujeme
        this.id = id || stagId || `${departmentCode}-${courseCode}-${type}-${day}-${startTime}-${Math.random().toString(36).substring(2, 9)}`;
        this.stagId = stagId || (id && id.startsWith('STAG_') ? id : null); // Pokud id je stagId
        this.startTime = startTime;
        this.endTime = endTime;
        this.day = day;
        this.recurrence = recurrence;
        this.validityStart = validityStart;
        this.validityEnd = validityEnd;
        this.courseId = courseId; // Toto by mělo být unikátní ID kurzu
        this.courseCode = courseCode;
        this.room = room;
        this.type = type;
        this.instructor = instructor;
        this.currentCapacity = currentCapacity;
        this.maxCapacity = maxCapacity;
        this.note = note;
        this.isVirtual = isVirtual || !room;
        this.year = year;
        this.semester = semester;
        this.groupId = groupId;
        this.departmentCode = departmentCode;
    }

    getDayAsString(tFunction) {
        const days = [
            tFunction('courseEvent.monday', 'Pondělí'),
            tFunction('courseEvent.tuesday', 'Úterý'),
            tFunction('courseEvent.wednesday', 'Středa'),
            tFunction('courseEvent.thursday', 'Čtvrtek'),
            tFunction('courseEvent.friday', 'Pátek'),
            tFunction('courseEvent.saturday', 'Sobota'),
            tFunction('courseEvent.sunday', 'Neděle')
        ];
        return days[this.day] || '';
    }
}

export default CourseEventClass;