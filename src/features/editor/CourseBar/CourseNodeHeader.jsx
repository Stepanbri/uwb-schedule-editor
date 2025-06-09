import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ScienceIcon from '@mui/icons-material/Science';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useState } from 'react'; // Přidán useState
import { useTranslation } from 'react-i18next';
import { ENROLLMENT_KEYS_ORDER } from '../../../services/CourseClass';
import GenericConfirmationDialog from '../Dialogs/GenericConfirmationDialog'; // Import dialogu

const CourseNodeHeader = ({
    course,
    enrolledHours,
    areAllRequirementsMet,
    onRemoveCourse,
    isExpanded,
}) => {
    const { t } = useTranslation();
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

    const handleOpenConfirmDialog = e => {
        e.stopPropagation(); // Zabráníme kliknutí na TreeItem
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleCloseConfirmDialog = () => {
        setIsConfirmDeleteDialogOpen(false);
    };

    const handleConfirmRemove = () => {
        onRemoveCourse(course.id); // Použijeme unikátní ID předmětu
        handleCloseConfirmDialog();
    };

    const { neededHours } = course;

    // Řetězec pro zobrazení zbývajících požadavků v Chipu
    const neededStr = ENROLLMENT_KEYS_ORDER.map(key => {
        const needed = neededHours[key] || 0;
        const enrolled = enrolledHours[key] || 0;
        const remaining = Math.max(0, needed - enrolled);
        if (needed > 0 && remaining > 0) {
            return `${remaining}h ${t(`enrollmentShort.${key}`, key.substring(0, 1).toUpperCase())}`;
        }
        return null;
    })
        .filter(Boolean)
        .join(' / ');

    // Řetězec pro zobrazení celkového stavu v Tooltipu
    const enrolledReqStr = ENROLLMENT_KEYS_ORDER.filter(key => neededHours[key] > 0)
        .map(
            key =>
                `${enrolledHours[key] || 0}/${neededHours[key] || 0}h ${t(`enrollmentShort.${key}`, key.substring(0, 1).toUpperCase())}`
        )
        .join(' | ');

    // Sestavení textu pro sjednocený tooltip
    const baseInfo =
        course.source === 'demo'
            ? `${t('courseBar.fromDemoStagTooltip', 'Načteno z DEMO STAGu')}\n${course.name} (${course.getShortCode()})`
            : `${course.name} (${course.getShortCode()})`;

    const contextInfo = `${course.year}, ${t(`Dialogs.selectStudyParams.semester${course.semester}`, course.semester)}`;
    const enrollmentStatusInfo = t('tooltips.requiredEnrollments', {
        enrolledReqStr: enrolledReqStr,
    });

    const combinedTooltipText = `${baseInfo}\n${contextInfo}\n\n${enrollmentStatusInfo}`;

    return (
        <>
            <Tooltip
                disableInteractive
                title={<div style={{ whiteSpace: 'pre-line' }}>{combinedTooltipText}</div>}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        py: '4px',
                    }}
                >
                    <Stack direction="column" spacing={0.5} flexGrow={1} overflow="hidden" pr={1}>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                fontSize: '0.9rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            {course.source === 'demo' && (
                                <ScienceIcon
                                    fontSize="inherit"
                                    color="warning"
                                    sx={{ mr: 0.5, verticalAlign: 'middle' }}
                                />
                            )}
                            <Box
                                component="span"
                                sx={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {course.courseCode} - {course.name}
                            </Box>
                        </Typography>
                        {isExpanded && (
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Chip
                                    icon={
                                        areAllRequirementsMet ? (
                                            <CheckCircleOutlineIcon fontSize="small" />
                                        ) : (
                                            <HourglassEmptyIcon fontSize="small" />
                                        )
                                    }
                                    label={
                                        areAllRequirementsMet
                                            ? `${t('labels.requirementsMetSimple', 'Požadavky splněny')} (${enrolledHours.total}h)`
                                            : `${t('labels.remainingSimple', 'Zbývá')}: ${neededStr || '0h'}`
                                    }
                                    size="small"
                                    color={areAllRequirementsMet ? 'success' : 'warning'}
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem', cursor: 'default' }}
                                />
                            </Stack>
                        )}
                    </Stack>
                    <IconButton
                        onClick={handleOpenConfirmDialog}
                        size="small"
                        sx={{ flexShrink: 0 }}
                        aria-label={t('tooltips.removeCourse', { courseName: course.name })}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Tooltip>
            <GenericConfirmationDialog
                open={isConfirmDeleteDialogOpen}
                onClose={handleCloseConfirmDialog}
                onConfirm={handleConfirmRemove}
                title={t('alerts.confirmRemoveCourseTitle', 'Odstranit předmět?')}
                message={t('alerts.confirmRemoveCourse', {
                    courseName: course.name,
                    courseStagId: course.getShortCode(),
                })}
                confirmButtonText={t('common.delete', 'Smazat')}
                confirmButtonColor="error"
            />
        </>
    );
};

export default CourseNodeHeader;
