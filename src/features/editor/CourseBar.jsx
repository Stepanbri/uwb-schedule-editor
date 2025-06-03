// PROJEKT/NEW/src/features/editor/CourseBar.jsx
import React from 'react';
import {Box, Typography, CircularProgress, Button, Stack, alpha} from '@mui/material'; // Odebrán nepoužitý Divider
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School'; // Ikona pro studijní plán
import { useTranslation } from 'react-i18next';

import CourseNodeHeader from './CourseBar/CourseNodeHeader';
import EventNode from './CourseBar/EventNode';
import { EVENT_TYPE_TO_KEY_MAP } from '../../services/CourseClass'; // Upravena cesta dle vaší struktury
import ScheduleClass from '../../services/ScheduleClass'; // Přidán import pro type checking

function CourseBar({
                       courses,
                       activeSchedule,
                       onRemoveCourse,
                       onToggleEvent,
                       isLoading = false,
                       onOpenLoadCourseFromSTAGDialog,
                       onOpenLoadCoursesFromStudentDialog // Nová prop pro otevření dialogu
                   }) {
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>{t('labels.loadingCourses', 'Načítání předmětů...')}</Typography>
            </Box>
        );
    }

    let enrolledEventIds = new Set();
    if (activeSchedule && typeof activeSchedule.getAllEnrolledEvents === 'function') {
        const eventsList = activeSchedule.getAllEnrolledEvents() || [];
        enrolledEventIds = new Set(eventsList.map(e => e.id));
    } else if (activeSchedule) {
        // Toto varování pomůže odhalit, pokud activeSchedule není správného typu
        console.warn("CourseBar: activeSchedule is present but getAllEnrolledEvents is not a function. Received:", activeSchedule);
    }


    const coursesByDepartment = courses.reduce((acc, course) => {
        const dept = course.departmentCode || t('labels.unknownDepartment', 'Neznámá katedra');
        if (!acc[dept]) {
            acc[dept] = [];
        }
        acc[dept].push(course);
        return acc;
    }, {});

    const getItemId = (prefix, id) => `${prefix}-${id}`;


    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: { xs: 0.5, sm: 1 } }}>
            <Stack direction="column" spacing={1} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', mb: 1, flexShrink: 0 }}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={onOpenLoadCourseFromSTAGDialog}
                    sx={{textTransform: 'none', justifyContent: 'flex-start'}}
                    aria-label={t('courseBar.loadSingleFromSTAG', 'Načíst předmět ze STAGu')}
                >
                    {t('courseBar.loadSingleFromSTAG', 'Načíst předmět ze STAGu')}
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SchoolIcon />}
                    onClick={onOpenLoadCoursesFromStudentDialog}
                    sx={{textTransform: 'none', justifyContent: 'flex-start'}}
                    aria-label={t('courseBar.loadFromStudentPlan', 'Předměty z plánu studenta')}
                >
                    {t('courseBar.loadFromStudentPlan', 'Předměty z plánu studenta')}
                </Button>
                {/* Další tlačítka (JSON, manuální) mohou být přidána zde */}
            </Stack>

            {(!courses || courses.length === 0) ? (
                <Box sx={{ p: 2, textAlign: 'center', flexGrow:1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">
                        {t('labels.noCoursesToDisplay', 'Žádné předměty k zobrazení. Nahrajte soubor s předměty nebo načtěte uložený stav.')}
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    <SimpleTreeView
                        defaultCollapseIcon={<ExpandMoreIcon />}
                        defaultExpandIcon={<ChevronRightIcon />}
                        sx={{ flexGrow: 1 }}
                    >
                        {Object.entries(coursesByDepartment).map(([departmentCode, deptCourses]) => (
                            <TreeItem
                                key={getItemId('dept', departmentCode)}
                                itemId={getItemId('dept', departmentCode)}
                                label={
                                    <Typography sx={{ fontWeight: 'bold', fontSize: '1rem', py: '4px', color: 'primary.main' }}>
                                        {departmentCode}
                                    </Typography>
                                }
                                sx={{ '& > .MuiTreeItem-content': { py: '2px', '&:hover': {backgroundColor: (theme) => alpha(theme.palette.action.hover, 0.04)} } }}
                            >
                                {deptCourses.map((course) => {
                                    const enrolledCounts = course.getEnrolledCounts(enrolledEventIds);
                                    const neededEnrollmentsDisplay = course.getDisplayableNeededEnrollments(enrolledEventIds);
                                    const areAllReqsMet = course.areAllEnrollmentRequirementsMet(enrolledEventIds);

                                    return (
                                        <TreeItem
                                            key={getItemId('course', course.id)}
                                            itemId={getItemId('course', course.id)}
                                            label={
                                                <CourseNodeHeader
                                                    course={course}
                                                    enrolledCounts={enrolledCounts}
                                                    neededEnrollmentsDisplay={neededEnrollmentsDisplay}
                                                    areAllRequirementsMet={areAllReqsMet}
                                                    onRemoveCourse={onRemoveCourse}
                                                />
                                            }
                                            sx={{
                                                '& > .MuiTreeItem-content': { py: '1px', '&:hover': { bgcolor: (theme) => alpha(theme.palette.action.hover, 0.08)} }, // Jemnější hover pro položku kurzu
                                                '& > .MuiTreeItem-content.Mui-focused, & > .MuiTreeItem-content.Mui-selected, & > .MuiTreeItem-content.Mui-selected.Mui-focused': {
                                                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12), // Výraznější selekce
                                                }
                                            }}
                                        >
                                            {course.events && course.events.length > 0 ? (
                                                course.events.map((event) => {
                                                    const isEnrolled = enrolledEventIds.has(event.id);
                                                    // Normalizujeme typ události pro vyhledání v EVENT_TYPE_TO_KEY_MAP
                                                    const normalizedEventType = event.type?.toLowerCase() || '';
                                                    const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[normalizedEventType] || normalizedEventType;

                                                    const typeRequirementMetForCourse = course.isEnrollmentTypeRequirementMet(eventTypeKey, enrolledEventIds);

                                                    let canEnroll = true;
                                                    let disabledTooltipText = '';

                                                    if (event.currentCapacity >= event.maxCapacity) {
                                                        canEnroll = false;
                                                        disabledTooltipText = t('tooltips.enrollDisabledCapacityFull', 'Kapacita této akce je plná.');
                                                    } else if (typeRequirementMetForCourse && !isEnrolled) {
                                                        canEnroll = false;
                                                        disabledTooltipText = t('tooltips.enrollDisabledTypeMet', `Požadovaný počet akcí typu "${t(`courseEvent.${eventTypeKey}`, event.type)}" pro tento předmět je již naplněn.`, { eventType: t(`courseEvent.${eventTypeKey}`, event.type) });
                                                    }

                                                    return (
                                                        <TreeItem
                                                            key={getItemId('event', event.id)}
                                                            itemId={getItemId('event', event.id)}
                                                            label={
                                                                <EventNode
                                                                    event={event}
                                                                    isEnrolled={isEnrolled}
                                                                    onToggleEvent={onToggleEvent}
                                                                    canEnroll={isEnrolled ? true : canEnroll}
                                                                    disabledTooltipText={disabledTooltipText}
                                                                />
                                                            }
                                                            sx={{
                                                                '& > .MuiTreeItem-content': {
                                                                    p: '2px 0', width: '100%', cursor: 'default',
                                                                    '&:hover': { backgroundColor: 'transparent' }, // EventNode si řeší vlastní hover
                                                                },
                                                                '& > .MuiTreeItem-content.Mui-focused, & > .MuiTreeItem-content.Mui-selected, & > .MuiTreeItem-content.Mui-selected.Mui-focused': {
                                                                    backgroundColor: 'transparent', // EventNode si řeší vlastní focus/select
                                                                },
                                                                '& .MuiTreeItem-label': { width: '100%', p: 0, m: 0 }
                                                            }}
                                                        />
                                                    );
                                                })
                                            ) : (
                                                <Typography sx={{ fontStyle: 'italic', p: '8px 16px', fontSize: '0.8rem', color: 'text.disabled' }}>
                                                    {t('labels.noEventsForCourse', 'Tento předmět nemá žádné rozvrhové akce.')}
                                                </Typography>
                                            )}
                                        </TreeItem>
                                    );
                                })}
                            </TreeItem>
                        ))}
                    </SimpleTreeView>
                </Box>
            )}
        </Box>
    );
}

export default CourseBar;