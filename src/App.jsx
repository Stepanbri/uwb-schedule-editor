import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Box, CssBaseline, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Route, Routes, useLocation } from 'react-router-dom';

import { SnackbarProvider } from './contexts/SnackbarContext';
import { StagApiProvider } from './contexts/StagApiContext';
import { AppThemeProvider, useAppContextTheme } from './contexts/ThemeContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';

import EditorPage from './features/editor/EditorPage.jsx';
import FAQPage from './features/faq/FAQPage.jsx';
import LandingPage from './features/landing/LandingPage.jsx';
import Header from './features/navigation/Header.jsx';
import SideDrawer from './features/navigation/SideDrawer.jsx';

/**
 * Hlavní komponenta, která sestavuje základní layout aplikace,
 * spravuje stav navigace a poskytuje globální kontexty.
 */
const MainAppContent = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const { mode, toggleColorMode } = useAppContextTheme();
    const theme = useTheme();

    // Lokální stav pro jazyk, synchronizovaný s i18next a localStorage
    const [currentLanguage, setCurrentLanguage] = useState(() => {
        const storedLang = localStorage.getItem('i18nextLng');
        return storedLang ? storedLang.split('-')[0] : 'cs';
    });
    // Stav pro ovládání viditelnosti mobilního menu
    const [mobileOpen, setMobileOpen] = useState(false);

    // Efekt pro nastavení jazyka při prvním načtení komponenty
    useEffect(() => {
        const savedLang = localStorage.getItem('i18nextLng')?.split('-')[0];
        const targetLang = savedLang && ['cs', 'en'].includes(savedLang) ? savedLang : 'cs';
        setCurrentLanguage(targetLang);
        if (i18n.language !== targetLang) {
            i18n.changeLanguage(targetLang);
        }
    }, [i18n]);

    // Zjištění, zda se jedná o mobilní zobrazení pro responzivní chování
    const isMobileOrSmaller = useMediaQuery(theme.breakpoints.down('sm'));

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const toggleLanguage = () => {
        const newLanguage = currentLanguage === 'cs' ? 'en' : 'cs';
        setCurrentLanguage(newLanguage);
        i18n.changeLanguage(newLanguage);
    };

    // Definice navigačních položek pro předání do hlavičky a postranního menu
    const navItems = [
        { textKey: 'nav.editor', path: '/editor', icon: <EditIcon /> },
        { textKey: 'nav.faq', path: '/faq', icon: <HelpOutlineIcon /> },
    ];

    return (
        <>
            <CssBaseline />
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <Header
                    navItems={navItems}
                    mode={mode}
                    currentLanguage={currentLanguage}
                    toggleColorMode={toggleColorMode}
                    toggleLanguage={toggleLanguage}
                    onDrawerToggle={handleDrawerToggle}
                    isMobileOrSmaller={isMobileOrSmaller}
                />

                <SideDrawer
                    navItems={navItems}
                    mode={mode}
                    currentLanguage={currentLanguage}
                    toggleColorMode={toggleColorMode}
                    toggleLanguage={toggleLanguage}
                    onDrawerToggle={handleDrawerToggle}
                    mobileOpen={mobileOpen}
                    isMobileOrSmaller={isMobileOrSmaller}
                />

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        // Pro stránku editoru chceme zamezit skrolování na hlavní úrovni,
                        // protože layout je rozdělen na samostatně skrolovatelné panely.
                        overflowY: location.pathname === '/editor' ? 'hidden' : 'auto',
                        height: location.pathname === '/editor' ? 'calc(100vh - 64px)' : 'auto', // Předpoklad výšky Appbaru 64px
                    }}
                >
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/faq" element={<FAQPage />} />
                        <Route path="/editor" element={<EditorPage />} />
                    </Routes>
                </Box>
            </Box>
        </>
    );
};

/**
 * Kořenová komponenta aplikace.
 * Obaluje celou aplikaci potřebnými context providery (pro motiv, snackbary, STAG API a pracovní prostor).
 */
function App() {
    return (
        <AppThemeProvider>
            <SnackbarProvider>
                <StagApiProvider>
                    <WorkspaceProvider>
                        <MainAppContent />
                    </WorkspaceProvider>
                </StagApiProvider>
            </SnackbarProvider>
        </AppThemeProvider>
    );
}

export default App;
