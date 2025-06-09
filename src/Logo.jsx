import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import WebLogoSrc from './assets/logo.svg'; // Import SVG jako zdroj

const Logo = ({ inDrawer = false }) => {
    const { t } = useTranslation();

    return (
        <Button
            disableRipple
            component={RouterLink}
            to="/" // Přesměrování na Landing Page
            sx={{
                color: inDrawer ? 'text.primary' : 'inherit',
                textDecoration: 'none',
                '&:hover': { backgroundColor: 'transparent' },
                p: 0,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
            }}
            aria-label={t('nav.landing', 'Úvodní stránka')} // Pro přístupnost
        >
            <Box
                component="img"
                src={WebLogoSrc} // Použití importovaného SVG
                alt={t('appTitleShort', 'Planner Logo')}
                sx={{
                    height: inDrawer ? 32 : 40,
                    width: 'auto',
                    mr: 1,
                    // filtr připraven pro tmavý režim - přepínaní...
                    //filter: (theme) => (theme.palette.mode === 'dark' && !inDrawer ? 'invert(1) brightness(1.5)' : 'none'),
                }}
            />
            {!inDrawer && (
                <Typography
                    variant="h5"
                    component="div"
                    sx={{ flexGrow: 0, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}
                >
                    {t('appTitleShort', 'Planner')}
                </Typography>
            )}
            {inDrawer && (
                <Typography variant="h6" component="div" sx={{ flexGrow: 0, whiteSpace: 'nowrap' }}>
                    {t('appTitleShort', 'Planner')}
                </Typography>
            )}
        </Button>
    );
};

export default Logo;
