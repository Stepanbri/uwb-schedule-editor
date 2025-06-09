// Konstanty pro dny v týdnu - obsahuje klíče pro překlady, které se používají v i18n
// Používá se hlavně v komponentách rozvrhu pro překlad dnů
export const DAY_I18N_KEYS = [
    'courseEvent.monday',
    'courseEvent.tuesday',
    'courseEvent.wednesday',
    'courseEvent.thursday',
    'courseEvent.friday',
    'courseEvent.saturday',
    'courseEvent.sunday',
];

// Konstanty pro typy preferencí - definují možné druhy preferencí, které může uživatel nastavit
export const PREFERENCE_TYPE_IDS = {
    FREE_DAY: 0, // Preference pro volný den v týdnu
    FREE_TIME_BLOCK: 1, // Preference pro volný časový blok
    PREFER_INSTRUCTOR: 2, // Preference pro konkrétního vyučujícího
};

// Mapování typů rozvrhových akcí na interní klíče - zajišťuje jednotné zpracování různých pojmenování
// stejných typů rozvrhových akcí (např. přednáška, lecture, př -> všechny převedeny na 'lecture')
export const EVENT_TYPE_TO_KEY_MAP = {
    přednáška: 'lecture',
    lecture: 'lecture',
    př: 'lecture',
    cv: 'practical',
    cvičení: 'practical',
    practical: 'practical',
    seminář: 'seminar',
    seminar: 'seminar',
};

// Mapování klíčů rozvrhových akcí na zkrácené i18n klíče pro překlady
// Používá se pro zkrácené popisky typů rozvrhových akcí v UI
export const ENROLLMENT_KEY_TO_SHORT_I18N_KEY = {
    lecture: 'enrollmentShort.lecture',
    practical: 'enrollmentShort.practical',
    seminar: 'enrollmentShort.seminar',
};

// Pořadí typů zápisu rozvrhových akcí pro zobrazení v UI
// Určuje, v jakém pořadí se mají typy rozvrhových akcí zobrazovat ve filtrech a seznamech
export const ENROLLMENT_DISPLAY_ORDER = ['lecture', 'practical', 'seminar'];

// Klíč pro ukládání dat aplikace do localStorage
// Použitý pro persistenci dat mezi návštěvami stránky
export const LOCAL_STORAGE_KEY = 'schedulePlannerWorkspaceSave';
