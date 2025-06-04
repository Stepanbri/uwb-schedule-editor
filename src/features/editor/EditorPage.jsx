// src/features/editor/EditorPage.jsx
import React, { useState, useEffect } from 'react';
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
    alpha
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import ListIcon from '@mui/icons-material/List';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import { useTranslation } from 'react-i18next';

// Konzumace contextů a hooků
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useStagApi } from '../../contexts/StagApiContext';
// import { useSnackbar } from '../../contexts/SnackbarContext'; // Není explicitně volán zde, ale v hookách

import { useCourseManagement } from './hooks/useCourseManagement';
// usePreferenceManagement bude použit v PropertiesBar, ne přímo zde
import { useStagCourseLoader } from './hooks/useStagCourseLoader';
import { useStagStudentPlanLoader } from './hooks/useStagStudentPlanLoader';

// Komponenty
import CourseBar from './CourseBar';
import ScheduleBox from './ScheduleBox/ScheduleBox.jsx';
import PropertiesBar from './PropertyBar/PropertiesBar'; // Zatím ponecháváme původní, refaktorujeme později
import ScheduleClass from '../../services/ScheduleClass'; // Pro instanceof check

// Dialogy
import LoadCourseFromSTAGDialog from './Dialogs/LoadCourseFromSTAGDialog';
import CourseLoadingProcessDialog from './Dialogs/CourseLoadingProcessDialog';
import ExistingCourseWarningDialog from './Dialogs/ExistingCourseWarningDialog';
import LoadCoursesFromStudentRedirectDialog from './Dialogs/LoadCoursesFromStudentRedirectDialog';
import SelectSTAGIdentityDialog from './Dialogs/SelectSTAGIdentityDialog';
import SelectStudyParametersDialog from './Dialogs/SelectStudyParametersDialog';

const LEFT_SIDEBAR_WIDTH_DESKTOP = '320px';
const RIGHT_SIDEBAR_WIDTH_DESKTOP = '320px';

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
    zIndex: theme.zIndex.drawer + 200, // Nad ostatními drawery
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxShadow: theme.shadows[6],
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
    },
}));

function EditorPage() {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

    // --- Stavy specifické pro EditorPage (UI, mobilní layout) ---
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [activeMobileTab, setActiveMobileTab] = useState(0);

    // --- Konzumace globálních stavů a logiky z contextů a hooků ---
    const { isLoadingWorkspace, workspaceYear } = useWorkspace(); // Pouze pro defaultní hodnoty nebo zobrazení

    const {
        stagUserTicket, // Pro detekci úspěšného přihlášení
        isProcessingLoginCallback, // Zda StagApiContext ještě zpracovává callback
        userInfo, // Pro kontrolu rolí po callbacku
    } = useStagApi();

    const {
        courses,
        activeSchedule,
        removeCourse, // z useCourseManagement
        toggleEventInSchedule, // z useCourseManagement
    } = useCourseManagement();

    const stagCourseLoader = useStagCourseLoader();
    const stagStudentPlanLoader = useStagStudentPlanLoader();

    // Efekt pro detekci dokončení STAG login callbacku a spuštění dalšího kroku
    useEffect(() => {
        // Pokud StagApiContext dokončil zpracování callbacku A máme ticket A zatím neběží zpracování studentského plánu
        if (!isProcessingLoginCallback && stagUserTicket && stagUserTicket !== 'anonymous' && !stagStudentPlanLoader.isProcessingStudentPlan) {
            // Zkontrolujeme, jestli už byl dialog identit otevřen tímto hookem (nebo jiným způsobem)
            // Toto je důležité, aby se dialog neotevíral opakovaně při každém re-renderu, pokud je ticket stále přítomen.
            // `processLoginSuccessAndOpenIdentityDialog` by měl interně spravovat, zda se má skutečně otevřít.
            if (userInfo && userInfo.roles && userInfo.roles.length > 0 && !stagStudentPlanLoader.isIdentityDialogOpen && !stagStudentPlanLoader.isStudyParamsDialogOpen) {
                stagStudentPlanLoader.processLoginSuccessAndOpenIdentityDialog();
            } else if (userInfo && (!userInfo.roles || userInfo.roles.length === 0)) {
                // Pokud login proběhl, ale nejsou role, StagApiContext by měl zalogovat chybu.
                // Zde můžeme případně resetovat isProcessingStudentPlan, pokud by se zasekl.
                // stagStudentPlanLoader.resetProcessingState(); // Hypotetická funkce v hooku
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isProcessingLoginCallback,
        stagUserTicket,
        userInfo, // Přidáno jako závislost
        stagStudentPlanLoader.processLoginSuccessAndOpenIdentityDialog, // Přidáno
        stagStudentPlanLoader.isProcessingStudentPlan, // Přidáno
        stagStudentPlanLoader.isIdentityDialogOpen, // Přidáno
        stagStudentPlanLoader.isStudyParamsDialogOpen // Přidáno
    ]);


    const handleDrawerToggle = () => setMobileDrawerOpen(!mobileDrawerOpen);
    const handleTabChange = (event, newValue) => setActiveMobileTab(newValue);

    // --- Kombinovaný stav načítání pro zobrazení overlaye ---
    const isGloballyLoading = isLoadingWorkspace || stagCourseLoader.isProcessingCourse || stagStudentPlanLoader.isProcessingStudentPlan;

    const globalLoadingMessage = () => {
        if (stagStudentPlanLoader.isProcessingStudentPlan) return t("common.processingStudentPlan", "Zpracovávám data studenta...");
        if (stagCourseLoader.isProcessingCourse) return t("common.processingCourse", "Zpracovávám předmět...");
        if (isLoadingWorkspace) return t("common.loadingApp", "Načítání pracovní plochy...");
        return t("common.processing", "Zpracovávám..."); // Obecná zpráva
    };

    // --- Příprava props pro CourseBar ---
    // Potřebujeme předat funkci, která zjistí `courseContext` pro `toggleEventInSchedule`
    const handleToggleEventForCourseBar = (eventToToggle, isCurrentlyEnrolled) => {
        const courseContext = courses.find(c => c.id === eventToToggle.courseId || c.stagId === eventToToggle.courseId);
        toggleEventInSchedule(eventToToggle, isCurrentlyEnrolled, courseContext);
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
                {/* Zde zobrazíme loading overlay jen pro CourseBar, pokud je to žádoucí */}
                {activeMobileTab === 0 && (
                    <CourseBar
                        courses={courses}
                        activeSchedule={activeSchedule}
                        onRemoveCourse={removeCourse} // Přímo z useCourseManagement
                        onToggleEvent={handleToggleEventForCourseBar} // Upravený handler
                        isLoading={isLoadingWorkspace && !stagCourseLoader.isProcessingCourse && !stagStudentPlanLoader.isProcessingStudentPlan} // Jen počáteční načítání workspace
                        onOpenLoadCourseFromSTAGDialog={stagCourseLoader.openLoadCourseDialog}
                        onOpenLoadCoursesFromStudentDialog={stagStudentPlanLoader.openLoadCoursesFromStudentDialog}
                    />
                )}
                {activeMobileTab === 1 && <PropertiesBar /* workspace={workspaceService} - bude refaktorováno */ />}
            </Box>
        </Box>
    );

    return (
        <EditorPageRoot>
            {isMobile ? (
                <>
                    <MainContentWrapper sx={{ borderRadius: 0, boxShadow: 'none', height: '100%', position: 'relative' }}>
                        {isGloballyLoading && (
                            <Box sx={{position: 'absolute', top:0,left:0,right:0,bottom:0, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor: alpha(theme.palette.background.paper, 0.85), zIndex: 10}}>
                                <CircularProgress />
                                <Typography sx={{mt:1}}>{globalLoadingMessage()}</Typography>
                            </Box>
                        )}
                        {!isGloballyLoading && activeSchedule instanceof ScheduleClass && <ScheduleBox schedule={activeSchedule} />}
                        {!isGloballyLoading && !(activeSchedule instanceof ScheduleClass) &&
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
                        disableBackdropTransition={true} // Pro plynulejší animaci na mobilu
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
                            onRemoveCourse={removeCourse}
                            onToggleEvent={handleToggleEventForCourseBar}
                            isLoading={isLoadingWorkspace && !stagCourseLoader.isProcessingCourse && !stagStudentPlanLoader.isProcessingStudentPlan}
                            onOpenLoadCourseFromSTAGDialog={stagCourseLoader.openLoadCourseDialog}
                            onOpenLoadCoursesFromStudentDialog={stagStudentPlanLoader.openLoadCoursesFromStudentDialog}
                        />
                    </SidebarWrapper>
                    <MainContentWrapper sx={{position: 'relative'}}>
                        {isGloballyLoading && (
                            <Box sx={{position: 'absolute', top:0,left:0,right:0,bottom:0, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', backgroundColor: alpha(theme.palette.background.paper, 0.85), zIndex: 10}}>
                                <CircularProgress />
                                <Typography sx={{mt:1}}>{globalLoadingMessage()}</Typography>
                            </Box>
                        )}
                        {!isGloballyLoading && activeSchedule instanceof ScheduleClass && <ScheduleBox schedule={activeSchedule} />}
                        {!isGloballyLoading && !(activeSchedule instanceof ScheduleClass) &&
                            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                                <Typography color="text.secondary">{t("common.scheduleNotAvailable", "Rozvrh není k dispozici nebo se načítá.")}</Typography>
                            </Box>
                        }
                    </MainContentWrapper>
                    <SidebarWrapper customWidth={RIGHT_SIDEBAR_WIDTH_DESKTOP}>
                        <PropertiesBar /* Ponecháváme prozatím, bude refaktorováno */ />
                    </SidebarWrapper>
                </EditorLayoutDesktop>
            )}

            {/* Dialogy jsou nyní řízeny svými hooky */}
            <LoadCourseFromSTAGDialog
                open={stagCourseLoader.isLoadCourseDialogOpen}
                onClose={stagCourseLoader.closeLoadCourseDialog}
                onSubmit={stagCourseLoader.handleSubmitLoadCourse}
            />
            <ExistingCourseWarningDialog
                open={stagCourseLoader.isOverwriteWarningOpen}
                courseIdentifier={stagCourseLoader.courseToOverwriteData ? `${stagCourseLoader.courseToOverwriteData.departmentCode}/${stagCourseLoader.courseToOverwriteData.subjectCode}` : ''}
                onConfirm={stagCourseLoader.handleConfirmOverwrite}
                onCancel={stagCourseLoader.closeOverwriteWarningDialog}
            />

            <LoadCoursesFromStudentRedirectDialog
                open={stagStudentPlanLoader.isRedirectDialogOpen}
                onClose={stagStudentPlanLoader.closeRedirectDialog}
                onContinueToSTAGLogin={stagStudentPlanLoader.handleContinueToSTAGLogin}
            />
            <SelectSTAGIdentityDialog
                open={stagStudentPlanLoader.isIdentityDialogOpen}
                onClose={() => stagStudentPlanLoader.closeIdentityDialog(true)} // true pro userCancelled
                onSelectIdentity={stagStudentPlanLoader.handleIdentitySelected}
                stagApiService={useStagApi().stagApiService} // Předáme instanci služby
            />
            <SelectStudyParametersDialog
                open={stagStudentPlanLoader.isStudyParamsDialogOpen}
                onClose={() => stagStudentPlanLoader.closeStudyParamsDialog(true)} // true pro userCancelled
                onSubmitParameters={stagStudentPlanLoader.handleStudyParametersSubmitted}
                studentContext={stagStudentPlanLoader.currentStudentContextForDialog}
                defaultAcademicYear={stagStudentPlanLoader.currentStudentContextForDialog?.currentAcademicYearFull || workspaceYear || new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString()}
            />

            {/* CourseLoadingProcessDialog se zobrazí, pokud některý z procesů běží A NENÍ otevřený žádný "interaktivní" dialog */}
            <CourseLoadingProcessDialog
                open={
                    (stagCourseLoader.isProcessingCourse && !stagCourseLoader.isOverwriteWarningOpen && !stagCourseLoader.isLoadCourseDialogOpen) ||
                    (stagStudentPlanLoader.isProcessingStudentPlan && !stagStudentPlanLoader.isIdentityDialogOpen && !stagStudentPlanLoader.isStudyParamsDialogOpen && !stagStudentPlanLoader.isRedirectDialogOpen)
                }
                message={globalLoadingMessage()}
            />

            {/* Snackbar je nyní globální a spravován přes SnackbarContext, není potřeba jej explicitně renderovat zde */}
        </EditorPageRoot>
    );
}

export default EditorPage;