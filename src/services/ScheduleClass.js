// Třída reprezentující rozvrh
// Spravuje seznam zapsaných rozvrhových akcí a operace s nimi

/**
 * Reprezentuje sestavený rozvrh studenta.
 * Obsahuje seznam zapsaných instancí CourseEventClass
 */
class ScheduleClass {
    constructor() {
        this.enrolledEvents = []; // Pole instancí CourseEventClass
    }

    /**
     * Přidá jednu rozvrhovou akci do rozvrhu studenta.
     * Zabrání duplicitnímu přidání stejné akce.
     * @param {CourseEventClass} event - Instance CourseEventClass.
     * @returns {boolean} True, pokud byla akce úspěšně přidána, jinak false.
     */
    addEvent(event) {
        if (event && event.id && !this.enrolledEvents.find(e => e.id === event.id)) {
            this.enrolledEvents.push(event);
            return true;
        }
        return false;
    }

    /**
     * Přidá pole instancí CourseEventClass do rozvrhu.
     * @param {CourseEventClass[]} eventList - Pole instancí CourseEventClass.
     */
    addEvents(eventList) {
        if (eventList && Array.isArray(eventList)) {
            eventList.forEach(event => this.addEvent(event));
        }
    }

    /**
     * Odebere rozvrhovou akci z rozvrhu studenta podle jejího ID.
     * @param {string|number} eventId - ID akce k odebrání.
     */
    removeEventById(eventId) {
        this.enrolledEvents = this.enrolledEvents.filter(event => event.id !== eventId);
    }

    /**
     * Odstraní všechny rozvrhové akce patřící danému předmětu,
     * pokud jejich ID nejsou v poskytnuté sadě nových ID rozvrhových akcí.
     * Používá se při přepisu předmětu novými daty.
     * @param {string} courseId - ID předmětu, jehož staré rozvrhové akce se mají odstranit.
     * @param {Set<string>} newEventIdsSet - Sada ID nových rozvrhových akcí, které mají být zachovány.
     */
    removeEventsByCourseIdIfNoLongerPresent(courseId, newEventIdsSet) {
        this.enrolledEvents = this.enrolledEvents.filter(event => {
            if (event.courseId === courseId) {
                // Pokud událost patří k danému kurzu, zkontrolujeme, zda je mezi novými událostmi
                return newEventIdsSet.has(event.id);
            }
            // Pokud událost nepatří k tomuto kurzu, ponecháme ji
            return true;
        });
    }

    /**
     * Zkontroluje, zda je daná akce již zapsána v rozvrhu.
     * @param {string|number} eventId - ID akce.
     * @returns {boolean}
     */
    isEventEnrolled(eventId) {
        return this.enrolledEvents.some(event => event.id === eventId);
    }

    /**
     * Vrátí všechny zapsané akce.
     * @returns {CourseEventClass[]}
     */
    getAllEnrolledEvents() {
        return [...this.enrolledEvents];
    }

    /**
     * Vymaže všechny zapsané akce z rozvrhu.
     */
    clear() {
        this.enrolledEvents = [];
    }

    /**
     * Vytvoří a vrátí hlubokou kopii rozvrhu.
     * @returns {ScheduleClass} Nová instance ScheduleClass se zkopírovanými událostmi.
     */
    clone() {
        const clonedSchedule = new ScheduleClass();
        // Reference na objekty rozvrhových akcí jsou dostačující,
        // protože CourseEventClass instance se nemění, jen se přidávají/odebírají
        clonedSchedule.addEvents(this.enrolledEvents);
        return clonedSchedule;
    }

    /**
     * Kontroluje, zda by přidání nové rozvrhové akce způsobilo konflikt s již zapsanými událostmi.
     * @param {CourseEventClass} newEvent - Nová událost ke kontrole.
     * @param {Function} conflictFunc - Funkce pro kontrolu konfliktu mezi dvěma událostmi.
     * @returns {boolean} True, pokud existuje konflikt.
     */
    conflictsWith(newEvent, conflictFunc) {
        if (!newEvent || !conflictFunc || typeof conflictFunc !== 'function') {
            return false;
        }

        return this.enrolledEvents.some(existingEvent => conflictFunc(existingEvent, newEvent));
    }
}

export default ScheduleClass;
