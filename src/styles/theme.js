import { csCZ } from '@mui/material/locale';
import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

// Základní barvy z vašich komentářů a původního souboru
const primaryLight = '#25696a';
const secondaryLight = '#73e1e2';
const backgroundLight = '#f2f8f8'; // default i paper
const textLight = '#171c1c';
const accentLight = '#12dade';

const primaryDark = '#97d9da';
const secondaryDark = '#1d8b8c';
const backgroundDark = '#080e0e'; // default i paper
const textDark = '#e4e9e9';
const accentDark = '#23ebed';

const eventColors = {
    // Barvy pozadí (s průhledností)
    lectureBgLight: alpha('#ef5350', 0.5),
    lectureBgDark: alpha('#d32f2f', 0.6),
    practicalBgLight: alpha('#66bb6a', 0.5),
    practicalBgDark: alpha('#388e3c', 0.6),
    seminarBgLight: alpha('#ffee58', 0.5),
    seminarBgDark: alpha('#fbc02d', 0.6),
    otherBgLight: alpha('#e0e0e0', 0.5),
    otherBgDark: alpha('#616161', 0.6),

    // Plné barvy patky/okraje (bez průhlednosti)
    lectureSolidLight: '#e53935', // red 600
    lectureSolidDark: '#ef5350', // red 400
    practicalSolidLight: '#43a047', // green 600
    practicalSolidDark: '#66bb6a', // green 400
    seminarSolidLight: '#fdd835', // yellow 600
    seminarSolidDark: '#ffee58', // yellow 400
    otherSolidLight: '#9e9e9e', // grey 500
    otherSolidDark: '#bdbdbd', // grey 400
};

const getDesignTokens = mode => ({
    palette: {
        mode,
        ...(mode === 'light'
            ? {
                  primary: {
                      main: primaryLight,
                  },
                  secondary: {
                      main: secondaryLight,
                  },
                  accent: {
                      main: accentLight,
                      contrastText: '#000000',
                  },
                  background: {
                      default: backgroundLight,
                      paper: backgroundLight,
                  },
                  text: {
                      primary: textLight,
                      secondary: alpha(textLight, 0.7),
                      disabled: alpha(textLight, 0.5),
                  },
                  eventTypes: {
                      lecture: eventColors.lectureBgLight,
                      practical: eventColors.practicalBgLight,
                      seminar: eventColors.seminarBgLight,
                      other: eventColors.otherBgLight,
                      // Solid colors for notches/borders
                      lectureSolid: eventColors.lectureSolidLight,
                      practicalSolid: eventColors.practicalSolidLight,
                      seminarSolid: eventColors.seminarSolidLight,
                      otherSolid: eventColors.otherSolidLight,
                  },
                  common: {
                      black: '#000',
                      white: '#fff',
                  },
              }
            : {
                  // Dark Mode
                  primary: {
                      main: primaryDark,
                  },
                  secondary: {
                      main: secondaryDark,
                  },
                  accent: {
                      main: accentDark,
                      contrastText: '#000000',
                  },
                  background: {
                      default: backgroundDark,
                      paper: backgroundDark,
                  },
                  text: {
                      primary: textDark,
                      secondary: alpha(textDark, 0.7),
                      disabled: alpha(textDark, 0.5),
                  },
                  eventTypes: {
                      lecture: eventColors.lectureBgDark,
                      practical: eventColors.practicalBgDark,
                      seminar: eventColors.seminarBgDark,
                      other: eventColors.otherBgDark,
                      // Solid colors for notches/borders
                      lectureSolid: eventColors.lectureSolidDark,
                      practicalSolid: eventColors.practicalSolidDark,
                      seminarSolid: eventColors.seminarSolidDark,
                      otherSolid: eventColors.otherSolidDark,
                  },
                  common: {
                      black: '#000',
                      white: '#fff',
                  },
              }),
        divider: mode === 'light' ? alpha(textLight, 0.12) : alpha(textDark, 0.12),
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '2.8rem', fontWeight: 700 },
        h2: { fontSize: '2.2rem', fontWeight: 600 },
        h3: { fontSize: '1.8rem', fontWeight: 600 },
        h4: { fontSize: '1.5rem', fontWeight: 500 },
        h5: { fontSize: '1.25rem', fontWeight: 500 },
        h6: { fontSize: '1.1rem', fontWeight: 500 },
        subtitle1: { fontSize: '1rem', fontWeight: 500 },
        subtitle2: { fontSize: '0.875rem', fontWeight: 500 },
        body1: { fontSize: '1rem' },
        body2: { fontSize: '0.875rem' },
        caption: { fontSize: '0.75rem' },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 6,
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: ({ theme }) => ({
                    boxShadow: 'none',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }),
            },
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: ({ theme }) => ({
                    // border: `1px solid ${theme.palette.divider}`, // Jemné ohraničení pro Paper
                }),
                outlined: ({ theme }) => ({
                    border: `1px solid ${theme.palette.divider}`,
                }),
            },
        },
        MuiCard: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: ({ theme }) => ({
                    border: `1px solid ${theme.palette.divider}`,
                    transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
                }),
            },
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {},
                containedPrimary: ({ theme }) => ({}),
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor:
                        mode === 'light' ? alpha('#000000', 0.87) : alpha('#ffffff', 0.87),
                    color: mode === 'light' ? '#ffffff' : '#000000',
                    fontSize: '0.8rem',
                },
                arrow: {
                    color: mode === 'light' ? alpha('#000000', 0.87) : alpha('#ffffff', 0.87),
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: ({ theme }) => ({
                    border: `1px solid ${theme.palette.divider}`,
                }),
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: ({ theme }) => ({
                    borderRight: `1px solid ${theme.palette.divider}`,
                    borderLeft: `1px solid ${theme.palette.divider}`,
                }),
            },
        },
        MuiPopover: {
            styleOverrides: {
                paper: {
                    border: `1px solid ${mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
            },
        },
    },
});

// Funkce pro vytvoření tématu
export const createAppTheme = mode => {
    let theme = createTheme(getDesignTokens(mode), csCZ);

    // Přepsání getContrastText, aby vždy vracel barvu s dobrým kontrastem
    theme.palette.getContrastText = background => {
        // Jednoduchá heuristika - pro světlé pozadí tmavý text, pro tmavé světlý.
        // MUI používá složitější výpočet, ale pro naše světlé alfa barvy je lepší toto.
        if (theme.palette.mode === 'light') {
            return theme.palette.text.primary; // Vždy tmavý text ve světlém módu
        }
        // V tmavém módu jsou pozadí rozvrhových akcí také tmavá, takže potřebujeme světlý text.
        return theme.palette.text.primary;
    };

    theme = responsiveFontSizes(theme);
    return theme;
};
