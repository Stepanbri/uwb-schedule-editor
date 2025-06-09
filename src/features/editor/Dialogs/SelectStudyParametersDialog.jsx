import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateAcademicYears, getCurrentAcademicYear } from '../../../utils/academicYearUtils';

// academicYearsSource a currentAcademicYear již nebudou primárně použity pro tento dialog
// ale ponecháme je, pokud by byly potřeba pro defaultní hodnotu jiného pole (např. rok pro rozvrhové akce)

const SelectStudyParametersDialog = ({
    open,
    onClose,
    onSubmitParameters,
    studentContext,
    defaultAcademicYear /* Může být stále relevantní pro rok rozvrhových akcí */,
}) => {
    const { t } = useTranslation();
    // Nový stav pro ročník studia
    const [studyYearNum, setStudyYearNum] = useState('1'); // Výchozí ročník
    const [semester, setSemester] = useState('%'); // Změna výchozí hodnoty na "Oba semestry"
    const [statuses, setStatuses] = useState({ A: true, B: true, C: false });
    const [error, setError] = useState('');

    // Rok pro načítání rozvrhových akcí, může být jiný než ročník studia předmětů
    const [scheduleAcademicYear, setScheduleAcademicYear] = useState(getCurrentAcademicYear());

    const academicYearsOptions = useMemo(() => generateAcademicYears(), []);

    useEffect(() => {
        if (open) {
            setStudyYearNum('1'); // Reset na první ročník
            setSemester('%'); // Změna resetované hodnoty na "Oba semestry"
            setStatuses({ A: true, B: true, C: false });
            setScheduleAcademicYear(getCurrentAcademicYear());
            setError('');
        }
    }, [open, defaultAcademicYear]);

    const handleStatusChange = event => {
        setStatuses({ ...statuses, [event.target.name]: event.target.checked });
        setError('');
    };

    const handleSelectAllStatuses = event => {
        const isChecked = event.target.checked;
        setStatuses({ A: isChecked, B: isChecked, C: isChecked });
        setError('');
    };

    const validate = () => {
        const selectedStatuses = Object.keys(statuses).filter(key => statuses[key]);
        if (selectedStatuses.length === 0) {
            setError(
                t(
                    'Dialogs.selectStudyParams.errorNoStatusSelected',
                    'Musíte vybrat alespoň jeden status předmětu.'
                )
            );
            return false;
        }
        const yearNum = parseInt(studyYearNum, 10);
        if (isNaN(yearNum) || yearNum < 1 || yearNum > 7) {
            // Obvykle 1-3 Bc., 1-2 Mgr., 1-4 PhD.
            setError(
                t(
                    'Dialogs.selectStudyParams.errorStudyYearInvalid',
                    'Ročník studia musí být číslo (např. 1-5).'
                )
            );
            return false;
        }
        if (!scheduleAcademicYear || !/^\d{4}\/\d{4}$/.test(scheduleAcademicYear)) {
            setError(
                t(
                    'Dialogs.selectStudyParams.errorScheduleYearInvalid',
                    'Akademický rok pro rozvrhové akce je neplatný (formát RRRR/RRRR).'
                )
            );
            return false;
        }
        if (!semester) {
            setError(t('Dialogs.selectStudyParams.errorSemesterRequired', 'Semestr je povinný.'));
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = () => {
        if (validate()) {
            const selectedStatusesArray = Object.keys(statuses).filter(key => statuses[key]);
            onSubmitParameters({
                studyYearNum: parseInt(studyYearNum, 10), // Číslo ročníku
                scheduleAcademicYear: scheduleAcademicYear, // Akademický rok pro hledání rozvrhových akcí (RRRR/RR)
                semester,
                statuses: selectedStatusesArray,
            });
        }
    };

    const isAllSelected = statuses.A && statuses.B && statuses.C;
    const isIndeterminate = (statuses.A || statuses.B || statuses.C) && !isAllSelected;

    const academicYearsSourceForSchedule = () => {
        const years = [];
        const currentYearStart = new Date().getFullYear();
        for (let i = 1; i >= -1; i--) {
            // Aktuální, minulý, příští
            years.push(`${currentYearStart - i}/${currentYearStart - i + 1}`);
        }
        return years;
    };

    return (
        <Dialog open={open} onClose={() => onClose(true)} fullWidth maxWidth="sm">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
                <LibraryBooksIcon sx={{ mr: 1, color: 'primary.main' }} />
                {t('Dialogs.selectStudyParams.title', 'Parametry pro načtení předmětů oboru')}
            </DialogTitle>
            <DialogContent dividers>
                {studentContext && (
                    <Typography variant="body2" gutterBottom>
                        {t('Dialogs.selectStudyParams.studentInfo', 'Načítání pro:')}{' '}
                        <strong>
                            {studentContext.jmeno} {studentContext.prijmeni}
                        </strong>{' '}
                        ({studentContext.osCislo})
                        <br />
                        {t('Dialogs.selectStudyParams.studyProgram', 'Program/Obor:')}{' '}
                        {studentContext.studProgramNazev} / {studentContext.oborNazev} (
                        {studentContext.fakulta})
                    </Typography>
                )}
                <Box
                    sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: studentContext ? 2 : 0 }}
                />

                <Grid container spacing={2} sx={{ pt: 1 }}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label={t('Dialogs.selectStudyParams.studyYearNumLabel', 'Ročník')}
                            type="number"
                            value={studyYearNum}
                            onChange={e => setStudyYearNum(e.target.value)}
                            fullWidth
                            required
                            slotProps={{ input: { min: 1, max: 7 } }} // Omezení vstupu
                            error={
                                !!error &&
                                error.includes(
                                    t('Dialogs.selectStudyParams.errorStudyYearInvalid', 'Ročník')
                                )
                            }
                            helperText={error.includes('Ročník') ? error : ''}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ width: '7.5rem' }}>
                        <Autocomplete
                            disableClearable
                            options={academicYearsOptions}
                            getOptionLabel={option => option.label || ''}
                            value={
                                academicYearsOptions.find(
                                    opt => opt.value === scheduleAcademicYear
                                ) || null
                            }
                            fullWidth
                            onChange={(event, newValue) => {
                                setScheduleAcademicYear(newValue ? newValue.value : null);
                            }}
                            isOptionEqualToValue={(option, value) => option.value === value.value}
                            renderInput={params => (
                                <TextField
                                    {...params}
                                    label={t(
                                        'Dialogs.selectStudyParams.scheduleAcademicYearLabel',
                                        'Akademický rok rozvrhu'
                                    )}
                                    required
                                    error={
                                        !!error &&
                                        error.includes(
                                            t(
                                                'Dialogs.selectStudyParams.errorScheduleYearInvalid',
                                                'Akademický rok'
                                            )
                                        )
                                    }
                                    helperText={error.includes('Akademický rok') ? error : ''}
                                />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl
                            fullWidth
                            required
                            error={
                                !!error &&
                                error.includes(
                                    t('Dialogs.selectStudyParams.errorSemesterRequired', 'Semestr')
                                )
                            }
                        >
                            <InputLabel id="semester-sp-select-label">
                                {t('Dialogs.selectStudyParams.semesterLabel', 'Semestr předmětů')}
                            </InputLabel>
                            <Select
                                labelId="semester-sp-select-label"
                                value={semester}
                                label={t(
                                    'Dialogs.selectStudyParams.semesterLabel',
                                    'Semestr předmětů'
                                )}
                                onChange={e => setSemester(e.target.value)}
                                variant={'filled'}
                            >
                                <MenuItem value="ZS">
                                    {t('Dialogs.selectStudyParams.semesterZS', 'Zimní (ZS)')}
                                </MenuItem>
                                <MenuItem value="LS">
                                    {t('Dialogs.selectStudyParams.semesterLS', 'Letní (LS)')}
                                </MenuItem>
                                <MenuItem value="%">
                                    {t('Dialogs.selectStudyParams.semesterBoth', 'Oba (ZS i LS)')}
                                </MenuItem>
                            </Select>
                            {error.includes('Semestr') && <FormHelperText>{error}</FormHelperText>}
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            {t(
                                'Dialogs.selectStudyParams.subjectStatusesTitle',
                                'Statuty předmětů k načtení:'
                            )}
                        </Typography>
                        <FormControl
                            component="fieldset"
                            variant="standard"
                            required
                            error={
                                !!error &&
                                error.includes(
                                    t('Dialogs.selectStudyParams.errorNoStatusSelected', 'status')
                                )
                            }
                        >
                            <FormGroup row>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={isAllSelected}
                                            indeterminate={isIndeterminate}
                                            onChange={handleSelectAllStatuses}
                                        />
                                    }
                                    label={t('Dialogs.selectStudyParams.statusAll', 'Všechny')}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={statuses.A}
                                            onChange={handleStatusChange}
                                            name="A"
                                        />
                                    }
                                    label={t('Dialogs.selectStudyParams.statusA', 'A (Povinný)')}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={statuses.B}
                                            onChange={handleStatusChange}
                                            name="B"
                                        />
                                    }
                                    label={t(
                                        'Dialogs.selectStudyParams.statusB',
                                        'B (Povinně vol.)'
                                    )}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={statuses.C}
                                            onChange={handleStatusChange}
                                            name="C"
                                        />
                                    }
                                    label={t('Dialogs.selectStudyParams.statusC', 'C (Volitelný)')}
                                />
                            </FormGroup>
                            {error.includes('status') && <FormHelperText>{error}</FormHelperText>}
                        </FormControl>
                    </Grid>
                </Grid>
                {error &&
                    !error.includes('status') &&
                    !error.includes('Ročník') &&
                    !error.includes('Semestr') &&
                    !error.includes('Akademický rok') && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={() => onClose(true)}>{t('common.cancel', 'Zrušit')}</Button>
                <Button onClick={handleSubmit} variant="contained">
                    {t('Dialogs.selectStudyParams.submitButton', 'Načíst předměty')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SelectStudyParametersDialog;
