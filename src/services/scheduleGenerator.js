/**
 * @file Tento soubor obsahuje hlavní algoritmus pro generování rozvrhů.
 * Funkce `generateSchedule` využívá rekurzivní backtracking k nalezení všech platných,
 * bezkolizních kombinací rozvrhových akcí pro zadané předměty.
 */
import ScheduleClass from './ScheduleClass';
import { EVENT_TYPE_TO_KEY_MAP } from './CourseClass';

/**
 * Maximální počet rozvrhů, které se algoritmus pokusí vygenerovat.
 * Omezuje se tím výpočetní složitost pro případy s velkým množstvím kombinací.
 * @type {number}
 */
const MAX_GENERATED_SCHEDULES = 10;

/**
 * Převádí časový řetězec ve formátu "HH:MM" na celkový počet minut od půlnoci.
 * Usnadňuje porovnávání časů a výpočet překryvů.
 * @param {string} timeStr - Časový řetězec (např. "14:30").
 * @returns {number} Počet minut od půlnoci.
 */
const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Kontroluje, zda dvě události v rozvrhu kolidují.
 * Bere v úvahu den, čas a frekvenci opakování (lichý/sudý týden).
 * @param {import('./CourseEventClass').default} event1 - První událost.
 * @param {import('./CourseEventClass').default} event2 - Druhá událost.
 * @returns {boolean} Vrací `true`, pokud události kolidují.
 */
const eventsConflict = (event1, event2) => {
    // Pokud jsou události v jiné dny, nemohou kolidovat
    if (event1.day !== event2.day) return false;

    // Převod časů na minuty pro snadnější porovnání
    const start1 = timeToMinutes(event1.startTime);
    const end1 = timeToMinutes(event1.endTime);
    const start2 = timeToMinutes(event2.startTime);
    const end2 = timeToMinutes(event2.endTime);

    // Kontrola překryvu časů - standardní algoritmus pro detekci překryvu intervalů
    const overlap = start1 < end2 && start2 < end1;
    if (!overlap) return false;

    // Zohlednění frekvence opakování (každý týden, lichý, sudý)
    const freq1 = event1.recurrence;
    const freq2 = event2.recurrence;

    // Jednorázové události vždy kolidují, pokud se překrývají v čase
    if (freq1 === "jednorázově" || freq2 === "jednorázově") {
        return true;
    }

    if (freq1 === "každýtýden" || freq2 === "každýtýden") return true;
    if (freq1 === freq2) return true;

    return false;
};

/**
 * Hlavní funkce pro generování možných rozvrhů na základě zadaných předmětů.
 * Používá rekurzivní backtracking algoritmus k nalezení všech platných kombinací,
 * které splňují požadavky na počet hodin pro každý typ akce (přednáška, cvičení, ...).
 * @param {import('./CourseClass').default[]} [coursesToSchedule=[]] - Pole předmětů, pro které se má generovat rozvrh.
 * @returns {ScheduleClass[]} Pole vygenerovaných platných rozvrhů (`ScheduleClass` instancí).
 */
export const generateSchedule = (coursesToSchedule = []) => {
    let generatedSchedules = [];
    const relevantCourses = coursesToSchedule.filter(course => course.events && course.events.length > 0);

    if (relevantCourses.length === 0) {
        return [];
    }

    // Krok 1: Seskupit všechny události podle předmětu a typu (přednáška, cvičení...).
    const allEventGroups = {};
    relevantCourses.forEach(course => {
        allEventGroups[course.id] = {};
        course.events.forEach(event => {
            const typeKey = EVENT_TYPE_TO_KEY_MAP[event.type.toLowerCase()];
            if (typeKey) {
                if (!allEventGroups[course.id][typeKey]) {
                    allEventGroups[course.id][typeKey] = [];
                }
                allEventGroups[course.id][typeKey].push(event);
            }
        });
    });

    let solutionsFound = 0;

    /**
     * Rekurzivní funkce, která prochází předměty a zkouší pro ně najít platné kombinace událostí.
     * @param {number} courseIdx - Index aktuálně zpracovávaného předmětu v poli `relevantCourses`.
     * @param {ScheduleClass} currentScheduleInProgress - Rozvrh sestavený v předchozích krocích rekurze.
     */
    const findSchedulesRecursive = (courseIdx, currentScheduleInProgress) => {
        if (solutionsFound >= MAX_GENERATED_SCHEDULES) {
            return;
        }

        if (courseIdx === relevantCourses.length) {
            generatedSchedules.push(currentScheduleInProgress.clone());
            solutionsFound++;
            return;
        }

        const course = relevantCourses[courseIdx];
        const eventGroupsForCourse = allEventGroups[course.id];
        const groupKeys = Object.keys(eventGroupsForCourse);

        /**
         * Vnořená rekurzivní funkce, která generuje kombinace událostí pro jeden konkrétní předmět.
         * Prochází typy akcí (přednášky, cvičení...) a pro každý hledá platné sady událostí.
         * @param {number} groupKeyIndex - Index aktuálně zpracovávaného typu akce (např. 'lecture').
         * @param {import('./CourseEventClass').default[]} tempEventsForCourse - Dočasné pole událostí vybraných pro tento předmět.
         */
        const generateEventCombinationsForCourse = (groupKeyIndex, tempEventsForCourse) => {
            if (solutionsFound >= MAX_GENERATED_SCHEDULES) return;

            if (groupKeyIndex === groupKeys.length) {
                const nextScheduleCandidate = currentScheduleInProgress.clone();
                let possibleToAddAll = true;
                for (const eventToAdd of tempEventsForCourse) {
                    if (nextScheduleCandidate.conflictsWith(eventToAdd, eventsConflict)) {
                        possibleToAddAll = false;
                        break;
                    }
                    nextScheduleCandidate.addEvent(eventToAdd);
                }

                if (possibleToAddAll) {
                    findSchedulesRecursive(courseIdx + 1, nextScheduleCandidate);
                }
                return;
            }

            const currentGroupKey = groupKeys[groupKeyIndex];
            const eventsOfThisGroup = eventGroupsForCourse[currentGroupKey];
            const neededHours = course.neededHours[currentGroupKey] || 0;

            if (neededHours === 0) {
                generateEventCombinationsForCourse(groupKeyIndex + 1, tempEventsForCourse);
                return;
            }

            /**
             * Najde všechny kombinace událostí daného typu, které splňují nebo překračují požadovanou hodinovou dotaci.
             * @param {import('./CourseEventClass').default[]} events - Pole událostí, ze kterých se vybírá (např. všechny přednášky).
             * @param {number} targetHours - Požadovaný počet hodin.
             * @returns {import('./CourseEventClass').default[][]} Pole polí, kde každé vnitřní pole je jedna platná kombinace.
             */
            function getCombinationsThatMeetHours(events, targetHours) {
                const result = [];

                /**
                 * Vnitřní rekurzivní pomocník pro hledání podmnožin.
                 * @param {number} startIndex - Index, od kterého se má v poli `events` hledat.
                 * @param {number} currentSum - Součet hodin v aktuálně sestavované podmnožině.
                 * @param {import('./CourseEventClass').default[]} currentSubset - Aktuálně sestavovaná podmnožina.
                 */
                function findSubsets(startIndex, currentSum, currentSubset) {
                    if (currentSum >= targetHours) {
                        result.push([...currentSubset]);
                    }

                    if (currentSum >= targetHours) return;
                    if (startIndex === events.length) return;

                    for (let i = startIndex; i < events.length; i++) {
                        const newSum = currentSum + (events[i].durationHours || 0);
                        currentSubset.push(events[i]);
                        findSubsets(i + 1, newSum, currentSubset);
                        currentSubset.pop();
                    }
                }
                findSubsets(0, 0, []);

                const uniqueCombinations = [];
                const seenCombinations = new Set();
                result.forEach(comb => {
                    const combId = comb.map(e => e.id).sort().join(',');
                    if (!seenCombinations.has(combId)) {
                        uniqueCombinations.push(comb);
                        seenCombinations.add(combId);
                    }
                });

                return uniqueCombinations;
            }

            const combinations = getCombinationsThatMeetHours(eventsOfThisGroup, neededHours);

            for (const combination of combinations) {
                if (solutionsFound >= MAX_GENERATED_SCHEDULES) return;
                generateEventCombinationsForCourse(groupKeyIndex + 1, [...tempEventsForCourse, ...combination]);
            }
        };
        generateEventCombinationsForCourse(0, []);
    };
    findSchedulesRecursive(0, new ScheduleClass());

    return generatedSchedules;
}; 