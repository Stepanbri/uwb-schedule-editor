// PROJEKT/NEW/src/features/editor/EditorPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    useMediaQuery,
    SwipeableDrawer,
    Tabs,
    Tab,
    IconButton,
    Typography,
    styled,
    useTheme,
    CircularProgress,
    Snackbar,
    alpha
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import TuneIcon from '@mui/icons-material/Tune';
import ListIcon from '@mui/icons-material/List';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import { useTranslation } from 'react-i18next';

import CourseBar from './CourseBar';
import ScheduleBox from './ScheduleBox';
import PropertiesBar from './PropertiesBar';
import WorkspaceService from '../../services/WorkspaceService';
import StagApiService from '../../services/StagApiService';
import { EVENT_TYPE_TO_KEY_MAP } from '../../services/CourseClass';
import ScheduleClass from '../../services/ScheduleClass';

import LoadCourseFromSTAGDialog from './Dialogs/LoadCourseFromSTAGDialog';
import CourseLoadingProcessDialog from './Dialogs/CourseLoadingProcessDialog';
import ExistingCourseWarningDialog from './Dialogs/ExistingCourseWarningDialog';
import LoadCoursesFromStudentRedirectDialog from './Dialogs/LoadCoursesFromStudentRedirectDialog';
import SelectSTAGIdentityDialog from './Dialogs/SelectSTAGIdentityDialog';
import SelectStudyParametersDialog from './Dialogs/SelectStudyParametersDialog';

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const STAG_LOGIN_FLOW_KEY = 'stagLoginFlow_StudentCoursesV2';
const LEFT_SIDEBAR_WIDTH_DESKTOP = '320px';
const RIGHT_SIDEBAR_WIDTH_DESKTOP = '320px';

// Pomocná funkce pro získání roku ve formátu RRRR pro STAG API
const getStagApiYear = (academicYearString) => {
    if (typeof academicYearString === 'string' && academicYearString.includes('/')) {
        return academicYearString.split('/')[0];
    }
    return academicYearString; // Vrátí původní, pokud formát není RRRR/RR nebo není string
};


const EditorPageRoot = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
});

const EditorLayoutDesktop = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden',
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.background.default,
}));

const SidebarWrapper = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'customWidth'
})(({ theme, customWidth }) => ({
    width: customWidth,
    minWidth: customWidth,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
}));

const MainContentWrapper = styled(Box)(({ theme }) => ({
    flexGrow: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
}));

const MobileDrawerToggleButton = styled(IconButton)(({ theme }) => ({
    position: 'fixed',
    bottom: theme.spacing(3),
    right: theme.spacing(3),
    zIndex: theme.zIndex.drawer + 200,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxShadow: theme.shadows[6],
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
    },
}));

function EditorPage() {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

    const [workspaceService] = useState(() => new WorkspaceService());
    const [stagApiService] = useState(() => new StagApiService());

    const [courses, setCourses] = useState([]);
    const [activeSchedule, setActiveSchedule] = useState(null);
    const [preferences, setPreferences] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingCourse, setIsProcessingCourse] = useState(false);
    const [isProcessingStudentPlan, setIsProcessingStudentPlan] = useState(false);

    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [activeMobileTab, setActiveMobileTab] = useState(0);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const [loadCourseFromSTAGDialogOpen, setLoadCourseFromSTAGDialogOpen] = useState(false);
    const [existingCourseWarningDialogOpen, setExistingCourseWarningDialogOpen] = useState(false);
    const [courseToOverwriteData, setCourseToOverwriteData] = useState(null);
    const [loadCoursesFromStudentRedirectDialogOpen, setLoadCoursesFromStudentRedirectDialogOpen] = useState(false);
    const [selectSTAGIdentityDialogOpen, setSelectSTAGIdentityDialogOpen] = useState(false);
    const [selectStudyParametersDialogOpen, setSelectStudyParametersDialogOpen] = useState(false);
    const [currentStudentContext, setCurrentStudentContext] = useState(null);

    const debouncedSaveWorkspace = useMemo(
        () => {
            let timeoutId;
            return () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    workspaceService.saveWorkspace();
                    console.log("Workspace auto-saved.");
                }, 1500);
            };
        },
        [workspaceService]
    );

    const syncStateFromService = useCallback((showSaveNotification = false) => {
        setCourses([...workspaceService.getAllCourses()]);
        const currentServiceSchedule = workspaceService.getActiveSchedule();
        if (currentServiceSchedule instanceof ScheduleClass) {
            setActiveSchedule(currentServiceSchedule);
        } else {
            console.error("CRITICAL: workspaceService.getActiveSchedule() did not return a ScheduleClass instance!");
            const fallbackSchedule = new ScheduleClass();
            if (Array.isArray(currentServiceSchedule?.enrolledEvents)) {
                fallbackSchedule.addEvents(currentServiceSchedule.enrolledEvents.filter(e => e instanceof Object));
            }
            setActiveSchedule(fallbackSchedule);
        }
        setPreferences({...workspaceService.preferences});
        debouncedSaveWorkspace();
        if (showSaveNotification) {
            setSnackbar({ open: true, message: t('alerts.workspaceSaved', 'Pracovní plocha uložena.'), severity: 'success' });
        }
    }, [workspaceService, debouncedSaveWorkspace, t]);

    useEffect(() => {
        const initializeOrHandleRedirect = async () => {
            const queryParams = new URLSearchParams(window.location.search);
            const ticket = queryParams.get('stagUserTicket');
            const userInfoBase64 = queryParams.get('stagUserInfo');
            const activeLoginFlow = localStorage.getItem(STAG_LOGIN_FLOW_KEY);
            let ranLoginFlowProcessing = false;

            if (ticket && activeLoginFlow === 'studentCourses') {
                ranLoginFlowProcessing = true;
                localStorage.removeItem(STAG_LOGIN_FLOW_KEY);
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
                setIsProcessingStudentPlan(true);
                setSnackbar({open: true, message: t('alerts.stagLoginSuccessful', 'Přihlášení do STAGu proběhlo úspěšně.'), severity: 'success'});
                const loginSuccess = stagApiService.handleLoginCallback(new URLSearchParams(`stagUserTicket=${ticket}&stagUserInfo=${userInfoBase64}`));
                const userInfo = stagApiService.getUserInfo();
                if (loginSuccess && userInfo && userInfo.roles && userInfo.roles.length > 0) {
                    setSelectSTAGIdentityDialogOpen(true);
                } else {
                    setSnackbar({open: true, message: t('alerts.stagLoginNoRoles', 'Přihlášení proběhlo, ale nebyly nalezeny žádné role, nebo chybí informace o uživateli.'), severity: 'warning'});
                    setIsProcessingStudentPlan(false);
                }
            }

            if (isLoading && !ranLoginFlowProcessing) {
                setIsLoading(true);
                const loadedFromStorage = workspaceService.loadWorkspace();
                if (!loadedFromStorage && workspaceService.getAllCourses().length === 0 && !ticket) {
                    setSnackbar({ open: true, message: t('alerts.loadedDummyData', 'Byla načtena ukázková data.'), severity: 'info' });
                } else if (loadedFromStorage && !ticket) {
                    setSnackbar({ open: true, message: t('alerts.workspaceLoadedFromLocalStorage', 'Pracovní plocha načtena z Local Storage.'), severity: 'info' });
                }
                syncStateFromService();
                setIsLoading(false);
            } else if (isLoading && ranLoginFlowProcessing){
                syncStateFromService();
                setIsLoading(false);
            }
        };
        initializeOrHandleRedirect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceService, stagApiService, t]);

    const handleUpdateWorkspace = useCallback((showSaveNotification = false) => {
        syncStateFromService(showSaveNotification);
    }, [syncStateFromService]);

    const handleRemoveCourse = useCallback((courseId) => {
        const courseToRemove = courses.find(c => c.id === courseId || c.stagId === courseId);
        workspaceService.removeCourse(courseId);
        handleUpdateWorkspace();
        setSnackbar({ open: true, message: t('alerts.courseRemoved', { courseId: courseToRemove?.getShortCode() || courseId }), severity: 'success' });
    }, [workspaceService, handleUpdateWorkspace, courses, t]);

    const handleToggleEvent = useCallback((eventToToggle, isCurrentlyEnrolled) => {
        const schedule = workspaceService.getActiveSchedule();
        if (!schedule) {
            console.error("Cannot toggle event: activeSchedule is null.");
            setSnackbar({ open: true, message: t('alerts.internalError', 'Interní chyba: Rozvrh není aktivní.'), severity: 'error'});
            return;
        }
        if (isCurrentlyEnrolled) {
            schedule.removeEventById(eventToToggle.id);
        } else {
            const course = courses.find(c => c.id === eventToToggle.courseId);
            let canEnroll = true;
            let alertMsg = "";
            if (eventToToggle.currentCapacity >= eventToToggle.maxCapacity) {
                alertMsg = t('alerts.eventFull', { eventType: eventToToggle.type, courseCode: course?.getShortCode() || eventToToggle.courseCode });
                canEnroll = false;
            } else if (course) {
                const eventTypeKey = Object.keys(EVENT_TYPE_TO_KEY_MAP).find(key => EVENT_TYPE_TO_KEY_MAP[key] === eventToToggle.type.toLowerCase()) || eventToToggle.type.toLowerCase();
                const enrolledEventIds = new Set(schedule.getAllEnrolledEvents().map(e => e.id));
                if (eventTypeKey && course.isEnrollmentTypeRequirementMet(eventTypeKey, enrolledEventIds)) {
                    alertMsg = t('alerts.typeRequirementMet', { eventType: t(`courseEvent.${eventTypeKey}`, eventToToggle.type), courseCode: course.getShortCode() });
                    canEnroll = false;
                }
            }
            if (canEnroll) {
                schedule.addEvent(eventToToggle);
            } else {
                setSnackbar({ open: true, message: alertMsg, severity: 'warning'});
                return;
            }
        }
        handleUpdateWorkspace();
    }, [workspaceService, courses, handleUpdateWorkspace, t]);

    const handleOpenLoadCourseFromSTAGDialog = useCallback(() => {
        setLoadCourseFromSTAGDialogOpen(true);
    }, []);

    const processAndAddCourse = useCallback((courseDataForWorkspace, operationType = 'added') => {
        workspaceService.addCourse(courseDataForWorkspace);
        handleUpdateWorkspace(true);
        if (operationType === 'overwritten') {
            setSnackbar({ open: true, message: t('alerts.courseOverwritten', { courseCode: `${courseDataForWorkspace.departmentCode}/${courseDataForWorkspace.courseCode}` }), severity: 'info'});
        } else {
            setSnackbar({ open: true, message: t('alerts.courseAdded', { courseCode: `${courseDataForWorkspace.departmentCode}/${courseDataForWorkspace.courseCode}` }), severity: 'success'});
        }
    }, [workspaceService, handleUpdateWorkspace, t]);

    const handleConfirmOverwriteCourse = useCallback(() => {
        if (courseToOverwriteData) {
            const existingCourse = workspaceService.courses.find(c =>
                c.departmentCode === courseToOverwriteData.departmentCode &&
                c.courseCode === courseToOverwriteData.courseCode &&
                c.year === courseToOverwriteData.year &&
                c.semester === courseToOverwriteData.semester
            );
            if(existingCourse) workspaceService.removeCourse(existingCourse.id);
            processAndAddCourse(courseToOverwriteData.dataForWorkspace, 'overwritten');
        }
        setExistingCourseWarningDialogOpen(false);
        setCourseToOverwriteData(null);
        setIsProcessingCourse(false);
        setIsProcessingStudentPlan(false);
    }, [workspaceService, processAndAddCourse, courseToOverwriteData, t]);

    const handleSubmitLoadCourseFromSTAG = useCallback(async (formData) => {
        setIsProcessingCourse(true);
        setLoadCourseFromSTAGDialogOpen(false);
        const lang = 'en';
        const stagApiYear = getStagApiYear(formData.year);

        try {
            const subjectInfo = await stagApiService.getSubjectInfo(formData.departmentCode, formData.subjectCode, stagApiYear, lang);
            if (!subjectInfo || (Object.keys(subjectInfo).length === 0 && subjectInfo.constructor === Object) || (Array.isArray(subjectInfo) && subjectInfo.length === 0) ) {
                setSnackbar({ open: true, message: t('alerts.stagSubjectNotFound', {subjectCode: `${formData.departmentCode}/${formData.subjectCode}`}), severity: 'error'});
                setIsProcessingCourse(false);
                return;
            }
            const scheduleEventsData = await stagApiService.getRozvrhByPredmet({
                katedra: formData.departmentCode,
                zkratka: formData.subjectCode,
                rok: stagApiYear,
                semestr: formData.semester
            }, lang);

            const dayMapping = { "PO": 0, "ÚT": 1, "ST": 2, "ČT": 3, "PÁ": 4, "SO": 5, "NE": 6, "MON":0, "TUE":1, "WED":2, "THU":3, "FRI":4, "SAT":5, "SUN":6 };
            const recurrenceMapping = { "KT": "KAŽDÝ TÝDEN", "SUDY": "SUDÝ TÝDEN", "LI": "LICHÝ TÝDEN", "KAŽDÝ":"KAŽDÝ TÝDEN", "LICHÝ":"LICHÝ TÝDEN", "SUDÝ":"SUDÝ TÝDEN", "EVERY":"KAŽDÝ TÝDEN", "ODD":"LICHÝ TÝDEN", "EVEN":"SUDÝ TÝDEN" };
            const typeMapping = { "P": "PŘEDNÁŠKA", "C": "CVIČENÍ", "S": "SEMINÁŘ", "Z": "ZKOUŠKA", "A": "ZÁPOČET", "BL": "BLOK", "PŘ":"PŘEDNÁŠKA", "CV":"CVIČENÍ", "SE":"SEMINÁŘ", "LECTURE":"PŘEDNÁŠKA", "PRACTICAL":"CVIČENÍ", "SEMINAR":"SEMINÁŘ"};

            const transformedEvents = (Array.isArray(scheduleEventsData) ? scheduleEventsData : []).map(stagEvent => {
                let instructorName = '';
                if (stagEvent.ucitel) {
                    const ucitele = Array.isArray(stagEvent.ucitel) ? stagEvent.ucitel : [stagEvent.ucitel];
                    instructorName = ucitele.map(u => `${u.titulPred ? u.titulPred + ' ' : ''}${u.jmeno} ${u.prijmeni}${u.titulZa ? ', ' + u.titulZa : ''}`).join(', ');
                }
                const dayKey = stagEvent.denZkr?.toUpperCase() || stagEvent.den?.toUpperCase();

                // *** ÚPRAVA PRO FORMÁT MÍSTNOSTI ***
                let formattedRoom = t('common.notSpecified', 'Nezadáno');
                if (stagEvent.budova && stagEvent.mistnost) { // Pokud máme budovu a místnost zvlášť
                    formattedRoom = `${stagEvent.budova.toUpperCase()}${stagEvent.mistnost.replace(/\s|-/g, '')}`;
                } else if (stagEvent.mistnost) { // Pokud je místnost už spojená, jen vyčistíme
                    formattedRoom = stagEvent.mistnost.replace(/\s|-/g, '');
                } else if (stagEvent.mistnostZkr) {
                    formattedRoom = stagEvent.mistnostZkr.replace(/\s|-/g, '');
                }


                return {
                    id: stagEvent.roakIdno || stagEvent.akceIdno,
                    startTime: stagEvent.hodinaSkutOd?.value || stagEvent.casOd,
                    endTime: stagEvent.hodinaSkutDo?.value || stagEvent.casDo,
                    day: dayMapping[dayKey] ?? (parseInt(stagEvent.den) ? (parseInt(stagEvent.den) -1) : 0),
                    recurrence: recurrenceMapping[stagEvent.tydenZkr?.toUpperCase()] || recurrenceMapping[stagEvent.tyden?.toUpperCase()] || stagEvent.tyden || "KAŽDÝ TÝDEN",
                    room: formattedRoom, // Použijeme formátovanou místnost
                    type: typeMapping[stagEvent.typAkceZkr?.toUpperCase()] || typeMapping[stagEvent.typAkce?.toUpperCase()] || stagEvent.typAkce || "NEZNÁMÝ",
                    instructor: instructorName, currentCapacity: parseInt(stagEvent.obsazeni) || parseInt(stagEvent.pocetZapsanychStudentu) || 0,
                    maxCapacity: parseInt(stagEvent.kapacita) || parseInt(stagEvent.maxKapacita) || parseInt(stagEvent.kapacitaMistnosti) || 0,
                    note: stagEvent.poznamka,
                    year: formData.year,
                    semester: formData.semester,
                    departmentCode: subjectInfo.katedra,
                    courseCode: subjectInfo.zkratka,
                };
            });

            const courseDataForWorkspace = {
                id: subjectInfo.predmetId || `LOCAL_${subjectInfo.katedra}_${subjectInfo.zkratka}_${stagApiYear}`,
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

            const existingCourse = workspaceService.courses.find(c =>
                c.departmentCode === courseDataForWorkspace.departmentCode &&
                c.courseCode === courseDataForWorkspace.courseCode &&
                c.year === courseDataForWorkspace.year &&
                c.semester === courseDataForWorkspace.semester
            );
            if (existingCourse) {
                setCourseToOverwriteData({ ...formData, departmentCode: subjectInfo.katedra, subjectCode: subjectInfo.zkratka, dataForWorkspace: courseDataForWorkspace });
                setExistingCourseWarningDialogOpen(true);
            } else {
                processAndAddCourse(courseDataForWorkspace);
                setIsProcessingCourse(false); // Ukončíme processing až zde
            }
        } catch (error) {
            console.error("Chyba při načítání předmětu ze STAGu:", error);
            setSnackbar({ open: true, message: error.message || t('alerts.stagLoadError', 'Chyba při komunikaci se STAG API.'), severity: 'error'});
            setIsProcessingCourse(false);
        }
    }, [workspaceService, stagApiService, processAndAddCourse, t, i18n.language]);

    const handleOpenLoadCoursesFromStudentDialog = useCallback(() => {
        setLoadCoursesFromStudentRedirectDialogOpen(true);
    }, []);

    const handleContinueToSTAGLoginForStudentCourses = useCallback(() => {
        setLoadCoursesFromStudentRedirectDialogOpen(false);
        localStorage.setItem(STAG_LOGIN_FLOW_KEY, 'studentCourses');
        const currentAppBaseUrl = `${window.location.origin}${window.location.pathname}`;
        stagApiService.redirectToLogin(currentAppBaseUrl, true, false);
    }, [stagApiService]);

    const handleIdentitySelected = useCallback(async (selectedStagUserIdentifier) => {
        setSelectSTAGIdentityDialogOpen(false);
        setIsProcessingStudentPlan(true);

        stagApiService.setSelectedStagUserRole(selectedStagUserIdentifier);
        setSnackbar({open: true, message: t('alerts.identitySelectedLog', {stagUser: selectedStagUserIdentifier}), severity: 'info'})

        try {
            const roleInfo = stagApiService.getUserInfo().roles.find(r => r.userName === selectedStagUserIdentifier || r.stagUser === selectedStagUserIdentifier);
            const osCisloForLookup = roleInfo?.osCislo || selectedStagUserIdentifier;
            const academicYearForStudentInfoFull = workspaceService.year || new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString();
            const stagApiYearForStudentInfo = getStagApiYear(academicYearForStudentInfoFull);

            const studentDetailInfo = await stagApiService.getStudentInfo(osCisloForLookup, stagApiYearForStudentInfo, false, 'en');
            console.log("EditorPage: Student Detail Info from STAG:", studentDetailInfo);

            if (studentDetailInfo && studentDetailInfo.osCislo) {
                // Zpracování informací o studiu přímo z studentDetailInfo, pokud studiumInfo chybí nebo je prázdné
                // Předpokládáme, že chceme první oborIdno, pokud je jich více v oborIdnos
                const primaryOborIdno = studentDetailInfo.oborIdnos ? studentDetailInfo.oborIdnos.split(',')[0].trim() : null;
                const primaryStprIdno = studentDetailInfo.stprIdno;

                // Zkusíme najít detailnější informace v poli studiumInfo, pokud existuje
                let studyDetailsToUse = null;
                if (Array.isArray(studentDetailInfo.studiumInfo) && studentDetailInfo.studiumInfo.length > 0) {
                    const activeStudy = studentDetailInfo.studiumInfo.find(s => s.stavStudia === 'S' || s.stavStudiaKey === 'S');
                    studyDetailsToUse = activeStudy || studentDetailInfo.studiumInfo[0];
                }

                const oborIdnoToUse = studyDetailsToUse?.oborIdno || primaryOborIdno;
                const stplIdnoToUse = studyDetailsToUse?.stplIdno; // stplIdno nemusí být vždy přímo v hlavním studentDetailInfo

                if (oborIdnoToUse) { // Primárně se budeme řídit oborIdno pro getPredmetyByObor
                    setCurrentStudentContext({
                        osCislo: studentDetailInfo.osCislo,
                        jmeno: studentDetailInfo.jmeno,
                        prijmeni: studentDetailInfo.prijmeni,
                        fakulta: studyDetailsToUse?.fakultaOrgJednotka || studentDetailInfo.fakultaSp || roleInfo?.fakulta,
                        stplIdno: stplIdnoToUse, // Může být null, pokud se spoléháme jen na oborIdno
                        oborIdno: oborIdnoToUse,
                        // Pro názvy použijeme data z studyDetailsToUse, pokud jsou, jinak z hlavního objektu
                        studProgramNazev: studyDetailsToUse?.studProgramPopisEn || studyDetailsToUse?.studProgramPopis || studentDetailInfo.nazevSpEn || studentDetailInfo.nazevSp,
                        oborNazev: studyDetailsToUse?.oborPopisEn || studyDetailsToUse?.oborPopis || studentDetailInfo.oborNazevSp, // STAG může mít i oborNazevSp
                        currentAcademicYearFull: academicYearForStudentInfoFull
                    });
                    setSelectStudyParametersDialogOpen(true);
                } else {
                    throw new Error(t('alerts.fetchStudentInfoErrorNoStudyDetails', 'Nepodařilo se získat ID oboru studenta ze STAGu.'));
                }
            } else {
                throw new Error(t('alerts.fetchStudentInfoErrorNoData', 'Nepodařilo se získat kompletní informace o studentovi ze STAGu.'));
            }
        } catch (error) {
            console.error("EditorPage: Error fetching student details after identity selection:", error);
            setSnackbar({open: true, message: error.message || t('alerts.fetchStudentInfoError', 'Nepodařilo se načíst detaily studenta.'), severity: 'error'});
            setIsProcessingStudentPlan(false);
        }
        // isProcessingStudentPlan se ukončí až v dalším kroku nebo při chybě/zrušení
    }, [stagApiService, t, workspaceService.year, i18n.language]);

    const handleStudyParametersSubmitted = useCallback(async (params) => {
        setSelectStudyParametersDialogOpen(false);
        setIsProcessingStudentPlan(true);
        setSnackbar({ open: true, message: t('alerts.loadingStudyPlanSubjects', 'Načítám předměty studijního plánu...'), severity: 'info' });
        const lang = 'en';
        const stagApiYearForApiCalls = getStagApiYear(params.scheduleAcademicYear);

        if (!currentStudentContext || !currentStudentContext.oborIdno) {
            setSnackbar({ open: true, message: t('alerts.noStudentContextForPlan', 'Chybí kontext studenta (ID oboru) pro načtení předmětů.'), severity: 'error'});
            setIsProcessingStudentPlan(false);
            return;
        }

        try {
            const allSubjectsOfFieldRaw = await stagApiService.getPredmetyByObor(
                currentStudentContext.oborIdno,
                stagApiYearForApiCalls,
                '%',
                lang
            );
            console.log(`EditorPage: Raw subjects for oborIdno: ${currentStudentContext.oborIdno}, versionYear: ${stagApiYearForApiCalls}, lang: ${lang}`, allSubjectsOfFieldRaw);

            if (!Array.isArray(allSubjectsOfFieldRaw) || allSubjectsOfFieldRaw.length === 0) {
                setSnackbar({ open: true, message: t('alerts.noSubjectsFoundForField', 'Pro daný obor a verzi plánu nebyly nalezeny žádné předměty.'), severity: 'info'});
                setIsProcessingStudentPlan(false);
                return;
            }

            // *** KROK ODSTRANĚNÍ DUPLICIT PŘEDMĚTŮ Z getPredmetyByObor ***
            // Duplicity odstraníme na základě kombinace katedra/zkratka (předpokládáme, že pro daný rok verze je to unikátní)
            // Pokud by i predmetId bylo konzistentně vraceno z getPredmetyByObor, bylo by lepší použít to.
            const uniqueSubjectsMap = new Map();
            allSubjectsOfFieldRaw.forEach(subj => {
                const key = `${subj.katedra}/${subj.zkratka}`; // Klíč pro unikátnost
                if (!uniqueSubjectsMap.has(key)) {
                    uniqueSubjectsMap.set(key, subj);
                } else {
                    // Můžeme zde případně logovat, že byla nalezena duplicita, nebo upřednostnit nějakou verzi
                    console.warn(`Nalezena duplicita předmětu v getPredmetyByObor: ${key}. Používám první výskyt.`);
                }
            });
            const uniqueSubjectsFromField = Array.from(uniqueSubjectsMap.values());
            console.log("EditorPage: Unique subjects after de-duplication:", uniqueSubjectsFromField);

            const filteredSubjects = uniqueSubjectsFromField.filter(subj => {
                const subjectRecommendedStudyYear = parseInt(subj.doporucenyRocnik || subj.dopRoc);
                const matchesStudyYearNum = !isNaN(subjectRecommendedStudyYear) && subjectRecommendedStudyYear === params.studyYearNum;

                let subjectSemesterNormalized = subj.semestr?.toUpperCase() || subj.semestrDoporUc?.toUpperCase();
                if (!subjectSemesterNormalized) {
                    if (subj.vyukaZS === 'A' && subj.vyukaLS === 'A') subjectSemesterNormalized = '%';
                    else if (subj.vyukaZS === 'A') subjectSemesterNormalized = 'ZS';
                    else if (subj.vyukaLS === 'A') subjectSemesterNormalized = 'LS';
                }
                const matchesSemester = params.semester === '%' || (subjectSemesterNormalized === params.semester.toUpperCase()) || (subjectSemesterNormalized === '%');

                const matchesStatus = params.statuses.includes(subj.statut?.toUpperCase());

                return matchesStudyYearNum && matchesSemester && matchesStatus;
            });

            console.log("EditorPage: Filtered subjects to load schedule events for:", filteredSubjects);

            if (filteredSubjects.length === 0) {
                setSnackbar({ open: true, message: t('alerts.noSubjectsMatchCriteria', 'Nebyly nalezeny žádné předměty odpovídající zadaným kritériím ročníku, semestru a statutu.'), severity: 'info'});
                setIsProcessingStudentPlan(false);
                return;
            }

            let coursesAddedCount = 0;
            let coursesOverwrittenCount = 0;
            let coursesFailedProcessing = [];

            setSnackbar({open:true, message: t('alerts.fetchingSubjectDetailsCount', {count: filteredSubjects.length}), severity: 'info'});

            const coursesDataPromises = filteredSubjects.map(async (subjectFromObor) => {
                try {
                    let semesterForEventsApi = params.semester;
                    if (params.semester === '%') {
                        const subjSem = subjectFromObor.semestrDoporUc?.toUpperCase() || (subjectFromObor.vyukaZS === 'A' ? 'ZS' : (subjectFromObor.vyukaLS === 'A' ? 'LS' : null));
                        semesterForEventsApi = subjSem || '%'; // Použijeme doporučený, nebo necháme '%'
                    }

                    const scheduleEventsData = await stagApiService.getRozvrhByPredmet({
                        katedra: subjectFromObor.katedra,
                        zkratka: subjectFromObor.zkratka,
                        rok: stagApiYearForApiCalls,
                        semestr: semesterForEventsApi
                    }, lang);

                    const dayMapping = { "PO": 0, "ÚT": 1, "ST": 2, "ČT": 3, "PÁ": 4, "SO": 5, "NE": 6, "MON":0, "TUE":1, "WED":2, "THU":3, "FRI":4, "SAT":5, "SUN":6 };
                    const recurrenceMapping = { "KT": "KAŽDÝ TÝDEN", "SUDY": "SUDÝ TÝDEN", "LI": "LICHÝ TÝDEN", "KAŽDÝ":"KAŽDÝ TÝDEN", "LICHÝ":"LICHÝ TÝDEN", "SUDÝ":"SUDÝ TÝDEN", "EVERY":"KAŽDÝ TÝDEN", "ODD":"LICHÝ TÝDEN", "EVEN":"SUDÝ TÝDEN" };
                    const typeMapping = { "P": "PŘEDNÁŠKA", "C": "CVIČENÍ", "S": "SEMINÁŘ", "Z": "ZKOUŠKA", "A": "ZÁPOČET", "BL": "BLOK", "PŘ":"PŘEDNÁŠKA", "CV":"CVIČENÍ", "SE":"SEMINÁŘ", "LECTURE":"PŘEDNÁŠKA", "PRACTICAL":"CVIČENÍ", "SEMINAR":"SEMINÁŘ"};

                    const transformedEvents = (Array.isArray(scheduleEventsData) ? scheduleEventsData : []).map(stagEvent => {
                        let instructorName = '';
                        if (stagEvent.ucitel) {
                            const ucitele = Array.isArray(stagEvent.ucitel) ? stagEvent.ucitel : [stagEvent.ucitel];
                            instructorName = ucitele.map(u => `${u.titulPred ? u.titulPred + ' ' : ''}${u.jmeno} ${u.prijmeni}${u.titulZa ? ', ' + u.titulZa : ''}`).join(', ');
                        }
                        const dayKey = stagEvent.denZkr?.toUpperCase() || stagEvent.den?.toUpperCase();

                        // *** ÚPRAVA PRO FORMÁT MÍSTNOSTI ***
                        let formattedRoom = t('common.notSpecified', 'Virtuální akce');
                        if (stagEvent.budova && stagEvent.mistnost) { // Předpoklad: mistnost je jen číslo/kód bez budovy
                            formattedRoom = `${stagEvent.budova.toUpperCase()}${stagEvent.mistnost.replace(/\s|-/g, '')}`;
                        } else if (stagEvent.mistnost) { // Pokud mistnost již obsahuje budovu (např. EP130)
                            formattedRoom = stagEvent.mistnost.replace(/\s|-/g, '');
                        } else if (stagEvent.mistnostZkr) {
                            formattedRoom = stagEvent.mistnostZkr.replace(/\s|-/g, '');
                        }


                        let eventSemester = stagEvent.semestr?.toUpperCase();
                        if (params.semester === '%') {
                            eventSemester = stagEvent.semestr?.toUpperCase() || subjectFromObor.semestrDoporUc?.toUpperCase() || (subjectFromObor.vyukaZS === 'A' ? 'ZS' : 'LS');
                        } else {
                            eventSemester = params.semester.toUpperCase();
                        }

                        return {
                            id: stagEvent.roakIdno || stagEvent.akceIdno,
                            startTime: stagEvent.hodinaSkutOd?.value || stagEvent.casOd,
                            endTime: stagEvent.hodinaSkutDo?.value || stagEvent.casDo,
                            day: dayMapping[dayKey] ?? (parseInt(stagEvent.den) ? (parseInt(stagEvent.den) -1) : 0),
                            recurrence: recurrenceMapping[stagEvent.tydenZkr?.toUpperCase()] || recurrenceMapping[stagEvent.tyden?.toUpperCase()] || stagEvent.tyden || "KAŽDÝ TÝDEN",
                            room: formattedRoom, // Použijeme formátovanou místnost
                            type: typeMapping[stagEvent.typAkceZkr?.toUpperCase()] || typeMapping[stagEvent.typAkce?.toUpperCase()] || stagEvent.typAkce || "NEZNÁMÝ",
                            instructor: instructorName, currentCapacity: parseInt(stagEvent.obsazeni) || parseInt(stagEvent.pocetZapsanychStudentu) || 0,
                            maxCapacity: parseInt(stagEvent.kapacita) || parseInt(stagEvent.maxKapacita) || parseInt(stagEvent.kapacitaMistnosti) || 0,
                            note: stagEvent.poznamka,
                            year: params.scheduleAcademicYear,
                            semester: eventSemester,
                            departmentCode: subjectFromObor.katedra, courseCode: subjectFromObor.zkratka,
                        };
                    }).filter(event => event !== null);

                    const rozsahParts = subjectFromObor.rozsah?.split('+').map(s => parseInt(s.trim()) || 0) ||
                        [parseInt(subjectFromObor.jednotekPrednasek) || 0, parseInt(subjectFromObor.cviceniRozsah) || 0, parseInt(subjectFromObor.seminareRozsah) || 0];
                    const needed = {
                        lecture: parseInt(subjectFromObor.jednotekPrednasek) || (rozsahParts[0] > 0 ? 1 : 0),
                        practical: parseInt(subjectFromObor.jednotekCviceni) || (rozsahParts[1] > 0 ? 1 : 0),
                        seminar: parseInt(subjectFromObor.jednotekSeminare) || (rozsahParts[2] > 0 ? 1 : 0),
                    };

                    return {
                        id: subjectFromObor.predmetId || `LOCAL_OBOR_${subjectFromObor.katedra}_${subjectFromObor.zkratka}_${params.scheduleAcademicYear.replace('/','')}`,
                        stagId: subjectFromObor.predmetId,
                        name: subjectFromObor.nazev,
                        departmentCode: subjectFromObor.katedra,
                        courseCode: subjectFromObor.zkratka,
                        credits: parseInt(subjectFromObor.kreditu) || 0,
                        neededEnrollments: needed,
                        semester: params.semester === '%' ? (subjectFromObor.semestrDoporUc?.toUpperCase() || (subjectFromObor.vyukaZS === 'A' ? 'ZS' : 'LS')) : params.semester.toUpperCase(),
                        year: params.scheduleAcademicYear,
                        events: transformedEvents,
                    };
                } catch (error) {
                    console.error(`Chyba při načítání událostí pro předmět ${subjectFromObor.katedra}/${subjectFromObor.zkratka}:`, error);
                    return { error: true, name: `${subjectFromObor.katedra}/${subjectFromObor.zkratka}`, reason: error.message };
                }
            });

            const coursesDataResults = await Promise.all(coursesDataPromises);

            coursesDataResults.forEach(courseData => {
                if (courseData && !courseData.error) {
                    const existingCourse = workspaceService.courses.find(c =>
                        c.departmentCode === courseData.departmentCode &&
                        c.courseCode === courseData.courseCode &&
                        c.year === courseData.year &&
                        c.semester === courseData.semester
                    );
                    if (existingCourse) {
                        workspaceService.removeCourse(existingCourse.id);
                        workspaceService.addCourse(courseData);
                        coursesOverwrittenCount++;
                    } else {
                        workspaceService.addCourse(courseData);
                        coursesAddedCount++;
                    }
                } else if (courseData && courseData.error) {
                    coursesFailedProcessing.push(courseData);
                }
            });

            handleUpdateWorkspace();
            setSnackbar({ open: true, message: t('alerts.studyPlanLoadSummary', { added: coursesAddedCount, overwritten: coursesOverwrittenCount, failed: coursesFailedProcessing.length }), severity: coursesFailedProcessing.length > 0 ? 'warning' : 'success'});
            if (coursesFailedProcessing.length > 0) {
                console.warn("Následující předměty se nepodařilo plně načíst:", coursesFailedProcessing);
            }

        } catch (error) {
            console.error("Chyba při zpracování předmětů studijního plánu:", error);
            setSnackbar({ open: true, message: error.message || t('alerts.studyPlanLoadError', 'Chyba při načítání předmětů studijního plánu.'), severity: 'error'});
        } finally {
            setIsProcessingStudentPlan(false);
            stagApiService.setStagUserTicket(null);
            stagApiService.setUserInfoFromBase64(null);
            setCurrentStudentContext(null);
        }
    }, [workspaceService, stagApiService, currentStudentContext, handleUpdateWorkspace, t, i18n.language]);




    const handleDrawerToggle = () => setMobileDrawerOpen(!mobileDrawerOpen);
    const handleTabChange = (event, newValue) => setActiveMobileTab(newValue);
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const currentGlobalProcessing = isLoading || isProcessingCourse || isProcessingStudentPlan;
    const currentGlobalProcessingMessage = () => {
        if (isProcessingStudentPlan) return t("common.processingStudentPlan", "Zpracovávám data studenta...");
        if (isProcessingCourse) return t("common.processingCourse", "Zpracovávám předmět...");
        if (isLoading) return t("common.loadingApp", "Načítání aplikace...");
        return "";
    };

    const drawerContent = (
        <Box sx={{ width: { xs: '85vw', sm: LEFT_SIDEBAR_WIDTH_DESKTOP }, height: '100%', display: 'flex', flexDirection: 'column' }} role="presentation">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ ml: 1 }}>
                    {activeMobileTab === 0 ? t('editorPage.mobileDrawer.coursesTitle', 'Kurzy') : t('editorPage.mobileDrawer.propertiesTitle', 'Preference')}
                </Typography>
                <IconButton onClick={handleDrawerToggle}><CloseIcon /></IconButton>
            </Box>
            <Tabs value={activeMobileTab} onChange={handleTabChange} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Tab icon={<ListIcon />} label={t('editorPage.mobileDrawer.coursesTab', 'Kurzy')} />
                <Tab icon={<TuneIcon />} label={t('editorPage.mobileDrawer.propertiesTab', 'Preference')} />
            </Tabs>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', position: 'relative' }}>
                {currentGlobalProcessing && activeMobileTab === 0 && (
                    <Box sx={{position: 'absolute', top:0,left:0,right:0,bottom:0, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor: alpha(theme.palette.background.paper, 0.7), zIndex:1}}>
                        <CircularProgress/>
                        <Typography sx={{mt:1}}>{currentGlobalProcessingMessage()}</Typography>
                    </Box>
                )}
                {activeMobileTab === 0 && (
                    <CourseBar
                        courses={courses}
                        activeSchedule={activeSchedule}
                        onRemoveCourse={handleRemoveCourse}
                        onToggleEvent={handleToggleEvent}
                        isLoading={isLoading && !isProcessingCourse && !isProcessingStudentPlan}
                        onOpenLoadCourseFromSTAGDialog={handleOpenLoadCourseFromSTAGDialog}
                        onOpenLoadCoursesFromStudentDialog={handleOpenLoadCoursesFromStudentDialog}
                    />
                )}
                {activeMobileTab === 1 && <PropertiesBar workspace={workspaceService} />}
            </Box>
        </Box>
    );

    return (
        <EditorPageRoot>
            {isMobile ? (
                <>
                    <MainContentWrapper sx={{ borderRadius: 0, boxShadow: 'none', height: '100%', position: 'relative' }}>
                        {currentGlobalProcessing && (
                            <Box sx={{position: 'absolute', top:0,left:0,right:0,bottom:0, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor: alpha(theme.palette.background.paper, 0.7), zIndex: 10}}>
                                <CircularProgress />
                                <Typography sx={{mt:1}}>{currentGlobalProcessingMessage()}</Typography>
                            </Box>
                        )}
                        {!currentGlobalProcessing && activeSchedule instanceof ScheduleClass && <ScheduleBox schedule={activeSchedule} />}
                        {!currentGlobalProcessing && !(activeSchedule instanceof ScheduleClass) &&
                            <Box sx={{p:2, textAlign:'center', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                <Typography color="text.secondary">{t("common.scheduleNotAvailable", "Rozvrh není k dispozici nebo se načítá.")}</Typography>
                            </Box>
                        }
                    </MainContentWrapper>
                    <MobileDrawerToggleButton onClick={handleDrawerToggle} size="large">
                        <MenuIcon />
                    </MobileDrawerToggleButton>
                    <SwipeableDrawer
                        anchor="left"
                        open={mobileDrawerOpen}
                        onClose={() => setMobileDrawerOpen(false)}
                        onOpen={() => setMobileDrawerOpen(true)}
                        PaperProps={{ sx: { height: '100vh', width: { xs: '85vw', sm: LEFT_SIDEBAR_WIDTH_DESKTOP },  borderRight: `1px solid ${theme.palette.divider}` } }}
                        disableBackdropTransition={true}
                    >
                        {drawerContent}
                    </SwipeableDrawer>
                </>
            ) : (
                <EditorLayoutDesktop>
                    <SidebarWrapper customWidth={LEFT_SIDEBAR_WIDTH_DESKTOP}>
                        <CourseBar
                            courses={courses}
                            activeSchedule={activeSchedule}
                            onRemoveCourse={handleRemoveCourse}
                            onToggleEvent={handleToggleEvent}
                            isLoading={isLoading && !isProcessingCourse && !isProcessingStudentPlan}
                            onOpenLoadCourseFromSTAGDialog={handleOpenLoadCourseFromSTAGDialog}
                            onOpenLoadCoursesFromStudentDialog={handleOpenLoadCoursesFromStudentDialog}
                        />
                    </SidebarWrapper>
                    <MainContentWrapper sx={{position: 'relative'}}>
                        {currentGlobalProcessing && (
                            <Box sx={{position: 'absolute', top:0,left:0,right:0,bottom:0, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor: alpha(theme.palette.background.paper, 0.7), zIndex: 10}}>
                                <CircularProgress />
                                <Typography sx={{mt:1}}>{currentGlobalProcessingMessage()}</Typography>
                            </Box>
                        )}
                        {!currentGlobalProcessing && activeSchedule instanceof ScheduleClass && <ScheduleBox schedule={activeSchedule} />}
                        {!currentGlobalProcessing && !(activeSchedule instanceof ScheduleClass) &&
                            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                                <Typography color="text.secondary">{t("common.scheduleNotAvailable", "Rozvrh není k dispozici nebo se načítá.")}</Typography>
                            </Box>
                        }
                    </MainContentWrapper>
                    <SidebarWrapper customWidth={RIGHT_SIDEBAR_WIDTH_DESKTOP}>
                        <PropertiesBar workspace={workspaceService} />
                    </SidebarWrapper>
                </EditorLayoutDesktop>
            )}

            <LoadCourseFromSTAGDialog
                open={loadCourseFromSTAGDialogOpen}
                onClose={() => setLoadCourseFromSTAGDialogOpen(false)}
                onSubmit={handleSubmitLoadCourseFromSTAG}
            />
            <CourseLoadingProcessDialog
                open={(isProcessingCourse || isProcessingStudentPlan) && !existingCourseWarningDialogOpen && !selectSTAGIdentityDialogOpen && !loadCoursesFromStudentRedirectDialogOpen && !selectStudyParametersDialogOpen}
                message={currentGlobalProcessingMessage()}
            />
            <ExistingCourseWarningDialog
                open={existingCourseWarningDialogOpen}
                courseIdentifier={courseToOverwriteData ? `${courseToOverwriteData.departmentCode}/${courseToOverwriteData.courseCode}` : ''}
                onConfirm={handleConfirmOverwriteCourse}
                onCancel={() => {
                    setExistingCourseWarningDialogOpen(false);
                    setCourseToOverwriteData(null);
                    setIsProcessingCourse(false);
                    setIsProcessingStudentPlan(false);
                }}
            />
            <LoadCoursesFromStudentRedirectDialog
                open={loadCoursesFromStudentRedirectDialogOpen}
                onClose={() => setLoadCoursesFromStudentRedirectDialogOpen(false)}
                onContinueToSTAGLogin={handleContinueToSTAGLoginForStudentCourses}
            />
            <SelectSTAGIdentityDialog
                open={selectSTAGIdentityDialogOpen}
                onClose={(userCancelled) => {
                    setSelectSTAGIdentityDialogOpen(false);
                    if (userCancelled) {
                        setIsProcessingStudentPlan(false);
                        stagApiService.setStagUserTicket(null);
                        stagApiService.setUserInfoFromBase64(null);
                        setCurrentStudentContext(null);
                        setSnackbar({open: true, message: t('alerts.identitySelectionCancelledAndTicketCleared', 'Výběr identity byl zrušen, STAG session byla ukončena.'), severity: 'info'});
                    }
                }}
                onSelectIdentity={handleIdentitySelected}
                stagApiService={stagApiService}
            />
            <SelectStudyParametersDialog
                open={selectStudyParametersDialogOpen}
                onClose={(userCancelled) => {
                    setSelectStudyParametersDialogOpen(false);
                    if (userCancelled) {
                        setIsProcessingStudentPlan(false);
                        stagApiService.setStagUserTicket(null);
                        stagApiService.setUserInfoFromBase64(null);
                        setCurrentStudentContext(null);
                        setSnackbar({open: true, message: t('alerts.studyParamsSelectionCancelled', 'Výběr parametrů studia byl zrušen.'), severity: 'info'});
                    }
                }}
                onSubmitParameters={handleStudyParametersSubmitted}
                studentContext={currentStudentContext}
                defaultAcademicYear={currentStudentContext?.currentAcademicYearFull || workspaceService.year || new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString()}
            />

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </EditorPageRoot>
    );
}

export default EditorPage;