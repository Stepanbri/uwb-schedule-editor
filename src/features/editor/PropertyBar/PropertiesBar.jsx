// src/features/editor/PropertiesBar/PropertiesBar.jsx
import React, { useState, useEffect } from 'react'; // useEffect pro načtení parametrů dialogu
import {
    Box, Typography, Button, Divider, Dialog, DialogTitle,
    DialogContent, DialogActions, Select, MenuItem, TextField,
    FormControl, InputLabel
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';
import PreferenceList from './PreferenceList';
import { usePreferenceManagement, PREFERENCE_CONFIG, PREFERENCE_OPTIONS } from '../hooks/usePreferenceManagement'; // Import hooku a konfigurace

function PropertiesBar() {
    const { t } = useTranslation();
    const {
        preferences, // Seřazené pole preferencí z hooku
        // PREFERENCE_CONFIG, // Již importováno přímo
        // PREFERENCE_OPTIONS, // Již importováno přímo
        addPreference,
        deletePreference,
        changePreferencePriority,
        togglePreferenceActive,
        handleGenerateSchedule,
        getPreferenceDisplayLabel,
    } = usePreferenceManagement();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    // Stavy pro formulář v dialogu pro přidání nové preference
    const [selectedPreferenceType, setSelectedPreferenceType] = useState(Object.keys(PREFERENCE_CONFIG)[0]);
    const [currentPreferenceParams, setCurrentPreferenceParams] = useState({});

    // Efekt pro inicializaci/reset parametrů dialogu při změně typu preference nebo otevření dialogu
    useEffect(() => {
        if (isAddDialogOpen) {
            const config = PREFERENCE_CONFIG[selectedPreferenceType];
            const newParams = {};
            if (config && config.params) {
                config.params.forEach(p => {
                    newParams[p.name] = p.defaultValue !== undefined ? p.defaultValue : '';
                });
            }
            setCurrentPreferenceParams(newParams);
        }
    }, [selectedPreferenceType, isAddDialogOpen]);


    const handleOpenAddDialog = () => {
        // Nastavíme výchozí typ a resetujeme parametry (useEffect výše to zařídí)
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
            // ID, priorita a isActive budou nastaveny v hooku/službě
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
                {t('propertiesBar.title', 'Nastavení Generování')}
            </Typography>
            <Button
                variant="outlined"
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleOpenAddDialog}
                sx={{ mb: 2 }}
                fullWidth
            >
                {t('propertiesBar.addPreferenceButton', 'Přidat preferenci')}
            </Button>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
                <PreferenceList
                    preferences={preferences} // Předáváme již seřazené preference z hooku
                    onPriorityChange={changePreferencePriority}
                    onToggleActive={togglePreferenceActive}
                    onDelete={deletePreference}
                    getPreferenceDisplayLabel={getPreferenceDisplayLabel}
                />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleGenerateSchedule} // Funkce z hooku
                fullWidth
                disabled={preferences.length > 0 && activePreferencesCount === 0} // Zakázáno, pokud jsou preference, ale žádná není aktivní
            >
                {t('propertiesBar.generateButton', 'Vygenerovat Rozvrh')}
            </Button>

            <Dialog
                open={isAddDialogOpen}
                onClose={handleCloseAddDialog}
                fullWidth
                maxWidth="xs"
                PaperProps={{ component: 'form', onSubmit: (e) => { e.preventDefault(); handleConfirmAddPreference(); } }}
            >
                <DialogTitle>{t('propertiesBar.addDialog.title', 'Přidat novou preferenci')}</DialogTitle>
                <DialogContent dividers>
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="preference-type-label">{t('propertiesBar.addDialog.preferenceType', 'Typ preference')}</InputLabel>
                        <Select
                            labelId="preference-type-label"
                            value={selectedPreferenceType}
                            label={t('propertiesBar.addDialog.preferenceType', 'Typ preference')}
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
                                                {/* Pokud optionsKey odkazuje na překlad, např. pro dny */}
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
                                    InputLabelProps={{ shrink: true }} // Opraveno z inputLabel
                                    inputProps={{ step: 300 }} // Opraveno z htmlInput
                                    variant="filled"
                                />
                            )}
                            {/* Zde by mohly být další typy parametrů, např. TextField pro textové vstupy */}
                        </FormControl>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddDialog}>{t('common.cancel', 'Zrušit')}</Button>
                    <Button type="submit" variant="contained">{t('common.add', 'Přidat')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default PropertiesBar;