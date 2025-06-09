import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LanguageIcon from '@mui/icons-material/Language';
import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Box, Button, Container, IconButton, Toolbar, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import Logo from '../../Logo';

/**
 * Komponenta hlavičky aplikace.
 * Zobrazuje logo, navigační odkazy, a ovládací prvky pro přepínání jazyka,
 * motivu a pro otevření postranního menu na mobilních zařízeních.
 * @param {object} props - Vlastnosti komponenty.
 * @param {Array<object>} props.navItems - Pole navigačních položek k zobrazení.
 * @param {string} props.mode - Aktuální barevný motiv ('light' nebo 'dark').
 * @param {string} props.currentLanguage - Aktuálně zvolený jazyk ('cs' nebo 'en').
 * @param {Function} props.toggleColorMode - Funkce pro přepnutí barevného motivu.
 * @param {Function} props.toggleLanguage - Funkce pro přepnutí jazyka.
 * @param {Function} props.onDrawerToggle - Funkce pro otevření/zavření postranního menu.
 * @param {boolean} props.isMobileOrSmaller - Příznak, zda je zobrazení pro mobilní zařízení.
 */
const Header = ({
    navItems,
    mode,
    currentLanguage,
    toggleColorMode,
    toggleLanguage,
    onDrawerToggle,
    isMobileOrSmaller,
}) => {
    const { t } = useTranslation();
    const location = useLocation();

    return (
        <AppBar position="static">
            <Container maxWidth="xl" disableGutters>
                <Toolbar>
                    {/* Logo*/}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            flexGrow: isMobileOrSmaller ? 1 : 0, // Na mobilu zabere místo, na desktopu ne (aby se vešlo menu)
                        }}
                    >
                        <Logo />
                    </Box>

                    {/* Desktopové navigační tlačítka */}
                    {!isMobileOrSmaller && (
                        <Box sx={{ ml: 'auto' }}>
                            {navItems.map(item => (
                                <Button
                                    key={item.textKey}
                                    color="inherit"
                                    component={RouterLink}
                                    to={item.path}
                                    sx={{
                                        fontWeight:
                                            location.pathname === item.path ? 'bold' : 'normal',
                                        textDecoration:
                                            location.pathname === item.path ? 'underline' : 'none',
                                        textUnderlineOffset: '4px',
                                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                                        mr: 1,
                                    }}
                                >
                                    {t(item.textKey)}
                                </Button>
                            ))}
                            {/* Tlačítko pro přepnutí jazyka */}
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
                                    '& .MuiButton-startIcon': { mr: 0.5 },
                                }}
                            >
                                {currentLanguage.toUpperCase()}
                            </Button>
                            {/* Tlačítko pro přepnutí motivu */}
                            <Tooltip
                                title={
                                    mode === 'dark'
                                        ? t('themeToggle.lightTooltip')
                                        : t('themeToggle.darkTooltip')
                                }
                            >
                                <IconButton
                                    sx={{ ml: 0.5 }}
                                    onClick={toggleColorMode}
                                    color="inherit"
                                >
                                    {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}

                    {/* Mobilní menu tlačítko*/}
                    {isMobileOrSmaller && (
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="end"
                            onClick={onDrawerToggle}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default Header;
