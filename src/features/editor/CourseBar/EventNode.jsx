import { Box, Card, CardContent, ToggleButton, Tooltip, Typography, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass';

const EventNode = ({ event, isEnrolled, onToggleEvent, canEnroll, disabledTooltipText }) => {
    const { t } = useTranslation();

    if (!event) return null;

    const dayStr = event.getDayAsString(t); // Používání metody pro získání dne jako řetězce
    const recurrenceStr = event.recurrence
        ? t(`courseEvent.${event.recurrence.toLowerCase().replace(/\s+/g, '')}`, event.recurrence)
        : t('common.notSpecified', 'Nespecifikováno');
    const eventTypeKey = EVENT_TYPE_TO_KEY_MAP[event.type.toLowerCase()] || 'other';

    let currentDisabledTooltipText = disabledTooltipText;
    if (isEnrolled) {
        currentDisabledTooltipText = t('tooltips.unenrollAction', 'Odzapsat akci ze svého rozvrhu');
    } else if (canEnroll) {
        currentDisabledTooltipText = t('tooltips.enrollAction', 'Zapsat akci do svého rozvrhu');
    }

    const instructorDisplay = event.instructor
        ? typeof event.instructor === 'object'
            ? event.instructor.name
            : event.instructor
        : '-';

    return (
        <Card
            variant="outlined"
            sx={{
                mb: 1,
                width: '100%',
                opacity: !canEnroll && !isEnrolled ? 0.65 : 1,
                backgroundColor: theme =>
                    isEnrolled ? alpha(theme.palette.success.light, 0.15) : 'transparent',
                borderColor: theme =>
                    isEnrolled ? theme.palette.success.main : theme.palette.divider,
                '&:hover': {
                    borderColor: theme =>
                        isEnrolled ? theme.palette.success.dark : theme.palette.primary.main,
                    boxShadow: theme =>
                        `0 0 0 1px ${isEnrolled ? theme.palette.success.dark : theme.palette.primary.main}`,
                },
            }}
        >
            <CardContent sx={{ padding: '10px !important' }}>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    sx={{ mb: 0.5 }}
                >
                    <Typography
                        variant="subtitle2"
                        component="div"
                        sx={{
                            fontWeight: 'bold',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.3,
                        }}
                    >
                        {t(`courseEvent.${eventTypeKey}`, event.type)}
                    </Typography>
                    <Tooltip title={currentDisabledTooltipText}>
                        <span>
                            {' '}
                            {/* Wrapper for Tooltip on disabled button */}
                            <ToggleButton
                                value="check"
                                selected={isEnrolled}
                                onChange={() => onToggleEvent(event, isEnrolled)}
                                size="small"
                                color={isEnrolled ? 'success' : 'primary'}
                                sx={{
                                    height: '30px',
                                    minWidth: '90px',
                                    ml: 1,
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                }}
                                disabled={!canEnroll && !isEnrolled}
                            >
                                {isEnrolled
                                    ? t('labels.enrolled', 'Zapsáno')
                                    : t('labels.enroll', 'Zapsat')}
                            </ToggleButton>
                        </span>
                    </Tooltip>
                </Box>
                <Typography variant="body2" gutterBottom sx={{ fontSize: '0.8rem' }}>
                    {dayStr}, {event.startTime} - {event.endTime}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {t('labels.room', 'Místnost')}:{' '}
                    {event.isVirtual
                        ? t('labels.virtualEvent', 'Virtuální akce')
                        : event.room || t('labels.notSpecified', 'Nezadáno')}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {t('labels.capacity', 'Kapacita')}: {event.maxCapacity}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        mb: event.note || instructorDisplay !== '-' ? 0.5 : 0,
                        fontSize: '0.8rem',
                    }}
                >
                    {t('labels.recurrence', 'Opakování')}: {recurrenceStr}
                </Typography>
                <Tooltip title={`${t('labels.instructor', 'Vyučující')}: ${instructorDisplay}`}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontStyle: 'italic',
                            display: 'block',
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.75rem',
                        }}
                    >
                        {t('labels.instructor', 'Vyučující')}: {instructorDisplay}
                    </Typography>
                </Tooltip>
                {event.note && (
                    <Tooltip title={`${t('labels.notes', 'Poznámka')}: ${event.note}`}>
                        <Typography
                            variant="caption"
                            sx={{
                                fontStyle: 'italic',
                                display: 'block',
                                color: 'text.secondary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.75rem',
                            }}
                        >
                            {t('labels.notes', 'Pozn.')}: {event.note}
                        </Typography>
                    </Tooltip>
                )}
            </CardContent>
        </Card>
    );
};

export default EventNode;
