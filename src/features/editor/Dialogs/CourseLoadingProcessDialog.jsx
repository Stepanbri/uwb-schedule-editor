// PROJEKT/NEW/src/features/editor/Dialogs/CourseLoadingProcessDialog.jsx
import React from 'react';
import { Dialog, DialogContent, DialogContentText, CircularProgress, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const CourseLoadingProcessDialog = ({ open, message }) => {
    const { t } = useTranslation();
    return (
        <Dialog open={open} PaperProps={{ sx: { p: 3, alignItems: 'center', borderRadius: 2 } }}>
            <DialogContent sx={{display: 'flex', flexDirection:'column', alignItems:'center', gap: 2}}>
                <CircularProgress />
                <DialogContentText>
                    {message || t('Dialogs.loadingProcess.defaultMessage', 'Zpracovávám požadavek...')}
                </DialogContentText>
            </DialogContent>
        </Dialog>
    );
};
export default CourseLoadingProcessDialog;