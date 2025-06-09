import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LoopIcon from '@mui/icons-material/Loop';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const CourseLoadSummaryDialog = ({ open, onClose, summary }) => {
    const { t } = useTranslation();

    const allItems = useMemo(() => {
        if (!summary) return [];
        const failed = (summary.failed || []).map(item => ({ ...item, status: 'failed' }));
        const added = (summary.added || []).map(item => ({ ...item, status: 'added' }));
        const overwritten = (summary.overwritten || []).map(item => ({
            ...item,
            status: 'overwritten',
        }));
        return [...failed, ...added, ...overwritten];
    }, [summary]);

    const getIconForStatus = status => {
        switch (status) {
            case 'failed':
                return <ErrorOutlineIcon color="error" fontSize="small" />;
            case 'added':
                return <CheckCircleOutlineIcon color="success" fontSize="small" />;
            case 'overwritten':
                return <LoopIcon color="info" fontSize="small" />;
            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{t('Dialogs.summary.title', 'Výsledek načítání předmětů')}</DialogTitle>
            <DialogContent dividers>
                <Typography gutterBottom>
                    {t(
                        'Dialogs.summary.overallResult',
                        'Proces načítání předmětů ze studijního plánu byl dokončen.'
                    )}
                </Typography>

                {allItems.length > 0 ? (
                    <List
                        dense
                        sx={{
                            maxHeight: 350,
                            overflow: 'auto',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            mt: 2,
                        }}
                    >
                        {allItems.map((item, index) => (
                            <ListItem key={index} divider={index < allItems.length - 1}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    {getIconForStatus(item.status)}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.name}
                                    primaryTypographyProps={{ variant: 'body2' }}
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        {t('Dialogs.summary.noItems')}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={onClose} variant="contained">
                    {t('common.close', 'Zavřít')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CourseLoadSummaryDialog;
