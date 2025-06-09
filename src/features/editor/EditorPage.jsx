import CloseIcon from '@mui/icons-material/Close';
import ListIcon from '@mui/icons-material/List';
import MenuIcon from '@mui/icons-material/Menu';
import TuneIcon from '@mui/icons-material/Tune';
import {
    Box,
    CircularProgress,
    IconButton,
    SwipeableDrawer,
    Tab,
    Tabs,
    Typography,
    alpha,
    styled,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useStagApi } from '../../contexts/StagApiContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useCourseManagement } from './hooks/useCourseManagement';
import { useStagCourseLoader } from './hooks/useStagCourseLoader';
import { useStagStudentPlanLoader } from './hooks/useStagStudentPlanLoader';

import ScheduleClass from '../../services/ScheduleClass';
import CourseBar from './CourseBar/CourseBar';
import PropertiesBar from './PropertyBar/PropertiesBar';
import ScheduleBox from './ScheduleBox/ScheduleBox.jsx';
import ScheduleToolbar from './ScheduleBox/ScheduleToolbar';

// Dialogy
import ConfirmationDialog from './Dialogs/ConfirmationDialog';
import CourseLoadingProcessDialog from './Dialogs/CourseLoadingProcessDialog';
import CourseLoadSummaryDialog from './Dialogs/CourseLoadSummaryDialog';
import GenericConfirmationDialog from './Dialogs/GenericConfirmationDialog';
import LoadCourseFromSTAGDialog from './Dialogs/LoadCourseFromSTAGDialog';
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
    backgroundColor: theme.palette.background.default,
    // padding: theme.spacing(1.5),
    //gap: theme.spacing(1.5),
}));

const SidebarWrapper = styled(Box, {
    shouldForwardProp: prop => prop !== 'customWidth',
})(({ theme, customWidth }) => ({
    width: customWidth,
    minWidth: customWidth,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    // borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
    borderRight: `1px solid ${theme.palette.divider}`,
    borderLeft: `1px solid ${theme.palette.divider}`,
}));

const MainContentArea = styled(Box)(({ theme }) => ({
    flexGrow: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: theme.spacing(1.5),
    //gap: theme.spacing(1.5)
}));

const ScheduleBoxWrapper = styled(Box)(({ theme }) => ({
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
    position: 'relative',
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
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
    const location = useLocation();

    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [activeMobileTab, setActiveMobileTab] = useState(0);
    const scheduleBoxRef = useRef(null);
    const scheduleToolbarRef = useRef(null);
    const [scheduleBoxWrapperHeight, setScheduleBoxWrapperHeight] = useState('100%');

    const {
        isLoadingWorkspace,
        isWorkspaceInitialized,
        initializeWorkspace,
        workspaceYear,
        workspaceService,
        clearFullWorkspace,
        handleExportWorkspace,
        handleImportWorkspace,
        handleSaveScheduleImage,
        handleRemoveAllCourses: removeAllCoursesFromContext,
        handleRemoveAllPreferences: removeAllPreferencesFromContext,
    } = useWorkspace();

    const { stagUserTicket, isProcessingLoginCallback, userInfo, stagApiService } = useStagApi();
    const { courses, activeSchedule, removeCourse, toggleEventInSchedule } = useCourseManagement();

    const stagCourseLoader = useStagCourseLoader();
    const stagStudentPlanLoader = useStagStudentPlanLoader();

    // Handler pro tlačítko na stažení obrázku rozvrhu
    const triggerDownloadScheduleImage = () => {
        if (scheduleBoxRef.current) {
            handleSaveScheduleImage(scheduleBoxRef.current);
        } else {
            console.error('triggerDownloadScheduleImage: scheduleBoxRef.current není k dispozici.');
            // Zde by se mohla zobrazit notifikace uživateli
        }
    };

    const [resetWorkspaceDialog, setResetWorkspaceDialog] = useState({
        open: false,
        onConfirm: () => {},
    });
    const [removeAllCoursesDialog, setRemoveAllCoursesDialog] = useState({
        open: false,
        onConfirm: () => {},
    });
    const [removeAllPrefsDialog, setRemoveAllPrefsDialog] = useState({
        open: false,
        onConfirm: () => {},
    });

    useEffect(() => {
        if (location.pathname === '/editor' && !isWorkspaceInitialized && !isLoadingWorkspace) {
            initializeWorkspace();
        }
    }, [location.pathname, isWorkspaceInitialized, initializeWorkspace, isLoadingWorkspace]);

    useEffect(() => {
        // 1. STAG login callback byl zpracován.
        // 2. Máme platný ticket.
        // 3. Žádná část procesu načítání plánu studenta již neběží
        if (
            !isProcessingLoginCallback &&
            stagUserTicket &&
            stagUserTicket !== 'anonymous' &&
            !stagStudentPlanLoader.isStudentPlanLoadingActive && // Hlavní kontrola celého flow
            !stagStudentPlanLoader.isLoadingCourseDetails && // Kontrola specifické fáze
            userInfo &&
            userInfo.roles &&
            userInfo.roles.length > 0 &&
            !stagStudentPlanLoader.isIdentityDialogOpen &&
            !stagStudentPlanLoader.isStudyParamsDialogOpen &&
            !stagStudentPlanLoader.overwritePlanDialogState.open
        ) {
            stagStudentPlanLoader.processLoginSuccessAndOpenIdentityDialog();
        }
    }, [
        isProcessingLoginCallback,
        stagUserTicket,
        userInfo,
        stagStudentPlanLoader.processLoginSuccessAndOpenIdentityDialog,
        stagStudentPlanLoader.isStudentPlanLoadingActive, // Hlavní kontrolní flag
        stagStudentPlanLoader.isLoadingCourseDetails,
        stagStudentPlanLoader.isIdentityDialogOpen,
        stagStudentPlanLoader.isStudyParamsDialogOpen,
        stagStudentPlanLoader.overwritePlanDialogState.open,
    ]);

    useEffect(() => {
        if (scheduleToolbarRef.current) {
            const toolbarHeight = scheduleToolbarRef.current.offsetHeight;
            const marginBetween = parseFloat(theme.spacing(1.5).replace('px', ''));
            setScheduleBoxWrapperHeight(`calc(100% - ${toolbarHeight}px - ${marginBetween}px)`);
        } else if (isMobile) {
            setScheduleBoxWrapperHeight('100%');
        }
    }, [isMobile, theme, scheduleToolbarRef.current]);

    const handleDrawerToggle = () => setMobileDrawerOpen(!mobileDrawerOpen);
    const handleTabChange = (event, newValue) => setActiveMobileTab(newValue);

    const isEffectivelyLoading =
        isLoadingWorkspace || // Počáteční načítání workspace z initializeWorkspace
        stagCourseLoader.isProcessingCourse || // Načítání jednoho kurzu
        stagStudentPlanLoader.isStudentPlanLoadingActive || // Celý proces načítání plánu
        stagStudentPlanLoader.isLoadingCourseDetails; // Specificky načítání detailů kurzů z plánu

    const globalLoadingMessage = () => {
        if (stagStudentPlanLoader.isLoadingCourseDetails)
            return t('alerts.fetchingSubjectDetailsCount', {
                count: stagStudentPlanLoader.overwritePlanDialogState.coursesToProcess?.length || 0,
            });
        if (
            stagStudentPlanLoader.isStudentPlanLoadingActive &&
            !stagStudentPlanLoader.isLoadingCourseDetails &&
            !stagStudentPlanLoader.overwritePlanDialogState.open
        )
            return t('common.processingStudentPlan');
        if (
            stagCourseLoader.isProcessingCourse &&
            !stagCourseLoader.overwriteSingleCourseDialog.open
        )
            return t('common.processingCourse');
        if (isLoadingWorkspace && isWorkspaceInitialized) return t('common.loadingApp'); // Pokud se workspace ještě načítá po initializeWorkspace
        if (!isWorkspaceInitialized && location.pathname === '/editor' && !isLoadingWorkspace)
            return t('common.loadingApp');
        return t('common.processing');
    };

    const handleToggleEventForCourseBar = (eventToToggle, isCurrentlyEnrolled) => {
        const courseContext = courses.find(c => c.id === eventToToggle.courseId);
        toggleEventInSchedule(eventToToggle, isCurrentlyEnrolled, courseContext);
    };

    const confirmAndResetWorkspaceClean = () => {
        setResetWorkspaceDialog({
            open: true,
            title: t('scheduleToolbar.resetWorkspaceCleanTitle', 'Vymazat pracovní plochu?'),
            message: t(
                'scheduleToolbar.confirmResetWorkspaceClean',
                'Opravdu si přejete vymazat celou pracovní plochu? Tato akce je nevratná.'
            ),
            onConfirm: () => {
                clearFullWorkspace();
                setResetWorkspaceDialog({ open: false });
            },
            confirmButtonColor: 'error',
        });
    };

    const confirmAndRemoveAllCourses = () => {
        setRemoveAllCoursesDialog({
            open: true,
            title: t('courseBar.removeAllCourses'),
            message: t('alerts.confirmRemoveAllCourses'),
            onConfirm: () => {
                removeAllCoursesFromContext();
                setRemoveAllCoursesDialog({ open: false });
            },
            confirmButtonColor: 'error',
        });
    };

    const confirmAndRemoveAllPreferences = () => {
        setRemoveAllPrefsDialog({
            open: true,
            title: t('propertiesBar.removeAllPreferences'),
            message: t('alerts.confirmRemoveAllPreferences'),
            onConfirm: () => {
                removeAllPreferencesFromContext();
                setRemoveAllPrefsDialog({ open: false });
            },
            confirmButtonColor: 'error',
        });
    };

    const drawerContent = (
        <Box
            sx={{
                width: { xs: '85vw', sm: LEFT_SIDEBAR_WIDTH_DESKTOP },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
            role="presentation"
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Typography variant="h6" sx={{ ml: 1 }}>
                    {activeMobileTab === 0
                        ? t('editorPage.mobileDrawer.coursesTitle')
                        : t('editorPage.mobileDrawer.propertiesTitle')}
                </Typography>
                <IconButton onClick={handleDrawerToggle}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <Tabs
                value={activeMobileTab}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
            >
                <Tab icon={<ListIcon />} label={t('editorPage.mobileDrawer.coursesTab')} />
                <Tab icon={<TuneIcon />} label={t('editorPage.mobileDrawer.propertiesTab')} />
            </Tabs>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', position: 'relative' }}>
                {activeMobileTab === 0 && (
                    <CourseBar
                        courses={courses}
                        activeSchedule={activeSchedule}
                        onRemoveCourse={removeCourse}
                        onToggleEvent={handleToggleEventForCourseBar}
                        isLoading={
                            !isWorkspaceInitialized &&
                            location.pathname === '/editor' &&
                            !isLoadingWorkspace
                        }
                        onOpenLoadCourseFromSTAGDialog={stagCourseLoader.openLoadCourseDialog}
                        onOpenLoadCoursesFromStudentDialog={
                            stagStudentPlanLoader.openLoadCoursesFromStudentDialog
                        }
                        onRemoveAllCourses={confirmAndRemoveAllCourses}
                    />
                )}
                {activeMobileTab === 1 && (
                    <PropertiesBar onRemoveAllPreferences={confirmAndRemoveAllPreferences} />
                )}
            </Box>
        </Box>
    );

    if (location.pathname === '/editor' && !isWorkspaceInitialized && !isLoadingWorkspace) {
        return (
            <EditorPageRoot>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                    }}
                >
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>{t('common.loadingApp')}</Typography>
                </Box>
            </EditorPageRoot>
        );
    }

    return (
        <EditorPageRoot>
            {isMobile ? (
                <Box
                    sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
                >
                    <Box ref={scheduleToolbarRef} sx={{ px: 1, pt: 1, flexShrink: 0 }}>
                        <ScheduleToolbar
                            onDownloadScheduleImage={triggerDownloadScheduleImage}
                            onExportWorkspace={handleExportWorkspace}
                            onImportWorkspace={handleImportWorkspace}
                            onResetWorkspace={confirmAndResetWorkspaceClean}
                        />
                    </Box>
                    <ScheduleBoxWrapper
                        ref={scheduleBoxRef}
                        sx={{ height: scheduleBoxWrapperHeight, m: 1, mt: 0, flexGrow: 1 }}
                    >
                        {isEffectivelyLoading && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: alpha(theme.palette.background.paper, 0.85),
                                    zIndex: 10,
                                }}
                            >
                                <CircularProgress />
                                <Typography sx={{ mt: 1 }}>{globalLoadingMessage()}</Typography>
                            </Box>
                        )}
                        {!isEffectivelyLoading &&
                            activeSchedule instanceof ScheduleClass &&
                            isWorkspaceInitialized && <ScheduleBox schedule={activeSchedule} />}
                        {!isEffectivelyLoading &&
                            !(activeSchedule instanceof ScheduleClass) &&
                            isWorkspaceInitialized && (
                                <Box
                                    sx={{
                                        p: 2,
                                        textAlign: 'center',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Typography color="text.secondary">
                                        {t('common.scheduleNotAvailable')}
                                    </Typography>
                                </Box>
                            )}
                    </ScheduleBoxWrapper>
                    <MobileDrawerToggleButton onClick={handleDrawerToggle} size="large">
                        <MenuIcon />
                    </MobileDrawerToggleButton>
                    <SwipeableDrawer
                        anchor="left"
                        open={mobileDrawerOpen}
                        onClose={() => setMobileDrawerOpen(false)}
                        onOpen={() => setMobileDrawerOpen(true)}
                        PaperProps={{
                            sx: {
                                overflow: 'hidden',
                                height: '100vh',
                                width: { xs: '85vw', sm: LEFT_SIDEBAR_WIDTH_DESKTOP },
                                borderRight: `1px solid ${theme.palette.divider}`,
                            },
                        }}
                        disableBackdropTransition={true}
                    >
                        {drawerContent}
                    </SwipeableDrawer>
                </Box>
            ) : (
                <EditorLayoutDesktop>
                    <SidebarWrapper customWidth={LEFT_SIDEBAR_WIDTH_DESKTOP}>
                        <CourseBar
                            courses={courses}
                            activeSchedule={activeSchedule}
                            onRemoveCourse={removeCourse}
                            onToggleEvent={handleToggleEventForCourseBar}
                            isLoading={
                                !isWorkspaceInitialized &&
                                location.pathname === '/editor' &&
                                !isLoadingWorkspace
                            }
                            onOpenLoadCourseFromSTAGDialog={stagCourseLoader.openLoadCourseDialog}
                            onOpenLoadCoursesFromStudentDialog={
                                stagStudentPlanLoader.openLoadCoursesFromStudentDialog
                            }
                            onRemoveAllCourses={confirmAndRemoveAllCourses}
                        />
                    </SidebarWrapper>

                    <MainContentArea>
                        <Box ref={scheduleToolbarRef}>
                            <ScheduleToolbar
                                onDownloadScheduleImage={triggerDownloadScheduleImage}
                                onExportWorkspace={handleExportWorkspace}
                                onImportWorkspace={handleImportWorkspace}
                                onResetWorkspace={confirmAndResetWorkspaceClean}
                            />
                        </Box>
                        <ScheduleBoxWrapper
                            ref={scheduleBoxRef}
                            sx={{ maxHeight: scheduleBoxWrapperHeight }}
                        >
                            {isEffectivelyLoading && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: alpha(
                                            theme.palette.background.paper,
                                            0.85
                                        ),
                                        zIndex: 10,
                                    }}
                                >
                                    <CircularProgress />
                                    <Typography sx={{ mt: 1 }}>{globalLoadingMessage()}</Typography>
                                </Box>
                            )}
                            {!isEffectivelyLoading &&
                                activeSchedule instanceof ScheduleClass &&
                                isWorkspaceInitialized && <ScheduleBox schedule={activeSchedule} />}
                            {!isEffectivelyLoading &&
                                !(activeSchedule instanceof ScheduleClass) &&
                                isWorkspaceInitialized && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            height: '100%',
                                        }}
                                    >
                                        <Typography color="text.secondary">
                                            {t('common.scheduleNotAvailable')}
                                        </Typography>
                                    </Box>
                                )}
                        </ScheduleBoxWrapper>
                    </MainContentArea>

                    <SidebarWrapper customWidth={RIGHT_SIDEBAR_WIDTH_DESKTOP}>
                        <PropertiesBar onRemoveAllPreferences={confirmAndRemoveAllPreferences} />
                    </SidebarWrapper>
                </EditorLayoutDesktop>
            )}

            <LoadCourseFromSTAGDialog
                open={stagCourseLoader.isLoadCourseDialogOpen}
                onClose={stagCourseLoader.closeLoadCourseDialog}
                onSubmit={stagCourseLoader.handleSubmitLoadCourse}
            />
            <GenericConfirmationDialog
                open={stagCourseLoader.overwriteSingleCourseDialog.open}
                onClose={stagCourseLoader.closeOverwriteSingleCourseDialog}
                onConfirm={stagCourseLoader.overwriteSingleCourseDialog.onConfirm}
                title={stagCourseLoader.overwriteSingleCourseDialog.title}
                message={stagCourseLoader.overwriteSingleCourseDialog.message}
                confirmButtonText={t('Dialogs.existingCourseWarning.confirmButton', 'Přepsat')}
            />

            <LoadCoursesFromStudentRedirectDialog
                open={stagStudentPlanLoader.isRedirectDialogOpen}
                onClose={stagStudentPlanLoader.closeRedirectDialog}
                onContinueToSTAGLogin={stagStudentPlanLoader.handleContinueToSTAGLogin}
            />
            <SelectSTAGIdentityDialog
                open={stagStudentPlanLoader.isIdentityDialogOpen}
                onClose={() => stagStudentPlanLoader.closeIdentityDialog(true)}
                onSelectIdentity={stagStudentPlanLoader.handleIdentitySelected}
                stagApiService={stagApiService}
            />
            <SelectStudyParametersDialog
                open={stagStudentPlanLoader.isStudyParamsDialogOpen}
                onClose={() => stagStudentPlanLoader.closeStudyParamsDialog(true)}
                onSubmitParameters={stagStudentPlanLoader.handleStudyParametersSubmitted}
                studentContext={stagStudentPlanLoader.currentStudentContextForDialog}
                defaultAcademicYear={
                    stagStudentPlanLoader.currentStudentContextForDialog?.currentAcademicYearFull ||
                    workspaceYear ||
                    new Date().getFullYear().toString() +
                        '/' +
                        (new Date().getFullYear() + 1).toString()
                }
            />
            <ConfirmationDialog
                open={stagStudentPlanLoader.overwritePlanDialogState.open}
                onClose={() => stagStudentPlanLoader.closeOverwritePlanDialog(true)}
                onConfirm={stagStudentPlanLoader.overwritePlanDialogState.onConfirm}
                title={t('Dialogs.studentPlanOverwrite.title', 'Potvrdit načtení předmětů')}
                message={t(
                    'Dialogs.studentPlanOverwrite.message',
                    'Následující akce ovlivní vaši pracovní plochu. Přejete si pokračovat?'
                )}
                itemsToOverwrite={stagStudentPlanLoader.overwritePlanDialogState.coursesToOverwrite}
                itemsToAdd={stagStudentPlanLoader.overwritePlanDialogState.coursesToAdd}
                confirmButtonText={t('common.continue', 'Pokračovat')}
            />

            <GenericConfirmationDialog
                open={resetWorkspaceDialog.open}
                onClose={() => setResetWorkspaceDialog(prev => ({ ...prev, open: false }))}
                onConfirm={resetWorkspaceDialog.onConfirm}
                title={resetWorkspaceDialog.title}
                message={resetWorkspaceDialog.message}
                confirmButtonColor={resetWorkspaceDialog.confirmButtonColor}
            />
            <GenericConfirmationDialog
                open={removeAllCoursesDialog.open}
                onClose={() => setRemoveAllCoursesDialog(prev => ({ ...prev, open: false }))}
                onConfirm={removeAllCoursesDialog.onConfirm}
                title={removeAllCoursesDialog.title}
                message={removeAllCoursesDialog.message}
                confirmButtonColor={removeAllCoursesDialog.confirmButtonColor}
            />
            <GenericConfirmationDialog
                open={removeAllPrefsDialog.open}
                onClose={() => setRemoveAllPrefsDialog(prev => ({ ...prev, open: false }))}
                onConfirm={removeAllPrefsDialog.onConfirm}
                title={removeAllPrefsDialog.title}
                message={removeAllPrefsDialog.message}
                confirmButtonColor={removeAllPrefsDialog.confirmButtonColor}
            />

            <CourseLoadSummaryDialog
                open={stagStudentPlanLoader.summaryDialog.open}
                onClose={stagStudentPlanLoader.closeSummaryDialog}
                summary={stagStudentPlanLoader.summaryDialog.summary}
            />

            <CourseLoadingProcessDialog
                open={
                    isEffectivelyLoading && // Zobrazit pouze pokud některý z hlavních procesů běží
                    !stagCourseLoader.overwriteSingleCourseDialog.open &&
                    !stagStudentPlanLoader.overwritePlanDialogState.open &&
                    !stagCourseLoader.isLoadCourseDialogOpen &&
                    !stagStudentPlanLoader.isIdentityDialogOpen &&
                    !stagStudentPlanLoader.isStudyParamsDialogOpen &&
                    !stagStudentPlanLoader.isRedirectDialogOpen
                }
                message={globalLoadingMessage()}
            />
        </EditorPageRoot>
    );
}

export default EditorPage;
