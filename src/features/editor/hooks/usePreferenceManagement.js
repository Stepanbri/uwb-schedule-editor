// src/features/editor/hooks/usePreferenceManagement.js
import { useCallback } from 'react';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useTranslation } from 'react-i18next';

// Definice typů preferencí a jejich parametrů (může být přesunuto do constants)
// Toto je příklad, upravte dle vaší stávající PREFERENCE_CONFIG z PropertiesBar
export const PREFERENCE_CONFIG = {
    FREE_DAY: {
        labelKey: 'preferences.types.FREE_DAY.label',
        shortLabelKey: 'preferences.types.FREE_DAY.shortLabel',
        defaultLabel: 'Volný den',
        params: [
            { name: 'day', labelKey: 'preferences.params.day', type: 'select', optionsKey: 'dayOptions', defaultValue: 'PO' },
        ],
        displayFormatter: (params, t) => t('preferences.displayLabels.freeDay', `Volný den: {{day}}`, { day: t(`preferences.dayOptions.${params.day}`, params.day) })
    },
    AVOID_TIMES: {
        labelKey: 'preferences.types.AVOID_TIMES.label',
        shortLabelKey: 'preferences.types.AVOID_TIMES.shortLabel',
        defaultLabel: 'Vyhnout se časům',
        params: [
            { name: 'day', labelKey: 'preferences.params.day', type: 'select', optionsKey: 'dayOptions', defaultValue: 'PO' },
            { name: 'startTime', labelKey: 'preferences.params.startTime', type: 'time', defaultValue: '10:00' },
            { name: 'endTime', labelKey: 'preferences.params.endTime', type: 'time', defaultValue: '12:00' },
        ],
        displayFormatter: (params, t) => t('preferences.displayLabels.avoidTimes', `Nevolno {{day}}: {{startTime}} - {{endTime}}`, { day: t(`preferences.dayOptions.${params.day}`, params.day), startTime: params.startTime, endTime: params.endTime })
    },
    // PREFER_INSTRUCTOR by zde také mohla být
};

// Možnosti pro selecty (může být v i18n souborech nebo constants)
export const PREFERENCE_OPTIONS = {
    dayOptions: ['PO', 'UT', 'ST', 'CT', 'PA', 'SO', 'NE'] // Klíče pro překlad
};


export const usePreferenceManagement = () => {
    const {
        preferences: rawPreferences, // Objekt preferencí z kontextu
        addPreference: addPrefToContext,
        deletePreference: deletePrefFromContext,
        updatePreference: updatePrefInContext,
        updatePreferencePriority: updatePrefPriorityInContext,
        togglePreferenceActive: togglePrefActiveInContext,
        generateAndSetSchedules,
    } = useWorkspace();
    const { showSnackbar } = useSnackbar();
    const { t } = useTranslation();

    // Převod objektu preferencí na pole a seřazení dle priority pro zobrazení
    // Toto by se mělo dít v komponentě, která zobrazuje seznam, nebo zde, pokud je to čistší
    const preferences = Object.values(rawPreferences || {}).sort((a, b) => a.priority - b.priority);

    const addPreference = useCallback((newPreferenceData) => {
        // newPreferenceData by měla být { type: '...', params: { ... } }
        // ID a priorita budou doplněny v WorkspaceService/Context
        addPrefToContext(newPreferenceData); // Kontext se postará o normalizaci priorit atd.
        showSnackbar(t('preferences.alerts.added', 'Preference přidána'), 'success');
    }, [addPrefToContext, showSnackbar, t]);

    const deletePreference = useCallback((preferenceId) => {
        deletePrefFromContext(preferenceId);
        showSnackbar(t('preferences.alerts.deleted', 'Preference odstraněna'), 'info');
    }, [deletePrefFromContext, showSnackbar, t]);

    const updatePreference = useCallback((preferenceId, updatedData) => {
        updatePrefInContext(preferenceId, updatedData);
        showSnackbar(t('preferences.alerts.updated', 'Preference aktualizována'), 'success');
    }, [updatePrefInContext, showSnackbar, t]);

    const changePreferencePriority = useCallback((preferenceId, direction) => {
        updatePrefPriorityInContext(preferenceId, direction);
        // Notifikace může být zde, pokud je potřeba
        // showSnackbar(t('preferences.alerts.priorityChanged', 'Priorita preference upravena'), 'success');
    }, [updatePrefPriorityInContext]);

    const togglePreferenceActive = useCallback((preferenceId) => {
        togglePrefActiveInContext(preferenceId);
        // showSnackbar(t('preferences.alerts.activityChanged', 'Aktivita preference změněna'), 'info');
    }, [togglePrefActiveInContext]);

    const handleGenerateSchedule = useCallback(async () => {
        showSnackbar(t('propertiesBar.generateScheduleLog', 'Spouštím generování rozvrhu...'), 'info');
        const success = generateAndSetSchedules(); // Tato metoda je již v WorkspaceContext
        if (success) {
            showSnackbar(t('propertiesBar.generateScheduleSuccess', 'Rozvrhy byly vygenerovány.'), 'success');
        } else {
            showSnackbar(t('propertiesBar.generateScheduleFailure', 'Nepodařilo se vygenerovat žádné rozvrhy splňující kritéria.'), 'warning');
        }
    }, [generateAndSetSchedules, showSnackbar, t]);

    const getPreferenceDisplayLabel = useCallback((preference) => {
        const config = PREFERENCE_CONFIG[preference.type];
        if (config && config.displayFormatter) {
            // Zajistíme, aby parametry pro formátování byly také přeloženy, pokud je to nutné (např. dny)
            const formattedParams = { ...preference.params };
            if (config.params) {
                config.params.forEach(paramDef => {
                    if (paramDef.type === 'select' && paramDef.optionsKey === 'dayOptions') {
                        formattedParams[paramDef.name] = t(`preferences.dayOptions.${preference.params[paramDef.name]}`, preference.params[paramDef.name]);
                    }
                });
            }
            return config.displayFormatter(formattedParams, t);
        }
        return t(config?.shortLabelKey || `preferences.types.${preference.type}.label`, preference.type);
    }, [t]);


    return {
        preferences, // Seřazené pole preferencí
        PREFERENCE_CONFIG, // Konfigurace pro formuláře atd.
        PREFERENCE_OPTIONS, // Možnosti pro selecty
        addPreference,
        deletePreference,
        updatePreference, // Obecná aktualizace, pokud bude potřeba měnit i jiné věci než prioritu/aktivitu
        changePreferencePriority,
        togglePreferenceActive,
        handleGenerateSchedule,
        getPreferenceDisplayLabel,
    };
};