// Hook pro správu kurzů v editoru rozvrhu
// Poskytuje funkce pro přidávání, odebírání a manipulaci s předměty a jejich akcemi v rozvrhu
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass';

export const useCourseManagement = () => {
    const {
        courses,
        activeSchedule,
        addCourse: addCourseToWorkspaceContext, // Funkce z kontextu pro přidání kurzu
        removeCourse: removeCourseFromWorkspaceContext, // Funkce z kontextu pro odebrání kurzu
        handleRemoveAllCourses: handleRemoveAllCoursesFromContext, // Funkce pro odebrání všech kurzů
        toggleEventInSchedule: toggleEventInScheduleContext,
        syncStateFromService,
    } = useWorkspace();
    const { showSnackbar } = useSnackbar();
    const { t } = useTranslation();

    // Funkce pro přepínání zápisu/odhlášení rozvrhové akce v rozvrhu
    // Kontroluje splnění podmínek pro zápis/odhlášení a zobrazuje odpovídající notifikace
    const toggleEventInSchedule = useCallback(
        (eventToToggle, isCurrentlyEnrolled, courseContext) => {
            if (isCurrentlyEnrolled) {
                // When un-enrolling, we always allow it
                toggleEventInScheduleContext(eventToToggle, true);
                showSnackbar(
                    t('alerts.eventUnenrolled', {
                        eventType: eventToToggle.type,
                        courseCode: eventToToggle.courseCode,
                    }),
                    'info'
                );
            } else {
                // For enrolling, we need to check if the requirements are met
                let canEnroll = true;
                let alertMsg = '';

                if (courseContext) {
                    const normalizedEventType = eventToToggle.type?.toLowerCase() || '';
                    const eventTypeKey =
                        EVENT_TYPE_TO_KEY_MAP[normalizedEventType] || normalizedEventType;
                    const enrolledEventIds = new Set(
                        activeSchedule.getAllEnrolledEvents().map(e => e.id)
                    );

                    // Kontrola, zda je splněn požadavek na počet rozvrhových akcí daného typu
                    if (
                        eventTypeKey &&
                        courseContext.isEnrollmentTypeRequirementMet(eventTypeKey, enrolledEventIds)
                    ) {
                        alertMsg = t('alerts.typeRequirementMet', {
                            eventType: t(`courseEvent.${eventTypeKey}`, eventToToggle.type),
                            courseCode: courseContext.getShortCode(),
                        });
                        canEnroll = false;
                    }
                }

                if (canEnroll) {
                    toggleEventInScheduleContext(eventToToggle, false);
                    showSnackbar(
                        t('alerts.eventEnrolled', {
                            eventType: eventToToggle.type,
                            courseCode: eventToToggle.courseCode,
                        }),
                        'success'
                    );
                } else {
                    showSnackbar(alertMsg, 'warning');
                    return;
                }
            }
        },
        [toggleEventInScheduleContext, activeSchedule, showSnackbar, t]
    );

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
        forceSync: syncStateFromService,
    };
};
