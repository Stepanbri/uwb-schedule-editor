import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const GenericConfirmationDialog = ({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor = 'primary', // 'primary' or 'error' for example
}) => {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle component="div">
                {' '}
                {/* Zajistíme, že DialogTitle nerenderuje další h2 */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningAmberIcon
                        sx={{
                            mr: 1,
                            color: confirmButtonColor === 'error' ? 'error.main' : 'warning.main',
                        }}
                    />
                    <Typography variant="h6" component="span">
                        {' '}
                        {/* Titulek je nyní span, ale vizuálně H6 */}
                        {title || t('common.confirm', 'Confirm Action')}
                    </Typography>
                </Box>
            </DialogTitle>
            {message && (
                <DialogContent>
                    <DialogContentText component="div">{message}</DialogContentText>
                </DialogContent>
            )}
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={onClose}>
                    {cancelButtonText || t('common.cancel', 'Cancel')}
                </Button>
                <Button onClick={onConfirm} variant="contained" color={confirmButtonColor}>
                    {confirmButtonText || t('common.confirm', 'Confirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default GenericConfirmationDialog;
