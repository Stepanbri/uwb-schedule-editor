import {
    ArrowDownward as ArrowDownwardIcon,
    ArrowUpward as ArrowUpwardIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { Box, IconButton, Paper, Stack, Switch, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GenericConfirmationDialog from '../Dialogs/GenericConfirmationDialog';

function PreferenceItem({
    preference,
    onPriorityChange,
    onToggleActive,
    onDelete,
    isFirst,
    isLast,
    displayLabel,
}) {
    const { t } = useTranslation();
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const handleOpenConfirmDialog = () => setConfirmDialogOpen(true);
    const handleCloseConfirmDialog = () => setConfirmDialogOpen(false);

    const handleConfirmDelete = () => {
        onDelete(preference.id);
        handleCloseConfirmDialog();
    };

    const handleIncreasePriority = () => onPriorityChange(preference.id, 'up');
    const handleDecreasePriority = () => onPriorityChange(preference.id, 'down');

    return (
        <>
            <Paper
                elevation={1}
                sx={{
                    p: '4px 8px',
                    my: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    opacity: preference.isActive ? 1 : 0.65,
                    transition: 'opacity 0.3s ease',
                }}
            >
                {/* Left part: Priority controls */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        alignSelf: 'stretch',
                    }}
                >
                    <Tooltip title={t('propertiesBar.preferenceItem.increasePriority')}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleIncreasePriority}
                                disabled={isFirst}
                            >
                                <ArrowUpwardIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {preference.priority}
                    </Typography>
                    <Tooltip title={t('propertiesBar.preferenceItem.decreasePriority')}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleDecreasePriority}
                                disabled={isLast}
                            >
                                <ArrowDownwardIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>

                {/* Middle part: Display Label */}
                <Typography
                    variant="body2"
                    title={displayLabel}
                    sx={{
                        flexGrow: 1,
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: '1.4',
                    }}
                >
                    {displayLabel}
                </Typography>

                {/* Right part: Actions */}
                <Stack direction="row" alignItems="center">
                    <Tooltip
                        title={
                            preference.isActive
                                ? t('propertiesBar.preferenceItem.deactivatePreference')
                                : t('propertiesBar.preferenceItem.activatePreference')
                        }
                    >
                        <Switch
                            checked={preference.isActive}
                            onChange={() => onToggleActive(preference.id)}
                            size="small"
                        />
                    </Tooltip>
                    <Tooltip title={t('propertiesBar.preferenceItem.deletePreference')}>
                        <IconButton size="small" onClick={handleOpenConfirmDialog}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Paper>

            <GenericConfirmationDialog
                open={confirmDialogOpen}
                onClose={handleCloseConfirmDialog}
                onConfirm={handleConfirmDelete}
                title={t('Dialogs.deletePreference.title')}
                message={t('Dialogs.deletePreference.message', { preferenceLabel: displayLabel })}
                confirmButtonText={t('common.delete')}
                confirmButtonColor="error"
            />
        </>
    );
}

export default PreferenceItem;
