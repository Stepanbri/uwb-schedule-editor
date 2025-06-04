// PROJEKT/NEW/src/features/editor/CourseBar/CourseNodeHeader.jsx
import React, { useState } from 'react'; // Přidán useState
import { Box, Typography, IconButton, Tooltip, Chip, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useTranslation } from 'react-i18next';
import { ENROLLMENT_KEYS_ORDER } from '../../../services/CourseClass';
import GenericConfirmationDialog from '../Dialogs/GenericConfirmationDialog'; // Import dialogu

const CourseNodeHeader = ({ course, enrolledCounts, neededEnrollmentsDisplay, areAllRequirementsMet, onRemoveCourse }) => {
    const { t } = useTranslation();
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

    const handleOpenConfirmDialog = (e) => {
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

    const neededStr = ENROLLMENT_KEYS_ORDER
        .filter(key => course.neededEnrollments[key] > 0)
        .map(key => `${neededEnrollmentsDisplay[key]}${t(`enrollmentShort.${key}`, key.substring(0,1).toUpperCase())}`)
        .join('/');

    const enrolledReqStr = ENROLLMENT_KEYS_ORDER
        .map(key => `${enrolledCounts[key]}/${course.neededEnrollments[key]}${t(`enrollmentShort.${key}`, key.substring(0,1).toUpperCase())}`)
        .join(' | ');

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', py: '4px' }}>
                <Stack direction="column" spacing={0.5} flexGrow={1} overflow="hidden" pr={1}>
                    <Tooltip disableInteractive title={`${course.name} (${course.departmentCode}/${course.courseCode}) - ${course.year}, ${t(`Dialogs.selectStudyParams.semester${course.semester}`, course.semester)}`}>
                        <Typography variant="subtitle1" sx={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                            {course.courseCode} - {course.name}
                        </Typography>
                    </Tooltip>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Tooltip title={t('tooltips.requiredEnrollments', { enrolledReqStr: enrolledReqStr } )}>
                            <Chip
                                icon={areAllRequirementsMet ? <CheckCircleOutlineIcon fontSize="small" /> : <HourglassEmptyIcon fontSize="small" />}
                                label={areAllRequirementsMet
                                    ? t('labels.requirementsMet', { count: enrolledCounts.total })
                                    : t('labels.remaining', { needed: neededStr || '0', enrolledCount: enrolledCounts.total })
                                }
                                size="small"
                                color={areAllRequirementsMet ? "success" : "warning"}
                                variant="outlined"
                                sx={{fontSize: '0.7rem', cursor: 'default' }}
                            />
                        </Tooltip>
                    </Stack>
                </Stack>
                <Tooltip disableInteractive title={t('tooltips.removeCourse', { courseName: course.name })}>
                    <IconButton
                        onClick={handleOpenConfirmDialog}
                        size="small"
                        sx={{ flexShrink: 0 }}
                        aria-label={t('tooltips.removeCourse', { courseName: course.name })}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
            <GenericConfirmationDialog
                open={isConfirmDeleteDialogOpen}
                onClose={handleCloseConfirmDialog}
                onConfirm={handleConfirmRemove}
                title={t('alerts.confirmRemoveCourseTitle', 'Odstranit předmět?')}
                message={t('alerts.confirmRemoveCourse', { courseName: course.name, courseStagId: course.getShortCode() })}
                confirmButtonText={t('common.delete', 'Smazat')}
                confirmButtonColor="error"
            />
        </>
    );
};

export default CourseNodeHeader;