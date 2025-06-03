// src/contexts/WorkspaceContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import WorkspaceService from '../services/WorkspaceService';
import ScheduleClass from '../services/ScheduleClass'; // Potřebné pro instanceof check

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
    const workspaceService = useMemo(() => new WorkspaceService(), []);

    const [courses, setCourses] = useState([]);
    const [activeSchedule, setActiveSchedule] = useState(new ScheduleClass());
    const [generatedSchedules, setGeneratedSchedules] = useState([]);
    const [activeScheduleIndex, setActiveScheduleIndex] = useState(-1);
    const [preferences, setPreferences] = useState({}); // Preference jsou nyní spravovány v PropertiesBar
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
    const [workspaceYear, setWorkspaceYear] = useState('');
    const [workspaceSemester, setWorkspaceSemester] = useState('');

    const syncStateFromService = useCallback((showSaveNotification = false) => {
        setCourses([...workspaceService.getAllCourses()]);

        const currentServiceSchedule = workspaceService.getActiveSchedule();
        if (currentServiceSchedule instanceof ScheduleClass) {
            setActiveSchedule(currentServiceSchedule);
        } else {
            console.error("WorkspaceContext: workspaceService.getActiveSchedule() did not return a ScheduleClass instance!", currentServiceSchedule);
            // Fallback, pokud by getActiveSchedule nevrátilo správný typ
            const fallbackSchedule = new ScheduleClass();
            if (currentServiceSchedule && Array.isArray(currentServiceSchedule.enrolledEvents)) {
                // Pokus o záchranu dat, pokud je to plain object
                const eventInstances = currentServiceSchedule.enrolledEvents
                    .map(eventData => workspaceService.findEventByIdGlobal(eventData.id))
                    .filter(Boolean);
                fallbackSchedule.addEvents(eventInstances);
            }
            setActiveSchedule(fallbackSchedule);
        }

        setGeneratedSchedules([...workspaceService.generatedSchedules]);
        setActiveScheduleIndex(workspaceService.activeScheduleIndex);
        setPreferences({ ...workspaceService.preferences }); // Načítání preferencí
        setWorkspaceYear(workspaceService.year);
        setWorkspaceSemester(workspaceService.semester);

        // Debounced save je nyní interní v WorkspaceService, pokud se tak rozhodneme,
        // nebo jej můžeme volat explicitně zde. Prozatím necháme explicitní save.
        if (showSaveNotification) {
            // Zde by se volala snackbar notifikace, např. pomocí SnackbarContext
            console.log("WorkspaceContext: Workspace would be saved here with notification.");
            workspaceService.saveWorkspace();
        } else {
            workspaceService.saveWorkspace();
        }
    }, [workspaceService]);

    useEffect(() => {
        setIsLoadingWorkspace(true);
        const loaded = workspaceService.loadWorkspace(); // loadWorkspace by měl vrátit true/false nebo data
        syncStateFromService();
        setIsLoadingWorkspace(false);
        if (loaded) {
            console.log("WorkspaceContext: Workspace loaded from storage.");
        } else {
            console.log("WorkspaceContext: New workspace initialized (or dummy data loaded).");
        }
    }, [workspaceService, syncStateFromService]);

    const addCourse = useCallback((courseData) => {
        workspaceService.addCourse(courseData);
        syncStateFromService(true); // true pro zobrazení notifikace o uložení
    }, [workspaceService, syncStateFromService]);

    const removeCourse = useCallback((courseId) => {
        workspaceService.removeCourse(courseId);
        syncStateFromService(true);
    }, [workspaceService, syncStateFromService]);

    const toggleEventInSchedule = useCallback((eventToToggle, isCurrentlyEnrolled) => {
        const schedule = workspaceService.getActiveSchedule();
        if (!schedule) {
            console.error("WorkspaceContext: Cannot toggle event, activeSchedule is null.");
            return false; // Indikace chyby
        }
        if (isCurrentlyEnrolled) {
            schedule.removeEventById(eventToToggle.id);
        } else {
            // Zde může být validace (kapacita, konflikty atd.), pokud ji chceme přesunout z EditorPage
            schedule.addEvent(eventToToggle);
        }
        syncStateFromService(false); // Obvykle se při toggle neukazuje "Workspace Saved"
        return true; // Indikace úspěchu
    }, [workspaceService, syncStateFromService]);

    const updateWorkspaceSettings = useCallback((year, semester) => {
        workspaceService.year = year;
        workspaceService.semester = semester;
        syncStateFromService(true);
    }, [workspaceService, syncStateFromService]);

    // Funkce pro preference
    const addPreference = useCallback((preference) => {
        workspaceService.addPreference(preference); // Předpokládá existenci této metody
        syncStateFromService(true);
    }, [workspaceService, syncStateFromService]);

    const deletePreference = useCallback((preferenceId) => {
        workspaceService.deletePreference(preferenceId); // Předpokládá existenci
        syncStateFromService(true);
    }, [workspaceService, syncStateFromService]);

    const updatePreference = useCallback((preferenceId, updatedData) => {
        workspaceService.updatePreference(preferenceId, updatedData); // Předpokládá existenci
        syncStateFromService(true);
    }, [workspaceService, syncStateFromService]);

    const updatePreferencePriority = useCallback((preferenceId, direction) => {
        workspaceService.updatePreferencePriority(preferenceId, direction); // Přidáno do WorkspaceService
        syncStateFromService(true); // Notifikace může být volitelná
    }, [workspaceService, syncStateFromService]);

    const togglePreferenceActive = useCallback((preferenceId) => {
        workspaceService.togglePreferenceActive(preferenceId); // Přidáno do WorkspaceService
        syncStateFromService(true); // Notifikace může být volitelná
    }, [workspaceService, syncStateFromService]);


    const generateAndSetSchedules = useCallback(() => {
        const success = workspaceService.generateSchedule();
        syncStateFromService(); // Zobrazí nově vygenerované rozvrhy
        return success;
    }, [workspaceService, syncStateFromService]);

    const setActiveGeneratedSchedule = useCallback((index) => {
        workspaceService.setActiveScheduleIndex(index);
        syncStateFromService();
    }, [workspaceService, syncStateFromService]);

    const clearFullWorkspace = useCallback(() => {
        workspaceService.clearWorkspace(true); // true pro odstranění z localStorage
        syncStateFromService(false); // false, protože se "maže", ne ukládá nový stav
        // Po vymazání může být vhodné znovu načíst výchozí (dummy) data, pokud je to žádoucí
        // workspaceService.loadWorkspace(); // Tím se načtou dummy data, pokud je localStorage prázdný
        // syncStateFromService();
    }, [workspaceService, syncStateFromService]);

    const findEventByIdGlobal = useCallback((eventId) => {
        return workspaceService.findEventByIdGlobal(eventId);
    }, [workspaceService]);

    const value = {
        workspaceService, // Přímý přístup, pokud je potřeba (s opatrností)
        courses,
        activeSchedule,
        generatedSchedules,
        activeScheduleIndex,
        preferences,
        isLoadingWorkspace,
        workspaceYear,
        workspaceSemester,
        addCourse,
        removeCourse,
        toggleEventInSchedule,
        updateWorkspaceSettings,
        addPreference,
        deletePreference,
        updatePreference,
        updatePreferencePriority, // Přidáno
        togglePreferenceActive, // Přidáno
        generateAndSetSchedules,
        setActiveGeneratedSchedule,
        clearFullWorkspace,
        syncStateFromService, // Může být užitečné pro explicitní resynchronizaci
        findEventByIdGlobal,
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