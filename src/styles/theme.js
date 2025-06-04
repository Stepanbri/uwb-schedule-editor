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

// Barvy pro typy událostí (dle dokumentace a běžné praxe)
//
const eventColors = {
    lectureLight: alpha('#ffcdd2', 0.7), // světle červená pro přednášky
    lectureLightBorder: '#ef9a9a',
    lectureDark: alpha('#b71c1c', 0.5),   // tmavší červená
    lectureDarkBorder: '#e57373',

    practicalLight: alpha('#c8e6c9', 0.7), // světle zelená pro cvičení
    practicalLightBorder: '#a5d6a7',
    practicalDark: alpha('#2e7d32', 0.5),  // tmavší zelená
    practicalDarkBorder: '#81c784',

    seminarLight: alpha('#fff9c4', 0.7),  // světle žlutá pro semináře
    seminarLightBorder: '#fff59d',
    seminarDark: alpha('#f9a825', 0.5), // tmavší žlutá/oranžová
    seminarDarkBorder: '#ffeb3b',

    otherLight: alpha('#e0e0e0', 0.7),    // pro ostatní/defaultní typy
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
                    // MUI si dopočítá light a dark varianty, nebo je zde můžeme explicitně definovat
                },
                secondary: {
                    main: secondaryLight,
                },
                accent: { // Vlastní barva
                    main: accentLight,
                    contrastText: '#000000', // Nutno určit kontrastní text
                },
                background: {
                    default: backgroundLight,
                    paper: backgroundLight, // Stejné jako default pro konzistenci sidebaru atd.
                },
                text: {
                    primary: textLight,
                    secondary: alpha(textLight, 0.7),
                    disabled: alpha(textLight, 0.5),
                },
                eventTypes: { // Barvy pro události v rozvrhu
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
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', //
        h1: { fontSize: '2.8rem', fontWeight: 700 }, // Pro LandingPage
        h2: { fontSize: '2.2rem', fontWeight: 600 },
        h3: { fontSize: '1.8rem', fontWeight: 600 },
        h4: { fontSize: '1.5rem', fontWeight: 500 },
        h5: { fontSize: '1.25rem', fontWeight: 500 },
        h6: { fontSize: '1.1rem', fontWeight: 500 }, // Např. pro titulky v sidebarech
        subtitle1: { fontSize: '1rem', fontWeight: 500 },
        subtitle2: { fontSize: '0.875rem', fontWeight: 500 },
        body1: { fontSize: '1rem' },
        body2: { fontSize: '0.875rem' },
        caption: { fontSize: '0.75rem' },
        button: {
            textTransform: 'none', // Globálně vypneme uppercase pro tlačítka
            fontWeight: 500,
        }
    },
    shape: {
        borderRadius: 8, // Mírně zaoblenější rohy
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: ({ theme }) => ({
                    // AppBar by měl mít barvu primary, ale můžeme ji zde přepsat, pokud chceme
                    // backgroundColor: theme.palette.mode === 'light' ? primaryLight : theme.palette.grey[900],
                    // Pro příklad necháme MUI default, který by měl použít primary.main
                    boxShadow: 'none', // Plošší vzhled pro AppBar
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }),
            }
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0, // Plošší vzhled pro Paper defaultně
            },
            styleOverrides: {
                root: ({ theme }) => ({
                    // border: `1px solid ${theme.palette.divider}`, // Jemné ohraničení pro Paper
                    // Tento styl se může aplikovat na mnoho věcí, takže opatrně
                }),
                outlined: ({theme}) => ({ // Pro variantu outlined
                    border: `1px solid ${theme.palette.divider}`,
                })
            }
        },
        MuiCard: {
            defaultProps: {
                elevation: 0, // Karty také plošší
            },
            styleOverrides: {
                root: ({ theme }) => ({
                    border: `1px solid ${theme.palette.divider}`, // Ohraničení pro karty
                    transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
                    '&:hover': { // Jemný hover efekt pro karty, pokud je to žádoucí globálně
                        // boxShadow: theme.shadows[3],
                        // transform: 'translateY(-2px)',
                    }
                }),
            }
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true, // Plošší tlačítka
            },
            styleOverrides: {
                root: {
                    // Příklad globální úpravy paddingu tlačítek
                    // padding: '8px 16px',
                },
                containedPrimary: ({ theme }) => ({
                    // Příklad: Pokud chceme, aby primární tlačítko mělo vždy bílý text
                    // color: theme.palette.common.white,
                }),
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
                    // Můžeme nastavit výchozí border, pokud chceme
                    border: `1px solid ${theme.palette.divider}`,
                })
            }
        },
        MuiDrawer: {
            styleOverrides: {
                paper: ({theme}) => ({
                    borderRight: `1px solid ${theme.palette.divider}`, // Pro levý/pravý drawer
                    borderLeft: `1px solid ${theme.palette.divider}`,
                })
            }
        }
    }
});

export const createAppTheme = (mode) => createTheme(getDesignTokens(mode));