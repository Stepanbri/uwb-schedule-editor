// src/features/editor/hooks/useCourseManagement.js
import { useCallback } from 'react';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useTranslation } from 'react-i18next';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass'; // Import pro mapování typu

export const useCourseManagement = () => {
    const {
        courses,
        activeSchedule,
        addCourse: addCourseToWorkspaceContext,
        removeCourse: removeCourseFromWorkspaceContext,
        toggleEventInSchedule: toggleEventInScheduleContext,
        syncStateFromService // Pro případné vynucení synchronizace
    } = useWorkspace();
    const { showSnackbar } = useSnackbar();
    const { t } = useTranslation();

    const addCourse = useCallback((courseData, operationType = 'added') => {
        // Logika pro kontrolu existujícího kurzu by mohla být zde nebo v WorkspaceService
        // Prozatím se spoléháme na logiku v WorkspaceService.addCourse
        addCourseToWorkspaceContext(courseData);
        if (operationType === 'overwritten') {
            showSnackbar(t('alerts.courseOverwritten', { courseCode: `${courseData.departmentCode}/${courseData.courseCode}` }), 'info');
        } else {
            showSnackbar(t('alerts.courseAdded', { courseCode: `${courseData.departmentCode}/${courseData.courseCode}` }), 'success');
        }
    }, [addCourseToWorkspaceContext, showSnackbar, t]);

    const removeCourse = useCallback((courseId) => {
        // Najdeme kurz pro zobrazení jeho kódu v notifikaci, než bude odstraněn
        const courseToRemove = courses.find(c => c.id === courseId || c.stagId === courseId);
        const courseIdentifier = courseToRemove ? courseToRemove.getShortCode() : courseId;

        removeCourseFromWorkspaceContext(courseId);
        showSnackbar(t('alerts.courseRemoved', { courseId: courseIdentifier }), 'success');
    }, [courses, removeCourseFromWorkspaceContext, showSnackbar, t]);

    const toggleEventInSchedule = useCallback((eventToToggle, isCurrentlyEnrolled, courseContext) => {
        // `courseContext` je předmět, ke kterému událost patří, získaný v komponentě
        if (isCurrentlyEnrolled) {
            toggleEventInScheduleContext(eventToToggle, true); // Odzapsat
            showSnackbar(t('alerts.eventUnenrolled', { eventType: eventToToggle.type, courseCode: eventToToggle.courseCode }), 'info');
        } else {
            // Validace před zápisem
            let canEnroll = true;
            let alertMsg = "";

            if (eventToToggle.currentCapacity >= eventToToggle.maxCapacity) {
                alertMsg = t('alerts.eventFull', { eventType: eventToToggle.type, courseCode: eventToToggle.courseCode });
                canEnroll = false;
            } else if (courseContext) {
                // Normalizujeme typ události pro vyhledání v EVENT_TYPE_TO_KEY_MAP
                const normalizedEventType = eventToToggle.type?.toLowerCase() || '';
                const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[normalizedEventType] || normalizedEventType;

                const enrolledEventIds = new Set(activeSchedule.getAllEnrolledEvents().map(e => e.id));

                if (eventTypeKey && courseContext.isEnrollmentTypeRequirementMet(eventTypeKey, enrolledEventIds)) {
                    alertMsg = t('alerts.typeRequirementMet', {
                        eventType: t(`courseEvent.${eventTypeKey}`, eventToToggle.type), // Překlad typu události
                        courseCode: courseContext.getShortCode()
                    });
                    canEnroll = false;
                }
            }

            if (canEnroll) {
                toggleEventInScheduleContext(eventToToggle, false); // Zapsat
                showSnackbar(t('alerts.eventEnrolled', { eventType: eventToToggle.type, courseCode: eventToToggle.courseCode }), 'success');
            } else {
                showSnackbar(alertMsg, 'warning');
                return; // Neúspěch, neprovádíme toggle
            }
        }
    }, [toggleEventInScheduleContext, activeSchedule, showSnackbar, t]);

    return {
        courses, // Poskytuje aktuální seznam kurzů z WorkspaceContext
        activeSchedule, // Poskytuje aktuální aktivní rozvrh
        addCourse,
        removeCourse,
        toggleEventInSchedule,
        forceSync: syncStateFromService // Pokud by bylo potřeba explicitně volat
    };
};