// src/contexts/WorkspaceContext.jsx
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import WorkspaceService from '../services/WorkspaceService';
import ScheduleClass from '../services/ScheduleClass';
import { useSnackbar } from './SnackbarContext';
import { useTranslation } from 'react-i18next';
import { LOCAL_STORAGE_KEY } from '../services/WorkspaceService';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
    const workspaceService = useMemo(() => new WorkspaceService(), []);
    const { showSnackbar } = useSnackbar();
    const { t } = useTranslation();

    const [courses, setCourses] = useState([]);
    const [activeSchedule, setActiveSchedule] = useState(new ScheduleClass());
    const [generatedSchedules, setGeneratedSchedules] = useState([]);
    const [activeScheduleIndex, setActiveScheduleIndex] = useState(-1);
    const [preferences, setPreferences] = useState({});
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
    const [isWorkspaceInitialized, setIsWorkspaceInitialized] = useState(false);
    const [workspaceYear, setWorkspaceYear] = useState('');
    const [workspaceSemester, setWorkspaceSemester] = useState('');

    const syncStateFromService = useCallback((showSaveNotification = false) => {
        setCourses([...workspaceService.getAllCourses()]);
        const currentServiceSchedule = workspaceService.getActiveSchedule();
        if (currentServiceSchedule instanceof ScheduleClass) {
            setActiveSchedule(currentServiceSchedule);
        } else {
            console.error("WorkspaceContext: workspaceService.getActiveSchedule() did not return a ScheduleClass instance!", currentServiceSchedule);
            const fallbackSchedule = new ScheduleClass();
            if (currentServiceSchedule && Array.isArray(currentServiceSchedule.enrolledEvents)) {
                const eventInstances = currentServiceSchedule.enrolledEvents
                    .map(eventData => workspaceService.findEventByIdGlobal(eventData.id))
                    .filter(Boolean);
                fallbackSchedule.addEvents(eventInstances);
            }
            setActiveSchedule(fallbackSchedule);
        }
        setGeneratedSchedules([...workspaceService.generatedSchedules]);
        setActiveScheduleIndex(workspaceService.activeScheduleIndex);
        setPreferences({ ...workspaceService.preferences });
        setWorkspaceYear(workspaceService.year);
        setWorkspaceSemester(workspaceService.semester);

        if (isWorkspaceInitialized) { // Ukládáme jen pokud je workspace inicializován
            workspaceService.saveWorkspace();
            if (showSaveNotification) { // Notifikace jen pokud je explicitně vyžádána
                // showSnackbar(t('alerts.workspaceSaved'), 'success'); // Spíše per-akce
            }
        }
    }, [workspaceService, isWorkspaceInitialized, t /*, showSnackbar */]);

    const initializeWorkspace = useCallback(() => {
        if (isWorkspaceInitialized) return;
        setIsLoadingWorkspace(true);
        const loadedFromStorage = workspaceService.loadWorkspace();
        syncStateFromService(false);
        setIsLoadingWorkspace(false);
        setIsWorkspaceInitialized(true);

        if (localStorage.getItem(LOCAL_STORAGE_KEY) && loadedFromStorage) {
            showSnackbar(t('alerts.workspaceLoadedFromLocalStorage'), 'info');
        } else if (loadedFromStorage) {
            showSnackbar(t('alerts.loadedDummyData'), 'info');
        }
        workspaceService.saveWorkspace(); // Uložíme i po první inicializaci
    }, [isWorkspaceInitialized, workspaceService, syncStateFromService, showSnackbar, t]);

    const addCourse = useCallback((courseData) => {
        if (!isWorkspaceInitialized) return;
        const courseIdentifier = `${courseData.departmentCode}/${courseData.courseCode}`;
        const existingCourse = workspaceService.courses.find(c => c.id === courseIdentifier);

        workspaceService.addCourse(courseData);
        syncStateFromService(true); // true pro uložení
        if (existingCourse) {
            showSnackbar(t('alerts.courseOverwritten', { courseCode: courseIdentifier }), 'info');
        } else {
            showSnackbar(t('alerts.courseAdded', { courseCode: courseIdentifier }), 'success');
        }
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    const removeCourse = useCallback((courseId) => { // courseId je KATEDRA/KOD
        if (!isWorkspaceInitialized) return;
        const courseToRemove = workspaceService.courses.find(c => c.id === courseId);
        const courseIdentifier = courseToRemove ? courseToRemove.getShortCode() : courseId;
        workspaceService.removeCourse(courseId);
        syncStateFromService(true);
        showSnackbar(t('alerts.courseRemoved', { courseId: courseIdentifier }), 'success');
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    // Potvrzení se přesunulo do EditorPage
    const handleRemoveAllCourses = useCallback(() => {
        if (!isWorkspaceInitialized) return;
        workspaceService.removeAllCourses();
        syncStateFromService(true);
        showSnackbar(t('alerts.allCoursesRemoved'), 'success');
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    const toggleEventInSchedule = useCallback((eventToToggle, isCurrentlyEnrolled) => {
        // ... (jako dříve)
        if (!isWorkspaceInitialized) return false;
        const schedule = workspaceService.getActiveSchedule();
        if (!schedule) {
            console.error("WorkspaceContext: Cannot toggle event, activeSchedule is null.");
            return false;
        }
        if (isCurrentlyEnrolled) {
            schedule.removeEventById(eventToToggle.id);
        } else {
            schedule.addEvent(eventToToggle);
        }
        syncStateFromService(false);
        return true;
    }, [workspaceService, syncStateFromService, isWorkspaceInitialized]);

    const updateWorkspaceSettings = useCallback((year, semester) => {
        // ... (jako dříve)
        if (!isWorkspaceInitialized) return;
        workspaceService.year = year;
        workspaceService.semester = semester;
        syncStateFromService(true);
        showSnackbar(t('alerts.workspaceSaved'), 'info');
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    const addPreference = useCallback((preference) => {
        // ... (jako dříve)
        if (!isWorkspaceInitialized) return;
        workspaceService.addPreference(preference);
        syncStateFromService(true);
        showSnackbar(t('preferences.alerts.added'), 'success');
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    const deletePreference = useCallback((preferenceId) => {
        // Potvrzení se přesunulo do PreferenceItem
        if (!isWorkspaceInitialized) return;
        workspaceService.deletePreference(preferenceId);
        syncStateFromService(true);
        showSnackbar(t('preferences.alerts.deleted'), 'info');
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    // Potvrzení se přesunulo do EditorPage
    const handleRemoveAllPreferences = useCallback(() => {
        if (!isWorkspaceInitialized) return;
        workspaceService.removeAllPreferences();
        syncStateFromService(true);
        showSnackbar(t('preferences.alerts.allDeleted'), 'success');
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    const updatePreference = useCallback((preferenceId, updatedData) => {
        // ... (jako dříve)
        if (!isWorkspaceInitialized) return;
        workspaceService.updatePreference(preferenceId, updatedData);
        syncStateFromService(true);
        showSnackbar(t('preferences.alerts.updated'), 'success');
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    const updatePreferencePriority = useCallback((preferenceId, direction) => {
        // ... (jako dříve)
        if (!isWorkspaceInitialized) return;
        workspaceService.updatePreferencePriority(preferenceId, direction);
        syncStateFromService(true);
        showSnackbar(t('preferences.alerts.priorityChanged'), 'info');
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    const togglePreferenceActive = useCallback((preferenceId) => {
        // ... (jako dříve)
        if (!isWorkspaceInitialized) return;
        workspaceService.togglePreferenceActive(preferenceId);
        syncStateFromService(true);
        showSnackbar(t('preferences.alerts.activityChanged'), 'info');
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    const generateAndSetSchedules = useCallback(() => {
        // ... (jako dříve)
        if (!isWorkspaceInitialized) return false;
        const success = workspaceService.generateSchedule();
        syncStateFromService();
        return success;
    }, [workspaceService, syncStateFromService, isWorkspaceInitialized]);

    const setActiveGeneratedSchedule = useCallback((index) => {
        // ... (jako dříve)
        if (!isWorkspaceInitialized) return;
        workspaceService.setActiveScheduleIndex(index);
        syncStateFromService();
    }, [workspaceService, syncStateFromService, isWorkspaceInitialized]);

    // Potvrzení se přesunulo do EditorPage
    const clearFullWorkspace = useCallback(() => {
        workspaceService.clearWorkspace(true);
        setIsWorkspaceInitialized(false);
        setCourses([]);
        setActiveSchedule(new ScheduleClass());
        setGeneratedSchedules([]);
        setActiveScheduleIndex(-1);
        setPreferences({});
        setWorkspaceYear('');
        setWorkspaceSemester('');
        showSnackbar(t('alerts.workspaceCleared'), 'info');
    }, [workspaceService, showSnackbar, t]);

    const handleExportWorkspace = useCallback(() => {
        // ... (jako dříve)
        if (!isWorkspaceInitialized) {
            showSnackbar(t('common.error') + ': ' + t('alerts.workspaceNotInitializedYet', 'Pracovní plocha ještě nebyla načtena.'), 'warning');
            return;
        }
        if (workspaceService.exportWorkspaceAsJson()) {
            showSnackbar(t('alerts.workspaceExported'), 'success');
        } else {
            showSnackbar(t('alerts.workspaceExportFailed'), 'error');
        }
    }, [workspaceService, showSnackbar, t, isWorkspaceInitialized]);

    // Potvrzení se přesunulo do EditorPage (nebo zůstává zde window.confirm)
    const handleImportWorkspace = useCallback(async (file) => {
        if (!file) return;
        // Potvrzení je v EditorPage
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const wasInitialized = isWorkspaceInitialized;
            if (workspaceService.importWorkspaceFromJson(text)) {
                setIsWorkspaceInitialized(true);
                syncStateFromService(true);
                showSnackbar(t('alerts.workspaceImported'), 'success');
            } else {
                if (!wasInitialized) setIsWorkspaceInitialized(false);
                showSnackbar(t('alerts.workspaceImportFailed'), 'error');
            }
        };
        reader.onerror = () => {
            showSnackbar(t('alerts.fileReadError'), 'error');
        };
        reader.readAsText(file);
    }, [workspaceService, syncStateFromService, showSnackbar, t, isWorkspaceInitialized]);

    const handleSaveScheduleImage = useCallback(async (scheduleElement) => {
        // ... (jako dříve)
        if (!isWorkspaceInitialized) {
            showSnackbar(t('common.error') + ': ' + t('alerts.workspaceNotInitializedYet', 'Pracovní plocha ještě nebyla načtena.'), 'warning');
            return;
        }
        if (!scheduleElement) {
            showSnackbar(t('alerts.imageSaveError'), 'error');
            return;
        }
        const success = await workspaceService.saveScheduleImage(scheduleElement);
        if (!success) {
            showSnackbar(t('alerts.imageSaveError'), 'error');
        }
    }, [workspaceService, showSnackbar, t, isWorkspaceInitialized]);

    const findEventByIdGlobal = useCallback((eventId) => {
        return workspaceService.findEventByIdGlobal(eventId);
    }, [workspaceService]);

    const value = {
        workspaceService, courses, activeSchedule, generatedSchedules, activeScheduleIndex,
        preferences, isLoadingWorkspace, isWorkspaceInitialized, initializeWorkspace,
        workspaceYear, workspaceSemester, addCourse, removeCourse, handleRemoveAllCourses,
        toggleEventInSchedule, updateWorkspaceSettings, addPreference, deletePreference,
        handleRemoveAllPreferences, updatePreference, updatePreferencePriority,
        togglePreferenceActive, generateAndSetSchedules, setActiveGeneratedSchedule,
        clearFullWorkspace, syncStateFromService, findEventByIdGlobal,
        handleExportWorkspace, handleImportWorkspace, handleSaveScheduleImage,
    };

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
};