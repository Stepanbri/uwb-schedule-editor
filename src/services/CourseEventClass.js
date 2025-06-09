// Třída reprezentující rozvrhovou akci předmětu
// Obsahuje všechny potřebné informace o konkrétní rozvrhové akce
class CourseEventClass {
    constructor({
        id, // Identifikátor rozvrhové akce, může být ze STAGu nebo generovaný
        stagId = null,
        startTime, // Čas začátku (např. "14:00")
        endTime, // Čas konce (např. "15:30")
        day, // Den v týdnu (index nebo textový identifikátor)
        recurrence, // Opakování (každý týden, sudý, lichý)
        validityStart = null, // Datum začátku platnosti
        validityEnd = null, // Datum konce platnosti
        courseId, // ID kurzu, ke kterému událost patří
        courseCode, // Kód předmětu (např. PPA1)
        room = '', // Místnost (např. UU303)
        type, // Typ výuky (přednáška, cvičení, seminář)
        instructor = '', // Vyučující
        currentCapacity = 0, // Aktuální maximální kapacity akce
        maxCapacity = 0, // Maximální kapacita místnosti
        note = '', // Poznámka k rozvrhové akce
        isVirtual = false, // Zda se jedná o virtuální rozvrhovou akci
        year = '', // Akademický rok
        semester = '', // Semestr (ZS, LS)
        groupId = null, // ID skupiny rozvrhových akcí (Pro spojené rozvrhové akce jako např. u UJP/AEP6 - NENÍ IMPLEMENTOVÁNO)
        departmentCode = '', // Kód katedry (např. KIV)
        durationHours = 0, // Délka v hodinách
    }) {
        // Použijeme stagId jako primární id, pokud je dostupné, jinak dodané id, jinak generujeme
        this.id =
            id ||
            stagId ||
            `${departmentCode}-${courseCode}-${type}-${day}-${startTime}-${Math.random().toString(36).substring(2, 9)}`;
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
        this.durationHours = durationHours;
    }

    serialize() {
        // Vrátí prostý objekt se všemi vlastnostmi pro JSON serializaci
        return {
            id: this.id,
            stagId: this.stagId,
            startTime: this.startTime,
            endTime: this.endTime,
            day: this.day,
            recurrence: this.recurrence,
            validityStart: this.validityStart,
            validityEnd: this.validityEnd,
            courseId: this.courseId,
            courseCode: this.courseCode,
            room: this.room,
            type: this.type,
            instructor: this.instructor,
            currentCapacity: this.currentCapacity,
            maxCapacity: this.maxCapacity,
            note: this.note,
            isVirtual: this.isVirtual,
            year: this.year,
            semester: this.semester,
            groupId: this.groupId,
            departmentCode: this.departmentCode,
            durationHours: this.durationHours,
        };
    }

    getDayAsString(tFunction) {
        const days = [
            tFunction('courseEvent.monday', 'Pondělí'),
            tFunction('courseEvent.tuesday', 'Úterý'),
            tFunction('courseEvent.wednesday', 'Středa'),
            tFunction('courseEvent.thursday', 'Čtvrtek'),
            tFunction('courseEvent.friday', 'Pátek'),
            tFunction('courseEvent.saturday', 'Sobota'),
            tFunction('courseEvent.sunday', 'Neděle'),
        ];
        return days[this.day] || '';
    }
}

export default CourseEventClass;
