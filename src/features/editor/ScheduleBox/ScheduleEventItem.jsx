import {
    Box,
    Checkbox,
    Divider,
    Paper,
    Popover,
    Tooltip,
    Typography,
    alpha,
    styled
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass';
import { getEventTypePatterns } from '../../../styles/patterns';

// Funkce pro získání barvy rozvrhové akce na základě typu a tématu
// Vrací barvu pozadí nebo plnou barvu podle varianty
// Používá mapování typů rozvrhových akcí na klíče pro získání správné barvy z tématu
// Pokud typ rozvrhové akce není nalezen, vrací barvu pro 'other'
// Používá se v komponentě ScheduleEventItem pro nastavení barvy pozadí a notche rozvrhové akce
const getEventTypeThemeColor = (eventType, theme, variant = 'background') => {
    const typeKey = EVENT_TYPE_TO_KEY_MAP[eventType?.toLowerCase()] || 'other';
    const colorKey = variant === 'solid' ? `${typeKey}Solid` : typeKey;
    return theme.palette.eventTypes[colorKey] || theme.palette.eventTypes.other;
};

// Komponenta pro zobrazení rozvrhovou akcí v rozvrhu
// Zobrazí informace o rozvrhové akce, včetně názvu předmětu, času, místnosti a vyučujícího
// Umožňuje interakci s rozvrhovou akcí a zobrazuje podrobnosti v popoveru
// Používá se v komponentě ScheduleBox pro zobrazení jednotlivých rozvrhových akcí v rozvrhu
const EventWrapper = styled(Box)(({ theme, eventcolor, notchcolor, patternimage, isenrolled }) => ({
    backgroundColor: eventcolor,
    backgroundImage: patternimage,
    backgroundBlendMode: 'overlay',
    border: `1px solid ${alpha(theme.palette.text.primary, 0.15)}`,
    borderRadius: '4px',
    padding: '2px 4px 2px 8px',
    overflow: 'hidden',
    cursor: 'pointer',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    color: theme.palette.getContrastText(eventcolor),
    transition: 'transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out',
    opacity: isenrolled === 'true' ? 1 : 0.85,
    filter: isenrolled === 'true' ? 'none' : 'grayscale(20%)',
    '&:hover': {
        borderColor: theme.palette.primary.main,
        boxShadow: theme.shadows[2],
        transform: 'scale(1.02)',
        zIndex: 10,
        opacity: 1,
        filter: 'none',
    },
    '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '5px',
        backgroundColor: notchcolor,
        borderTopLeftRadius: '3px',
        borderBottomLeftRadius: '3px',
    },
}));

// Komponenta ScheduleEventItem zobrazuje jednotlivé akce v rozvrhu
// Používá se v komponentě ScheduleBox pro zobrazení jednotlivých akcí v rozvrhu
// Přijímá data rozvrhových akcí, předměty a další stylování jako props
function ScheduleEventItem({ eventData, course, style, scheduleColorMode, isEnrolled, onToggleEvent }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleClick = event => {
        // Prevent click event from propagating to checkbox
        if (event.target.closest('.event-checkbox')) {
            return;
        }
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => setAnchorEl(null);
    const open = Boolean(anchorEl);
    const popoverId = open ? `event-popover-${eventData.id}` : undefined;
    
    const handleToggle = (event) => {
        event.stopPropagation();
        if (onToggleEvent) {
            onToggleEvent(eventData, isEnrolled);
        }
    };

    if (!eventData || !course) return null;

    const isCourseColorMode = scheduleColorMode === 'course'; // Určuje, jaký režim prezentace akcí v rozvrhu je aktuálně nasatven

    const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[eventData.type.toLowerCase()] || 'other'; // Získání klíče typu akce pro překlad a barvy
    const eventTypeBgColor = getEventTypeThemeColor(eventData.type, theme, 'background'); // Získání barvy pozadí akce na základě typu a tématu
    const eventTypeSolidColor = getEventTypeThemeColor(eventData.type, theme, 'solid'); // Získání plné barvy akce na základě typu a tématu
    const courseColor = course.color || theme.palette.grey[500]; // Barva předmětu, pokud není nastavená - použije se šedá

    const patterns = getEventTypePatterns(theme);
    const patternImage = isCourseColorMode ? 'none' : patterns[eventTypeKey] || 'none';

    const backgroundColor = isCourseColorMode ? alpha(courseColor, 0.25) : eventTypeBgColor; //

    const notchColor = isCourseColorMode ? eventTypeSolidColor : courseColor;

    const courseShortCode = course.getShortCode();
    const capacityText = `${eventData.currentCapacity} / ${eventData.maxCapacity}`;
    const fullInstructorNameForPopover = eventData.instructor || '-';
    let displayInstructorName = '-';
    if (eventData.instructor) {
        const nameTokens = eventData.instructor.split(',')[0].trim().split(' ').filter(Boolean);
        displayInstructorName = nameTokens[nameTokens.length - 1];
    }
    const roomText = eventData.isVirtual
        ? t('labels.virtualEvent', 'Virtuální')
        : eventData.room || '-'; // Zobrazí text místnosti, pokud se jedná o virtuální akci, zobrazí se "Virtuální", jinak se zobrazí zadaná místnost nebo '-'
    let recurrenceDisplay = ''; // Proměnná pro zobrazení opakování akce
    if (eventData.recurrence) {
        const recurrenceKey = eventData.recurrence.toLowerCase().replace(/\s+/g, '');
        recurrenceDisplay = t(
            `courseEvent.recurrenceShort.${recurrenceKey}`,
            eventData.recurrence.substring(0, 2).toUpperCase()
        );
    }

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
                    eventcolor={backgroundColor}
                    notchcolor={notchColor}
                    patternimage={patternImage}
                    isenrolled={isEnrolled ? 'true' : 'false'}
                >
                    <Typography variant="caption" fontWeight="bold" noWrap sx={{ lineHeight: 1.2 }}>
                        {courseShortCode}
                    </Typography>
                    <Typography
                        variant="caption"
                        noWrap
                        sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}
                    >
                        {roomText || '-'} {recurrenceDisplay && `(${recurrenceDisplay})`}
                    </Typography>

                    <Typography
                        variant="caption"
                        noWrap
                        sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}
                    >
                        {(displayInstructorName || '-').substring(0, 15)}
                    </Typography>
                    
                    <Box 
                        className="event-checkbox"
                        onClick={e => e.stopPropagation()}
                        sx={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            zIndex: 5
                        }}
                    >
                        <Checkbox
                            size="small"
                            checked={isEnrolled}
                            onChange={handleToggle}
                            sx={{
                                color: alpha(theme.palette.common.white, 0.9),
                                padding: 0,
                                '&.Mui-checked': {
                                    color: theme.palette.common.white,
                                },
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                                }
                            }}
                        />
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
                    <Typography variant="subtitle1">
                        {course.name} ({courseShortCode})
                    </Typography>
                    <Typography variant="subtitle2">
                        {t(`courseEvent.${eventTypeKey}`, eventData.type)}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color={isEnrolled ? "success.main" : "text.primary"} fontWeight={isEnrolled ? "bold" : "normal"}>
                        {isEnrolled ? t('labels.enrolledStatus', 'Zapsáno') : t('labels.notEnrolledStatus', 'Nezapsáno')}
                    </Typography>
                    <Typography variant="body2">
                        {t('labels.time', 'Čas')}: {`${eventData.startTime} - ${eventData.endTime}`}
                    </Typography>
                    <Typography variant="body2">
                        {t('labels.room', 'Místnost')}: {roomText || '-'}
                    </Typography>
                    <Typography variant="body2">
                        {t('labels.instructor', 'Vyučující')}: {fullInstructorNameForPopover}
                    </Typography>
                    <Typography variant="body2">
                        {t('labels.capacity', 'Kapacita')}: {capacityText}
                    </Typography>
                    <Typography variant="body2">
                        {t('labels.recurrence', 'Opakování')}:{' '}
                        {t(
                            `courseEvent.${eventData.recurrence.toLowerCase().replace(/\s+/g, '')}`,
                            eventData.recurrence
                        )}
                    </Typography>
                    {eventData.note && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                            {t('labels.notes', 'Poznámka')}: {eventData.note}
                        </Typography>
                    )}
                </Paper>
            </Popover>
        </>
    );
}

export default ScheduleEventItem;
