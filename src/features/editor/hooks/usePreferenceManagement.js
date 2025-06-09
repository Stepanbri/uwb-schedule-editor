// Hook pro správu uživatelských preferencí při generování rozvrhu
// Obsahuje definici typů preferencí, jejich parametrů a funkcí pro práci s nimi
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass';

// Konfigurace typů preferencí - definuje parametry, popisky a formátování pro každý typ preference
export const PREFERENCE_CONFIG = {
    // Preference pro volný den v týdnu
    FREE_DAY: {
        labelKey: 'preferences.types.FREE_DAY.label',
        shortLabelKey: 'preferences.types.FREE_DAY.shortLabel',
        defaultLabel: 'Volný den',
        params: [
            {
                name: 'day',
                labelKey: 'preferences.params.day',
                type: 'select',
                optionsKey: 'dayOptions',
                defaultValue: 'PO',
            },
        ],
        displayFormatter: (params, t) =>
            t('preferences.displayLabels.freeDay', {
                day: t(
                    `preferences.dayOptions.${EVENT_TYPE_TO_KEY_MAP[params.day.toLowerCase()] || 'other'}`,
                    params.day
                ),
            }),
    },
    // Preference pro vyhnutí se určitým časům v daný den
    AVOID_TIMES: {
        labelKey: 'preferences.types.AVOID_TIMES.label',
        shortLabelKey: 'preferences.types.AVOID_TIMES.shortLabel',
        defaultLabel: 'Vyhnout se časům',
        params: [
            {
                name: 'day',
                labelKey: 'preferences.params.day',
                type: 'select',
                optionsKey: 'dayOptions',
                defaultValue: 'PO',
            },
            {
                name: 'startTime',
                labelKey: 'preferences.params.startTime',
                type: 'time',
                defaultValue: '10:00',
            },
            {
                name: 'endTime',
                labelKey: 'preferences.params.endTime',
                type: 'time',
                defaultValue: '12:00',
            },
        ],
        displayFormatter: (params, t) =>
            t('preferences.displayLabels.avoidTimes', {
                day: t(
                    `preferences.dayOptions.${EVENT_TYPE_TO_KEY_MAP[params.day.toLowerCase()] || 'other'}`,
                    params.day
                ),
                startTime: params.startTime,
                endTime: params.endTime,
            }),
    },
    // Preference pro preferování konkrétního vyučujícího u daného předmětu a typu výuky
    PREFER_INSTRUCTOR: {
        labelKey: 'preferences.types.PREFER_INSTRUCTOR.label',
        shortLabelKey: 'preferences.types.PREFER_INSTRUCTOR.shortLabel',
        defaultLabel: 'Preferovat vyučujícího',
        params: [
            {
                name: 'courseCode',
                labelKey: 'preferences.params.courseCode',
                type: 'customCourseSelect',
                defaultValue: '',
            },
            {
                name: 'eventType',
                labelKey: 'preferences.params.eventType',
                type: 'customEventTypeSelect',
                defaultValue: '',
            },
            {
                name: 'instructorName',
                labelKey: 'preferences.params.instructorName',
                type: 'customInstructorSelect',
                defaultValue: '',
            },
        ],
        displayFormatter: (params, t) => {
            const eventTypeDisplay = params.eventType
                ? t(`courseEvent.${params.eventType.toLowerCase()}`, params.eventType)
                : t('common.notSpecified');
            return t('preferences.displayLabels.preferInstructor', {
                instructorName: params.instructorName || t('common.notSpecified'),
                courseCode: params.courseCode || t('common.notSpecified'),
                eventType: eventTypeDisplay,
            });
        },
    },
};

// Dostupné hodnoty pro výběrové parametry preferencí
export const PREFERENCE_OPTIONS = {
    dayOptions: ['PO', 'UT', 'ST', 'CT', 'PA', 'SO', 'NE'],
};

export const usePreferenceManagement = () => {
    const {
        preferences: rawPreferences,
        addPreference: addPrefToContext, // Z kontextu
        deletePreference: deletePrefFromContext, // Z kontextu
        handleRemoveAllPreferences: handleRemoveAllPreferencesFromContext, // Nová z kontextu
        updatePreference: updatePrefInContext, // Z kontextu
        updatePreferencePriority: updatePrefPriorityInContext,
        togglePreferenceActive: togglePrefActiveInContext,
        generateAndSetSchedules,
    } = useWorkspace();
    const { showSnackbar } = useSnackbar(); // Zůstává pro notifikace specifické pro tento hook
    const { t } = useTranslation();

    const preferences = Object.values(rawPreferences || {}).sort((a, b) => a.priority - b.priority);

    // addPreference, deletePreference, updatePreference jsou nyní volány přímo z WorkspaceContext,
    // který se stará o snackbary.
    const addPreference = addPrefToContext;
    const deletePreference = deletePrefFromContext;
    const updatePreference = updatePrefInContext;
    const handleRemoveAllPreferences = handleRemoveAllPreferencesFromContext;

    const changePreferencePriority = useCallback(
        (preferenceId, direction) => {
            updatePrefPriorityInContext(preferenceId, direction);
            // showSnackbar(t('preferences.alerts.priorityChanged'), 'info'); // WorkspaceContext to řeší
        },
        [updatePrefPriorityInContext]
    );

    const togglePreferenceActive = useCallback(
        preferenceId => {
            togglePrefActiveInContext(preferenceId);
            // showSnackbar(t('preferences.alerts.activityChanged'), 'info'); // WorkspaceContext to řeší
        },
        [togglePrefActiveInContext]
    );

    const handleGenerateSchedule = useCallback(async () => {
        const activePrefsCount = preferences.filter(p => p.isActive).length;
        showSnackbar(t('propertiesBar.generateScheduleAlert', { count: activePrefsCount }), 'info');
        const success = generateAndSetSchedules();
        if (success) {
            showSnackbar(t('propertiesBar.generateScheduleSuccess'), 'success');
        } else {
            showSnackbar(t('propertiesBar.generateScheduleFailure'), 'warning');
        }
    }, [generateAndSetSchedules, showSnackbar, t, preferences]);

    const getPreferenceDisplayLabel = useCallback(
        preference => {
            const config = PREFERENCE_CONFIG[preference.type];
            if (config && config.displayFormatter) {
                const formattedParams = { ...preference.params };
                if (config.params) {
                    config.params.forEach(paramDef => {
                        if (
                            paramDef.type === 'select' &&
                            paramDef.optionsKey === 'dayOptions' &&
                            preference.params &&
                            preference.params[paramDef.name]
                        ) {
                            formattedParams[paramDef.name] = t(
                                `preferences.dayOptions.${preference.params[paramDef.name]}`,
                                preference.params[paramDef.name]
                            );
                        }
                        // Přidáme formátování pro nový typ preference, pokud je potřeba specifické zobrazení parametru
                        // Pro PREFER_INSTRUCTOR se o formátování stará přímo jeho displayFormatter
                    });
                }
                return config.displayFormatter(formattedParams, t);
            }
            return t(
                config?.shortLabelKey || `preferences.types.${preference.type}.shortLabel`,
                preference.type
            );
        },
        [t]
    );

    return {
        preferences,
        PREFERENCE_CONFIG,
        PREFERENCE_OPTIONS,
        addPreference,
        deletePreference,
        handleRemoveAllPreferences, // Vystavena
        updatePreference,
        changePreferencePriority,
        togglePreferenceActive,
        handleGenerateSchedule,
        getPreferenceDisplayLabel,
    };
};
