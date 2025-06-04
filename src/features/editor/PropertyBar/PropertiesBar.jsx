// src/features/editor/PropertiesBar/PropertiesBar.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Divider, Dialog, DialogTitle,
    DialogContent, DialogActions, Select, MenuItem, TextField,
    FormControl, InputLabel, Tooltip // Přidán Tooltip
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'; // Ikona pro odstranění všech
import { useTranslation } from 'react-i18next';
import PreferenceList from './PreferenceList';
import { usePreferenceManagement, PREFERENCE_CONFIG, PREFERENCE_OPTIONS } from '../hooks/usePreferenceManagement';

function PropertiesBar() {
    const { t } = useTranslation();
    const {
        preferences,
        addPreference,
        deletePreference,
        handleRemoveAllPreferences, // Nová funkce z hooku
        changePreferencePriority,
        togglePreferenceActive,
        handleGenerateSchedule,
        getPreferenceDisplayLabel,
    } = usePreferenceManagement();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedPreferenceType, setSelectedPreferenceType] = useState(Object.keys(PREFERENCE_CONFIG)[0]);
    const [currentPreferenceParams, setCurrentPreferenceParams] = useState({});

    useEffect(() => {
        if (isAddDialogOpen) {
            const config = PREFERENCE_CONFIG[selectedPreferenceType];
            const newParams = {};
            if (config && config.params) {
                config.params.forEach(p => {
                    newParams[p.name] = p.defaultValue !== undefined ? p.defaultValue : '';
                    if (p.type === 'text' && p.name === 'courseCode' && PREFERENCE_CONFIG[selectedPreferenceType]?.defaultCourseCodeProvider) {
                        // Zde by mohla být logika pro načtení kódu prvního kurzu, pokud je to požadováno
                        // newParams[p.name] = PREFERENCE_CONFIG[selectedPreferenceType].defaultCourseCodeProvider();
                    }
                });
            }
            setCurrentPreferenceParams(newParams);
        }
    }, [selectedPreferenceType, isAddDialogOpen]);


    const handleOpenAddDialog = () => {
        setSelectedPreferenceType(Object.keys(PREFERENCE_CONFIG)[0]);
        setIsAddDialogOpen(true);
    };

    const handleCloseAddDialog = () => setIsAddDialogOpen(false);

    const handleParamChange = (paramName, value) => {
        setCurrentPreferenceParams(prev => ({ ...prev, [paramName]: value }));
    };

    const handleConfirmAddPreference = () => {
        addPreference({
            type: selectedPreferenceType,
            params: { ...currentPreferenceParams }
        });
        handleCloseAddDialog();
    };

    const activePreferencesCount = preferences.filter(p => p.isActive).length;

    return (
        <Box
            sx={{
                p: { xs: 1, sm: 2 },
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: (theme) => theme.palette.background.paper,
                flexGrow: 1,
                overflowY: 'auto',
                minHeight: 0,
            }}
        >
            <Typography variant="h6" gutterBottom component="div" sx={{ px: { xs: 1, sm: 0 } }}>
                {t('propertiesBar.title')}
            </Typography>
            <Button
                variant="outlined"
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleOpenAddDialog}
                sx={{ mb: 1 }} // Zmenšena mezera
                fullWidth
            >
                {t('propertiesBar.addPreferenceButton')}
            </Button>

            {preferences && preferences.length > 0 && ( // Zobrazit jen pokud jsou nějaké preference
                <Tooltip title={t('propertiesBar.removeAllPreferencesTooltip')}>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteSweepIcon />}
                        onClick={handleRemoveAllPreferences} // Použití nové funkce
                        sx={{ mb: 2, textTransform: 'none' }}
                        fullWidth
                        size="small"
                    >
                        {t('propertiesBar.removeAllPreferences')}
                    </Button>
                </Tooltip>
            )}


            <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0, mb: 2 }}>
                <PreferenceList
                    preferences={preferences}
                    onPriorityChange={changePreferencePriority}
                    onToggleActive={togglePreferenceActive}
                    onDelete={deletePreference}
                    getPreferenceDisplayLabel={getPreferenceDisplayLabel}
                />
            </Box>

            <Divider sx={{ mt: 'auto' }} /> {/* Posunuto dolů, pokud je seznam krátký */}

            <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleGenerateSchedule}
                fullWidth
                disabled={preferences.length > 0 && activePreferencesCount === 0}
                sx={{ mt: 2 }} // Mezera nad tlačítkem generování
            >
                {t('propertiesBar.generateButton')}
            </Button>

            <Dialog
                open={isAddDialogOpen}
                onClose={handleCloseAddDialog}
                fullWidth
                maxWidth="xs"
                PaperProps={{ component: 'form', onSubmit: (e) => { e.preventDefault(); handleConfirmAddPreference(); } }}
            >
                <DialogTitle>{t('propertiesBar.addDialog.title')}</DialogTitle>
                <DialogContent dividers>
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="preference-type-label">{t('propertiesBar.addDialog.preferenceType')}</InputLabel>
                        <Select
                            labelId="preference-type-label"
                            value={selectedPreferenceType}
                            label={t('propertiesBar.addDialog.preferenceType')}
                            onChange={(e) => setSelectedPreferenceType(e.target.value)}
                            variant="filled"
                        >
                            {Object.keys(PREFERENCE_CONFIG).map(typeKey => (
                                <MenuItem key={typeKey} value={typeKey}>
                                    {t(PREFERENCE_CONFIG[typeKey].labelKey, PREFERENCE_CONFIG[typeKey].defaultLabel)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {PREFERENCE_CONFIG[selectedPreferenceType]?.params.map(param => (
                        <FormControl key={param.name} fullWidth margin="normal">
                            {param.type === 'select' && (
                                <>
                                    <InputLabel id={`${param.name}-label`}>{t(param.labelKey, param.name)}</InputLabel>
                                    <Select
                                        labelId={`${param.name}-label`}
                                        value={currentPreferenceParams[param.name] || param.defaultValue || ''}
                                        label={t(param.labelKey, param.name)}
                                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                                        variant="filled"
                                    >
                                        {(PREFERENCE_OPTIONS[param.optionsKey] || param.options || []).map(optValue => (
                                            <MenuItem key={optValue} value={optValue}>
                                                {param.optionsKey ? t(`preferences.${param.optionsKey}.${optValue}`, optValue) : optValue}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </>
                            )}
                            {param.type === 'time' && (
                                <TextField
                                    label={t(param.labelKey, param.name)}
                                    type="time"
                                    value={currentPreferenceParams[param.name] || param.defaultValue || ''}
                                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ step: 300 }}
                                    variant="filled"
                                />
                            )}
                            {param.type === 'text' && ( // Přidáno pro textové parametry jako courseCode
                                <TextField
                                    label={t(param.labelKey, param.name)}
                                    type="text"
                                    value={currentPreferenceParams[param.name] || param.defaultValue || ''}
                                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                                    variant="filled"
                                    // Zde by mohla být nápověda nebo placeholder, např. "KIV/PPA1"
                                />
                            )}
                        </FormControl>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddDialog}>{t('common.cancel')}</Button>
                    <Button type="submit" variant="contained">{t('common.add')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default PropertiesBar;