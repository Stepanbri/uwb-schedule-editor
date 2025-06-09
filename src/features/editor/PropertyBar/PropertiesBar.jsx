import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { EVENT_TYPE_TO_KEY_MAP } from '../../../services/CourseClass';
import {
    PREFERENCE_CONFIG,
    PREFERENCE_OPTIONS,
    usePreferenceManagement,
} from '../hooks/usePreferenceManagement';
import PreferenceList from './PreferenceList';

const getUniqueValues = (array, keyAccessor) => {
    const values = array.map(item => keyAccessor(item));
    return [...new Set(values)].filter(Boolean);
};

function PropertiesBar() {
    const { t } = useTranslation();
    const {
        preferences,
        addPreference,
        deletePreference,
        handleRemoveAllPreferences,
        changePreferencePriority,
        togglePreferenceActive,
        handleGenerateSchedule,
        getPreferenceDisplayLabel,
    } = usePreferenceManagement();

    const { courses } = useWorkspace();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedPreferenceType, setSelectedPreferenceType] = useState(
        Object.keys(PREFERENCE_CONFIG)[0]
    );
    const [currentPreferenceParams, setCurrentPreferenceParams] = useState({});

    // Stavy pro dynamické selecty PREFER_INSTRUCTOR
    const [selectedCourseEvents, setSelectedCourseEvents] = useState([]);
    const [availableEventTypes, setAvailableEventTypes] = useState([]);
    const [availableInstructors, setAvailableInstructors] = useState([]);

    // Efekt pro resetování a naplnění parametrů při změně typu preference nebo otevření dialogu
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

            // Reset dynamických polí, pokud typ není PREFER_INSTRUCTOR
            if (selectedPreferenceType !== 'PREFER_INSTRUCTOR') {
                setSelectedCourseEvents([]);
                setAvailableEventTypes([]);
                setAvailableInstructors([]);
            } else {
                // Pokud je PREFER_INSTRUCTOR a jsou již nějaké parametry (např. dialog se znovu otevřel se starými hodnotami),
                // pokusíme se je znovu načíst.
                if (newParams.courseCode) {
                    const foundCourse = courses.find(
                        c => c.getShortCode() === newParams.courseCode
                    );
                    if (foundCourse) {
                        setSelectedCourseEvents(foundCourse.events || []);
                        const types = getUniqueValues(
                            foundCourse.events || [],
                            event => event.type
                        );
                        setAvailableEventTypes(types);
                        if (newParams.eventType) {
                            const instructors = getUniqueValues(
                                (foundCourse.events || []).filter(
                                    event => event.type === newParams.eventType
                                ),
                                event =>
                                    typeof event.instructor === 'object'
                                        ? event.instructor.name
                                        : event.instructor
                            );
                            setAvailableInstructors(instructors);
                        } else {
                            setAvailableInstructors([]);
                        }
                    } else {
                        setSelectedCourseEvents([]);
                        setAvailableEventTypes([]);
                        setAvailableInstructors([]);
                    }
                } else {
                    // Žádný předmět není vybrán, resetujeme vše
                    setSelectedCourseEvents([]);
                    setAvailableEventTypes([]);
                    setAvailableInstructors([]);
                }
            }
        }
    }, [selectedPreferenceType, isAddDialogOpen, courses]);

    // Efekt pro aktualizaci dostupných typů akcí při změně vybraného kurzu
    useEffect(() => {
        if (selectedPreferenceType === 'PREFER_INSTRUCTOR' && currentPreferenceParams.courseCode) {
            const selectedCourse = courses.find(
                c => c.getShortCode() === currentPreferenceParams.courseCode
            );
            if (selectedCourse) {
                setSelectedCourseEvents(selectedCourse.events || []);
                const types = getUniqueValues(selectedCourse.events || [], event => event.type);
                setAvailableEventTypes(types);
            } else {
                setSelectedCourseEvents([]);
                setAvailableEventTypes([]);
            }
            // Reset eventType a instructorName, protože se změnil předmět
            setCurrentPreferenceParams(prev => ({ ...prev, eventType: '', instructorName: '' }));
            setAvailableInstructors([]);
        }
    }, [currentPreferenceParams.courseCode, selectedPreferenceType, courses]);

    // Efekt pro aktualizaci dostupných vyučujících při změně typu akce
    useEffect(() => {
        if (
            selectedPreferenceType === 'PREFER_INSTRUCTOR' &&
            currentPreferenceParams.eventType &&
            selectedCourseEvents.length > 0
        ) {
            const instructors = getUniqueValues(
                selectedCourseEvents.filter(
                    event => event.type === currentPreferenceParams.eventType
                ),
                event =>
                    typeof event.instructor === 'object' ? event.instructor.name : event.instructor
            );
            setAvailableInstructors(instructors);
        } else {
            setAvailableInstructors([]);
        }
        // Reset instructorName, protože se změnil typ akce
        setCurrentPreferenceParams(prev => ({ ...prev, instructorName: '' }));
    }, [currentPreferenceParams.eventType, selectedCourseEvents, selectedPreferenceType]);

    const handleOpenAddDialog = () => {
        setSelectedPreferenceType(Object.keys(PREFERENCE_CONFIG)[0]);
        setSelectedCourseEvents([]);
        setAvailableEventTypes([]);
        setAvailableInstructors([]);
        setIsAddDialogOpen(true);
    };

    const handleCloseAddDialog = () => setIsAddDialogOpen(false);

    const handleParamChange = (paramName, value) => {
        setCurrentPreferenceParams(prev => ({ ...prev, [paramName]: value }));
    };

    const handleConfirmAddPreference = () => {
        addPreference({
            type: selectedPreferenceType,
            params: Object.keys(currentPreferenceParams).reduce((acc, key) => {
                const paramDef = PREFERENCE_CONFIG[selectedPreferenceType]?.params.find(
                    p => p.name === key
                );
                if (paramDef) {
                    acc[key] = currentPreferenceParams[key];
                }
                return acc;
            }, {}),
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
                backgroundColor: theme => theme.palette.background.paper,
                flexGrow: 1,
                overflowY: 'auto',
                scrollbarGutter: 'unset',
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
                sx={{ mb: 1, textTransform: 'none', justifyContent: 'flex-start' }}
                fullWidth
                size="small"
            >
                {t('propertiesBar.addPreferenceButton')}
            </Button>

            {preferences && preferences.length > 0 && (
                <Tooltip title={t('propertiesBar.removeAllPreferencesTooltip')}>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteSweepIcon />}
                        onClick={handleRemoveAllPreferences}
                        sx={{ mb: 2, textTransform: 'none', justifyContent: 'flex-start' }}
                        fullWidth
                        size="small"
                    >
                        {t('propertiesBar.removeAllPreferences')}
                    </Button>
                </Tooltip>
            )}

            <Box
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    minHeight: 0,
                    mb: 2,
                    scrollbarGutter: 'stable',
                }}
            >
                <PreferenceList
                    preferences={preferences}
                    onPriorityChange={changePreferencePriority}
                    onToggleActive={togglePreferenceActive}
                    onDelete={deletePreference}
                    getPreferenceDisplayLabel={getPreferenceDisplayLabel}
                />
            </Box>

            <Divider sx={{ mt: 'auto' }} />

            <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleGenerateSchedule}
                fullWidth
                sx={{ mt: 2, textTransform: 'none' }}
                size="small"
            >
                {t('propertiesBar.generateButton')}
            </Button>

            <Dialog
                open={isAddDialogOpen}
                onClose={handleCloseAddDialog}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    component: 'form',
                    onSubmit: e => {
                        e.preventDefault();
                        handleConfirmAddPreference();
                    },
                }}
            >
                <DialogTitle>{t('propertiesBar.addDialog.title')}</DialogTitle>
                <DialogContent dividers>
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="preference-type-label">
                            {t('propertiesBar.addDialog.preferenceType')}
                        </InputLabel>
                        <Select
                            labelId="preference-type-label"
                            value={selectedPreferenceType}
                            label={t('propertiesBar.addDialog.preferenceType')}
                            onChange={e => setSelectedPreferenceType(e.target.value)}
                            variant="filled"
                        >
                            {Object.keys(PREFERENCE_CONFIG).map(typeKey => (
                                <MenuItem key={typeKey} value={typeKey}>
                                    {t(
                                        PREFERENCE_CONFIG[typeKey].labelKey,
                                        PREFERENCE_CONFIG[typeKey].defaultLabel
                                    )}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {PREFERENCE_CONFIG[selectedPreferenceType]?.params.map(param => (
                        <FormControl key={param.name} fullWidth margin="normal">
                            {param.type === 'select' && (
                                <>
                                    <InputLabel id={`${param.name}-label`}>
                                        {t(param.labelKey, param.name)}
                                    </InputLabel>
                                    <Select
                                        labelId={`${param.name}-label`}
                                        value={
                                            currentPreferenceParams[param.name] ||
                                            param.defaultValue ||
                                            ''
                                        }
                                        label={t(param.labelKey, param.name)}
                                        onChange={e =>
                                            handleParamChange(param.name, e.target.value)
                                        }
                                        variant="filled"
                                    >
                                        {(
                                            PREFERENCE_OPTIONS[param.optionsKey] ||
                                            param.options ||
                                            []
                                        ).map(optValue => (
                                            <MenuItem key={optValue} value={optValue}>
                                                {param.optionsKey
                                                    ? t(
                                                          `preferences.${param.optionsKey}.${optValue}`,
                                                          optValue
                                                      )
                                                    : optValue}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </>
                            )}
                            {param.type === 'customCourseSelect' && (
                                <>
                                    <InputLabel id={`${param.name}-label`}>
                                        {t(param.labelKey, param.name)}
                                    </InputLabel>
                                    <Select
                                        labelId={`${param.name}-label`}
                                        value={currentPreferenceParams[param.name] || ''}
                                        label={t(param.labelKey, param.name)}
                                        onChange={e =>
                                            handleParamChange(param.name, e.target.value)
                                        }
                                        variant="filled"
                                        disabled={courses.length === 0}
                                    >
                                        {courses.map(course => (
                                            <MenuItem key={course.id} value={course.getShortCode()}>
                                                {`${course.name} (${course.getShortCode()})`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </>
                            )}
                            {param.type === 'customEventTypeSelect' && (
                                <>
                                    <InputLabel id={`${param.name}-label`}>
                                        {t(param.labelKey, param.name)}
                                    </InputLabel>
                                    <Select
                                        labelId={`${param.name}-label`}
                                        value={currentPreferenceParams[param.name] || ''}
                                        label={t(param.labelKey, param.name)}
                                        onChange={e =>
                                            handleParamChange(param.name, e.target.value)
                                        }
                                        variant="filled"
                                        disabled={
                                            !currentPreferenceParams.courseCode ||
                                            availableEventTypes.length === 0
                                        }
                                    >
                                        {availableEventTypes.map(eventType => (
                                            <MenuItem key={eventType} value={eventType}>
                                                {t(
                                                    `courseEvent.${EVENT_TYPE_TO_KEY_MAP[eventType.toLowerCase()] || 'other'}`,
                                                    eventType
                                                )}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </>
                            )}
                            {param.type === 'customInstructorSelect' && (
                                <>
                                    <InputLabel id={`${param.name}-label`}>
                                        {t(param.labelKey, param.name)}
                                    </InputLabel>
                                    <Select
                                        labelId={`${param.name}-label`}
                                        value={currentPreferenceParams[param.name] || ''}
                                        label={t(param.labelKey, param.name)}
                                        onChange={e =>
                                            handleParamChange(param.name, e.target.value)
                                        }
                                        variant="filled"
                                        disabled={
                                            !currentPreferenceParams.eventType ||
                                            availableInstructors.length === 0
                                        }
                                    >
                                        {availableInstructors.map(instructor => (
                                            <MenuItem key={instructor} value={instructor}>
                                                {instructor}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </>
                            )}
                            {param.type === 'time' && (
                                <TextField
                                    label={t(param.labelKey, param.name)}
                                    type="time"
                                    value={
                                        currentPreferenceParams[param.name] ||
                                        param.defaultValue ||
                                        ''
                                    }
                                    onChange={e => handleParamChange(param.name, e.target.value)}
                                    slotProps={{ input: { step: 300 } }}
                                    variant="filled"
                                />
                            )}
                            {param.type === 'text' && (
                                <TextField
                                    label={t(param.labelKey, param.name)}
                                    type="text"
                                    value={
                                        currentPreferenceParams[param.name] ||
                                        param.defaultValue ||
                                        ''
                                    }
                                    onChange={e => handleParamChange(param.name, e.target.value)}
                                    variant="filled"
                                />
                            )}
                        </FormControl>
                    ))}
                </DialogContent>
                <DialogActions sx={{ padding: '16px 24px' }}>
                    <Button onClick={handleCloseAddDialog}>{t('common.cancel')}</Button>
                    <Button type="submit" variant="contained">
                        {t('common.add')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default PropertiesBar;
