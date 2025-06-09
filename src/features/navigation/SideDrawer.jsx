import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LanguageIcon from '@mui/icons-material/Language';
import {
    Box,
    Divider,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import Logo from '../../Logo';

/**
 * Komponenta postranního menu (Drawer) pro mobilní zobrazení.
 * Poskytuje navigační odkazy a ovládací prvky, které jsou v desktopové verzi v hlavičce.
 * @param {object} props - Vlastnosti komponenty.
 * @param {Array<object>} props.navItems - Pole navigačních položek k zobrazení.
 * @param {string} props.mode - Aktuální barevný motiv ('light' nebo 'dark').
 * @param {string} props.currentLanguage - Aktuálně zvolený jazyk ('cs' nebo 'en').
 * @param {Function} props.toggleColorMode - Funkce pro přepnutí barevného motivu.
 * @param {Function} props.toggleLanguage - Funkce pro přepnutí jazyka.
 * @param {Function} props.onDrawerToggle - Funkce pro zavření menu.
 * @param {boolean} props.mobileOpen - Stav, zda je menu otevřené.
 * @param {boolean} props.isMobileOrSmaller - Příznak, zda je zobrazení pro mobilní zařízení (podmínka pro renderování).
 */
const SideDrawer = ({
    navItems,
    mode,
    currentLanguage,
    toggleColorMode,
    toggleLanguage,
    onDrawerToggle,
    mobileOpen,
    isMobileOrSmaller,
}) => {
    const { t } = useTranslation();
    const location = useLocation();

    // Obsah, který se zobrazí uvnitř menu.
    // Při kliknutí na jakoukoliv položku se menu zavře díky onDrawerToggle na root elementu.
    const drawerContent = (
        <Box
            onClick={onDrawerToggle}
            sx={{ textAlign: 'center', width: { xs: '80vw', sm: 280 } }}
            role="presentation"
        >
            <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                <Logo inDrawer={true} />
            </Box>
            <Divider />
            <List>
                {navItems.map(item => (
                    <ListItem key={item.textKey} disablePadding>
                        <ListItemButton
                            component={RouterLink}
                            to={item.path}
                            selected={location.pathname === item.path}
                        >
                            <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={t(item.textKey)} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={toggleLanguage}>
                        <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                            <LanguageIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={`${t('languageToggle')}: ${currentLanguage.toUpperCase()}`}
                        />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={toggleColorMode}>
                        <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                mode === 'dark' ? t('themeToggle.light') : t('themeToggle.dark')
                            }
                        />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Drawer
            variant="temporary"
            anchor="right"
            open={mobileOpen && isMobileOrSmaller}
            onClose={onDrawerToggle}
            ModalProps={{ keepMounted: true }} // Důležité pro lepší výkon na mobilních zařízeních
            slotProps={{ paper: { sx: { width: { xs: '80vw', sm: 280 } } } }}
        >
            {drawerContent}
        </Drawer>
    );
};

export default SideDrawer;
