import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Link,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const LoadCoursesFromStudentRedirectDialog = ({ open, onClose, onContinueToSTAGLogin }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleFaqLinkClick = () => {
        navigate('/faq#q8');
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
                <VpnKeyIcon sx={{ mr: 1, color: 'primary.main' }} />
                {t('Dialogs.loadFromStudentRedirect.title', 'Načtení předmětů z plánu studenta')}
            </DialogTitle>
            <DialogContent dividers>
                <DialogContentText component="div">
                    <Typography gutterBottom>
                        {t(
                            'Dialogs.loadFromStudentRedirect.p1',
                            'Pro načtení předmětů dle vašeho studijního plánu je nutné se přihlásit do informačního systému STAG.'
                        )}
                    </Typography>
                    <Typography gutterBottom>
                        {t(
                            'Dialogs.loadFromStudentRedirect.p2',
                            'Po kliknutí na "Pokračovat" budete přesměrováni na přihlašovací stránku ZČU (Orion login). Po úspěšném přihlášení budete automaticky vráceni zpět do aplikace Plánovač Rozvrhu.'
                        )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {t(
                            'Dialogs.loadFromStudentRedirect.p3',
                            'Tato aplikace neukládá vaše přihlašovací údaje. Získaný dočasný přístupový klíč (ticket) se použije pouze pro komunikaci se STAG API během této relace.'
                        )}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                        <HelpOutlineIcon
                            fontSize="small"
                            sx={{ mr: 0.5, color: 'action.active' }}
                        />
                        <Link component="button" variant="body2" onClick={handleFaqLinkClick}>
                            {t(
                                'Dialogs.loadFromStudentRedirect.faqLink',
                                'Více informací o bezpečnosti a fungování přihlášení'
                            )}
                        </Link>
                    </Box>
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={onClose}>{t('common.cancel', 'Zrušit')}</Button>
                <Button onClick={onContinueToSTAGLogin} variant="contained" color="primary">
                    {t(
                        'Dialogs.loadFromStudentRedirect.continueButton',
                        'Pokračovat na přihlášení'
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LoadCoursesFromStudentRedirectDialog;
