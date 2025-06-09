import {
    Autocomplete,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    MenuItem,
    TextField
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateAcademicYears, getCurrentAcademicYear } from '../../../utils/academicYearUtils';

const LoadCourseFromSTAGDialog = ({ open, onClose, onSubmit }) => {
    const { t } = useTranslation();
    const [courseCodeFull, setCourseCodeFull] = useState(''); // e.g., KIV/PPA1
    const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
    const [semester, setSemester] = useState('ZS'); // ZS or LS
    const [errors, setErrors] = useState({});

    const academicYearsOptions = useMemo(() => generateAcademicYears(), []);

    useEffect(() => {
        if (open) {
            // Resetovat pouze chyby, ostatní hodnoty ponechat pro pohodlí uživatele
            setErrors({});
            // Ujistíme se, že je vybrán aktuální rok při každém otevření, pokud je to žádoucí
            setAcademicYear(getCurrentAcademicYear());
        }
    }, [open]);

    const validate = () => {
        const newErrors = {};
        if (!courseCodeFull.trim()) {
            newErrors.courseCodeFull = t(
                'Dialogs.loadCourseFromSTAG.errorCourseCodeRequired',
                'Kód předmětu je povinný.'
            );
        } else if (!/^[A-Z]{2,5}\/[A-Z0-9-]{2,10}$/i.test(courseCodeFull.trim())) {
            newErrors.courseCodeFull = t(
                'Dialogs.loadCourseFromSTAG.errorCourseCodeFormat',
                'Neplatný formát kódu (např. KIV/PPA1).'
            );
        }
        if (!academicYear) {
            newErrors.academicYear = t(
                'Dialogs.loadCourseFromSTAG.errorYearRequired',
                'Akademický rok je povinný.'
            );
        } else if (!/^\d{4}\/\d{4}$/.test(academicYear)) {
            newErrors.academicYear = t(
                'Dialogs.loadCourseFromSTAG.errorYearFormat',
                'Neplatný formát roku (např. 2023/2024).'
            );
        }
        if (!semester) {
            newErrors.semester = t(
                'Dialogs.loadCourseFromSTAG.errorSemesterRequired',
                'Semestr je povinný.'
            );
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            const [departmentCode, subjectCode] = courseCodeFull.trim().split('/');
            onSubmit({
                departmentCode,
                subjectCode,
                year: academicYear,
                semester,
            });
            onClose(); // Close dialog after submit
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                {t('Dialogs.loadCourseFromSTAG.title', 'Načíst předmět ze STAGu')}
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} sx={{ pt: 1 }}>
                    <Grid sx={{ gridColumn: 'span 12' }}>
                        <TextField
                            label={t(
                                'Dialogs.loadCourseFromSTAG.courseCodeLabel',
                                'Kód předmětu (např. KIV/PPA1)'
                            )}
                            value={courseCodeFull}
                            onChange={e => setCourseCodeFull(e.target.value.toUpperCase())}
                            fullWidth
                            required
                            error={!!errors.courseCodeFull}
                            helperText={errors.courseCodeFull}
                            autoFocus
                        />
                    </Grid>
                    <Grid
                        sx={{
                            gridColumn: { xs: 'span 12', sm: 'span 8' },
                            width: '7.5rem',
                        }}
                    >
                        <Autocomplete
                            disableClearable
                            options={academicYearsOptions}
                            getOptionLabel={option => option.label || ''}
                            value={
                                academicYearsOptions.find(opt => opt.value === academicYear) || null
                            }
                            onChange={(event, newValue) => {
                                setAcademicYear(newValue ? newValue.value : null);
                            }}
                            isOptionEqualToValue={(option, value) => option.value === value.value}
                            renderInput={params => (
                                <TextField
                                    {...params}
                                    label={t(
                                        'Dialogs.loadCourseFromSTAG.academicYearLabel',
                                        'Verze'
                                    )}
                                    required
                                    error={!!errors.academicYear}
                                    helperText={errors.academicYear}
                                />
                            )}
                        />
                    </Grid>
                    <Grid
                        sx={{
                            gridColumn: { xs: 'span 12', sm: 'span 4' },
                        }}
                    >
                        <TextField
                            select
                            label={t('Dialogs.loadCourseFromSTAG.semesterLabel', 'Semestr')}
                            value={semester}
                            onChange={e => setSemester(e.target.value)}
                            fullWidth
                            required
                            error={!!errors.semester}
                            helperText={errors.semester}
                            variant="filled"
                        >
                            <MenuItem value="ZS">
                                {t('Dialogs.loadCourseFromSTAG.semesterZS', 'Zimní (ZS)')}
                            </MenuItem>
                            <MenuItem value="LS">
                                {t('Dialogs.loadCourseFromSTAG.semesterLS', 'Letní (LS)')}
                            </MenuItem>
                        </TextField>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={onClose}>{t('common.cancel', 'Zrušit')}</Button>
                <Button onClick={handleSubmit} variant="contained">
                    {t('Dialogs.loadCourseFromSTAG.submitButton', 'Načíst')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LoadCourseFromSTAGDialog;
