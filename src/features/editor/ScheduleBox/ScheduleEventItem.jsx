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
    const typeKey = EVENT_TYPE_TO_KEY_MAP[eventType?.toLowerCase()] || 'other'; // 'other' jako fallback
    return {
        backgroundColor: theme.palette.eventTypes[typeKey] || theme.palette.eventTypes.other,
        borderColor: theme.palette.eventTypes[`${typeKey}Border`] || theme.palette.eventTypes.otherBorder,
    };
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

    const eventStyleColors = getEventTypeThemeColor(eventData.type, theme);

    const shortTypeKey = EVENT_TYPE_TO_KEY_MAP[eventData.type?.toLowerCase()];
    const typeDisplay = shortTypeKey ? t(ENROLLMENT_KEY_TO_SHORT_I18N_KEY[shortTypeKey], eventData.type.substring(0,2).toUpperCase()) : eventData.type.substring(0,2).toUpperCase();


    // Informace k zobrazení v eventu
    const courseShortCode = course.getShortCode(); // KATEDRA/PŘEDMĚT
    const capacityText = `${t('labels.maxCapacityPrefix', 'Max:')} ${eventData.maxCapacity}`; // Pouze maximální kapacita
    
    let displayInstructorName = t('common.notSpecified');
    if (eventData.instructor) {
        const fullName = typeof eventData.instructor === 'object' ? eventData.instructor.name : eventData.instructor;
        if (fullName && typeof fullName === 'string') {
            const parts = fullName.split(','); // Oddělit jméno od titulů za
            const namePart = parts[0].trim();
            const nameTokens = namePart.split(' ').filter(token => token.length > 0); // Rozdělit na slova a odstranit prázdné tokeny
            if (nameTokens.length > 0) {
                // Zkusíme najít slovo, které neobsahuje tečku (není titul před jménem)
                // a je pravděpodobně příjmení (obvykle poslední nebo předposlední, pokud je za ním titul)
                let lastName = nameTokens[nameTokens.length - 1];
                // Jednoduchá heuristika: pokud poslední slovo neobsahuje tečku, je to pravděpodobně příjmení.
                // Pokud obsahuje, a existuje předchozí slovo, které také neobsahuje tečku, zkusíme to.
                // Toto je zjednodušení a nemusí pokrýt všechny případy (např. víceslovná příjmení, cizí jména).
                // Pro robustnější řešení by bylo potřeba detailnější parsování nebo strukturovanější data.
                if (!lastName.includes('.')) {
                    displayInstructorName = lastName;
                } else if (nameTokens.length > 1 && !nameTokens[nameTokens.length - 2].includes('.')) {
                    displayInstructorName = nameTokens[nameTokens.length - 2];
                } else {
                    // Fallback na poslední slovo, i když může být titul (např. "Novák Ph.D.")
                    // nebo pokud je to jediné slovo (např. "Novák")
                     displayInstructorName = lastName; 
                }
            }
        }
    }

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
                        backgroundColor: eventStyleColors.backgroundColor,
                        border: `1px solid ${eventStyleColors.borderColor}`,
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
                        color: theme.palette.getContrastText(eventStyleColors.backgroundColor),
                    }}
                >
                    <Typography variant="caption" fontWeight="bold" noWrap sx={{ lineHeight: 1.2, overflow: "visible" }}>
                        {courseShortCode} <Chip label={typeDisplay} size="small" variant="outlined" sx={{ ml: 0.5, height: '12px', fontSize: '0.65rem', backgroundColor: alpha(theme.palette.common.white, 0.2)}} />
                    </Typography>
                    <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
                        {roomText}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
                            {displayInstructorName.substring(0,15)} {/* Zkráceno pro zobrazení */}
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
                    <Typography variant="body2">{t('labels.time', 'Čas')}: {`${eventData.startTime} - ${eventData.endTime}`}</Typography>
                    <Typography variant="body2">{t('labels.room', 'Místnost')}: {roomText}</Typography>
                    <Typography variant="body2">{t('labels.instructor', 'Vyučující')}: {displayInstructorName}</Typography>
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