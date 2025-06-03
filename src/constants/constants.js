export const DAY_I18N_KEYS = [
    'courseEvent.monday',
    'courseEvent.tuesday',
    'courseEvent.wednesday',
    'courseEvent.thursday',
    'courseEvent.friday',
    'courseEvent.saturday',
    'courseEvent.sunday'
];

// Add other constants from your old project or new ones as needed
export const PREFERENCE_TYPE_IDS = {
    FREE_DAY: 0,
    FREE_TIME_BLOCK: 1,
    PREFER_INSTRUCTOR: 2,
};

export const EVENT_TYPE_TO_KEY_MAP = {
    'přednáška': 'lecture',
    'lecture': 'lecture',
    'př': 'lecture',
    'cv': 'practical',
    'cvičení': 'practical',
    'practical': 'practical',
    'seminář': 'seminar',
    'seminar': 'seminar',
};

export const ENROLLMENT_KEY_TO_SHORT_I18N_KEY = {
    lecture: 'enrollmentShort.lecture',
    practical: 'enrollmentShort.practical',
    seminar: 'enrollmentShort.seminar',
};

export const ENROLLMENT_DISPLAY_ORDER = ['lecture', 'practical', 'seminar'];

export const LOCAL_STORAGE_KEY = 'schedulePlannerWorkspace_v2';