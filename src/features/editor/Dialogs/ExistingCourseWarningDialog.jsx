import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const ExistingCourseWarningDialog = ({ open, courseIdentifier, onConfirm, onCancel }) => {
    const { t } = useTranslation();
    return (
        <Dialog open={open} onClose={onCancel}>
            <DialogTitle>
                {t('Dialogs.existingCourseWarning.title', 'Předmět již existuje')}
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t(
                        'Dialogs.existingCourseWarning.message',
                        `Předmět "${courseIdentifier}" již máte načtený. Přejete si přepsat jeho stávající data novými daty ze STAGu?`,
                        { courseIdentifier }
                    )}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{t('common.cancel', 'Zrušit')}</Button>
                <Button onClick={onConfirm} color="primary" variant="contained">
                    {t('Dialogs.existingCourseWarning.confirmButton', 'Přepsat')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
export default ExistingCourseWarningDialog;
