import {
    Box,
    Pagination,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    styled
} from '@mui/material';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DAY_I18N_KEYS } from '../../../constants/constants';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass';
import { timeToMinutes } from '../../../utils/timeUtils';
import { useCourseManagement } from '../hooks/useCourseManagement';
import ScheduleEventItem from './ScheduleEventItem';

// Konstanty pro rozvrh
export const TIME_BLOCKS = [
    { label: '1.', start: '7:30', end: '8:15' },
    { label: '2.', start: '8:25', end: '9:10' },
    { label: '3.', start: '9:20', end: '10:05' },
    { label: '4.', start: '10:15', end: '11:00' },
    { label: '5.', start: '11:10', end: '11:55' },
    { label: '6.', start: '12:05', end: '12:50' },
    { label: '7.', start: '13:00', end: '13:45' },
    { label: '8.', start: '13:55', end: '14:40' },
    { label: '9.', start: '14:50', end: '15:35' },
    { label: '10.', start: '15:45', end: '16:30' },
    { label: '11.', start: '16:40', end: '17:25' },
    { label: '12.', start: '17:35', end: '18:20' },
    { label: '13.', start: '18:30', end: '19:15' },
    { label: '14.', start: '19:25', end: '20:10' },
];

const SCHEDULE_START_TIME_MINUTES = timeToMinutes(TIME_BLOCKS[0].start);
const SCHEDULE_END_TIME_MINUTES = timeToMinutes(TIME_BLOCKS[TIME_BLOCKS.length - 1].end);
const TOTAL_SCHEDULE_DURATION_MINUTES = SCHEDULE_END_TIME_MINUTES - SCHEDULE_START_TIME_MINUTES;

const DAY_CELL_WIDTH = 100;
const TIME_HEADER_HEIGHT = 60;
const MIN_EVENT_HEIGHT = 50;

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    maxHeight: `calc(100vh - ${theme.mixins.toolbar.minHeight}px - 48px - ${TIME_HEADER_HEIGHT}px - ${theme.spacing(1.5)} )`,
    overflow: 'auto',
    position: 'relative',
    border: `1px solid ${theme.palette.divider}`,
}));

const StickyTableCell = styled(TableCell)(({ theme, stickytype }) => ({
    position: 'sticky',
    backgroundColor: theme.palette.background.paper,
    zIndex: stickytype === 'day' ? theme.zIndex.appBar + 1 : theme.zIndex.appBar,
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderTop: `1px solid ${theme.palette.divider}`,
    ...(stickytype === 'day' && {
        left: 0,
        minWidth: DAY_CELL_WIDTH,
        width: DAY_CELL_WIDTH,
        borderRight: `1px solid ${theme.palette.divider}`,
    }),
    ...(stickytype === 'time' && {
        top: 0,
        textAlign: 'center',
        padding: 0,
        fontSize: '0.7rem',
        minWidth: '55px',
        borderLeft: `1px solid ${theme.palette.divider}`,
    }),
    ...(stickytype === 'corner' && {
        left: 0,
        top: 0,
        zIndex: theme.zIndex.appBar + 2,
        minWidth: DAY_CELL_WIDTH,
        width: DAY_CELL_WIDTH,
        borderRight: `1px solid ${theme.palette.divider}`,
    }),
}));

const DayRowCell = styled(TableCell)(({ theme }) => ({
    position: 'relative',
    height: MIN_EVENT_HEIGHT,
    padding: 0,
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
}));

const ScheduleSwitcherWrapper = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
}));

export const layoutEvents = eventsForDay => {
    if (!eventsForDay || eventsForDay.length === 0) return [];

    const sortedEvents = [...eventsForDay].sort((a, b) => {
        const startA = timeToMinutes(a.startTime);
        const startB = timeToMinutes(b.startTime);
        if (startA !== startB) return startA - startB;
        const endA = timeToMinutes(a.endTime);
        const endB = timeToMinutes(b.endTime);
        return endA - endB;
    });

    const levels = [];

    sortedEvents.forEach(event => {
        let placed = false;
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const collidesWithLevelEvent = level.some(placedEvent => {
                const eventStart = timeToMinutes(event.startTime);
                const eventEnd = timeToMinutes(event.endTime);
                const placedEventStart = timeToMinutes(placedEvent.startTime);
                const placedEventEnd = timeToMinutes(placedEvent.endTime);
                return eventStart < placedEventEnd && placedEventStart < eventEnd;
            });

            if (!collidesWithLevelEvent) {
                level.push(event);
                placed = true;
                break;
            }
        }

        if (!placed) {
            levels.push([event]);
        }
    });
    return levels;
};

function ScheduleBox() {
    const { t } = useTranslation();
    const {
        activeSchedule,
        courses,
        scheduleColorMode,
        generatedSchedules,
        activeScheduleIndex,
        setActiveGeneratedSchedule,
    } = useWorkspace();
    
    const { toggleEventInSchedule } = useCourseManagement();

    const scheduledEvents = activeSchedule ? activeSchedule.getAllEnrolledEvents() : [];
    const enrolledEventIds = useMemo(() => 
        new Set(scheduledEvents.map(event => event.id)), 
        [scheduledEvents]
    );

    const handleToggleEvent = useCallback((event, isCurrentlyEnrolled) => {
        const courseContext = courses.find(c => c.id === event.courseId);
        toggleEventInSchedule(event, isCurrentlyEnrolled, courseContext);
    }, [courses, toggleEventInSchedule]);

    // Get all events that should be shown in the schedule (enrolled + available for enrollment)
    const visibleEvents = useMemo(() => {
        // Map to store type requirements status for each course
        const courseTypeRequirementsMet = new Map();
        
        // Helper function to check if the required hours for a type are met
        const isTypeRequirementMet = (course, typeKey) => {
            const courseId = course.id;
            if (!courseTypeRequirementsMet.has(courseId)) {
                courseTypeRequirementsMet.set(courseId, {});
            }
            
            if (courseTypeRequirementsMet.get(courseId)[typeKey] === undefined) {
                const result = course.isEnrollmentTypeRequirementMet(typeKey, enrolledEventIds);
                courseTypeRequirementsMet.get(courseId)[typeKey] = result;
            }
            
            return courseTypeRequirementsMet.get(courseId)[typeKey];
        };
        
        // Events to show in the schedule
        const allVisibleEvents = [];
        
        // First, add all enrolled events
        scheduledEvents.forEach(event => {
            const course = courses.find(c => c.id === event.courseId);
            if (course) {
                allVisibleEvents.push({ ...event, course, isEnrolled: true });
            }
        });
        
        // Then, add available events that should be visible based on requirements
        courses.forEach(course => {
            course.events.forEach(event => {
                // Skip if already enrolled
                if (enrolledEventIds.has(event.id)) return;
                
                const normalizedEventType = event.type?.toLowerCase() || '';
                const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[normalizedEventType] || normalizedEventType;
                
                // Show this event if requirements for this type are not met
                if (!isTypeRequirementMet(course, eventTypeKey)) {
                    allVisibleEvents.push({ ...event, course, isEnrolled: false });
                }
            });
        });
        
        return allVisibleEvents;
    }, [courses, scheduledEvents, enrolledEventIds]);

    // Group events by day
    const eventsByDay = useMemo(() => {
        const grouped = Array(7)
            .fill(null)
            .map(() => []);
            
        visibleEvents.forEach(event => {
            if (event.day >= 0 && event.day < 7) {
                grouped[event.day].push(event);
            }
        });
        
        return grouped.map(dayEvents => layoutEvents(dayEvents));
    }, [visibleEvents]);

    const timeToBlockPosition = timeInMinutes => {
        const firstBlockStart = timeToMinutes(TIME_BLOCKS[0].start);
        if (timeInMinutes <= firstBlockStart) return 0;

        const lastBlockEnd = timeToMinutes(TIME_BLOCKS[TIME_BLOCKS.length - 1].end);
        if (timeInMinutes >= lastBlockEnd) return TIME_BLOCKS.length;

        for (let i = 0; i < TIME_BLOCKS.length; i++) {
            const block = TIME_BLOCKS[i];
            const blockStart = timeToMinutes(block.start);
            const blockEnd = timeToMinutes(block.end);

            if (timeInMinutes >= blockStart && timeInMinutes <= blockEnd) {
                const progressInBlock =
                    blockEnd - blockStart > 0
                        ? (timeInMinutes - blockStart) / (blockEnd - blockStart)
                        : 0;
                return i + progressInBlock;
            }

            if (i < TIME_BLOCKS.length - 1) {
                const nextBlockStart = timeToMinutes(TIME_BLOCKS[i + 1].start);
                if (timeInMinutes > blockEnd && timeInMinutes < nextBlockStart) {
                    return i + 1; // Snap to the end of the current block
                }
            }
        }
        return TIME_BLOCKS.length; // Fallback
    };

    const renderEvent = (eventData, levelIndex) => {
        const eventStartMinutes = timeToMinutes(eventData.startTime);
        const eventEndMinutes = timeToMinutes(eventData.endTime);

        const startBlockPos = timeToBlockPosition(eventStartMinutes);
        const endBlockPos = timeToBlockPosition(eventEndMinutes);

        const leftPercent = (startBlockPos / TIME_BLOCKS.length) * 100;
        const widthPercent = ((endBlockPos - startBlockPos) / TIME_BLOCKS.length) * 100;

        return (
            <ScheduleEventItem
                key={eventData.id + '-' + levelIndex}
                eventData={eventData}
                course={eventData.course}
                scheduleColorMode={scheduleColorMode}
                isEnrolled={eventData.isEnrolled}
                onToggleEvent={handleToggleEvent}
                style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    top: `${levelIndex * (MIN_EVENT_HEIGHT + 4)}px`,
                    height: `${MIN_EVENT_HEIGHT}px`,
                }}
            />
        );
    };

    const handleScheduleChange = (event, newIndex) => {
        setActiveGeneratedSchedule(newIndex);
    };

    return (
        <Box
            elevation={1}
            sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
            <StyledTableContainer component={Paper}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow
                            sx={{
                                height: 'auto' /* TIME_HEADER_HEIGHT -> auto pro přizpůsobení obsahu */,
                            }}
                        >
                            <StickyTableCell stickytype="corner">
                                {t('schedule.dayTime', 'Den/Čas')}
                            </StickyTableCell>
                            {TIME_BLOCKS.map((block, index) => (
                                <StickyTableCell key={index} stickytype="time">
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-start',
                                            alignItems: 'center',
                                            height: '100%',
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            display="block"
                                            fontWeight="bold"
                                            sx={{
                                                fontSize: '0.75rem',
                                                backgroundColor: theme => theme.palette.divider,
                                                color: theme => theme.palette.text.primary,
                                                width: '100%',
                                                py: '2px',
                                            }}
                                        >
                                            {block.label}
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                alignItems: 'stretch',
                                                width: '100%',
                                                px: '4px',
                                                pb: '4px',
                                                flexGrow: 1,
                                            }}
                                        >
                                            <Typography
                                                component="div"
                                                variant="caption"
                                                sx={{
                                                    fontSize: 'inherit',
                                                    lineHeight: 1.1,
                                                    textAlign: 'left',
                                                }}
                                            >
                                                {block.start}
                                            </Typography>
                                            <Typography
                                                component="div"
                                                variant="caption"
                                                sx={{
                                                    fontSize: 'inherit',
                                                    lineHeight: 1.1,
                                                    textAlign: 'right',
                                                }}
                                            >
                                                {block.end}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </StickyTableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {DAY_I18N_KEYS.map((dayKey, dayIndex) => {
                            const levelsForDay = eventsByDay[dayIndex] || [];
                            const rowHeight =
                                Math.max(1, levelsForDay.length) * (MIN_EVENT_HEIGHT + 4) - 4;

                            return (
                                <TableRow key={dayKey} sx={{ height: `${rowHeight}px` }}>
                                    <StickyTableCell
                                        stickytype="day"
                                        component="th"
                                        scope="row"
                                        variant="head"
                                    >
                                        <Typography fontWeight="bold">{t(dayKey)}</Typography>
                                    </StickyTableCell>
                                    <DayRowCell colSpan={TIME_BLOCKS.length}>
                                        {levelsForDay.map((levelEvents, levelIndex) =>
                                            levelEvents.map(eventData =>
                                                renderEvent(eventData, levelIndex, dayIndex)
                                            )
                                        )}
                                    </DayRowCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </StyledTableContainer>

            {generatedSchedules.length > 0 && (
                <ScheduleSwitcherWrapper>
                    <Stack spacing={1} direction="column" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                            {t('schedule.switcherTitle', 'Varianty rozvrhu')}
                        </Typography>
                        <Pagination
                            count={generatedSchedules.length + 1}
                            page={activeScheduleIndex + 2} // +2 protože -1 je primární a indexy začínají od 1
                            onChange={(event, value) => setActiveGeneratedSchedule(value - 2)} // -2 pro konverzi zpět na indexy
                            color="primary"
                            size="medium"
                            showFirstButton
                            showLastButton
                            siblingCount={1}
                            boundaryCount={1}
                            sx={{
                                '& .MuiPaginationItem-root.Mui-selected': {
                                    fontWeight: 'bold',
                                    backgroundColor: theme => theme.palette.primary.main,
                                    color: theme => theme.palette.primary.contrastText,
                                },
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {activeScheduleIndex === -1
                                ? t('schedule.primarySchedule', 'Primární rozvrh')
                                : t(
                                      'schedule.generatedSchedule',
                                      'Vygenerovaný rozvrh č. {{number}}',
                                      { number: activeScheduleIndex + 1 }
                                  )}
                        </Typography>
                    </Stack>
                </ScheduleSwitcherWrapper>
            )}
        </Box>
    );
}

export default ScheduleBox;
