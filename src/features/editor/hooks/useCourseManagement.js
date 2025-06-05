// src/features/editor/hooks/useCourseManagement.js
import { useCallback } from 'react';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useTranslation } from 'react-i18next';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass';

export const useCourseManagement = () => {
    const {
        courses,
        activeSchedule,
        addCourse: addCourseToWorkspaceContext, // Nyní řešeno v kontextu
        removeCourse: removeCourseFromWorkspaceContext, // Nyní řešeno v kontextu
        handleRemoveAllCourses: handleRemoveAllCoursesFromContext, // Nová funkce z kontextu
        toggleEventInSchedule: toggleEventInScheduleContext,
        syncStateFromService
    } = useWorkspace();
    const { showSnackbar } = useSnackbar();
    const { t } = useTranslation();

    // addCourse a removeCourse jsou nyní primárně řešeny v WorkspaceContext,
    // který zobrazuje vlastní snackbary.
    // Zde ponecháme jen toggleEventInSchedule, pokud chceme specifickou logiku/notifikace pro něj.

    const toggleEventInSchedule = useCallback((eventToToggle, isCurrentlyEnrolled, courseContext) => {
        if (isCurrentlyEnrolled) {
            toggleEventInScheduleContext(eventToToggle, true);
            showSnackbar(t('alerts.eventUnenrolled', { eventType: eventToToggle.type, courseCode: eventToToggle.courseCode }), 'info');
        } else {
            let canEnroll = true;
            let alertMsg = "";

            if (courseContext) {
                const normalizedEventType = eventToToggle.type?.toLowerCase() || '';
                const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[normalizedEventType] || normalizedEventType;
                const enrolledEventIds = new Set(activeSchedule.getAllEnrolledEvents().map(e => e.id));

                if (eventTypeKey && courseContext.isEnrollmentTypeRequirementMet(eventTypeKey, enrolledEventIds)) {
                    alertMsg = t('alerts.typeRequirementMet', {
                        eventType: t(`courseEvent.${eventTypeKey}`, eventToToggle.type),
                        courseCode: courseContext.getShortCode()
                    });
                    canEnroll = false;
                }
            }

            if (canEnroll) {
                toggleEventInScheduleContext(eventToToggle, false);
                showSnackbar(t('alerts.eventEnrolled', { eventType: eventToToggle.type, courseCode: eventToToggle.courseCode }), 'success');
            } else {
                showSnackbar(alertMsg, 'warning');
                return;
            }
        }
    }, [toggleEventInScheduleContext, activeSchedule, showSnackbar, t]);

    // Použijeme přímo funkce z kontextu pro jednoduchost, pokud nepotřebujeme další logiku v hooku
    const addCourse = addCourseToWorkspaceContext;
    const removeCourse = removeCourseFromWorkspaceContext;
    const handleRemoveAllCourses = handleRemoveAllCoursesFromContext;


    return {
        courses,
        activeSchedule,
        addCourse,
        removeCourse,
        handleRemoveAllCourses, // Vystavena funkce z kontextu
        toggleEventInSchedule,
        forceSync: syncStateFromService
    };
};