import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createAppTheme } from '../styles/theme';

const AppThemeContext = createContext(null);

export const AppThemeProvider = ({ children }) => {
    const [mode, setMode] = useState(() => {
        const savedMode = localStorage.getItem('themeMode');
        if (savedMode) return savedMode;
        const prefersDarkModeSystem =
            window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDarkModeSystem ? 'dark' : 'light';
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = e => {
            // Pokud uživatel explicitně nevybral režim, přizpůsob se systému
            if (!localStorage.getItem('themeMode')) {
                setMode(e.matches ? 'dark' : 'light');
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleColorMode = useCallback(() => {
        setMode(prevMode => {
            const newMode = prevMode === 'light' ? 'dark' : 'light';
            localStorage.setItem('themeMode', newMode);
            return newMode;
        });
    }, []);

    const theme = useMemo(() => createAppTheme(mode), [mode]);

    const value = {
        mode,
        toggleColorMode,
    };

    return (
        <AppThemeContext.Provider value={value}>
            <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
        </AppThemeContext.Provider>
    );
};

export const useAppContextTheme = () => {
    const context = useContext(AppThemeContext);
    if (!context) {
        throw new Error('useAppContextTheme must be used within an AppThemeProvider');
    }
    return context;
};
