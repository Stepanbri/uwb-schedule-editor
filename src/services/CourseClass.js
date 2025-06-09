// Třída reprezentující předmět v rozvrhu
// Obsahuje metadata předmětu a seznam jeho rozvrhových akcí
import CourseEventClass from './CourseEventClass';
import { getColorForCourse } from '../utils/colorUtils';

// Mapování různých formátů zápisu typů rozvrhových akcí na jednotné interní klíče
// Slouží k normalizaci dat z různých zdrojů (STAG, uživatelský vstup)
export const EVENT_TYPE_TO_KEY_MAP = {
    přednáška: 'lecture',
    lecture: 'lecture',
    př: 'lecture',
    cvičení: 'practical',
    practical: 'practical',
    cv: 'practical',
    seminář: 'seminar',
    seminar: 'seminar',
    se: 'seminar',
};

// Pořadí typů akcí pro konzistentní zobrazení v UI
export const ENROLLMENT_KEYS_ORDER = ['lecture', 'practical', 'seminar'];

// Hlavní třída reprezentující předmět v rozvrhu
// Uchovává metadata předmětu a spravuje seznam jeho rozvrhových akcí
class CourseClass {
    constructor({
        stagId = null, // ID předmětu ve STAGu
        name, // Název předmětu
        departmentCode, // Kód katedry (např. KIV)
        courseCode, // Kód předmětu (např. PPA1)
        credits, // Počet kreditů
        neededHours = {}, // Požadované hodiny podle typu výuky
        events = [], // Seznam rozvrhových akcí
        semester = '', // Semestr (ZS, LS)
        year = '', // Akademický rok
        source = 'prod', // Zdroj dat (prod, demo)
        color = null, // Barva předmětu v UI
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
            color: this.color,
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

    // Speciální případ pro předměty, kde je např. potřeba 1 přednáška, ale nabízí se 2 (např. v UJP/AEP5)
    // a student si má vybrat jen jednu. V tomto případě se požadavek na P bere jako splněný, pokud je zapsána *jakákoliv* P.
    isSpecialLectureSubstitutionCase() {
        // Příklad: pokud jsou potřeba 2 hodiny přednášek, a existují právě dvě přednášky, každá s délkou 2 hodiny,
        // pak se jedná o substituční případ. Student si má vybrat jen jednu.
        // Bohužel, v STAG API mají některé předměty pomerně špatně definované parametry (). STAG system si s tím poradí ale znamená to další potřebné záplaty chyb pro aplikace třetích stran...
        if (this.neededHours.lecture > 0) {
            const lectureEvents = this.events.filter(
                e => EVENT_TYPE_TO_KEY_MAP[e.type.toLowerCase()] === 'lecture'
            );
            const allLecturesHaveRequiredHours = lectureEvents.every(
                e => e.durationHours >= this.neededHours.lecture
            );
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
        const event =
            eventData instanceof CourseEventClass
                ? eventData
                : new CourseEventClass({
                      ...eventData,
                      courseId: this.id, // Předáme ID předmětu
                      departmentCode: this.departmentCode,
                      courseCode: this.courseCode,
                      year: this.year,
                      semester: this.semester,
                  });

        if (!this.events.some(e => e.id === event.id)) {
            this.events.push(event);
        }
    }

    // Přidá více rozvrhových akcí najednou
    // Očekává pole s daty rozvrhových akcí, které se převedou na instance CourseEventClass
    // a přidají do seznamu akcí předmětu
    // Pokud data nejsou platná, nic se nepřidá
    // Pokud akce již existuje, nebude přidána znovu
    // Používá se pro hromadné načítání akcí z externích zdrojů (např. STAG API)
    // Předpokládá, že data jsou v kompatibilním formátu s CourseEventClass
    addCourseEvents(eventsData) {
        if (!eventsData || !Array.isArray(eventsData)) return;
        eventsData.forEach(eventData => this.addCourseEvent(eventData));
    }

    // Vrátí všechny rozvrhové akce předmětu, případně filtrované podle typu
    // Používá se pro zobrazení akcí v UI, případně pro další zpracování
    // Pokud nejsou zadány žádné filtry, vrátí všechny akce
    // Pokud je zadán filtr podle typu, vrátí pouze akce tohoto typu
    // Filtr může být objekt s vlastností 'type', která odpovídá typu akce (např. 'lecture', 'practical', 'seminar')
    // Pokud není zadán žádný filtr, vrátí všechny akce
    // Příklad použití: getCourseEvents() vrátí všechny akce bez filtru
    // Příklad použití: getCourseEvents({}) vrátí všechny akce bez filtru
    // Příklad použití: getCourseEvents({ type: 'seminar' }) vrátí všechny semináře
    // Příklad použití: getCourseEvents({ type: 'practical' }) vrátí všechny cvičení
    // Příklad použití: getCourseEvents({ type: 'lecture' }) vrátí všechny přednášky
    getCourseEvents(filters = {}) {
        let filteredEvents = [...this.events];
        if (filters.type) {
            filteredEvents = filteredEvents.filter(event => event.type === filters.type);
        }
        return filteredEvents;
    }

    // Vrátí počet hodin zapsaných akcí podle typu (přednáška, cvičení, seminář)
    // Používá se pro zobrazení celkového počtu hodin zapsaných akcí v rozvrhu
    // Vstupem je sada ID zapsaných akcí v rozvrhu
    // Pokud nejsou zapsány žádné akcí, vrátí 0 pro všechny typy
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

        enrolledHours.total =
            enrolledHours.lecture + enrolledHours.practical + enrolledHours.seminar;
        return enrolledHours;
    }

    // Zkontroluje, zda jsou splněny požadavky na zápis pro daný typ akcí
    // Vstupem je klíč typu zápisu (např. 'lecture', 'practical', 'seminar') a sada ID zapsaných akcí v rozvrhu
    // Vrací true, pokud jsou splněny požadavky pro daný typ, jinak false
    // Pokud pro daný typ není nic potřeba (např. volitelné přednášky), vrátí true, pokud nejsou žádné akce tohoto typu
    // Pokud je potřeba alespoň jedna akce tohoto typu, zkontroluje, zda je zapsána dostatečná doba
    // Pokud je potřeba 0 hodin, ale existují akce tohoto typu, umožní zápis (jsou volitelné)
    isEnrollmentTypeRequirementMet(enrollmentKey, allEnrolledEventIdsInSchedule) {
        if (!enrollmentKey || !allEnrolledEventIdsInSchedule) {
            return false;
        }

        const needed = this.neededHours[enrollmentKey] || 0;

        // Pokud pro daný typ není nic potřeba...
        if (needed === 0) {
            // ...ale akce tohoto typu existují, umožníme uživateli je zapsat
            // (jsou volitelné, takže neblokujeme zápis)
            return !this._hasEventsOfType(enrollmentKey);
        }

        // Speciální případ pro volitelné přednášky
        if (enrollmentKey === 'lecture' && this.isSpecialLectureSubstitutionCase()) {
            // Zjistíme, zda už má zapsanou alespoň jednu přednášku
            const enrolledEvents = this.events.filter(
                e =>
                    allEnrolledEventIdsInSchedule.has(e.id) &&
                    EVENT_TYPE_TO_KEY_MAP[e.type.toLowerCase()] === 'lecture'
            );
            return enrolledEvents.length > 0;
        }

        // Standardní případ - kontrola počtu hodin
        let enrolledHoursOfThisType = 0;

        for (const event of this.events) {
            // Kontrola, zda je rozvrhová akce zapsaná
            if (allEnrolledEventIdsInSchedule.has(event.id)) {
                // Kontrola typu rozvrhové akce
                const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[event.type.toLowerCase()];

                // Pokud jde o hledaný typ, přičteme jeho hodiny
                if (eventTypeKey === enrollmentKey) {
                    enrolledHoursOfThisType += event.durationHours || 0;
                }
            }
        }

        // Vrátíme true, pokud je počet zapsaných hodin >= potřebnému počtu
        return enrolledHoursOfThisType >= needed;
    }

    // Zkontroluje, zda jsou splněny všechny požadavky na zápis pro všechny typy akcí
    // Vstupem je sada ID zapsaných akcí v rozvrhu
    // Vrací true, pokud jsou splněny požadavky pro všechny typy (přednášky, cvičení, semináře)
    // Pokud pro daný typ není nic potřeba, ale existují akce tohoto typu, umožní zápis (jsou volitelné)
    areAllEnrollmentRequirementsMet(allEnrolledEventIdsInSchedule) {
        return ENROLLMENT_KEYS_ORDER.every(key =>
            this.isEnrollmentTypeRequirementMet(key, allEnrolledEventIdsInSchedule)
        );
    }
}

export default CourseClass;
