/**
 * @file Tento soubor obsahuje utility funkce pro transformaci dat získaných ze STAG API
 * do formátu, který používá vnitřní logika aplikace (`WorkspaceService` a související třídy).
 * Zajišťuje mapování a normalizaci dat, jako jsou dny v týdnu, typy opakování, typy akcí a další.
 */

/**
 * Mapování zkratek dnů v týdnu ze STAGu na číselný index (0 = Pondělí).
 * @type {Object<string, number>}
 */
const DAY_MAPPING = {
    PO: 0,
    ÚT: 1,
    ST: 2,
    ČT: 3,
    PÁ: 4,
    SO: 5,
    NE: 6,
    MON: 0,
    TUE: 1,
    WED: 2,
    THU: 3,
    FRI: 4,
    SAT: 5,
    SUN: 6,
};

/**
 * Mapování zkratek typu opakování rozvrhových ze STAGu na plný textový popis.
 * @type {Object<string, string>}
 */
const RECURRENCE_MAPPING = {
    KT: 'KAŽDÝ TÝDEN',
    SUDY: 'SUDÝ TÝDEN',
    LI: 'LICHÝ TÝDEN',
    KAŽDÝ: 'KAŽDÝ TÝDEN',
    LICHÝ: 'LICHÝ TÝDEN',
    SUDÝ: 'SUDÝ TÝDEN',
    EVERY: 'KAŽDÝ TÝDEN',
    ODD: 'LICHÝ TÝDEN',
    EVEN: 'SUDÝ TÝDEN',
};

/**
 * Mapování zkratek typu rozvrhových (přednáška, cvičení) ze STAGu na plný textový popis.
 * @type {Object<string, string>}
 */
const TYPE_MAPPING = {
    P: 'PŘEDNÁŠKA',
    C: 'CVIČENÍ',
    S: 'SEMINÁŘ',
    Z: 'ZKOUŠKA',
    A: 'ZÁPOČET',
    BL: 'BLOK',
    PŘ: 'PŘEDNÁŠKA',
    CV: 'CVIČENÍ',
    SE: 'SEMINÁŘ',
    LECTURE: 'PŘEDNÁŠKA',
    PRACTICAL: 'CVIČENÍ',
    SEMINAR: 'SEMINÁŘ',
};

/**
 * Zpracuje a zformátuje jméno vyučujícího z datové struktury STAGu.
 * Zvládá případy, kdy je vyučující jeden nebo je jich více v poli.
 * @param {object|object[]} instructorData - Data o vyučujícím (nebo pole dat) ze STAGu.
 * @returns {string} Plné jméno vyučujícího (nebo seznam jmen oddělený čárkou).
 */
const formatInstructorName = instructorData => {
    if (!instructorData) return '';
    const instructors = Array.isArray(instructorData) ? instructorData : [instructorData];
    return instructors
        .map(
            u =>
                `${u.titulPred ? u.titulPred + ' ' : ''}${u.jmeno} ${u.prijmeni}${u.titulZa ? ', ' + u.titulZa : ''}`
        )
        .join(', ');
};

/**
 * Zformátuje informaci o místnosti z datové struktury STAGu.
 * Pokouší se sestavit název z budovy a čísla místnosti, případně použije dostupné zkratky.
 * @param {object} stagEvent - Data rozvrhových akcí ze STAGu.
 * @param {function} t - Funkce pro překlad (i18next).
 * @returns {string} Zformátovaný název místnosti, např. "UU101".
 */
const formatRoom = (stagEvent, t) => {
    if (stagEvent.budova && stagEvent.mistnost)
        return `${stagEvent.budova.toUpperCase()}${stagEvent.mistnost.replace(/\s|-/g, '')}`;
    if (stagEvent.mistnost) return stagEvent.mistnost.replace(/\s|-/g, '');
    if (stagEvent.mistnostZkr) return stagEvent.mistnostZkr.replace(/\s|-/g, '');
    return t('common.notSpecified', 'N/A');
};

/**
 * Transformuje jednu rozvrhovou akci ze STAG formátu na interní formát aplikace.
 * Normalizuje časy, dny, typy a další atributy. Přeskakuje neplatné akce (např. s nulovým časem).
 * @param {object} stagEvent - Surová data akcí ze STAGu.
 * @param {object} subjectData - Data o předmětu, ke kterému rozvrhová patří (pro kontext).
 * @param {object} planParams - Parametry zadané uživatelem (rok, semestr).
 * @param {function} t - Funkce pro překlad (i18next).
 * @returns {object|null} Objekt rozvrhové akce ve formátu aplikace nebo `null`, pokud má být rozvrhová akce přeskočena.
 */
export const transformStagEvent = (stagEvent, subjectData, planParams, t) => {
    const startTime = stagEvent.hodinaSkutOd?.value || stagEvent.casOd;
    const endTime = stagEvent.hodinaSkutDo?.value || stagEvent.casDo;

    if (startTime === '00:00' && endTime === '00:00') {
        return null; // Přeskočíme virtuální/neplatné akce - není důvod je zobrazovat
    }

    let durationHours = parseFloat(stagEvent.pocetVyucHodin) || 0;
    if (
        durationHours <= 0 &&
        stagEvent.hodinaOd &&
        stagEvent.hodinaDo &&
        stagEvent.hodinaDo >= stagEvent.hodinaOd
    ) {
        durationHours = stagEvent.hodinaDo - stagEvent.hodinaOd + 1;
    }

    const dayKey = stagEvent.denZkr?.toUpperCase() || stagEvent.den?.toUpperCase();
    const dayIndex =
        DAY_MAPPING[dayKey] ??
        (Number.isInteger(parseInt(stagEvent.den)) ? parseInt(stagEvent.den) - 1 : 0);

    let eventSemesterEffective = stagEvent.semestr?.toUpperCase();
    if (!eventSemesterEffective && planParams.semester === '%') {
        eventSemesterEffective =
            subjectData.rawSubject.semestrDoporUc?.toUpperCase() ||
            (subjectData.rawSubject.vyukaZS === 'A'
                ? 'ZS'
                : subjectData.rawSubject.vyukaLS === 'A'
                  ? 'LS'
                  : 'ZS');
    } else if (!eventSemesterEffective) {
        eventSemesterEffective = planParams.semester.toUpperCase();
    }

    const eventId =
        stagEvent.roakIdno ||
        stagEvent.akceIdno ||
        `${subjectData.rawSubject.katedra}-${subjectData.rawSubject.zkratka}-${stagEvent.typAkceZkr || 'T'}-${dayKey || 'D'}-${startTime || '0000'}-${Math.random().toString(16).slice(2, 7)}`;

    // Vytvoříme a vrátíme objekt rozvrhové akce ve formátu aplikace
    return {
        id: eventId,
        stagId: stagEvent.roakIdno || stagEvent.akceIdno,
        startTime,
        endTime,
        day: dayIndex,
        recurrence:
            RECURRENCE_MAPPING[stagEvent.tydenZkr?.toUpperCase()] ||
            RECURRENCE_MAPPING[stagEvent.tyden?.toUpperCase()] ||
            stagEvent.tyden ||
            'KAŽDÝ TÝDEN',
        room: formatRoom(stagEvent, t),
        type:
            TYPE_MAPPING[stagEvent.typAkceZkr?.toUpperCase()] ||
            TYPE_MAPPING[stagEvent.typAkce?.toUpperCase()] ||
            stagEvent.typAkce ||
            'NEZNÁMÝ',
        instructor: formatInstructorName(stagEvent.ucitel),
        currentCapacity: parseInt(stagEvent.planObsazeni || 0),
        maxCapacity: parseInt(stagEvent.kapacitaMistnosti || 0),
        note: stagEvent.poznamka,
        year: planParams.scheduleAcademicYear,
        semester: eventSemesterEffective,
        departmentCode: subjectData.rawSubject.katedra,
        courseCode: subjectData.rawSubject.zkratka,
        durationHours,
    };
};

/**
 * Zpracovává rozsah hodin a další metadata.
 * @param {object} subjectData - Surová data o předmětu a jeho operaci (přidat/přepsat).
 * @param {object[]} transformedEvents - Pole již transformovaných rozvrhových akcí.
 * @param {object} planParams - Parametry zadané uživatelem (rok, semestr).
 * @param {boolean} useDemoApi - Příznak, zda se používá demo API (ovlivňuje 'source' pole).
 * @returns {object} Objekt předmětu připravený pro přidání do `WorkspaceService`.
 */
export const transformStagSubject = (subjectData, transformedEvents, planParams, useDemoApi) => {
    const rozsahParts = subjectData.rawSubject.rozsah
        ?.split('+')
        .map(s => parseInt(s.trim()) || 0) || [0, 0, 0];
    const neededHours = {
        lecture: rozsahParts[0] || 0,
        practical: rozsahParts.length > 1 ? rozsahParts[1] : 0,
        seminar: rozsahParts.length > 2 ? rozsahParts[2] : 0,
    };

    let courseEffectiveSemester = planParams.semester.toUpperCase();
    if (planParams.semester === '%') {
        courseEffectiveSemester =
            subjectData.rawSubject.semestrDoporUc?.toUpperCase() ||
            (subjectData.rawSubject.vyukaZS === 'A'
                ? 'ZS'
                : subjectData.rawSubject.vyukaLS === 'A'
                  ? 'LS'
                  : 'ZS');
    }

    // Vytvoříme objekt s daty předmětu, který bude použit v WorkspaceService
    return {
        stagId: subjectData.rawSubject.predmetId,
        name: subjectData.rawSubject.nazev,
        departmentCode: subjectData.rawSubject.katedra,
        courseCode: subjectData.rawSubject.zkratka,
        credits: parseInt(subjectData.rawSubject.kreditu) || 0,
        neededHours,
        semester: courseEffectiveSemester,
        year: planParams.scheduleAcademicYear,
        events: transformedEvents,
        source: useDemoApi ? 'demo' : 'prod',
    };
};
