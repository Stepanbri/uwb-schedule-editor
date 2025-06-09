import PersonPinIcon from '@mui/icons-material/PersonPin';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItemButton,
    ListItemText,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const SelectSTAGIdentityDialog = ({ open, onClose, onSelectIdentity, stagApiService }) => {
    const { t } = useTranslation();
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedRoleIdentifier, setSelectedRoleIdentifier] = useState('');

    useEffect(() => {
        if (open) {
            const fetchAndSetRoles = async () => {
                setIsLoading(true);
                setError('');
                setSelectedRoleIdentifier('');
                setRoles([]);

                try {
                    const userInfo = stagApiService.getUserInfo(); // Získáme aktuální userInfo
                    const currentTicket = stagApiService.getStagUserTicket();

                    console.log('SelectSTAGIdentityDialog: Current ticket:', currentTicket);
                    console.log('SelectSTAGIdentityDialog: UserInfo from service:', userInfo);

                    if (!currentTicket || currentTicket === 'anonymous') {
                        throw new Error(
                            t(
                                'Dialogs.selectIdentity.errorNoTicket',
                                'Chybí platný STAG ticket pro načtení rolí. Zkuste se přihlásit znovu.'
                            )
                        );
                    }

                    let rolesToDisplay = [];
                    // Primárně použijeme role z userInfo, pokud jsou dostupné a validní
                    if (userInfo && Array.isArray(userInfo.roles) && userInfo.roles.length > 0) {
                        console.log(
                            'SelectSTAGIdentityDialog: Using roles from stagApiService.getUserInfo()',
                            userInfo.roles
                        );
                        rolesToDisplay = userInfo.roles;
                    } else {
                        // Fallback: Pokud userInfo.roles nejsou k dispozici, zkusíme je explicitně načíst
                        // Toto by nemělo být potřeba, pokud EditorPage správně čeká na handleLoginCallback
                        console.warn(
                            'SelectSTAGIdentityDialog: userInfo.roles not found or empty, attempting explicit fetch with getStagUserListForLoginTicket. Ticket:',
                            currentTicket
                        );
                        const fetchedRolesFromApi =
                            await stagApiService.getStagUserListForLoginTicket(currentTicket);

                        if (fetchedRolesFromApi && fetchedRolesFromApi.length > 0) {
                            rolesToDisplay = fetchedRolesFromApi;
                            // Pokud jsme je museli explicitně načíst, můžeme zvážit aktualizaci userInfo v stagApiService
                            // Např. pokud by userInfo nebylo z URL kompletní.
                            // stagApiService.setUserInfoFromBase64(btoa(JSON.stringify({ ...userInfo, roles: fetchedRolesFromApi /* nebo stagUserInfo: fetchedRolesFromApi */ })));
                        }
                    }

                    if (rolesToDisplay.length > 0) {
                        const processedRoles = rolesToDisplay.map(role => ({
                            ...role,
                            // 'userName' je dle vašeho debug výpisu identifikátor jako A24B0093P
                            // 'stagUser' je obecný název parametru pro API volání
                            // Pro výběr použijeme to, co jednoznačně identifikuje roli pro další kroky
                            identifier:
                                role.userName || role.stagUser || role.osCislo || role.ucitIdno,
                            displayName:
                                role.roleNazev ||
                                role.popis ||
                                `${role.typ || t('common.unknownType', 'Neznámý typ')}`,
                            secondaryInfo:
                                `${role.fakulta ? `${role.fakulta}` : ''}${role.osCislo && role.fakulta ? ` / ${role.osCislo}` : role.osCislo || ''}${role.ucitIdno && !role.osCislo ? `ID: ${role.ucitIdno}` : ''}`.trim() ||
                                role.userName ||
                                role.stagUser,
                        }));
                        setRoles(processedRoles.filter(role => role.identifier)); // Jen role s platným identifikátorem
                        if (processedRoles.filter(role => role.identifier).length === 0) {
                            setError(
                                t(
                                    'Dialogs.selectIdentity.noValidRolesFound',
                                    'Nebyly nalezeny žádné validní STAG role/identity.'
                                )
                            );
                        }
                    } else {
                        setError(
                            t(
                                'Dialogs.selectIdentity.noRolesFound',
                                'Nebyly nalezeny žádné STAG role/identity pro váš účet.'
                            )
                        );
                    }
                } catch (err) {
                    console.error('Error processing/fetching STAG roles for dialog:', err);
                    setError(
                        err.message ||
                            t(
                                'Dialogs.selectIdentity.errorFetchingRoles',
                                'Nepodařilo se načíst STAG role.'
                            )
                    );
                } finally {
                    setIsLoading(false);
                }
            };

            fetchAndSetRoles();
        }
    }, [open, stagApiService, t]);

    const handleListItemClick = identifier => {
        setSelectedRoleIdentifier(identifier);
        setError('');
    };

    const handleSubmit = () => {
        if (selectedRoleIdentifier) {
            onSelectIdentity(selectedRoleIdentifier);
        } else {
            setError(t('Dialogs.selectIdentity.pleaseSelectRole', 'Prosím, vyberte jednu roli.'));
        }
    };

    const handleCancelAndCleanup = () => {
        onClose(true);
    };

    return (
        <Dialog open={open} onClose={handleCancelAndCleanup} fullWidth maxWidth="sm">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonPinIcon sx={{ mr: 1, color: 'primary.main' }} />
                {t('Dialogs.selectIdentity.title', 'Výběr STAG Identity/Role')}
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, minHeight: '200px' }}>
                {isLoading && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            p: 3,
                            height: '100%',
                        }}
                    >
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>
                            {t('Dialogs.selectIdentity.loadingRoles', 'Načítání rolí...')}
                        </Typography>
                    </Box>
                )}
                {!isLoading && error && (
                    <Alert severity="error" sx={{ m: 2, wordBreak: 'break-word' }}>
                        {error}
                    </Alert>
                )}
                {/* Zobrazíme, i když je chyba, pokud je to "noRolesFound/Available" */}
                {!isLoading && !error && roles.length === 0 && (
                    <Alert severity="info" sx={{ m: 2 }}>
                        {t(
                            'Dialogs.selectIdentity.noRolesAvailable',
                            'Pro váš účet nejsou aktuálně k dispozici žádné STAG role nebo se je nepodařilo načíst.'
                        )}
                    </Alert>
                )}
                {!isLoading && !error && roles.length > 0 && (
                    <List dense>
                        {roles.map((role, index) => (
                            <ListItemButton
                                key={role.identifier || `role-${index}`}
                                selected={selectedRoleIdentifier === role.identifier}
                                onClick={() => handleListItemClick(role.identifier)}
                                disabled={!role.identifier} // Zakázat výběr, pokud chybí identifikátor
                            >
                                <ListItemText
                                    primary={role.displayName}
                                    secondary={
                                        role.secondaryInfo ||
                                        t('common.noAdditionalInfo', 'Bez dalších informací')
                                    }
                                    primaryTypographyProps={{
                                        sx: {
                                            fontWeight:
                                                selectedRoleIdentifier === role.identifier
                                                    ? 'bold'
                                                    : 'normal',
                                        },
                                    }}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={handleCancelAndCleanup}>{t('common.cancel', 'Zrušit')}</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isLoading || !selectedRoleIdentifier || roles.length === 0 || !!error} // Přidána kontrola error
                >
                    {t('common.continue', 'Pokračovat')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SelectSTAGIdentityDialog;
