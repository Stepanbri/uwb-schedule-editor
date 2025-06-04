// src/features/editor/ScheduleBox/ScheduleEventItem.jsx
import React, { useState } from 'react';
import {Box, Typography, Popover, Divider, Paper, Tooltip, Chip, alpha} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation }
    from 'react-i18next';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass'; // Pro mapování typů a barev
import { ENROLLMENT_KEY_TO_SHORT_I18N_KEY } from '../../../constants/constants.js';
// import EventDetailPopover from './EventDetailPopover'; // Vytvoříme později

const getEventTypeThemeColor = (eventType, theme) => {
    const typeKey = EVENT_TYPE_TO_KEY_MAP[eventType?.toLowerCase()] || 'default';
    // Rozšíření theme.js o barvy pro eventTypes by bylo ideální
    // např. theme.palette.eventTypes.lecture, theme.palette.eventTypes.practical, atd.
    // (zmínka o theme.jsx)
    // (zmínka o barevném odlišení)

    // Prozatímní fallback barvy
    const colors = {
        lecture: theme.palette.mode === 'dark' ? theme.palette.error.dark : theme.palette.error.light, // červená pro přednášky
        practical: theme.palette.mode === 'dark' ? theme.palette.success.dark : theme.palette.success.light, // zelená pro cvičení
        seminar: theme.palette.mode === 'dark' ? theme.palette.warning.dark : theme.palette.warning.light, // žlutá pro semináře
        default: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
    };
    return colors[typeKey] || colors.default;
};


function ScheduleEventItem({ eventData, course, style }) {
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

    const backgroundColor = getEventTypeThemeColor(eventData.type, theme);
    const shortTypeKey = EVENT_TYPE_TO_KEY_MAP[eventData.type?.toLowerCase()];
    const typeDisplay = shortTypeKey ? t(ENROLLMENT_KEY_TO_SHORT_I18N_KEY[shortTypeKey], eventData.type.substring(0,2).toUpperCase()) : eventData.type.substring(0,2).toUpperCase();


    // Informace k zobrazení v eventu
    const courseShortCode = course.getShortCode(); // KATEDRA/PŘEDMĚT
    const capacityText = `${eventData.currentCapacity}/${eventData.maxCapacity}`; // Obsazenost/kapacita
    const instructorName = typeof eventData.instructor === 'object' ? eventData.instructor.name : eventData.instructor; // Vyučující
    const roomText = eventData.isVirtual ? t('labels.virtualEvent', 'Virtuální') : eventData.room; // Místnost
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
                <Box
                    aria-describedby={popoverId}
                    onClick={handleClick}
                    sx={{
                        ...style, // position, left, width, top, height z ScheduleBox
                        backgroundColor,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '4px',
                        padding: '2px 4px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        '&:hover': {
                            borderColor: theme.palette.primary.main,
                            boxShadow: theme.shadows[2],
                        },
                        color: theme.palette.getContrastText(backgroundColor),
                    }}
                >
                    <Typography variant="caption" fontWeight="bold" noWrap sx={{ lineHeight: 1.2 }}>
                        {courseShortCode} <Chip label={typeDisplay} size="small" variant="outlined" sx={{ ml: 0.5, height: '16px', fontSize: '0.65rem', backgroundColor: alpha(theme.palette.common.white, 0.2)}} />
                    </Typography>
                    <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
                        {roomText}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
                            {instructorName?.substring(0,15) || t('common.notSpecified')} {/* Zkráceno pro zobrazení */}
                        </Typography>
                        <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', lineHeight: 1.1, ml: 0.5 }}>
                            {capacityText} {recurrenceDisplay && `(${recurrenceDisplay})`}
                        </Typography>
                    </Box>
                </Box>
            </Tooltip>

            {/* <EventDetailPopover
                id={popoverId}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                eventData={eventData}
                course={course}
            /> */}
            {/* Prozatím Popover s jednoduchým obsahem, EventDetailPopover vytvoříme později */}
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
                    <Typography variant="body2">{t('labels.time', 'Čas')}: {eventData.startTime} - {eventData.endTime}}</Typography>
                    <Typography variant="body2">{t('labels.room', 'Místnost')}: {roomText}</Typography>
                    <Typography variant="body2">{t('labels.instructor', 'Vyučující')}: {instructorName || t('common.notSpecified')}</Typography>
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