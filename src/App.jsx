// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link as RouterLink, useLocation } from 'react-router-dom';
import {
    CssBaseline,
    AppBar,
    Toolbar,
    Button,
    Box,
    IconButton,
    Tooltip,
    useMediaQuery,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Container
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';

import { AppThemeProvider, useAppContextTheme } from './contexts/ThemeContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { StagApiProvider } from './contexts/StagApiContext';
import { SnackbarProvider } from './contexts/SnackbarContext';

import LandingPage from './features/landing/LandingPage.jsx';
import FAQPage from './features/faq/FAQPage.jsx';
import EditorPage from './features/editor/EditorPage.jsx';
import Logo from './Logo.jsx';


const MainAppContent = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const { mode, toggleColorMode } = useAppContextTheme();
    const theme = useTheme();

    const [currentLanguage, setCurrentLanguage] = useState(() => {
        const storedLang = localStorage.getItem('i18nextLng');
        return storedLang ? storedLang.split('-')[0] : 'cs';
    });
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const savedLang = localStorage.getItem('i18nextLng')?.split('-')[0];
        const targetLang = (savedLang && ['cs', 'en'].includes(savedLang)) ? savedLang : 'cs';
        setCurrentLanguage(targetLang);
        if (i18n.language !== targetLang) {
            i18n.changeLanguage(targetLang);
        }
    }, [i18n]);

    const isMobileOrSmaller = useMediaQuery(theme.breakpoints.down('sm'));

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const toggleLanguage = () => {
        const newLanguage = currentLanguage === 'cs' ? 'en' : 'cs';
        setCurrentLanguage(newLanguage);
        i18n.changeLanguage(newLanguage);
    };

    const navItems = [
        { textKey: 'nav.editor', path: '/editor', icon: <EditIcon /> },
        { textKey: 'nav.faq', path: '/faq', icon: <HelpOutlineIcon /> },
    ];

    const drawerContent = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center', width: {xs: '80vw', sm: 280} }} role="presentation">
            <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                <Logo inDrawer={true} />
            </Box>
            <Divider />
            <List>
                {navItems.map((item) => (
                    <ListItem key={item.textKey} disablePadding>
                        <ListItemButton component={RouterLink} to={item.path} selected={location.pathname === item.path}>
                            <ListItemIcon sx={{minWidth: 'auto', mr: 2}}>{item.icon}</ListItemIcon>
                            <ListItemText primary={t(item.textKey)} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={toggleLanguage}>
                        <ListItemIcon sx={{minWidth: 'auto', mr: 2}}><LanguageIcon /></ListItemIcon>
                        <ListItemText primary={`${t('languageToggle')}: ${currentLanguage.toUpperCase()}`} />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={toggleColorMode}>
                        <ListItemIcon sx={{minWidth: 'auto', mr: 2}}>{mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}</ListItemIcon>
                        <ListItemText primary={mode === 'dark' ? t('themeToggle.light') : t('themeToggle.dark')} />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <>
            <CssBaseline />
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <AppBar position="static">
                    <Container maxWidth="xl" disableGutters>
                        <Toolbar>
                            {/* Logo a název aplikace - bude se roztahovat, pokud není desktopové menu */}
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                flexGrow: isMobileOrSmaller ? 1 : 0, // Na mobilu zabere místo, na desktopu ne (aby se vešlo menu)
                            }}>
                                <Logo />
                            </Box>

                            {/* Desktopové navigační tlačítka */}
                            {!isMobileOrSmaller && (
                                <Box sx={{ ml: 'auto' }}> {/* Zarovnáme doprava */}
                                    {navItems.map((item) => (
                                        <Button
                                            key={item.textKey}
                                            color="inherit"
                                            component={RouterLink}
                                            to={item.path}
                                            sx={{
                                                fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                                                textDecoration: location.pathname === item.path ? 'underline' : 'none',
                                                textUnderlineOffset: '4px',
                                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                                                mr: 1
                                            }}
                                        >
                                            {t(item.textKey)}
                                        </Button>
                                    ))}
                                    <Button
                                        color="inherit"
                                        onClick={toggleLanguage}
                                        variant="outlined"
                                        size="small"
                                        startIcon={<LanguageIcon />}
                                        sx={{
                                            ml: 1,
                                            mr: 0.5,
                                            borderColor: 'rgba(255,255,255,0.7)',
                                            color: 'white',
                                            '& .MuiButton-startIcon': { mr: 0.5 }
                                        }}
                                    >
                                        {currentLanguage.toUpperCase()}
                                    </Button>
                                    <Tooltip title={mode === 'dark' ? t('themeToggle.lightTooltip') : t('themeToggle.darkTooltip')}>
                                        <IconButton sx={{ ml: 0.5 }} onClick={toggleColorMode} color="inherit">
                                            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            )}

                            {/* Mobilní "hamburger" menu tlačítko - nyní na pravé straně */}
                            {isMobileOrSmaller && (
                                <IconButton
                                    color="inherit"
                                    aria-label="open drawer"
                                    edge="end" // Pro lepší zarovnání na konci (vpravo)
                                    onClick={handleDrawerToggle}
                                    // sx={{ ml: 'auto' }} // ml: 'auto' přesune úplně doprava, pokud je Logo flexGrow: 1
                                >
                                    <MenuIcon />
                                </IconButton>
                            )}
                        </Toolbar>
                    </Container>
                </AppBar>

                <Drawer
                    variant="temporary"
                    anchor="right" // Změna anchor na "right"
                    open={mobileOpen && isMobileOrSmaller}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    slotProps={{ paper: { sx: { width: { xs: '80vw', sm: 280 } }}}}
                >
                    {drawerContent}
                </Drawer>

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        overflowY: location.pathname === '/editor' ? 'hidden' : 'auto',
                        height: location.pathname === '/editor' ? 'calc(100vh - 64px)' : 'auto' // Předpoklad výšky Appbaru 64px
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
}

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