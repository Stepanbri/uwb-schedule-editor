// src/features/editor/ScheduleBox/ScheduleToolbar.jsx
import React, { useState, useRef } from 'react';
import { Box, Paper, ToggleButtonGroup, ToggleButton, Tooltip, Button, Divider, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

// Ikony pro toolbar
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SaveIcon from '@mui/icons-material/Save'; // Může být pro export
import RefreshIcon from '@mui/icons-material/Refresh';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';


const ScheduleToolbar = ({
                             onToggleCompactView, // Předpoklad pro toggle button
                             onToggleWeekends,    // Předpoklad pro toggle button
                             isCompactView,       // Stav pro toggle
                             showWeekends,        // Stav pro toggle
                             onDownloadScheduleImage,
                             onExportWorkspace,
                             onImportWorkspace,
                             onResetWorkspace,
                         }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const importFileRef = useRef(null);

    const handleImportClick = () => {
        if (importFileRef.current) {
            importFileRef.current.click();
        }
    };

    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (file) {
            onImportWorkspace(file);
        }
        // Reset value of input so the same file can be selected again
        if (importFileRef.current) {
            importFileRef.current.value = "";
        }
    };

    return (
        <Paper
            elevation={1}
            sx={{
                p: 1,
                mb: 1.5,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'center',
                borderRadius: theme.shape.borderRadius,
                border: `1px solid ${theme.palette.divider}`,
            }}
        >
            {/* Toggle Buttons - Příklad, upravte dle reálné potřeby */}
            {/* <ToggleButtonGroup
                value={isCompactView ? 'compact' : 'normal'}
                exclusive
                onChange={onToggleCompactView} // Handler by měl být předán z EditorPage
                aria-label="Schedule view mode"
                size="small"
            >
                <ToggleButton value="compact" aria-label={t('scheduleToolbar.compactView')}>
                    <Tooltip title={t('scheduleToolbar.compactViewTooltip')}>
                        <ViewCompactIcon />
                    </Tooltip>
                </ToggleButton>
            </ToggleButtonGroup>
             <ToggleButtonGroup
                value={showWeekends ? 'weekends' : 'no-weekends'}
                exclusive
                onChange={onToggleWeekends} // Handler by měl být předán z EditorPage
                aria-label="Toggle weekends"
                size="small"
            >
                <ToggleButton value="weekends" aria-label={t('scheduleToolbar.fullWeekView')}>
                    <Tooltip title={t('scheduleToolbar.fullWeekViewTooltip')}>
                        <CalendarViewWeekIcon />
                    </Tooltip>
                </ToggleButton>
            </ToggleButtonGroup> */}


            {/* Akční tlačítka */}
            <Tooltip title={t('scheduleToolbar.downloadImageTooltip')}>
                <IconButton size="medium" onClick={onDownloadScheduleImage} color="primary">
                    <PhotoCameraIcon />
                </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Tooltip title={t('scheduleToolbar.exportWorkspaceTooltip')}>
                <IconButton size="medium" onClick={onExportWorkspace} color="primary">
                    <DownloadIcon />
                </IconButton>
            </Tooltip>

            <Tooltip title={t('scheduleToolbar.importWorkspaceTooltip')}>
                <IconButton size="medium" onClick={handleImportClick} color="primary">
                    <UploadFileIcon />
                </IconButton>
            </Tooltip>
            <input
                type="file"
                ref={importFileRef}
                onChange={handleFileImport}
                accept=".json"
                style={{ display: 'none' }}
            />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Tooltip title={t('scheduleToolbar.resetWorkspaceTooltip')}>
                <IconButton size="medium" onClick={onResetWorkspace} color="error">
                    <RefreshIcon />
                </IconButton>
            </Tooltip>
        </Paper>
    );
};

export default ScheduleToolbar;