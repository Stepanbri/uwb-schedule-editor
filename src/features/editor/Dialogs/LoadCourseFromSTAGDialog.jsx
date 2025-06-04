// PROJEKT/NEW/src/features/editor/Dialogs/LoadCourseFromSTAGDialog.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, FormControl, InputLabel, Select, MenuItem, Grid, FormHelperText
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const currentAcademicYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0 (Jan) - 11 (Dec)
    // Assuming academic year changes around July/August
    return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

const LoadCourseFromSTAGDialog = ({ open, onClose, onSubmit }) => {
    const { t } = useTranslation();
    const [courseCodeFull, setCourseCodeFull] = useState(''); // e.g., KIV/PPA1
    const [academicYear, setAcademicYear] = useState(currentAcademicYear());
    const [semester, setSemester] = useState('ZS'); // ZS or LS
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            // Reset form on open, if desired, or retain last values
            // setCourseCodeFull('');
            // setAcademicYear(currentAcademicYear());
            // setSemester('ZS');
            setErrors({});
        }
    }, [open]);

    const validate = () => {
        const newErrors = {};
        if (!courseCodeFull.trim()) {
            newErrors.courseCodeFull = t('Dialogs.loadCourseFromSTAG.errorCourseCodeRequired', 'Kód předmětu je povinný.');
        } else if (!/^[A-Z]{2,5}\/[A-Z0-9-]{2,10}$/i.test(courseCodeFull.trim())) {
            newErrors.courseCodeFull = t('Dialogs.loadCourseFromSTAG.errorCourseCodeFormat', 'Neplatný formát kódu (např. KIV/PPA1).');
        }
        if (!academicYear.trim()) {
            newErrors.academicYear = t('Dialogs.loadCourseFromSTAG.errorYearRequired', 'Akademický rok je povinný.');
        } else if (!/^\d{4}\/\d{4}$/.test(academicYear.trim())) {
            newErrors.academicYear = t('Dialogs.loadCourseFromSTAG.errorYearFormat', 'Neplatný formát roku (např. 2023/2024).');
        }
        if (!semester) {
            newErrors.semester = t('Dialogs.loadCourseFromSTAG.errorSemesterRequired', 'Semestr je povinný.');
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
                year: academicYear.trim(),
                semester,
            });
            onClose(); // Close dialog after submit
        }
    };

    const academicYears = () => {
        const years = [];
        const currentYearStart = new Date().getFullYear();
        for (let i = 2; i >= -2; i--) { // 2 years back, current, 2 years forward
            years.push(`${currentYearStart - i}/${currentYearStart - i + 1}`);
        }
        return years;
    };


    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{t('Dialogs.loadCourseFromSTAG.title', 'Načíst předmět ze STAGu')}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} sx={{pt: 1}}>
                    <Grid item xs={12}>
                        <TextField
                            label={t('Dialogs.loadCourseFromSTAG.courseCodeLabel', 'Kód předmětu (např. KIV/PPA1)')}
                            value={courseCodeFull}
                            onChange={(e) => setCourseCodeFull(e.target.value.toUpperCase())}
                            fullWidth
                            required
                            error={!!errors.courseCodeFull}
                            helperText={errors.courseCodeFull}
                            autoFocus
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required error={!!errors.academicYear}>
                            <InputLabel id="academic-year-select-label">{t('Dialogs.loadCourseFromSTAG.academicYearLabel', 'Akademický rok')}</InputLabel>
                            <Select
                                labelId="academic-year-select-label"
                                value={academicYear}
                                label={t('Dialogs.loadCourseFromSTAG.academicYearLabel', 'Akademický rok')}
                                onChange={(e) => setAcademicYear(e.target.value)}
                            >
                                {academicYears().map(year => (
                                    <MenuItem key={year} value={year}>{year}</MenuItem>
                                ))}
                            </Select>
                            {errors.academicYear && <FormHelperText>{errors.academicYear}</FormHelperText>}
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required error={!!errors.semester}>
                            <InputLabel id="semester-select-label">{t('Dialogs.loadCourseFromSTAG.semesterLabel', 'Semestr')}</InputLabel>
                            <Select
                                labelId="semester-select-label"
                                value={semester}
                                label={t('Dialogs.loadCourseFromSTAG.semesterLabel', 'Semestr')}
                                onChange={(e) => setSemester(e.target.value)}
                            >
                                <MenuItem value="ZS">{t('Dialogs.loadCourseFromSTAG.semesterZS', 'Zimní (ZS)')}</MenuItem>
                                <MenuItem value="LS">{t('Dialogs.loadCourseFromSTAG.semesterLS', 'Letní (LS)')}</MenuItem>
                            </Select>
                            {errors.semester && <FormHelperText>{errors.semester}</FormHelperText>}
                        </FormControl>
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