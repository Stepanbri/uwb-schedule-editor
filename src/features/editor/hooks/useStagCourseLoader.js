// src/features/editor/hooks/useStagCourseLoader.js
import { useState, useCallback } from 'react';
import { useStagApi } from '../../../contexts/StagApiContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useTranslation } from 'react-i18next';

const getStagApiYear = (academicYearString) => {
    if (typeof academicYearString === 'string' && academicYearString.includes('/')) {
        return academicYearString.split('/')[0];
    }
    return academicYearString;
};

export const useStagCourseLoader = () => {
    const { stagApiService } = useStagApi();
    const { workspaceService, addCourse } = useWorkspace();
    const { showSnackbar } = useSnackbar();
    const { t, i18n } = useTranslation();

    const [isLoadCourseDialogOpen, setIsLoadCourseDialogOpen] = useState(false);
    const [isProcessingCourse, setIsProcessingCourse] = useState(false);

    const [overwriteSingleCourseDialog, setOverwriteSingleCourseDialog] = useState({
        open: false,
        title: '',
        message: '',
        courseDataForWorkspace: null,
        onConfirm: () => {},
    });

    const openLoadCourseDialog = useCallback(() => setIsLoadCourseDialogOpen(true), []);
    const closeLoadCourseDialog = useCallback(() => setIsLoadCourseDialogOpen(false), []);

    const closeOverwriteSingleCourseDialog = () => {
        setOverwriteSingleCourseDialog(prev => ({ ...prev, open: false }));
        setIsProcessingCourse(false); // Ukončíme processing, pokud byl dialog jen zavřen
    };

    const handleSubmitLoadCourse = useCallback(async (formData) => {
        setIsProcessingCourse(true);
        closeLoadCourseDialog();
        const lang = i18n.language === 'cs' ? 'cs' : 'en';
        const stagApiYearValue = getStagApiYear(formData.year);

        try {
            const subjectInfoArray = await stagApiService.getSubjectInfo(formData.departmentCode, formData.subjectCode, stagApiYearValue, lang);
            const subjectInfo = Array.isArray(subjectInfoArray) && subjectInfoArray.length > 0 ? subjectInfoArray[0] : subjectInfoArray;

            if (!subjectInfo || (Object.keys(subjectInfo).length === 0 && subjectInfo.constructor === Object)) {
                showSnackbar(t('alerts.stagSubjectNotFound', { subjectCode: `${formData.departmentCode}/${formData.subjectCode}` }), 'error');
                setIsProcessingCourse(false);
                return;
            }

            const scheduleEventsData = await stagApiService.getRozvrhByPredmet({
                katedra: subjectInfo.katedra,
                zkratka: subjectInfo.zkratka,
                rok: stagApiYearValue,
                semestr: formData.semester
            }, lang);

            const dayMapping = { "PO": 0, "ÚT": 1, "ST": 2, "ČT": 3, "PÁ": 4, "SO": 5, "NE": 6, "MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6 };
            const recurrenceMapping = { "KT": "KAŽDÝ TÝDEN", "SUDY": "SUDÝ TÝDEN", "LI": "LICHÝ TÝDEN", "KAŽDÝ": "KAŽDÝ TÝDEN", "LICHÝ": "LICHÝ TÝDEN", "SUDÝ": "SUDÝ TÝDEN", "EVERY": "KAŽDÝ TÝDEN", "ODD": "LICHÝ TÝDEN", "EVEN": "SUDÝ TÝDEN" };
            const typeMapping = { "P": "PŘEDNÁŠKA", "C": "CVIČENÍ", "S": "SEMINÁŘ", "Z": "ZKOUŠKA", "A": "ZÁPOČET", "BL": "BLOK", "PŘ": "PŘEDNÁŠKA", "CV": "CVIČENÍ", "SE": "SEMINÁŘ", "LECTURE": "PŘEDNÁŠKA", "PRACTICAL": "CVIČENÍ", "SEMINAR": "SEMINÁŘ" };

            const transformedEvents = (Array.isArray(scheduleEventsData) ? scheduleEventsData : []).map(stagEvent => {
                const eventId = stagEvent.roakIdno || stagEvent.akceIdno || `${subjectInfo.katedra}-${subjectInfo.zkratka}-${stagEvent.typAkceZkr || 'T'}-${stagEvent.denZkr || 'D'}-${stagEvent.hodinaSkutOd?.value || '0000'}-${Math.random().toString(16).slice(2,7)}`;
                let instructorName = '';
                if (stagEvent.ucitel) {
                    const ucitele = Array.isArray(stagEvent.ucitel) ? stagEvent.ucitel : [stagEvent.ucitel];
                    instructorName = ucitele.map(u => `${u.titulPred ? u.titulPred + ' ' : ''}${u.jmeno} ${u.prijmeni}${u.titulZa ? ', ' + u.titulZa : ''}`).join(', ');
                }
                const dayKey = stagEvent.denZkr?.toUpperCase() || stagEvent.den?.toUpperCase();
                let formattedRoom = t('common.notSpecified');
                if (stagEvent.budova && stagEvent.mistnost) formattedRoom = `${stagEvent.budova.toUpperCase()}${stagEvent.mistnost.replace(/\s|-/g, '')}`;
                else if (stagEvent.mistnost) formattedRoom = stagEvent.mistnost.replace(/\s|-/g, '');
                else if (stagEvent.mistnostZkr) formattedRoom = stagEvent.mistnostZkr.replace(/\s|-/g, '');

                return {
                    id: eventId, stagId: stagEvent.roakIdno || stagEvent.akceIdno,
                    startTime: stagEvent.hodinaSkutOd?.value || stagEvent.casOd,
                    endTime: stagEvent.hodinaSkutDo?.value || stagEvent.casDo,
                    day: dayMapping[dayKey] ?? (Number.isInteger(parseInt(stagEvent.den)) ? (parseInt(stagEvent.den) - 1) : 0),
                    recurrence: recurrenceMapping[stagEvent.tydenZkr?.toUpperCase()] || recurrenceMapping[stagEvent.tyden?.toUpperCase()] || stagEvent.tyden || "KAŽDÝ TÝDEN",
                    room: formattedRoom,
                    type: typeMapping[stagEvent.typAkceZkr?.toUpperCase()] || typeMapping[stagEvent.typAkce?.toUpperCase()] || stagEvent.typAkce || "NEZNÁMÝ",
                    instructor: instructorName,
                    currentCapacity: parseInt(stagEvent.obsazeni || stagEvent.pocetZapsanychStudentu || 0),
                    maxCapacity: parseInt(stagEvent.kapacita || stagEvent.maxKapacita || stagEvent.kapacitaMistnosti || 0),
                    note: stagEvent.poznamka,
                    year: formData.year,
                    semester: formData.semester,
                    departmentCode: subjectInfo.katedra,
                    courseCode: subjectInfo.zkratka,
                };
            });

            const courseDataForWorkspace = {
                stagId: subjectInfo.predmetId,
                name: subjectInfo.nazevEn || subjectInfo.nazev,
                departmentCode: subjectInfo.katedra,
                courseCode: subjectInfo.zkratka,
                credits: parseInt(subjectInfo.kreditu) || 0,
                neededEnrollments: {
                    lecture: parseInt(subjectInfo.prednaskyRozsah) || (parseInt(subjectInfo.jednotekPrednasek) > 0 ? 1 : 0),
                    practical: parseInt(subjectInfo.cviceniRozsah) || (parseInt(subjectInfo.jednotekCviceni) > 0 ? 1 : 0),
                    seminar: parseInt(subjectInfo.seminareRozsah) || (parseInt(subjectInfo.jednotekSeminare) > 0 ? 1 : 0)
                },
                semester: formData.semester,
                year: formData.year,
                events: transformedEvents,
            };

            const courseIdentifier = `${subjectInfo.katedra}/${subjectInfo.zkratka}`;
            const existingCourse = workspaceService.courses.find(c => c.id === courseIdentifier);

            if (existingCourse) {
                setOverwriteSingleCourseDialog({
                    open: true,
                    title: t('Dialogs.existingCourseWarning.title'),
                    message: t('Dialogs.existingCourseWarning.message', { courseIdentifier: `${courseIdentifier} (pro ${formData.year}, ${formData.semester})` }),
                    courseDataForWorkspace: courseDataForWorkspace,
                    onConfirm: () => { // Definujeme onConfirm zde
                        addCourse(courseDataForWorkspace);
                        closeOverwriteSingleCourseDialog();
                        setIsProcessingCourse(false);
                    }
                });
            } else {
                addCourse(courseDataForWorkspace);
                setIsProcessingCourse(false);
            }

        } catch (error) {
            console.error("Chyba při načítání předmětu ze STAGu:", error);
            showSnackbar(error.message || t('alerts.stagLoadError'), 'error');
            setIsProcessingCourse(false);
        }
    }, [stagApiService, addCourse, closeLoadCourseDialog, showSnackbar, t, i18n.language, workspaceService]);

    return {
        isLoadCourseDialogOpen, openLoadCourseDialog, closeLoadCourseDialog, handleSubmitLoadCourse,
        isProcessingCourse,
        overwriteSingleCourseDialog,
        closeOverwriteSingleCourseDialog, // Pro tlačítko zrušit v dialogu
    };
};