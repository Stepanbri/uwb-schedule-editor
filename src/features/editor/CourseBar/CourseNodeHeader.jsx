// PROJEKT/NEW/src/features/editor/CourseBar/CourseNodeHeader.jsx
import React from 'react';
import { Box, Typography, IconButton, Tooltip, Chip, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useTranslation } from 'react-i18next';
import { ENROLLMENT_KEYS_ORDER } from '../../../services/CourseClass'; // Assuming this path from previous step

const CourseNodeHeader = ({ course, enrolledCounts, neededEnrollmentsDisplay, areAllRequirementsMet, onRemoveCourse }) => {
    const { t } = useTranslation();

    const handleRemoveClick = (e) => {
        e.stopPropagation(); // Prevent TreeItem click
        if (window.confirm(t('alerts.confirmRemoveCourse', `Opravdu chcete odstranit předmět ${course.name} (${course.getShortCode()}) a odepsat všechny jeho zapsané akce z aktuálního rozvrhu?`, { courseName: course.name, courseStagId: course.getShortCode() }))) {
            onRemoveCourse(course.id); // Use local ID or stagId as appropriate
        }
    };

    const neededStr = ENROLLMENT_KEYS_ORDER
        .filter(key => course.neededEnrollments[key] > 0) // Show only types that are actually needed
        .map(key => `${neededEnrollmentsDisplay[key]}${t(`enrollmentShort.${key}`, key.substring(0,1).toUpperCase())}`)
        .join('/');

    const enrolledReqStr = ENROLLMENT_KEYS_ORDER
        .map(key => `${enrolledCounts[key]}/${course.neededEnrollments[key]}${t(`enrollmentShort.${key}`, key.substring(0,1).toUpperCase())}`)
        .join(' | ');

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', py: '4px' }}>
            <Stack direction="column" spacing={0.5} flexGrow={1} overflow="hidden" pr={1}>
                <Tooltip disableInteractive title={`${course.name} (${course.departmentCode}/${course.courseCode})`}>
                    <Typography variant="subtitle1" sx={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                        {course.courseCode} - {course.name}
                    </Typography>
                </Tooltip>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    {/*<Chip label={t('labels.credits', { count: course.credits })} size="small" variant="outlined" sx={{ fontSize: '0.7rem', cursor: 'default' }} />*/}
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
            <Tooltip disableInteractive title={t('tooltips.removeCourse', 'Odstranit předmět z pracovní plochy')}>
                <IconButton
                    onClick={handleRemoveClick}
                    size="small"
                    sx={{ flexShrink: 0 }}
                    aria-label={t('tooltips.removeCourse', `Odstranit předmět ${course.name}`)}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

export default CourseNodeHeader;