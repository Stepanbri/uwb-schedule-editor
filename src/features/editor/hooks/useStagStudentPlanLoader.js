/**
 * @file Tento soubor definuje hook `useStagStudentPlanLoader`, který zapouzdřuje komplexní logiku
 * pro načítání studijního plánu studenta ze STAGu. Tento proces zahrnuje několik kroků:
 * 1. Přihlášení uživatele přes STAG.
 * 2. Výběr identity (role) studenta.
 * 3. Zadání parametrů studia (ročník, semestr).
 * 4. Načtení předmětů a jejich rozvrhových akcí.
 * 5. Zpracování a přidání předmětů do `WorkspaceService`.
 * Hook spravuje stav všech dialogových oken a komunikaci se STAG API a Workspace.
 */

// Hook pro načítání studijního plánu studenta ze STAGu
// Řídí celý proces od přihlášení uživatele až po přidání předmětů do workspace
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useStagApi } from '../../../contexts/StagApiContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { transformStagEvent, transformStagSubject } from '../../../utils/stagDataTransform.js';

/**
 * Pomocná funkce pro získání akademického roku ve formátu, který vyžaduje STAG API (např. "2023").
 * @param {string} academicYearString - Akademický rok ve formátu "RRRR/RRRR" (např. "2023/2024").
 * @returns {string} První část roku.
 */
const getStagApiYear = academicYearString => {
    if (typeof academicYearString === 'string' && academicYearString.includes('/')) {
        return academicYearString.split('/')[0];
    }
    return academicYearString;
};

/**
 * Hook pro správu kompletního workflow načítání studijního plánu studenta.
 * @returns {{
 *  isRedirectDialogOpen: boolean,
 *  isIdentityDialogOpen: boolean,
 *  isStudyParamsDialogOpen: boolean,
 *  isStudentPlanLoadingActive: boolean,
 *  isLoadingCourseDetails: boolean,
 *  currentStudentContextForDialog: object | null,
 *  overwritePlanDialogState: object,
 *  summaryDialog: object,
 *  openLoadCoursesFromStudentDialog: () => void,
 *  closeRedirectDialog: () => void,
 *  handleContinueToSTAGLogin: () => void,
 *  processLoginSuccessAndOpenIdentityDialog: () => void,
 *  closeIdentityDialog: (userCancelled?: boolean) => void,
 *  handleIdentitySelected: (selectedStagUserIdentifier: string) => Promise<void>,
 *  closeStudyParamsDialog: (userCancelled?: boolean) => void,
 *  handleStudyParametersSubmitted: (params: object) => Promise<void>,
 *  closeOverwritePlanDialog: (userCancelled?: boolean) => void,
 *  closeSummaryDialog: () => void
 * }}
 */
export const useStagStudentPlanLoader = () => {
    const {
        stagApiService,
        redirectToStagLogin,
        setRole,
        clearStagAuthData,
        userInfo,
        useDemoApi,
    } = useStagApi();
    const { workspaceService, addCourse } = useWorkspace();
    const { showSnackbar } = useSnackbar();
    const { t, i18n } = useTranslation();

    // Stav pro dialog, který informuje o přesměrování na STAG login.
    const [isRedirectDialogOpen, setIsRedirectDialogOpen] = useState(false);
    // Stav pro dialog výběru identity (role) studenta po přihlášení.
    const [isIdentityDialogOpen, setIsIdentityDialogOpen] = useState(false);
    // Stav pro dialog zadání parametrů studia (rok, semestr).
    const [isStudyParamsDialogOpen, setIsStudyParamsDialogOpen] = useState(false);

    // Globální příznak, že probíhá proces načítání plánu (od prvního kroku až do konce).
    const [isStudentPlanLoadingActive, setIsStudentPlanLoadingActive] = useState(false);
    // Specifický příznak pro fázi, kdy se na pozadí stahují detaily předmětů.
    const [isLoadingCourseDetails, setIsLoadingCourseDetails] = useState(false);

    // Uchovává kontext studenta (jméno, obor atd.) pro zobrazení v dialogu.
    const [currentStudentContextForDialog, setCurrentStudentContextForDialog] = useState(null);

    // Stav pro dialog, který se ptá na přepsání existujících předmětů.
    const [overwritePlanDialogState, setOverwritePlanDialogState] = useState({
        open: false,
        coursesToProcess: [],
        coursesToAdd: [],
        coursesToOverwrite: [],
        planParams: null,
        onConfirm: () => {},
    });

    // Stav pro souhrnný dialog zobrazující výsledek importu.
    const [summaryDialog, setSummaryDialog] = useState({
        open: false,
        summary: { added: [], overwritten: [], failed: [] },
    });

    /**
     * Resetuje všechny stavy hooku do jejich počáteční hodnoty.
     * Používá se pro čistý start nebo při zrušení operace.
     */
    const resetAllPlanLoaderStates = () => {
        setIsRedirectDialogOpen(false);
        setIsIdentityDialogOpen(false);
        setIsStudyParamsDialogOpen(false);
        setIsStudentPlanLoadingActive(false);
        setIsLoadingCourseDetails(false);
        setCurrentStudentContextForDialog(null);
        setOverwritePlanDialogState({
            open: false,
            coursesToProcess: [],
            coursesToAdd: [],
            coursesToOverwrite: [],
            planParams: null,
            onConfirm: () => {},
        });
        setSummaryDialog({ open: false, summary: { added: [], overwritten: [], failed: [] } });
        clearStagAuthData();
    };

    /**
     * Zahájí proces načítání studijního plánu otevřením úvodního dialogu.
     */
    const openLoadCoursesFromStudentDialog = useCallback(() => {
        resetAllPlanLoaderStates(); // Reset před začátkem nového flow
        setIsRedirectDialogOpen(true);
    }, []); // Závislost na resetAllPlanLoaderStates není nutná, protože se nemění

    /**
     * Zavře dialog o přesměrování a ukončí celý proces.
     */
    const closeRedirectDialog = useCallback(() => {
        setIsRedirectDialogOpen(false);
        // Pokud uživatel zavře tento dialog, flow končí
        resetAllPlanLoaderStates();
    }, []);

    /**
     * Pokračuje z úvodního dialogu na přihlašovací stránku STAGu.
     */
    const handleContinueToSTAGLogin = useCallback(() => {
        // isRedirectDialogOpen se nastaví na false v closeRedirectDialog, ale chceme, aby studentPlanLoadingActive zůstal true
        setIsStudentPlanLoadingActive(true); // Indikujeme, že proces načítání studenta začal
        closeRedirectDialog(); // Toto už nevolá resetAllPlanLoaderStates
        redirectToStagLogin('studentCourses');
    }, [redirectToStagLogin]);

    /**
     * Zpracuje úspěšné přihlášení, zkontroluje role a otevře dialog pro výběr identity.
     */
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

    /**
     * Zavře dialog pro výběr identity. Pokud jej zrušil uživatel, resetuje stav.
     * @param {boolean} [userCancelled=false] - Indikuje, zda dialog zavřel uživatel.
     */
    const closeIdentityDialog = useCallback(
        (userCancelled = false) => {
            setIsIdentityDialogOpen(false);
            if (userCancelled) {
                showSnackbar(t('alerts.identitySelectionCancelledAndTicketCleared'), 'info');
                resetAllPlanLoaderStates();
            }
            // Pokud není zrušeno, isStudentPlanLoadingActive zůstává true
        },
        [showSnackbar, t]
    );

    /**
     * Zpracuje výběr identity studenta, načte jeho detaily a otevře dialog pro zadání parametrů studia.
     * @param {string} selectedStagUserIdentifier - Identifikátor vybrané role ze STAGu.
     */
    const handleIdentitySelected = useCallback(
        async selectedStagUserIdentifier => {
            setIsIdentityDialogOpen(false);
            setRole(selectedStagUserIdentifier);
            showSnackbar(
                t('alerts.identitySelectedLog', { stagUser: selectedStagUserIdentifier }),
                'info'
            );
            setIsStudentPlanLoadingActive(true); // Ujistíme se, že je stále true

            try {
                const currentRoleInfo = stagApiService
                    .getUserInfo()
                    .roles.find(
                        r =>
                            r.userName === selectedStagUserIdentifier ||
                            r.stagUser === selectedStagUserIdentifier
                    );
                const osCisloForLookup = currentRoleInfo?.osCislo || selectedStagUserIdentifier;
                const academicYearForStudentInfoFull =
                    workspaceService.year ||
                    new Date().getFullYear().toString() +
                        '/' +
                        (new Date().getFullYear() + 1).toString();
                const stagApiYearForStudentInfo = getStagApiYear(academicYearForStudentInfoFull);
                const studentDetailInfo = await stagApiService.getStudentInfo(
                    osCisloForLookup,
                    stagApiYearForStudentInfo,
                    false,
                    i18n.language
                );

                if (studentDetailInfo && studentDetailInfo.osCislo) {
                    const primaryOborIdno = studentDetailInfo.oborIdnos
                        ? studentDetailInfo.oborIdnos.split(',')[0].trim()
                        : null;
                    let studyDetailsToUse = null;
                    if (
                        Array.isArray(studentDetailInfo.studiumInfo) &&
                        studentDetailInfo.studiumInfo.length > 0
                    ) {
                        const activeStudy = studentDetailInfo.studiumInfo.find(
                            s => s.stavStudia === 'S' || s.stavStudiaKey === 'S'
                        );
                        studyDetailsToUse = activeStudy || studentDetailInfo.studiumInfo[0];
                    }
                    const oborIdnoToUse = studyDetailsToUse?.oborIdno || primaryOborIdno;

                    if (oborIdnoToUse) {
                        const context = {
                            osCislo: studentDetailInfo.osCislo,
                            jmeno: studentDetailInfo.jmeno,
                            prijmeni: studentDetailInfo.prijmeni,
                            fakulta:
                                studyDetailsToUse?.fakultaOrgJednotka ||
                                studentDetailInfo.fakultaSp ||
                                currentRoleInfo?.fakulta,
                            stplIdno: studyDetailsToUse?.stplIdno,
                            oborIdno: oborIdnoToUse,
                            studProgramNazev:
                                studyDetailsToUse?.studProgramPopisEn ||
                                studyDetailsToUse?.studProgramPopis ||
                                studentDetailInfo.nazevSpEn ||
                                studentDetailInfo.nazevSp,
                            oborNazev:
                                studyDetailsToUse?.oborPopisEn ||
                                studyDetailsToUse?.oborPopis ||
                                studentDetailInfo.oborNazevSp,
                            currentAcademicYearFull: academicYearForStudentInfoFull,
                        };
                        setCurrentStudentContextForDialog(context);
                        setIsStudyParamsDialogOpen(true);
                    } else {
                        throw new Error(t('alerts.fetchStudentInfoErrorNoStudyDetails'));
                    }
                } else {
                    throw new Error(t('alerts.fetchStudentInfoErrorNoData'));
                }
            } catch (error) {
                showSnackbar(error.message || t('alerts.fetchStudentInfoError'), 'error');
                resetAllPlanLoaderStates(); // Při chybě resetujeme
            }
            // setIsStudentPlanLoadingActive zůstává true, dokud se neotevře StudyParamsDialog nebo nedojde k chybě
        },
        [stagApiService, setRole, showSnackbar, t, i18n.language, workspaceService.year]
    );

    /**
     * Zavře dialog pro zadání parametrů studia. Pokud jej zrušil uživatel, resetuje stav.
     * @param {boolean} [userCancelled=false] - Indikuje, zda dialog zavřel uživatel.
     */
    const closeStudyParamsDialog = useCallback(
        (userCancelled = false) => {
            setIsStudyParamsDialogOpen(false);
            if (userCancelled) {
                showSnackbar(t('alerts.studyParamsSelectionCancelled'), 'info');
                resetAllPlanLoaderStates();
            }
            // Pokud není zrušeno, isStudentPlanLoadingActive zůstává true
        },
        [showSnackbar, t]
    );

    /**
     * Finální fáze: Zpracuje pole předmětů, dotáhne pro každý z nich rozvrhové akce,
     * transformuje data a přidá je do workspace.
     * @param {object} planParams - Parametry studia (rok, semestr).
     * @param {object[]} coursesToProcess - Pole předmětů k importu.
     */
    const actuallyProcessCoursesFromPlan = async (planParams, coursesToProcess) => {
        setOverwritePlanDialogState(prev => ({ ...prev, open: false }));
        setIsLoadingCourseDetails(true); // Začínáme načítání detailů předmětů
        setIsStudentPlanLoadingActive(true); // Ujistíme se, že je stále true
        showSnackbar(
            t('alerts.fetchingSubjectDetailsCount', { count: coursesToProcess.length }),
            'info'
        );

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
                        const subjSem =
                            subjectData.rawSubject.semestrDoporUc?.toUpperCase() ||
                            (subjectData.rawSubject.vyukaZS === 'A'
                                ? 'ZS'
                                : subjectData.rawSubject.vyukaLS === 'A'
                                  ? 'LS'
                                  : 'ZS');
                        semesterForEventsApi = subjSem || '%';
                    }

                    const scheduleEventsData = await stagApiService.getRozvrhByPredmet(
                        {
                            katedra: subjectData.rawSubject.katedra,
                            zkratka: subjectData.rawSubject.zkratka,
                            rok: stagApiYearForCourseEvents,
                            semestr: semesterForEventsApi,
                        },
                        lang
                    );

                    const transformedEvents = (
                        Array.isArray(scheduleEventsData) ? scheduleEventsData : []
                    )
                        .map(stagEvent => transformStagEvent(stagEvent, subjectData, planParams, t))
                        .filter(event => event !== null);

                    const courseDataForWorkspace = transformStagSubject(
                        subjectData,
                        transformedEvents,
                        planParams,
                        useDemoApi
                    );

                    addCourse(courseDataForWorkspace);
                    const subjectIdentifier = {
                        name: `${subjectData.rawSubject.katedra}/${subjectData.rawSubject.zkratka} - ${subjectData.rawSubject.nazev}`,
                    };
                    if (subjectData.operation === 'overwritten') {
                        coursesOverwritten.push(subjectIdentifier);
                    } else {
                        coursesAdded.push(subjectIdentifier);
                    }
                } catch (innerError) {
                    coursesFailed.push({
                        name: `${subjectData.rawSubject.katedra}/${subjectData.rawSubject.zkratka} - ${subjectData.rawSubject.nazev}`,
                    });
                }
            }
            // Zobrazíme souhrnný dialog místo snackbaru
            setSummaryDialog({
                open: true,
                summary: {
                    added: coursesAdded,
                    overwritten: coursesOverwritten,
                    failed: coursesFailed,
                },
            });
        } catch (e) {
            // Catch any unexpected error during the loop or setup
            showSnackbar(t('alerts.studyPlanLoadError'), 'error');
        } finally {
            setIsLoadingCourseDetails(false);
            setIsStudentPlanLoadingActive(false); // Celý proces načítání plánu studenta skončil
            clearStagAuthData(); // Vyčistíme STAG data po dokončení operace
            setCurrentStudentContextForDialog(null); // Vyčistíme kontext studenta
        }
    };

    /**
     * Zpracuje odeslané parametry studia, načte seznam předmětů pro daný obor a ročník
     * a zobrazí dialog pro potvrzení přepisu.
     * @param {object} params - Parametry zadané v dialogu (ročník, semestr atd.).
     */
    const handleStudyParametersSubmitted = useCallback(
        async params => {
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
                    currentStudentContextForDialog.oborIdno,
                    stagApiYearForFieldSubjects,
                    '%',
                    lang
                );
                const uniqueSubjectsMap = new Map();
                allSubjectsOfFieldRaw.forEach(subj => {
                    const key = `${subj.katedra}/${subj.zkratka}`;
                    if (
                        !uniqueSubjectsMap.has(key) ||
                        (subj.predmetId && !uniqueSubjectsMap.get(key).predmetId)
                    ) {
                        uniqueSubjectsMap.set(key, subj);
                    }
                });
                const uniqueSubjectsFromField = Array.from(uniqueSubjectsMap.values());

                const filteredSubjects = uniqueSubjectsFromField.filter(subj => {
                    const subjectRecommendedStudyYear = parseInt(
                        subj.doporucenyRocnik || subj.dopRoc
                    );
                    const matchesStudyYearNum =
                        !isNaN(subjectRecommendedStudyYear) &&
                        subjectRecommendedStudyYear === params.studyYearNum;
                    let subjectSemesterNormalized =
                        subj.semestr?.toUpperCase() || subj.semestrDoporUc?.toUpperCase();
                    if (!subjectSemesterNormalized && subj.vyukaZS === 'A' && subj.vyukaLS === 'A')
                        subjectSemesterNormalized = '%';
                    else if (!subjectSemesterNormalized && subj.vyukaZS === 'A')
                        subjectSemesterNormalized = 'ZS';
                    else if (!subjectSemesterNormalized && subj.vyukaLS === 'A')
                        subjectSemesterNormalized = 'LS';
                    const paramSemesterUpper = params.semester.toUpperCase();
                    const matchesSemester =
                        paramSemesterUpper === '%' ||
                        subjectSemesterNormalized === paramSemesterUpper ||
                        subjectSemesterNormalized === '%';
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
                    const existingCourse = workspaceService.courses.find(
                        c => c.id === workspaceCourseIdentifier
                    );

                    let displaySemester = params.semester.toUpperCase();
                    if (params.semester === '%') {
                        displaySemester =
                            subjectFromObor.semestrDoporUc?.toUpperCase() ||
                            (subjectFromObor.vyukaZS === 'A' && subjectFromObor.vyukaLS === 'A'
                                ? t('Dialogs.selectStudyParams.semesterBoth')
                                : subjectFromObor.vyukaZS === 'A'
                                  ? 'ZS'
                                  : subjectFromObor.vyukaLS === 'A'
                                    ? 'LS'
                                    : 'N/A');
                    }

                    const courseEntry = {
                        name: `${workspaceCourseIdentifier} - ${subjectFromObor.nazev}`,
                        details: t('Dialogs.confirmation.courseDetails', {
                            year: params.scheduleAcademicYear,
                            semester: displaySemester,
                        }),
                        rawSubject: subjectFromObor,
                        operation: existingCourse ? 'overwritten' : 'added',
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
                        onConfirm: () =>
                            actuallyProcessCoursesFromPlan(params, coursesToProcessList),
                    });
                    // isStudentPlanLoadingActive zůstává true, dokud se dialog nevyřeší
                } else {
                    // Nic k zobrazení nebo zpracování
                    resetAllPlanLoaderStates();
                }
            } catch (error) {
                showSnackbar(error.message || t('alerts.studyPlanLoadError'), 'error');
                resetAllPlanLoaderStates();
            }
            // Zde již není setIsStudentPlanLoadingActive(false), to se řeší v actuallyProcess nebo cancel
        },
        [
            stagApiService,
            currentStudentContextForDialog,
            showSnackbar,
            t,
            i18n.language,
            workspaceService,
            addCourse,
            useDemoApi,
        ]
    );

    /**
     * Zavře dialog pro potvrzení přepisu. Pokud jej zrušil uživatel, resetuje stav.
     * @param {boolean} [userCancelled=false] - Indikuje, zda dialog zavřel uživatel.
     */
    const closeOverwritePlanDialog = (userCancelled = false) => {
        setOverwritePlanDialogState(prev => ({
            ...prev,
            open: false,
            coursesToProcess: [],
            coursesToAdd: [],
            coursesToOverwrite: [],
        }));
        if (userCancelled) {
            showSnackbar(t('alerts.studyParamsSelectionCancelled'), 'info');
            resetAllPlanLoaderStates();
        }
        // Pokud nebyl dialog zrušen, tak isStudentPlanLoadingActive a isLoadingCourseDetails se řídí v actuallyProcessCoursesFromPlan
    };

    /**
     * Zavře souhrnný dialog s výsledky importu.
     */
    const closeSummaryDialog = () => {
        setSummaryDialog({ open: false, summary: { added: [], overwritten: [], failed: [] } });
    };

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
        isStudentPlanLoadingActive, // Změněno z isProcessingStudentPlan
        isLoadingCourseDetails,
        overwritePlanDialogState,
        closeOverwritePlanDialog,
        summaryDialog,
        closeSummaryDialog,
    };
};
