// src/styles/theme.js
import { createTheme, alpha } from '@mui/material/styles';

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
    lectureLight: alpha('#ffcdd2', 0.7),
    lectureLightBorder: '#ef9a9a',
    lectureDark: alpha('#b71c1c', 0.5),
    lectureDarkBorder: '#e57373',

    practicalLight: alpha('#c8e6c9', 0.7),
    practicalLightBorder: '#a5d6a7',
    practicalDark: alpha('#2e7d32', 0.5),
    practicalDarkBorder: '#81c784',

    seminarLight: alpha('#fff9c4', 0.7),
    seminarLightBorder: '#fff59d',
    seminarDark: alpha('#f9a825', 0.5),
    seminarDarkBorder: '#ffeb3b',

    otherLight: alpha('#e0e0e0', 0.7),
    otherLightBorder: '#bdbdbd',
    otherDark: alpha('#616161', 0.5),
    otherDarkBorder: '#9e9e9e',
};

const getDesignTokens = (mode) => ({
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
                    lecture: eventColors.lectureLight,
                    lectureBorder: eventColors.lectureLightBorder,
                    practical: eventColors.practicalLight,
                    practicalBorder: eventColors.practicalLightBorder,
                    seminar: eventColors.seminarLight,
                    seminarBorder: eventColors.seminarLightBorder,
                    other: eventColors.otherLight,
                    otherBorder: eventColors.otherLightBorder,
                },
                common: {
                    black: '#000',
                    white: '#fff'
                }
            }
            : { // Dark Mode
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
                    lecture: eventColors.lectureDark,
                    lectureBorder: eventColors.lectureDarkBorder,
                    practical: eventColors.practicalDark,
                    practicalBorder: eventColors.practicalDarkBorder,
                    seminar: eventColors.seminarDark,
                    seminarBorder: eventColors.seminarDarkBorder,
                    other: eventColors.otherDark,
                    otherBorder: eventColors.otherDarkBorder,
                },
                common: {
                    black: '#000',
                    white: '#fff'
                }
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
        }
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: ({ theme }) => ({
                    boxShadow: 'none',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }),
            }
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: ({ theme }) => ({
                    // border: `1px solid ${theme.palette.divider}`, // Jemné ohraničení pro Paper
                }),
                outlined: ({theme}) => ({
                    border: `1px solid ${theme.palette.divider}`,
                })
            }
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
            }
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {},
                containedPrimary: ({ theme }) => ({}),
            }
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: ({ theme }) => ({
                    backgroundColor: alpha(theme.palette.common.black, 0.85),
                    fontSize: '0.8rem',
                }),
                arrow: ({ theme }) => ({
                    color: alpha(theme.palette.common.black, 0.85),
                }),
            }
        },
        MuiDialog: {
            styleOverrides: {
                paper: ({theme}) => ({
                    border: `1px solid ${theme.palette.divider}`,
                })
            }
        },
        MuiDrawer: {
            styleOverrides: {
                paper: ({theme}) => ({
                    borderRight: `1px solid ${theme.palette.divider}`,
                    borderLeft: `1px solid ${theme.palette.divider}`,
                })
            }
        }
    }
});

export const createAppTheme = (mode) => createTheme(getDesignTokens(mode));