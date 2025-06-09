import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    List,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const ConfirmationDialog = ({
    open,
    onClose,
    onConfirm,
    title,
    message,
    itemsToOverwrite = [],
    itemsToAdd = [],
    confirmButtonText,
    cancelButtonText,
}) => {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle component="div">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningAmberIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="h6" component="span">
                        {title || t('common.confirm', 'Potvrdit')}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {message && (
                    <DialogContentText
                        component="div"
                        sx={{ mb: itemsToOverwrite.length > 0 || itemsToAdd.length > 0 ? 2 : 0 }}
                    >
                        {message}
                    </DialogContentText>
                )}

                {itemsToOverwrite.length > 0 && (
                    <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>
                            {t(
                                'Dialogs.confirmation.overwriteListTitle',
                                'Následující položky budou přepsány:'
                            )}
                        </Typography>
                        <List
                            dense
                            sx={{
                                maxHeight: 150,
                                overflow: 'auto',
                                border: '1px solid rgba(0,0,0,0.12)',
                                borderRadius: 1,
                                p: 1,
                                bgcolor: 'action.hover',
                            }}
                        >
                            {itemsToOverwrite.map((item, index) => (
                                <ListItem key={`overwrite-${index}`} disablePadding sx={{ pl: 1 }}>
                                    <ListItemText
                                        slotProps={{
                                            primary: { variant: 'body2' },
                                            secondary: { variant: 'caption' },
                                        }}
                                        primary={typeof item === 'string' ? item : item.name}
                                        secondary={typeof item === 'string' ? null : item.details}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}

                {itemsToAdd.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            {t(
                                'Dialogs.confirmation.addListTitle',
                                'Následující položky budou přidány:'
                            )}
                        </Typography>
                        <List
                            dense
                            sx={{
                                maxHeight: 150,
                                overflow: 'auto',
                                border: '1px solid rgba(0,0,0,0.12)',
                                borderRadius: 1,
                                p: 1,
                                bgcolor: 'action.hover',
                            }}
                        >
                            {itemsToAdd.map((item, index) => (
                                <ListItem key={`add-${index}`} disablePadding sx={{ pl: 1 }}>
                                    <ListItemText
                                        slotProps={{
                                            primary: { variant: 'body2' },
                                            secondary: { variant: 'caption' },
                                        }}
                                        primary={typeof item === 'string' ? item : item.name}
                                        secondary={typeof item === 'string' ? null : item.details}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={onClose}>
                    {cancelButtonText || t('common.cancel', 'Zrušit')}
                </Button>
                <Button onClick={onConfirm} variant="contained" color="primary">
                    {confirmButtonText || t('common.confirm', 'Potvrdit')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;
