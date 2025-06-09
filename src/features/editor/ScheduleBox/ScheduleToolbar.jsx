import {
    Box,
    Divider,
    IconButton,
    Paper,
    ToggleButton,
    Tooltip,
    Typography,
    alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useStagApi } from '../../../contexts/StagApiContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';

// Ikony pro toolbar
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PaletteIcon from '@mui/icons-material/Palette';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ScienceIcon from '@mui/icons-material/Science';

const ScheduleToolbar = ({
    onDownloadScheduleImage,
    onExportWorkspace,
    onImportWorkspace,
    onResetWorkspace,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const navigate = useNavigate();
    const importFileRef = useRef(null);
    const { useDemoApi, toggleUseDemoApi } = useStagApi();
    const { scheduleColorMode, toggleScheduleColorMode } = useWorkspace();

    const handleImportClick = () => {
        if (importFileRef.current) {
            importFileRef.current.click();
        }
    };

    const handleFileImport = event => {
        const file = event.target.files[0];
        if (file) {
            onImportWorkspace(file);
        }

        if (importFileRef.current) {
            importFileRef.current.value = '';
        }
    };

    const stagApiTooltipText = useDemoApi
        ? t(
              'scheduleToolbar.deactivateDemoStagTooltip',
              'Deaktivovat DEMO režim (použít produkční STAG API)'
          )
        : t('scheduleToolbar.activateDemoStagTooltip', 'Aktivovat DEMO režim STAG API');

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {' '}
                {/* Levá skupina tlačítek */}
                <Tooltip
                    title={t(
                        'scheduleToolbar.colorModeTooltip',
                        'Přepnout barvy rozvrhu (dle předmětu / typu akce)'
                    )}
                >
                    <ToggleButton
                        value="colorMode"
                        selected={scheduleColorMode === 'course'}
                        onChange={toggleScheduleColorMode}
                        size="small"
                        sx={{
                            '&.Mui-selected': {
                                color: 'primary.main',
                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                            },
                        }}
                    >
                        <PaletteIcon />
                    </ToggleButton>
                </Tooltip>
                <Tooltip title={t('scheduleToolbar.downloadImageTooltip')}>
                    <IconButton size="small" onClick={onDownloadScheduleImage} color="primary">
                        <PhotoCameraIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title={t('scheduleToolbar.exportWorkspaceTooltip')}>
                    <IconButton size="small" onClick={onExportWorkspace} color="primary">
                        <FileDownloadIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title={t('scheduleToolbar.importWorkspaceTooltip')}>
                    <IconButton size="small" onClick={handleImportClick} color="primary">
                        <FileUploadIcon />
                    </IconButton>
                </Tooltip>
                <input
                    type="file"
                    ref={importFileRef}
                    onChange={handleFileImport}
                    accept=".json"
                    style={{ display: 'none' }}
                />
                <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }}
                />
                <Tooltip
                    title={t(
                        'scheduleToolbar.resetWorkspaceCleanTooltip',
                        'Resetovat pracovní plochu (vymazat vše)'
                    )}
                >
                    <IconButton size="small" onClick={onResetWorkspace} color="error">
                        <RestartAltIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Box sx={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {' '}
                {/* Pravá skupina */}
                <Tooltip title={t('scheduleToolbar.faqButtonTooltip', 'Nápověda a FAQ')}>
                    <IconButton
                        size="small"
                        onClick={() => navigate('/faq#q4')}
                        color="inherit"
                        sx={{ color: theme.palette.action.active }}
                    >
                        <HelpOutlineIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title={stagApiTooltipText}>
                    <ToggleButton
                        value="check"
                        selected={useDemoApi}
                        onChange={toggleUseDemoApi}
                        size="small"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            paddingX: 1,
                            textTransform: 'none',
                            border: `1px solid ${theme.palette.divider}`,
                            color: theme.palette.action.active,
                            backgroundColor: 'transparent',
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.action.active, 0.04),
                            },
                            '&.Mui-selected': {
                                border: `1px solid ${theme.palette.warning.main}`,
                                color: theme.palette.warning.main,
                                backgroundColor: alpha(theme.palette.warning.light, 0.12),
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.warning.main, 0.2),
                                },
                            },
                        }}
                    >
                        <ScienceIcon fontSize="small" />
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 'bold',
                                lineHeight: 'inherit',
                                color: 'inherit',
                                display: { xs: 'none', sm: 'inline' },
                            }}
                        >
                            DEMO
                        </Typography>
                    </ToggleButton>
                </Tooltip>
            </Box>
        </Paper>
    );
};

export default ScheduleToolbar;
