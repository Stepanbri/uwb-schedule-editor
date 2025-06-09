/**
 * @file Tento soubor obsahuje hlavní algoritmus pro generování rozvrhů.
 * Funkce `generateScheduleAlgorithm` využívá rekurzivní backtracking k nalezení všech platných,
 * bezkolizních kombinací rozvrhových akcí pro zadané předměty s ohledem na preference.
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
const timeToMinutes = timeStr => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Kontroluje, zda dvě rozvrhové akce v rozvrhu kolidují.
 * Bere v úvahu den, čas a frekvenci opakování (lichý/sudý týden).
 * @param {import('./CourseEventClass').default} event1 - První událost.
 * @param {import('./CourseEventClass').default} event2 - Druhá událost.
 * @returns {boolean} Vrací `true`, pokud rozvrhové akce kolidují.
 */
const eventsConflict = (event1, event2) => {
    // Pokud jsou rozvrhové akce v jiné dny, nemohou kolidovat
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

    // Jednorázové rozvrhové akce vždy kolidují, pokud se překrývají v čase
    if (freq1 === 'jednorázově' || freq2 === 'jednorázově') {
        return true;
    }

    if (freq1 === 'každýtýden' || freq2 === 'každýtýden') return true;
    if (freq1 === freq2) return true;

    return false;
};

/**
 * Vypočítá "cenu" okna (prázdného času) mezi rozvrhovými akcemi v rámci jednoho dne.
 * Čím větší hodnota, tím méně efektivní je rozvrh.
 * @param {ScheduleClass} schedule - Rozvrh pro výpočet ceny oken.
 * @returns {number} Cena oken v rozvrhu.
 */
const calculateGapsCost = schedule => {
    const events = schedule.getAllEnrolledEvents();
    let totalGapsCost = 0;

    // Rozdělení rozvrhových akcí podle dnů
    const eventsByDay = {};
    events.forEach(event => {
        if (!eventsByDay[event.day]) {
            eventsByDay[event.day] = [];
        }
        eventsByDay[event.day].push(event);
    });

    // Pro každý den s událostmi spočítáme mezery
    Object.values(eventsByDay).forEach(dayEvents => {
        if (dayEvents.length <= 1) return; // V daném dni je nejvýše jedna událost, žádná mezera

        // Seřazení rozvrhových akcí podle času začátku
        dayEvents.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

        // Výpočet mezer mezi událostmi
        for (let i = 0; i < dayEvents.length - 1; i++) {
            const currentEnd = timeToMinutes(dayEvents[i].endTime);
            const nextStart = timeToMinutes(dayEvents[i + 1].startTime);
            const gap = nextStart - currentEnd;

            if (gap > 0) {
                // Cena mezery je kvadratická, abychom více penalizovali velké mezery
                totalGapsCost += gap * gap;
            }
        }
    });

    return totalGapsCost;
};

/**
 * Kontroluje, zda rozvrh splňuje preferenci typu FREE_DAY.
 * @param {object} preference - Preference, která má být ověřena.
 * @param {ScheduleClass} schedule - Rozvrh k ověření.
 * @returns {boolean} Vrací `true`, pokud rozvrh splňuje preferenci.
 */
const checkFreeDayPreference = (preference, schedule) => {
    const params = preference.params || {};
    const dayToCheck = ['PO', 'UT', 'ST', 'CT', 'PA', 'SO', 'NE'].indexOf(params.day);

    if (dayToCheck === -1) return true; // Neplatný den, ignorujeme preferenci

    // Kontrola, zda v daném dni nejsou žádné rozvrhové akce
    return !schedule.getAllEnrolledEvents().some(event => event.day === dayToCheck);
};

/**
 * Kontroluje, zda rozvrh splňuje preferenci typu AVOID_TIMES.
 * @param {object} preference - Preference, která má být ověřena.
 * @param {ScheduleClass} schedule - Rozvrh k ověření.
 * @returns {boolean} Vrací `true`, pokud rozvrh splňuje preferenci.
 */
const checkAvoidTimesPreference = (preference, schedule) => {
    const params = preference.params || {};
    const dayToCheck = ['PO', 'UT', 'ST', 'CT', 'PA', 'SO', 'NE'].indexOf(params.day);

    if (dayToCheck === -1) return true; // Neplatný den, ignorujeme preferenci
    if (!params.startTime || !params.endTime) return true; // Chybějící parametry, ignorujeme preferenci

    const startToAvoid = timeToMinutes(params.startTime);
    const endToAvoid = timeToMinutes(params.endTime);

    // Kontrola, zda v daném dni a čase nejsou žádné rozvrhové akce
    return !schedule.getAllEnrolledEvents().some(event => {
        if (event.day !== dayToCheck) return false;

        const eventStart = timeToMinutes(event.startTime);
        const eventEnd = timeToMinutes(event.endTime);

        // Kontrola překryvu časových intervalů
        return eventStart < endToAvoid && startToAvoid < eventEnd;
    });
};

/**
 * Kontroluje, zda rozvrh splňuje preferenci typu PREFER_INSTRUCTOR.
 * @param {object} preference - Preference, která má být ověřena.
 * @param {ScheduleClass} schedule - Rozvrh k ověření.
 * @param {import('./CourseClass').default[]} courses - Pole všech dostupných předmětů.
 * @returns {boolean} Vrací `true`, pokud rozvrh splňuje preferenci.
 */
const checkPreferInstructorPreference = (preference, schedule, courses) => {
    const params = preference.params || {};

    if (!params.courseCode || !params.eventType || !params.instructorName) {
        console.log('PREFER_INSTRUCTOR: Chybějící parametry preference', params);
        return true; // Chybějící parametry, ignorujeme preferenci
    }

    console.log('PREFER_INSTRUCTOR: Kontroluji preferenci pro', params);

    const course = courses.find(c => c.getShortCode() === params.courseCode);
    if (!course) {
        console.log('PREFER_INSTRUCTOR: Předmět nenalezen', params.courseCode);
        return true; // Předmět neexistuje, ignorujeme preferenci
    }

    const eventType = EVENT_TYPE_TO_KEY_MAP[params.eventType.toLowerCase()];
    if (!eventType) {
        console.log('PREFER_INSTRUCTOR: Neplatný typ rozvrhové akce', params.eventType);
        return true; // Neplatný typ rozvrhové akce, ignorujeme preferenci
    }

    // Zjistíme všechny zapsané rozvrhové akce daného předmětu a typu
    const enrolledEvents = schedule
        .getAllEnrolledEvents()
        .filter(
            event =>
                event.courseId === course.id &&
                EVENT_TYPE_TO_KEY_MAP[event.type.toLowerCase()] === eventType
        );

    console.log(
        'PREFER_INSTRUCTOR: Zapsané rozvrhové akce:',
        enrolledEvents.map(e => ({
            id: e.id,
            type: e.type,
            instructor: e.instructor,
        }))
    );

    // Pokud nemá zapsanou žádnou událost tohoto typu, preference není splněna
    if (enrolledEvents.length === 0) {
        console.log('PREFER_INSTRUCTOR: Žádné zapsané rozvrhové akce tohoto typu');
        return false;
    }

    // Kontrola, zda alespoň jedna zapsaná událost má požadovaného vyučujícího
    const result = enrolledEvents.some(event => event.instructor === params.instructorName);
    console.log(
        'PREFER_INSTRUCTOR: Výsledek kontroly:',
        result,
        'pro vyučujícího',
        params.instructorName
    );
    return result;
};

/**
 * Zkontroluje, zda rozvrh splňuje danou preferenci.
 * @param {object} preference - Preference, která má být ověřena.
 * @param {ScheduleClass} schedule - Rozvrh k ověření.
 * @param {import('./CourseClass').default[]} courses - Pole všech dostupných předmětů.
 * @returns {boolean} Vrací `true`, pokud rozvrh splňuje preferenci.
 */
const checkPreference = (preference, schedule, courses) => {
    if (!preference || !preference.isActive) return true; // Neaktivní preference je vždy splněna

    switch (preference.type) {
        case 'FREE_DAY':
            return checkFreeDayPreference(preference, schedule);
        case 'AVOID_TIMES':
            return checkAvoidTimesPreference(preference, schedule);
        case 'PREFER_INSTRUCTOR':
            return checkPreferInstructorPreference(preference, schedule, courses);
        default:
            return true; // Neznámý typ preference, ignorujeme
    }
};

/**
 * Hlavní funkce pro generování rozvrhů.
 * Implementuje algoritmus s backtrackingem a zohledňuje uživatelské preference.
 * @param {import('./CourseClass').default[]} coursesToSchedule - Předměty pro generování rozvrhu.
 * @param {object} preferences - Objekt s uživatelskými preferencemi.
 * @returns {ScheduleClass[]} Pole vygenerovaných validních rozvrhů.
 */
export const generateScheduleAlgorithm = (coursesToSchedule = [], preferences = {}) => {
    console.log('generateScheduleAlgorithm called with:', {
        coursesCount: coursesToSchedule.length,
        preferencesCount: Object.keys(preferences).length,
    });

    // Seřadíme preference podle priority (od nejvyšší po nejnižší)
    const orderedPreferences = Object.values(preferences || {}).sort(
        (a, b) => a.priority - b.priority
    );

    console.log('Ordered preferences:', orderedPreferences);

    // Filtrujeme pouze předměty, které mají nějaké rozvrhové akce
    const relevantCourses = coursesToSchedule.filter(
        course => course.events && course.events.length > 0
    );

    console.log('Relevant courses:', {
        count: relevantCourses.length,
        courses: relevantCourses.map(c => c.id),
    });

    if (relevantCourses.length === 0) {
        console.log('No relevant courses, returning empty array');
        return [];
    }

    let generatedSchedules = [];
    let solutionsFound = 0;

    // Krok 1: Seskupit všechny rozvrhové akce podle předmětu a typu (přednáška, cvičení...).
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

    /**
     * Rekurzivní funkce, která prochází předměty a zkouší pro ně najít platné kombinace rozvrhových akcí.
     * @param {number} courseIdx - Index aktuálně zpracovávaného předmětu v poli `relevantCourses`.
     * @param {ScheduleClass} currentScheduleInProgress - Rozvrh sestavený v předchozích krocích rekurze.
     */
    const findSchedulesRecursive = (courseIdx, currentScheduleInProgress) => {
        if (solutionsFound >= MAX_GENERATED_SCHEDULES) {
            return;
        }

        if (courseIdx === relevantCourses.length) {
            // Kontrola aktivních preferencí
            let allPreferencesMet = true;
            for (const pref of orderedPreferences) {
                if (
                    pref.isActive &&
                    !checkPreference(pref, currentScheduleInProgress, relevantCourses)
                ) {
                    allPreferencesMet = false;
                    break;
                }
            }

            if (allPreferencesMet) {
                generatedSchedules.push(currentScheduleInProgress.clone());
                solutionsFound++;
            }
            return;
        }

        const course = relevantCourses[courseIdx];
        const eventGroupsForCourse = allEventGroups[course.id];
        const groupKeys = Object.keys(eventGroupsForCourse);

        /**
         * Vnořená rekurzivní funkce, která generuje kombinace rozvrhových akcí pro jeden konkrétní předmět.
         * Prochází typy akcí (přednášky, cvičení...) a pro každý hledá platné sady rozvrhových akcí.
         * @param {number} groupKeyIndex - Index aktuálně zpracovávaného typu akce (např. 'lecture').
         * @param {import('./CourseEventClass').default[]} tempEventsForCourse - Dočasné pole rozvrhových akcí vybraných pro tento předmět.
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
             * Najde všechny kombinace rozvrhových akcí daného typu, které splňují nebo překračují požadovanou hodinovou dotaci.
             * @param {import('./CourseEventClass').default[]} events - Pole rozvrhových akcí, ze kterých se vybírá (např. všechny přednášky).
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
                    const combId = comb
                        .map(e => e.id)
                        .sort()
                        .join(',');
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
                generateEventCombinationsForCourse(groupKeyIndex + 1, [
                    ...tempEventsForCourse,
                    ...combination,
                ]);
            }
        };
        generateEventCombinationsForCourse(0, []);
    };

    findSchedulesRecursive(0, new ScheduleClass());

    // Seřazení rozvrhů podle ceny oken (od nejmenší po největší)
    generatedSchedules.sort((a, b) => calculateGapsCost(a) - calculateGapsCost(b));

    return generatedSchedules;
};

/**
 * Hlavní exportovaná funkce pro generování rozvrhů.
 * Nastaví generovaný rozvrh podle zadaných předmětů a preferencí.
 * @param {import('./CourseClass').default[]} coursesToSchedule - Předměty pro generování rozvrhu.
 * @param {object} preferences - Objekt s uživatelskými preferencemi.
 * @returns {ScheduleClass[]} Pole vygenerovaných platných rozvrhů.
 */
export const generateSchedule = (coursesToSchedule = [], preferences = {}) => {
    return generateScheduleAlgorithm(coursesToSchedule, preferences);
};
