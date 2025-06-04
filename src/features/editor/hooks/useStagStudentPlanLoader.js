// src/features/editor/hooks/useStagStudentPlanLoader.js
import { useState, useCallback } from 'react';
import { useStagApi } from '../../../contexts/StagApiContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { useCourseManagement } from './useCourseManagement';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useTranslation } from 'react-i18next';

const getStagApiYear = (academicYearString) => {
    if (typeof academicYearString === 'string' && academicYearString.includes('/')) {
        return academicYearString.split('/')[0];
    }
    return academicYearString;
};

export const useStagStudentPlanLoader = () => {
    const { stagApiService, redirectToStagLogin, setRole, clearStagAuthData, userInfo } = useStagApi();
    const { workspaceService, workspaceYear } = useWorkspace();
    const { addCourse } = useCourseManagement();
    const { showSnackbar } = useSnackbar();
    const { t, i18n } = useTranslation();

    const [isRedirectDialogOpen, setIsRedirectDialogOpen] = useState(false);
    const [isIdentityDialogOpen, setIsIdentityDialogOpen] = useState(false);
    const [isStudyParamsDialogOpen, setIsStudyParamsDialogOpen] = useState(false);
    const [isProcessingStudentPlan, setIsProcessingStudentPlan] = useState(false);
    const [currentStudentContextForDialog, setCurrentStudentContextForDialog] = useState(null);

    const openLoadCoursesFromStudentDialog = useCallback(() => {
        setIsRedirectDialogOpen(true);
    }, []);

    const closeRedirectDialog = useCallback(() => {
        setIsRedirectDialogOpen(false);
    }, []);

    const handleContinueToSTAGLogin = useCallback(() => {
        closeRedirectDialog();
        redirectToStagLogin('studentCourses'); //
    }, [closeRedirectDialog, redirectToStagLogin]);

    const processLoginSuccessAndOpenIdentityDialog = useCallback(() => {
        if (userInfo && userInfo.roles && userInfo.roles.length > 0) { //
            showSnackbar(t('alerts.stagLoginSuccessful'), 'success'); //
            setIsIdentityDialogOpen(true);
            setIsProcessingStudentPlan(true);
        } else {
            showSnackbar(t('alerts.stagLoginNoRoles'), 'warning'); //
            clearStagAuthData();
            setIsProcessingStudentPlan(false);
        }
    }, [userInfo, showSnackbar, t, clearStagAuthData]);

    const closeIdentityDialog = useCallback((userCancelled = false) => {
        setIsIdentityDialogOpen(false);
        if (userCancelled) {
            showSnackbar(t('alerts.identitySelectionCancelledAndTicketCleared'), 'info'); //
            clearStagAuthData();
            setIsProcessingStudentPlan(false);
            setCurrentStudentContextForDialog(null);
        }
    }, [showSnackbar, t, clearStagAuthData]);

    const handleIdentitySelected = useCallback(async (selectedStagUserIdentifier) => {
        setIsIdentityDialogOpen(false);
        setRole(selectedStagUserIdentifier); //
        showSnackbar(t('alerts.identitySelectedLog', { stagUser: selectedStagUserIdentifier }), 'info'); //

        try {
            const currentRoleInfo = stagApiService.getUserInfo().roles.find(
                r => r.userName === selectedStagUserIdentifier || r.stagUser === selectedStagUserIdentifier
            );
            const osCisloForLookup = currentRoleInfo?.osCislo || selectedStagUserIdentifier;
            const academicYearForStudentInfoFull = workspaceYear || new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString(); //
            const stagApiYearForStudentInfo = getStagApiYear(academicYearForStudentInfoFull);

            const studentDetailInfo = await stagApiService.getStudentInfo(osCisloForLookup, stagApiYearForStudentInfo, false, i18n.language); //

            if (studentDetailInfo && studentDetailInfo.osCislo) { //
                const primaryOborIdno = studentDetailInfo.oborIdnos ? studentDetailInfo.oborIdnos.split(',')[0].trim() : null; //
                let studyDetailsToUse = null;
                if (Array.isArray(studentDetailInfo.studiumInfo) && studentDetailInfo.studiumInfo.length > 0) { //
                    const activeStudy = studentDetailInfo.studiumInfo.find(s => s.stavStudia === 'S' || s.stavStudiaKey === 'S'); //
                    studyDetailsToUse = activeStudy || studentDetailInfo.studiumInfo[0]; //
                }

                const oborIdnoToUse = studyDetailsToUse?.oborIdno || primaryOborIdno; //

                if (oborIdnoToUse) { //
                    const context = {
                        osCislo: studentDetailInfo.osCislo, //
                        jmeno: studentDetailInfo.jmeno, //
                        prijmeni: studentDetailInfo.prijmeni, //
                        fakulta: studyDetailsToUse?.fakultaOrgJednotka || studentDetailInfo.fakultaSp || currentRoleInfo?.fakulta, //
                        stplIdno: studyDetailsToUse?.stplIdno, //
                        oborIdno: oborIdnoToUse, //
                        studProgramNazev: studyDetailsToUse?.studProgramPopisEn || studyDetailsToUse?.studProgramPopis || studentDetailInfo.nazevSpEn || studentDetailInfo.nazevSp, //
                        oborNazev: studyDetailsToUse?.oborPopisEn || studyDetailsToUse?.oborPopis || studentDetailInfo.oborNazevSp, //
                        currentAcademicYearFull: academicYearForStudentInfoFull //
                    };
                    setCurrentStudentContextForDialog(context); //
                    setIsStudyParamsDialogOpen(true); //
                } else {
                    throw new Error(t('alerts.fetchStudentInfoErrorNoStudyDetails')); //
                }
            } else {
                throw new Error(t('alerts.fetchStudentInfoErrorNoData')); //
            }
        } catch (error) {
            console.error("Chyba při získávání detailů studenta po výběru identity:", error);
            showSnackbar(error.message || t('alerts.fetchStudentInfoError'), 'error'); //
            setIsProcessingStudentPlan(false);
            clearStagAuthData();
        }
    }, [stagApiService, setRole, showSnackbar, t, i18n.language, workspaceYear, clearStagAuthData]);

    const closeStudyParamsDialog = useCallback((userCancelled = false) => {
        setIsStudyParamsDialogOpen(false);
        if (userCancelled) {
            showSnackbar(t('alerts.studyParamsSelectionCancelled'), 'info'); //
            clearStagAuthData();
            setIsProcessingStudentPlan(false);
            setCurrentStudentContextForDialog(null);
        }
    }, [showSnackbar, t, clearStagAuthData]);

    const handleStudyParametersSubmitted = useCallback(async (params) => {
        setIsStudyParamsDialogOpen(false);
        showSnackbar(t('alerts.loadingStudyPlanSubjects'), 'info'); //
        const lang = i18n.language === 'cs' ? 'cs' : 'en';
        const stagApiYearForCourseEvents = getStagApiYear(params.scheduleAcademicYear);

        if (!currentStudentContextForDialog || !currentStudentContextForDialog.oborIdno) {
            showSnackbar(t('alerts.noStudentContextForPlan'), 'error'); //
            setIsProcessingStudentPlan(false);
            clearStagAuthData();
            return;
        }

        try {
            const allSubjectsOfFieldRaw = await stagApiService.getPredmetyByObor( //
                currentStudentContextForDialog.oborIdno,
                stagApiYearForCourseEvents,
                '%',
                lang
            );

            const uniqueSubjectsMap = new Map();
            allSubjectsOfFieldRaw.forEach(subj => {
                const key = `${subj.katedra}/${subj.zkratka}`;
                if (!uniqueSubjectsMap.has(key) || (subj.predmetId && !uniqueSubjectsMap.get(key).predmetId)) {
                    uniqueSubjectsMap.set(key, subj);
                }
            });
            const uniqueSubjectsFromField = Array.from(uniqueSubjectsMap.values()); //

            const filteredSubjects = uniqueSubjectsFromField.filter(subj => { //
                const subjectRecommendedStudyYear = parseInt(subj.doporucenyRocnik || subj.dopRoc);
                const matchesStudyYearNum = !isNaN(subjectRecommendedStudyYear) && subjectRecommendedStudyYear === params.studyYearNum;
                let subjectSemesterNormalized = subj.semestr?.toUpperCase() || subj.semestrDoporUc?.toUpperCase();
                if (!subjectSemesterNormalized && subj.vyukaZS === 'A' && subj.vyukaLS === 'A') subjectSemesterNormalized = '%';
                else if (!subjectSemesterNormalized && subj.vyukaZS === 'A') subjectSemesterNormalized = 'ZS';
                else if (!subjectSemesterNormalized && subj.vyukaLS === 'A') subjectSemesterNormalized = 'LS';
                const matchesSemester = params.semester === '%' || (subjectSemesterNormalized === params.semester.toUpperCase()) || (subjectSemesterNormalized === '%');
                const matchesStatus = params.statuses.includes(subj.statut?.toUpperCase());
                return matchesStudyYearNum && matchesSemester && matchesStatus;
            });

            if (filteredSubjects.length === 0) { //
                showSnackbar(t('alerts.noSubjectsMatchCriteria'), 'info'); //
                setIsProcessingStudentPlan(false);
                clearStagAuthData();
                return;
            }

            showSnackbar(t('alerts.fetchingSubjectDetailsCount', { count: filteredSubjects.length }), 'info'); //
            let coursesAddedCount = 0;
            let coursesOverwrittenCount = 0;

            for (const subjectFromObor of filteredSubjects) {
                let semesterForEventsApi = params.semester;
                if (params.semester === '%') {
                    const subjSem = subjectFromObor.semestrDoporUc?.toUpperCase() || (subjectFromObor.vyukaZS === 'A' ? 'ZS' : (subjectFromObor.vyukaLS === 'A' ? 'LS' : null));
                    semesterForEventsApi = subjSem || '%';
                }

                const scheduleEventsData = await stagApiService.getRozvrhByPredmet({ //
                    katedra: subjectFromObor.katedra,
                    zkratka: subjectFromObor.zkratka,
                    rok: stagApiYearForCourseEvents,
                    semestr: semesterForEventsApi
                }, lang);

                const dayMapping = { "PO": 0, "ÚT": 1, "ST": 2, "ČT": 3, "PÁ": 4, "SO": 5, "NE": 6, "MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6 }; //
                const recurrenceMapping = { "KT": "KAŽDÝ TÝDEN", "SUDY": "SUDÝ TÝDEN", "LI": "LICHÝ TÝDEN", "KAŽDÝ": "KAŽDÝ TÝDEN", "LICHÝ": "LICHÝ TÝDEN", "SUDÝ": "SUDÝ TÝDEN", "EVERY": "KAŽDÝ TÝDEN", "ODD": "LICHÝ TÝDEN", "EVEN": "SUDÝ TÝDEN" }; //
                const typeMapping = { "P": "PŘEDNÁŠKA", "C": "CVIČENÍ", "S": "SEMINÁŘ", "Z": "ZKOUŠKA", "A": "ZÁPOČET", "BL": "BLOK", "PŘ": "PŘEDNÁŠKA", "CV": "CVIČENÍ", "SE": "SEMINÁŘ", "LECTURE": "PŘEDNÁŠKA", "PRACTICAL": "CVIČENÍ", "SEMINAR": "SEMINÁŘ" }; //

                const transformedEvents = (Array.isArray(scheduleEventsData) ? scheduleEventsData : []).map(stagEvent => { //
                    let instructorName = '';
                    if (stagEvent.ucitel) {
                        const ucitele = Array.isArray(stagEvent.ucitel) ? stagEvent.ucitel : [stagEvent.ucitel];
                        instructorName = ucitele.map(u => `${u.titulPred ? u.titulPred + ' ' : ''}${u.jmeno} ${u.prijmeni}${u.titulZa ? ', ' + u.titulZa : ''}`).join(', ');
                    }
                    const dayKey = stagEvent.denZkr?.toUpperCase() || stagEvent.den?.toUpperCase();
                    let formattedRoom = t('common.notSpecified', 'Virtuální akce'); //
                    if (stagEvent.budova && stagEvent.mistnost) {
                        formattedRoom = `${stagEvent.budova.toUpperCase()}${stagEvent.mistnost.replace(/\s|-/g, '')}`;
                    } else if (stagEvent.mistnost) {
                        formattedRoom = stagEvent.mistnost.replace(/\s|-/g, '');
                    } else if (stagEvent.mistnostZkr) {
                        formattedRoom = stagEvent.mistnostZkr.replace(/\s|-/g, '');
                    }
                    let eventSemesterEffective = stagEvent.semestr?.toUpperCase(); //
                    if (!eventSemesterEffective && params.semester === '%') {
                        eventSemesterEffective = subjectFromObor.semestrDoporUc?.toUpperCase() || (subjectFromObor.vyukaZS === 'A' ? 'ZS' : 'LS');
                    } else if (!eventSemesterEffective) {
                        eventSemesterEffective = params.semester.toUpperCase();
                    }

                    return {
                        id: stagEvent.roakIdno || stagEvent.akceIdno || undefined,
                        stagId: stagEvent.roakIdno || stagEvent.akceIdno,
                        startTime: stagEvent.hodinaSkutOd?.value || stagEvent.casOd, //
                        endTime: stagEvent.hodinaSkutDo?.value || stagEvent.casDo, //
                        day: dayMapping[dayKey] ?? (Number.isInteger(parseInt(stagEvent.den)) ? (parseInt(stagEvent.den) - 1) : 0), //
                        recurrence: recurrenceMapping[stagEvent.tydenZkr?.toUpperCase()] || recurrenceMapping[stagEvent.tyden?.toUpperCase()] || stagEvent.tyden || "KAŽDÝ TÝDEN", //
                        room: formattedRoom, //
                        type: typeMapping[stagEvent.typAkceZkr?.toUpperCase()] || typeMapping[stagEvent.typAkce?.toUpperCase()] || stagEvent.typAkce || "NEZNÁMÝ", //
                        instructor: instructorName,
                        currentCapacity: parseInt(stagEvent.obsazeni || stagEvent.pocetZapsanychStudentu || 0), //
                        maxCapacity: parseInt(stagEvent.kapacita || stagEvent.maxKapacita || stagEvent.kapacitaMistnosti || 0), //
                        note: stagEvent.poznamka, //
                        year: params.scheduleAcademicYear,
                        semester: eventSemesterEffective,
                        departmentCode: subjectFromObor.katedra,
                        courseCode: subjectFromObor.zkratka,
                    };
                }).filter(event => event !== null);

                const rozsahParts = subjectFromObor.rozsah?.split('+').map(s => parseInt(s.trim()) || 0) || []; //
                const needed = { //
                    lecture: parseInt(subjectFromObor.jednotekPrednasek) || (rozsahParts[0] > 0 ? 1 : 0) || 0,
                    practical: parseInt(subjectFromObor.jednotekCviceni) || (rozsahParts.length > 1 && rozsahParts[1] > 0 ? 1 : 0) || 0,
                    seminar: parseInt(subjectFromObor.jednotekSeminare) || (rozsahParts.length > 2 && rozsahParts[2] > 0 ? 1 : 0) || 0,
                };
                const courseSemesterEffective = params.semester === '%' //
                    ? (subjectFromObor.semestrDoporUc?.toUpperCase() || (subjectFromObor.vyukaZS === 'A' ? 'ZS' : (subjectFromObor.vyukaLS === 'A' ? 'LS' : 'ZS')))
                    : params.semester.toUpperCase();

                const courseDataForWorkspace = { //
                    id: `${subjectFromObor.katedra}/${subjectFromObor.zkratka}`,
                    stagId: subjectFromObor.predmetId,
                    name: subjectFromObor.nazev,
                    departmentCode: subjectFromObor.katedra,
                    courseCode: subjectFromObor.zkratka,
                    credits: parseInt(subjectFromObor.kreditu) || 0,
                    neededEnrollments: needed,
                    semester: courseSemesterEffective,
                    year: params.scheduleAcademicYear,
                    events: transformedEvents,
                };

                const existingCourse = workspaceService.courses.find(c => //
                    c.departmentCode === courseDataForWorkspace.departmentCode &&
                    c.courseCode === courseDataForWorkspace.courseCode &&
                    c.year === courseDataForWorkspace.year &&
                    c.semester === courseDataForWorkspace.semester
                );

                if (existingCourse) { //
                    addCourse(courseDataForWorkspace, 'overwritten');
                    coursesOverwrittenCount++;
                } else {
                    addCourse(courseDataForWorkspace, 'added');
                    coursesAddedCount++;
                }
            }

            showSnackbar(t('alerts.studyPlanLoadSummary', { added: coursesAddedCount, overwritten: coursesOverwrittenCount, failed: 0 }), coursesAddedCount + coursesOverwrittenCount > 0 ? 'success' : 'info'); //

        } catch (error) {
            console.error("Chyba při zpracování předmětů studijního plánu:", error);
            showSnackbar(error.message || t('alerts.studyPlanLoadError'), 'error'); //
        } finally {
            setIsProcessingStudentPlan(false); //
            clearStagAuthData();
            setCurrentStudentContextForDialog(null); //
        }
    }, [
        stagApiService, addCourse, currentStudentContextForDialog,
        showSnackbar, t, i18n.language, workspaceService, clearStagAuthData, workspaceYear // Přidán workspaceYear jako závislost
    ]);

    return {
        isRedirectDialogOpen,
        openLoadCoursesFromStudentDialog,
        closeRedirectDialog,
        handleContinueToSTAGLogin,
        isIdentityDialogOpen,
        processLoginSuccessAndOpenIdentityDialog,
        closeIdentityDialog,
        handleIdentitySelected,
        isStudyParamsDialogOpen,
        closeStudyParamsDialog,
        handleStudyParametersSubmitted,
        currentStudentContextForDialog,
        isProcessingStudentPlan,
    };
};