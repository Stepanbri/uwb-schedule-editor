// src/features/editor/ScheduleBox/ScheduleEventItem.jsx
import React, { useState } from 'react';
import {Box, Typography, Popover, Divider, Paper, Tooltip, Chip, alpha, styled} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass'; // Pro mapování typů a barev
import { ENROLLMENT_KEY_TO_SHORT_I18N_KEY } from '../../../constants/constants.js';
// import EventDetailPopover from './EventDetailPopover'; // Vytvoříme později

const getEventTypeThemeColor = (eventType, theme) => {
    const typeKey = EVENT_TYPE_TO_KEY_MAP[eventType?.toLowerCase()] || 'other'; // 'other' jako fallback
    // Nyní vrací pouze barvu, ne objekt s border
    return theme.palette.eventTypes[typeKey] || theme.palette.eventTypes.other;
};

const EventWrapper = styled(Box)(({ theme, eventColor, notchColor }) => ({
    backgroundColor: eventColor,
    border: `1px solid ${alpha(theme.palette.common.black, 0.2)}`,
    borderRadius: '4px',
    padding: '2px 4px 2px 8px', // Více místa vlevo pro patku
    overflow: 'hidden',
    cursor: 'pointer',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative', // Pro pozicování patky
    color: theme.palette.getContrastText(eventColor),
    '&:hover': {
        borderColor: theme.palette.primary.main,
        boxShadow: theme.shadows[2],
    },
    // Patka vlevo
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

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const popoverId = open ? `event-popover-${eventData.id}` : undefined;

    if (!eventData || !course) return null;

    // Získání barev
    const eventTypeColor = getEventTypeThemeColor(eventData.type, theme);
    const courseColor = course.color || theme.palette.grey[500]; // Fallback na šedou, pokud předmět nemá barvu

    // Rozhodnutí, která barva bude pro pozadí a která pro patku
    const isCourseColorMode = scheduleColorMode === 'course';
    const backgroundColor = isCourseColorMode ? courseColor : eventTypeColor;
    const notchColor = isCourseColorMode ? eventTypeColor : courseColor;


    const shortTypeKey = EVENT_TYPE_TO_KEY_MAP[eventData.type?.toLowerCase()];
    const typeDisplay = shortTypeKey ? t(ENROLLMENT_KEY_TO_SHORT_I18N_KEY[shortTypeKey], eventData.type.substring(0,2).toUpperCase()) : eventData.type.substring(0,2).toUpperCase();


    // Informace k zobrazení v eventu
    const courseShortCode = course.getShortCode(); // KATEDRA/PŘEDMĚT
    const capacityText = `${t('labels.maxCapacityPrefix', 'Max:')} ${eventData.maxCapacity}`; // Pouze maximální kapacita
    
    const rawInstructor = eventData.instructor; // Může být string nebo prázdný string
    const fullInstructorNameForPopover = rawInstructor || '-';
    let displayInstructorName = '-';

    if (rawInstructor && typeof rawInstructor === 'string') {
        const parts = rawInstructor.split(',');
        const namePart = parts[0].trim();
        const nameTokens = namePart.split(' ').filter(token => token.length > 0);
        if (nameTokens.length > 0) {
            let lastName = nameTokens[nameTokens.length - 1];
            if (!lastName.includes('.')) {
                displayInstructorName = lastName;
            } else if (nameTokens.length > 1 && !nameTokens[nameTokens.length - 2].includes('.')) {
                displayInstructorName = nameTokens[nameTokens.length - 2];
            } else {
                 displayInstructorName = lastName; 
            }
        }
    } // Pokud rawInstructor je prázdný, displayInstructorName zůstane '-'

    const roomText = eventData.isVirtual ? t('labels.virtualEvent', 'Virtuální') : (eventData.room || '-');
    // Opakovatelnost - např. "KT", "ST", "LT"
    let recurrenceDisplay = '';
    if (eventData.recurrence) {
        const recurrenceKey = eventData.recurrence.toLowerCase().replace(/\s+/g, '');
        recurrenceDisplay = t(`courseEvent.recurrenceShort.${recurrenceKey}`, eventData.recurrence.substring(0,2).toUpperCase());
    }


    return (
        <>
            <Tooltip
                title={`${courseShortCode} - ${t(`courseEvent.${eventData.type.toLowerCase()}`, eventData.type)} (${eventData.startTime} - ${eventData.endTime})`}
                arrow
            >
                <EventWrapper
                    aria-describedby={popoverId}
                    onClick={handleClick}
                    sx={{ ...style }} // position, left, width, top, height z ScheduleBox
                    eventColor={backgroundColor}
                    notchColor={notchColor}
                >
                    <Typography variant="caption" fontWeight="bold" noWrap sx={{ lineHeight: 1.2, overflow: "visible" }}>
                        {courseShortCode} <Chip label={typeDisplay} size="small" variant="outlined" sx={{ ml: 0.5, height: '12px', fontSize: '0.65rem', backgroundColor: alpha(theme.palette.common.white, 0.2), borderColor: alpha(theme.palette.common.white, 0.4)}} />
                    </Typography>
                    <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
                        {roomText || '-'} {recurrenceDisplay && `(${recurrenceDisplay})`}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
                            {(displayInstructorName || '-').substring(0,15)} {/* Zkráceno a fallback na pomlčku */}
                        </Typography>
                    </Box>
                </EventWrapper>
            </Tooltip>

            <Popover
                id={popoverId}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Paper sx={{ p: 2, maxWidth: 300 }}>
                    <Typography variant="subtitle1">{course.name} ({courseShortCode})</Typography>
                    <Typography variant="subtitle2">{t(`courseEvent.${eventData.type.toLowerCase()}`, eventData.type)}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2">{t('labels.time', 'Čas')}: {`${eventData.startTime} - ${eventData.endTime}`}</Typography>
                    <Typography variant="body2">{t('labels.room', 'Místnost')}: {roomText || '-'}</Typography>
                    <Typography variant="body2">{t('labels.instructor', 'Vyučující')}: {fullInstructorNameForPopover}</Typography>
                    <Typography variant="body2">{t('labels.capacity', 'Kapacita')}: {capacityText}</Typography>
                    <Typography variant="body2">{t('labels.recurrence', 'Opakování')}: {t(`courseEvent.${eventData.recurrence.toLowerCase().replace(/\s+/g, '')}`, eventData.recurrence)}</Typography>
                    {eventData.note && <Typography variant="body2" sx={{mt: 1, fontStyle: 'italic'}}>{t('labels.notes', 'Poznámka')}: {eventData.note}</Typography>}
                    {/* Zde by mohla být tlačítka pro zápis/odzápis, pokud je to žádoucí */}
                </Paper>
            </Popover>
        </>
    );
}

export default ScheduleEventItem;