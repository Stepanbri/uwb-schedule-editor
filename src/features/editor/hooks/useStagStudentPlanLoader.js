// src/features/editor/hooks/useStagStudentPlanLoader.js
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

export const useStagStudentPlanLoader = () => {
    const { stagApiService, redirectToStagLogin, setRole, clearStagAuthData, userInfo, useDemoApi } = useStagApi();
    const { workspaceService, addCourse } = useWorkspace();
    const { showSnackbar } = useSnackbar();
    const { t, i18n } = useTranslation();

    const [isRedirectDialogOpen, setIsRedirectDialogOpen] = useState(false);
    const [isIdentityDialogOpen, setIsIdentityDialogOpen] = useState(false);
    const [isStudyParamsDialogOpen, setIsStudyParamsDialogOpen] = useState(false);

    // Tento stav by měl pokrývat celý proces od výběru identity až po dokončení načítání
    const [isStudentPlanLoadingActive, setIsStudentPlanLoadingActive] = useState(false);
    // Tento stav je specifičtější pro fázi načítání detailů předmětů a jejich RAKcí
    const [isLoadingCourseDetails, setIsLoadingCourseDetails] = useState(false);

    const [currentStudentContextForDialog, setCurrentStudentContextForDialog] = useState(null);

    const [overwritePlanDialogState, setOverwritePlanDialogState] = useState({
        open: false,
        coursesToProcess: [],
        coursesToAdd: [],
        coursesToOverwrite: [],
        planParams: null,
        onConfirm: () => {},
    });

    const [summaryDialog, setSummaryDialog] = useState({
        open: false,
        summary: { added: [], overwritten: [], failed: [] }
    });

    const resetAllPlanLoaderStates = () => {
        setIsRedirectDialogOpen(false);
        setIsIdentityDialogOpen(false);
        setIsStudyParamsDialogOpen(false);
        setIsStudentPlanLoadingActive(false);
        setIsLoadingCourseDetails(false);
        setCurrentStudentContextForDialog(null);
        setOverwritePlanDialogState({ open: false, coursesToProcess: [], coursesToAdd: [], coursesToOverwrite: [], planParams: null, onConfirm: () => {} });
        setSummaryDialog({ open: false, summary: { added: [], overwritten: [], failed: [] }});
        clearStagAuthData();
    };

    const openLoadCoursesFromStudentDialog = useCallback(() => {
        resetAllPlanLoaderStates(); // Reset před začátkem nového flow
        setIsRedirectDialogOpen(true);
    }, []); // Závislost na resetAllPlanLoaderStates není nutná, protože se nemění

    const closeRedirectDialog = useCallback(() => {
        setIsRedirectDialogOpen(false);
        // Pokud uživatel zavře tento dialog, flow končí
        resetAllPlanLoaderStates();
    }, []);

    const handleContinueToSTAGLogin = useCallback(() => {
        // isRedirectDialogOpen se nastaví na false v closeRedirectDialog, ale chceme, aby studentPlanLoadingActive zůstal true
        setIsStudentPlanLoadingActive(true); // Indikujeme, že proces načítání studenta začal
        closeRedirectDialog(); // Toto už nevolá resetAllPlanLoaderStates
        redirectToStagLogin('studentCourses');
    }, [redirectToStagLogin]);


    const processLoginSuccessAndOpenIdentityDialog = useCallback(() => {
        if (userInfo && userInfo.roles && userInfo.roles.length > 0) {
            showSnackbar(t('alerts.stagLoginSuccessful'), 'success');
            setIsStudentPlanLoadingActive(true); // Udržujeme aktivní stav
            setIsIdentityDialogOpen(true);
        } else {
            showSnackbar(t('alerts.stagLoginNoRoles'), 'warning');
            resetAllPlanLoaderStates();
        }
    }, [userInfo, showSnackbar, t]); // Odebrána závislost na clearStagAuthData

    const closeIdentityDialog = useCallback((userCancelled = false) => {
        setIsIdentityDialogOpen(false);
        if (userCancelled) {
            showSnackbar(t('alerts.identitySelectionCancelledAndTicketCleared'), 'info');
            resetAllPlanLoaderStates();
        }
        // Pokud není zrušeno, isStudentPlanLoadingActive zůstává true
    }, [showSnackbar, t]);

    const handleIdentitySelected = useCallback(async (selectedStagUserIdentifier) => {
        setIsIdentityDialogOpen(false);
        setRole(selectedStagUserIdentifier);
        showSnackbar(t('alerts.identitySelectedLog', { stagUser: selectedStagUserIdentifier }), 'info');
        setIsStudentPlanLoadingActive(true); // Ujistíme se, že je stále true

        try {
            const currentRoleInfo = stagApiService.getUserInfo().roles.find(
                r => r.userName === selectedStagUserIdentifier || r.stagUser === selectedStagUserIdentifier
            );
            const osCisloForLookup = currentRoleInfo?.osCislo || selectedStagUserIdentifier;
            const academicYearForStudentInfoFull = workspaceService.year || new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString();
            const stagApiYearForStudentInfo = getStagApiYear(academicYearForStudentInfoFull);
            const studentDetailInfo = await stagApiService.getStudentInfo(osCisloForLookup, stagApiYearForStudentInfo, false, i18n.language);

            if (studentDetailInfo && studentDetailInfo.osCislo) {
                // ... (kód pro získání contextu jako dříve) ...
                const primaryOborIdno = studentDetailInfo.oborIdnos ? studentDetailInfo.oborIdnos.split(',')[0].trim() : null;
                let studyDetailsToUse = null;
                if (Array.isArray(studentDetailInfo.studiumInfo) && studentDetailInfo.studiumInfo.length > 0) {
                    const activeStudy = studentDetailInfo.studiumInfo.find(s => s.stavStudia === 'S' || s.stavStudiaKey === 'S');
                    studyDetailsToUse = activeStudy || studentDetailInfo.studiumInfo[0];
                }
                const oborIdnoToUse = studyDetailsToUse?.oborIdno || primaryOborIdno;

                if (oborIdnoToUse) {
                    const context = {
                        osCislo: studentDetailInfo.osCislo, jmeno: studentDetailInfo.jmeno, prijmeni: studentDetailInfo.prijmeni,
                        fakulta: studyDetailsToUse?.fakultaOrgJednotka || studentDetailInfo.fakultaSp || currentRoleInfo?.fakulta,
                        stplIdno: studyDetailsToUse?.stplIdno, oborIdno: oborIdnoToUse,
                        studProgramNazev: studyDetailsToUse?.studProgramPopisEn || studyDetailsToUse?.studProgramPopis || studentDetailInfo.nazevSpEn || studentDetailInfo.nazevSp,
                        oborNazev: studyDetailsToUse?.oborPopisEn || studyDetailsToUse?.oborPopis || studentDetailInfo.oborNazevSp,
                        currentAcademicYearFull: academicYearForStudentInfoFull
                    };
                    setCurrentStudentContextForDialog(context);
                    setIsStudyParamsDialogOpen(true);
                } else { throw new Error(t('alerts.fetchStudentInfoErrorNoStudyDetails')); }
            } else { throw new Error(t('alerts.fetchStudentInfoErrorNoData')); }
        } catch (error) {
            console.error("Chyba při získávání detailů studenta:", error);
            showSnackbar(error.message || t('alerts.fetchStudentInfoError'), 'error');
            resetAllPlanLoaderStates(); // Při chybě resetujeme
        }
        // setIsStudentPlanLoadingActive zůstává true, dokud se neotevře StudyParamsDialog nebo nedojde k chybě
    }, [stagApiService, setRole, showSnackbar, t, i18n.language, workspaceService.year]);

    const closeStudyParamsDialog = useCallback((userCancelled = false) => {
        setIsStudyParamsDialogOpen(false);
        if (userCancelled) {
            showSnackbar(t('alerts.studyParamsSelectionCancelled'), 'info');
            resetAllPlanLoaderStates();
        }
        // Pokud není zrušeno, isStudentPlanLoadingActive zůstává true
    }, [showSnackbar, t]);

    const actuallyProcessCoursesFromPlan = async (planParams, coursesToProcess) => {
        setOverwritePlanDialogState(prev => ({ ...prev, open: false }));
        setIsLoadingCourseDetails(true); // Začínáme načítání detailů předmětů
        setIsStudentPlanLoadingActive(true); // Ujistíme se, že je stále true
        showSnackbar(t('alerts.fetchingSubjectDetailsCount', { count: coursesToProcess.length }), 'info');

        let coursesAdded = [];
        let coursesOverwritten = [];
        let coursesFailed = [];
        const lang = i18n.language === 'cs' ? 'cs' : 'en';
        const stagApiYearForCourseEvents = getStagApiYear(planParams.scheduleAcademicYear);

        try {
            for (const subjectData of coursesToProcess) {
                try {
                    let semesterForEventsApi = planParams.semester;
                    if (planParams.semester === '%') {
                        const subjSem = subjectData.rawSubject.semestrDoporUc?.toUpperCase() ||
                            (subjectData.rawSubject.vyukaZS === 'A' ? 'ZS' :
                                (subjectData.rawSubject.vyukaLS === 'A' ? 'LS' : 'ZS'));
                        semesterForEventsApi = subjSem || '%';
                    }

                    const scheduleEventsData = await stagApiService.getRozvrhByPredmet({
                        katedra: subjectData.rawSubject.katedra,
                        zkratka: subjectData.rawSubject.zkratka,
                        rok: stagApiYearForCourseEvents,
                        semestr: semesterForEventsApi
                    }, lang);

                    const dayMapping = { "PO": 0, "ÚT": 1, "ST": 2, "ČT": 3, "PÁ": 4, "SO": 5, "NE": 6, "MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6 };
                    const recurrenceMapping = { "KT": "KAŽDÝ TÝDEN", "SUDY": "SUDÝ TÝDEN", "LI": "LICHÝ TÝDEN", "KAŽDÝ": "KAŽDÝ TÝDEN", "LICHÝ": "LICHÝ TÝDEN", "SUDÝ": "SUDÝ TÝDEN", "EVERY": "KAŽDÝ TÝDEN", "ODD": "LICHÝ TÝDEN", "EVEN": "SUDÝ TÝDEN" };
                    const typeMapping = { "P": "PŘEDNÁŠKA", "C": "CVIČENÍ", "S": "SEMINÁŘ", "Z": "ZKOUŠKA", "A": "ZÁPOČET", "BL": "BLOK", "PŘ": "PŘEDNÁŠKA", "CV": "CVIČENÍ", "SE": "SEMINÁŘ", "LECTURE": "PŘEDNÁŠKA", "PRACTICAL": "CVIČENÍ", "SEMINAR": "SEMINÁŘ" };

                    const transformedEvents = (Array.isArray(scheduleEventsData) ? scheduleEventsData : []).map(stagEvent => {
                        const eventId = stagEvent.roakIdno || stagEvent.akceIdno || `${subjectData.rawSubject.katedra}-${subjectData.rawSubject.zkratka}-${stagEvent.typAkceZkr || 'T'}-${stagEvent.denZkr || 'D'}-${stagEvent.hodinaSkutOd?.value || '0000'}-${Math.random().toString(16).slice(2,7)}`;
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

                        let eventSemesterEffective = stagEvent.semestr?.toUpperCase();
                        if (!eventSemesterEffective && planParams.semester === '%') {
                            eventSemesterEffective = subjectData.rawSubject.semestrDoporUc?.toUpperCase() ||
                                (subjectData.rawSubject.vyukaZS === 'A' ? 'ZS' :
                                    (subjectData.rawSubject.vyukaLS === 'A' ? 'LS' : 'ZS'));
                        } else if (!eventSemesterEffective) {
                            eventSemesterEffective = planParams.semester.toUpperCase();
                        }

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
                            year: planParams.scheduleAcademicYear,
                            semester: eventSemesterEffective,
                            departmentCode: subjectData.rawSubject.katedra,
                            courseCode: subjectData.rawSubject.zkratka,
                        };
                    }).filter(event => event !== null);

                    const rozsahParts = subjectData.rawSubject.rozsah?.split('+').map(s => parseInt(s.trim()) || 0) || [];
                    const needed = {
                        lecture: parseInt(subjectData.rawSubject.jednotekPrednasek) || (rozsahParts[0] > 0 ? 1 : 0) || 0,
                        practical: parseInt(subjectData.rawSubject.jednotekCviceni) || (rozsahParts.length > 1 && rozsahParts[1] > 0 ? 1 : 0) || 0,
                        seminar: parseInt(subjectData.rawSubject.jednotekSeminare) || (rozsahParts.length > 2 && rozsahParts[2] > 0 ? 1 : 0) || 0,
                    };

                    let courseEffectiveSemester = planParams.semester.toUpperCase();
                    if (planParams.semester === '%') {
                        courseEffectiveSemester = subjectData.rawSubject.semestrDoporUc?.toUpperCase() ||
                            (subjectData.rawSubject.vyukaZS === 'A' ? 'ZS' :
                                (subjectData.rawSubject.vyukaLS === 'A' ? 'LS' : 'ZS'));
                    }

                    const courseDataForWorkspace = {
                        stagId: subjectData.rawSubject.predmetId,
                        name: subjectData.rawSubject.nazev,
                        departmentCode: subjectData.rawSubject.katedra,
                        courseCode: subjectData.rawSubject.zkratka,
                        credits: parseInt(subjectData.rawSubject.kreditu) || 0,
                        neededEnrollments: needed,
                        semester: courseEffectiveSemester,
                        year: planParams.scheduleAcademicYear,
                        events: transformedEvents,
                        source: useDemoApi ? 'demo' : 'prod',
                    };

                    addCourse(courseDataForWorkspace);
                    const subjectIdentifier = { name: `${subjectData.rawSubject.katedra}/${subjectData.rawSubject.zkratka} - ${subjectData.rawSubject.nazev}` };
                    if (subjectData.operation === 'overwritten') {
                        coursesOverwritten.push(subjectIdentifier);
                    } else {
                        coursesAdded.push(subjectIdentifier);
                    }

                } catch (innerError) {
                    console.error(`Chyba při zpracování předmětu ${subjectData.rawSubject.katedra}/${subjectData.rawSubject.zkratka}:`, innerError);
                    coursesFailed.push({ name: `${subjectData.rawSubject.katedra}/${subjectData.rawSubject.zkratka} - ${subjectData.rawSubject.nazev}` });
                }
            }
            // Zobrazíme souhrnný dialog místo snackbaru
            setSummaryDialog({
                open: true,
                summary: {
                    added: coursesAdded,
                    overwritten: coursesOverwritten,
                    failed: coursesFailed
                }
            });

        } catch (e) {
            // Catch any unexpected error during the loop or setup
            console.error("Neočekávaná chyba během zpracování předmětů plánu:", e);
            showSnackbar(t('alerts.studyPlanLoadError'), 'error');
        } finally {
            setIsLoadingCourseDetails(false);
            setIsStudentPlanLoadingActive(false); // Celý proces načítání plánu studenta skončil
            clearStagAuthData(); // Vyčistíme STAG data po dokončení operace
            setCurrentStudentContextForDialog(null); // Vyčistíme kontext studenta
        }
    };

    const handleStudyParametersSubmitted = useCallback(async (params) => {
        setIsStudyParamsDialogOpen(false);
        setIsStudentPlanLoadingActive(true); // Proces stále běží, nyní načítáme seznam předmětů
        showSnackbar(t('alerts.loadingStudyPlanSubjects'), 'info');
        const lang = i18n.language === 'cs' ? 'cs' : 'en';
        const stagApiYearForFieldSubjects = getStagApiYear(params.scheduleAcademicYear);

        if (!currentStudentContextForDialog || !currentStudentContextForDialog.oborIdno) {
            showSnackbar(t('alerts.noStudentContextForPlan'), 'error');
            resetAllPlanLoaderStates();
            return;
        }

        try {
            const allSubjectsOfFieldRaw = await stagApiService.getPredmetyByObor(
                currentStudentContextForDialog.oborIdno, stagApiYearForFieldSubjects, '%', lang
            );
            const uniqueSubjectsMap = new Map();
            allSubjectsOfFieldRaw.forEach(subj => {
                const key = `${subj.katedra}/${subj.zkratka}`;
                if (!uniqueSubjectsMap.has(key) || (subj.predmetId && !uniqueSubjectsMap.get(key).predmetId)) {
                    uniqueSubjectsMap.set(key, subj);
                }
            });
            const uniqueSubjectsFromField = Array.from(uniqueSubjectsMap.values());

            const filteredSubjects = uniqueSubjectsFromField.filter(subj => {
                const subjectRecommendedStudyYear = parseInt(subj.doporucenyRocnik || subj.dopRoc);
                const matchesStudyYearNum = !isNaN(subjectRecommendedStudyYear) && subjectRecommendedStudyYear === params.studyYearNum;
                let subjectSemesterNormalized = subj.semestr?.toUpperCase() || subj.semestrDoporUc?.toUpperCase();
                if (!subjectSemesterNormalized && subj.vyukaZS === 'A' && subj.vyukaLS === 'A') subjectSemesterNormalized = '%';
                else if (!subjectSemesterNormalized && subj.vyukaZS === 'A') subjectSemesterNormalized = 'ZS';
                else if (!subjectSemesterNormalized && subj.vyukaLS === 'A') subjectSemesterNormalized = 'LS';
                const paramSemesterUpper = params.semester.toUpperCase();
                const matchesSemester = paramSemesterUpper === '%' || (subjectSemesterNormalized === paramSemesterUpper) || (subjectSemesterNormalized === '%');
                const matchesStatus = params.statuses.includes(subj.statut?.toUpperCase());
                return matchesStudyYearNum && matchesSemester && matchesStatus;
            });

            if (filteredSubjects.length === 0) {
                showSnackbar(t('alerts.noSubjectsMatchCriteria'), 'info');
                resetAllPlanLoaderStates();
                return;
            }

            const coursesToProcessList = [];
            const coursesToOverwriteDisplayList = [];
            const coursesToAddDisplayList = [];

            filteredSubjects.forEach(subjectFromObor => {
                const workspaceCourseIdentifier = `${subjectFromObor.katedra}/${subjectFromObor.zkratka}`;
                const existingCourse = workspaceService.courses.find(c => c.id === workspaceCourseIdentifier);

                let displaySemester = params.semester.toUpperCase();
                if (params.semester === '%') {
                    displaySemester = subjectFromObor.semestrDoporUc?.toUpperCase() ||
                        (subjectFromObor.vyukaZS === 'A' && subjectFromObor.vyukaLS === 'A' ? t('Dialogs.selectStudyParams.semesterBoth') :
                            (subjectFromObor.vyukaZS === 'A' ? 'ZS' :
                                (subjectFromObor.vyukaLS === 'A' ? 'LS' : 'N/A')));
                }

                const courseEntry = {
                    name: `${workspaceCourseIdentifier} - ${subjectFromObor.nazev}`,
                    details: t('Dialogs.confirmation.courseDetails', {year: params.scheduleAcademicYear, semester: displaySemester}),
                    rawSubject: subjectFromObor,
                    operation: existingCourse ? 'overwritten' : 'added'
                };
                coursesToProcessList.push(courseEntry);
                if (existingCourse) {
                    coursesToOverwriteDisplayList.push(courseEntry);
                } else {
                    coursesToAddDisplayList.push(courseEntry);
                }
            });

            if (coursesToProcessList.length > 0) {
                setOverwritePlanDialogState({
                    open: true,
                    coursesToProcess: coursesToProcessList,
                    coursesToAdd: coursesToAddDisplayList,
                    coursesToOverwrite: coursesToOverwriteDisplayList,
                    planParams: params, // Uložíme parametry pro actuallyProcessCoursesFromPlan
                    onConfirm: () => actuallyProcessCoursesFromPlan(params, coursesToProcessList),
                });
                // isStudentPlanLoadingActive zůstává true, dokud se dialog nevyřeší
            } else {
                // Nic k zobrazení nebo zpracování
                resetAllPlanLoaderStates();
            }
        } catch (error) {
            console.error("Chyba při načítání předmětů studijního plánu (před dialogem):", error);
            showSnackbar(error.message || t('alerts.studyPlanLoadError'), 'error');
            resetAllPlanLoaderStates();
        }
        // Zde již není setIsStudentPlanLoadingActive(false), to se řeší v actuallyProcess nebo cancel
    }, [stagApiService, currentStudentContextForDialog, showSnackbar, t, i18n.language, workspaceService, addCourse, useDemoApi]);

    const closeOverwritePlanDialog = (userCancelled = false) => {
        setOverwritePlanDialogState(prev => ({ ...prev, open: false, coursesToProcess: [], coursesToAdd: [], coursesToOverwrite: [] }));
        if (userCancelled) {
            showSnackbar(t('alerts.studyParamsSelectionCancelled'), 'info');
            resetAllPlanLoaderStates();
        }
        // Pokud nebyl dialog zrušen, tak isStudentPlanLoadingActive a isLoadingCourseDetails se řídí v actuallyProcessCoursesFromPlan
    };

    const closeSummaryDialog = () => {
        setSummaryDialog({ open: false, summary: { added: [], overwritten: [], failed: [] }});
    };

    return {
        isRedirectDialogOpen, openLoadCoursesFromStudentDialog, closeRedirectDialog, handleContinueToSTAGLogin,
        isIdentityDialogOpen, processLoginSuccessAndOpenIdentityDialog, closeIdentityDialog, handleIdentitySelected,
        isStudyParamsDialogOpen, closeStudyParamsDialog, handleStudyParametersSubmitted,
        currentStudentContextForDialog,
        isStudentPlanLoadingActive, // Změněno z isProcessingStudentPlan
        isLoadingCourseDetails,
        overwritePlanDialogState,
        closeOverwritePlanDialog,
        summaryDialog,
        closeSummaryDialog,
    };
};