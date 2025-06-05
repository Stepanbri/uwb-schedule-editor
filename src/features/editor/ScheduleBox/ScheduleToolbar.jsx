// src/features/editor/ScheduleBox/ScheduleToolbar.jsx
import React, { useRef } from 'react';
import { Paper, Tooltip, Divider, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

// Ikony pro toolbar
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import RestartAltIcon from '@mui/icons-material/RestartAlt';


const ScheduleToolbar = ({
                             onDownloadScheduleImage,
                             onExportWorkspace,
                             onImportWorkspace,
                             onResetWorkspace,
                             onResetWorkspaceAndLoadDummyData,
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
                //borderRadius: theme.shape.borderRadius,
                border: `1px solid ${theme.palette.divider}`,
            }}
        >
            {/* Akční tlačítka */}
            <Tooltip title={t('scheduleToolbar.downloadImageTooltip')}>
                <IconButton size="small" onClick={onDownloadScheduleImage} color="primary">
                    <PhotoCameraIcon />
                </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Tooltip title={t('scheduleToolbar.exportWorkspaceTooltip')}>
                <IconButton size="small" onClick={onExportWorkspace} color="primary">
                    <DownloadIcon />
                </IconButton>
            </Tooltip>

            <Tooltip title={t('scheduleToolbar.importWorkspaceTooltip')}>
                <IconButton size="small" onClick={handleImportClick} color="primary">
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

            <Tooltip title={t('scheduleToolbar.resetWorkspaceCleanTooltip', 'Resetovat pracovní plochu (vymazat vše)')}>
                <IconButton size="small" onClick={onResetWorkspace} color="error">
                    <RestartAltIcon />
                </IconButton>
            </Tooltip>

            <Tooltip title={t('scheduleToolbar.resetWorkspaceWithDummyTooltip', 'Resetovat a načíst ukázková data')}>
                <IconButton size="small" onClick={onResetWorkspaceAndLoadDummyData} color="warning">
                    <PlaylistAddCheckIcon />
                </IconButton>
            </Tooltip>
        </Paper>
    );
};

export default ScheduleToolbar;