// src/services/ScheduleClass.js
// import CourseEventClass from './CourseEventClass'; // Není přímo potřeba zde, akce přicházejí zvenku

/**
 * Reprezentuje sestavený rozvrh studenta.
 * Obsahuje seznam zapsaných instancí CourseEventClass[cite: 150].
 */
class ScheduleClass {
    constructor() {
        this.enrolledEvents = []; // Pole instancí CourseEventClass [cite: 150]
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
     * Odstraní všechny události patřící danému předmětu,
     * pokud jejich ID nejsou v poskytnuté sadě nových ID událostí.
     * Používá se při přepisu předmětu novými daty.
     * @param {string} courseId - ID předmětu, jehož staré události se mají odstranit.
     * @param {Set<string>} newEventIdsSet - Sada ID nových událostí, které mají být zachovány.
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

    // Metody pro kontrolu překryvů, získání akcí pro den atd. mohou být přidány zde.
    // Například pro grafické zobrazení dle
}

export default ScheduleClass;