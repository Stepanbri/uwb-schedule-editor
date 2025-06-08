// src/features/editor/ScheduleBox/ScheduleEventItem.jsx
import React, { useState } from 'react';
import { Box, Typography, Popover, Paper, Tooltip, alpha, styled, Stack, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass';
import { ENROLLMENT_KEY_TO_SHORT_I18N_KEY } from '../../../constants/constants.js';
import { getEventTypePatterns } from '../../../styles/patterns';

const getEventTypeThemeColor = (eventType, theme, variant = 'background') => {
    const typeKey = EVENT_TYPE_TO_KEY_MAP[eventType?.toLowerCase()] || 'other';
    const colorKey = variant === 'solid' ? `${typeKey}Solid` : typeKey;
    return theme.palette.eventTypes[colorKey] || theme.palette.eventTypes.other;
};

const EventWrapper = styled(Box)(({ theme, eventColor, notchColor, patternImage }) => ({
    backgroundColor: eventColor,
    backgroundImage: patternImage,
    backgroundBlendMode: 'overlay',
    border: `1px solid ${alpha(theme.palette.text.primary, 0.15)}`,
    borderRadius: '4px',
    padding: '2px 4px 2px 8px', // Více místa vlevo pro patku
    overflow: 'hidden',
    cursor: 'pointer',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    color: theme.palette.getContrastText(eventColor),
    transition: 'transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out',
    '&:hover': {
        borderColor: theme.palette.primary.main,
        boxShadow: theme.shadows[2],
        transform: 'scale(1.02)',
        zIndex: 10
    },
    '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '5px',
        backgroundColor: notchColor,
        borderTopLeftRadius: '3px',
        borderBottomLeftRadius: '3px',
    }
}));


function ScheduleEventItem({ eventData, course, style, scheduleColorMode }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleClick = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const open = Boolean(anchorEl);
    const popoverId = open ? `event-popover-${eventData.id}` : undefined;

    if (!eventData || !course) return null;

    // --- Color & Pattern Logic ---
    const isCourseColorMode = scheduleColorMode === 'course';

    const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[eventData.type.toLowerCase()] || 'other';
    const eventTypeBgColor = getEventTypeThemeColor(eventData.type, theme, 'background');
    const eventTypeSolidColor = getEventTypeThemeColor(eventData.type, theme, 'solid');
    const courseColor = course.color || theme.palette.grey[500];

    const patterns = getEventTypePatterns(theme);
    const patternImage = isCourseColorMode ? 'none' : (patterns[eventTypeKey] || 'none');
    
    // Background color is lightened course color in course mode, or type color in type mode
    const backgroundColor = isCourseColorMode ? alpha(courseColor, 0.25) : eventTypeBgColor;
    
    // Notch is solid type color in course mode, or course color in type mode
    const notchColor = isCourseColorMode ? eventTypeSolidColor : courseColor;
    // --- End Color & Pattern Logic ---

    // --- Text Content Logic ---
    const courseShortCode = course.getShortCode();
    const capacityText = `${eventData.currentCapacity} / ${eventData.maxCapacity}`;
    const fullInstructorNameForPopover = eventData.instructor || '-';
    let displayInstructorName = '-';
    if (eventData.instructor) {
        const nameTokens = eventData.instructor.split(',')[0].trim().split(' ').filter(Boolean);
        displayInstructorName = nameTokens[nameTokens.length - 1];
    }
    const roomText = eventData.isVirtual ? t('labels.virtualEvent', 'Virtuální') : (eventData.room || '-');
    let recurrenceDisplay = '';
    if (eventData.recurrence) {
        const recurrenceKey = eventData.recurrence.toLowerCase().replace(/\s+/g, '');
        recurrenceDisplay = t(`courseEvent.recurrenceShort.${recurrenceKey}`, eventData.recurrence.substring(0,2).toUpperCase());
    }
    // --- End Text Content Logic ---

    return (
        <>
            <Tooltip
                title={`${courseShortCode} - ${t(`courseEvent.${eventTypeKey}`, eventData.type)} (${eventData.startTime} - ${eventData.endTime})`}
                arrow
                disableInteractive
            >
                <EventWrapper
                    aria-describedby={popoverId}
                    onClick={handleClick}
                    sx={style}
                    eventColor={backgroundColor}
                    notchColor={notchColor}
                    patternImage={patternImage}
                >
                    <Typography variant="caption" fontWeight="bold" noWrap sx={{ lineHeight: 1.2 }}>
                        {courseShortCode}
                    </Typography>
                    <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
                        {roomText || '-'} {recurrenceDisplay && `(${recurrenceDisplay})`}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
                            {(displayInstructorName || '-').substring(0,15)}
                        </Typography>
                    </Box>
                </EventWrapper>
            </Tooltip>

            <Popover
                id={popoverId}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <Paper sx={{ p: 2, maxWidth: 300 }}>
                    <Typography variant="subtitle1">{course.name} ({courseShortCode})</Typography>
                    <Typography variant="subtitle2">{t(`courseEvent.${eventTypeKey}`, eventData.type)}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2">{t('labels.time', 'Čas')}: {`${eventData.startTime} - ${eventData.endTime}`}</Typography>
                    <Typography variant="body2">{t('labels.room', 'Místnost')}: {roomText || '-'}</Typography>
                    <Typography variant="body2">{t('labels.instructor', 'Vyučující')}: {fullInstructorNameForPopover}</Typography>
                    <Typography variant="body2">{t('labels.capacity', 'Kapacita')}: {capacityText}</Typography>
                    <Typography variant="body2">{t('labels.recurrence', 'Opakování')}: {t(`courseEvent.recurrence.${eventData.recurrence.toLowerCase().replace(/\s+/g, '')}`, eventData.recurrence)}</Typography>
                    {eventData.note && <Typography variant="body2" sx={{mt: 1, fontStyle: 'italic'}}>{t('labels.notes', 'Poznámka')}: {eventData.note}</Typography>}
                </Paper>
            </Popover>
        </>
    );
}

export default ScheduleEventItem;