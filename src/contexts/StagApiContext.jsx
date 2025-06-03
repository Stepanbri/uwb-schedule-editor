// src/contexts/StagApiContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import StagApiService from '../services/StagApiService';
import { STAG_LOGIN_FLOW_KEY } from '../constants/stagConstants'; // Vytvoříme tento soubor

const StagApiContext = createContext(null);

export const StagApiProvider = ({ children }) => {
    const stagApiService = useMemo(() => new StagApiService(), []);

    const [stagUserTicket, setStagUserTicket] = useState(stagApiService.getStagUserTicket());
    const [userInfo, setUserInfo] = useState(stagApiService.getUserInfo());
    const [selectedStagUserRole, setSelectedStagUserRole] = useState(stagApiService.getSelectedStagUserRole());
    const [isProcessingLoginCallback, setIsProcessingLoginCallback] = useState(true); // Začínáme s true pro kontrolu URL

    // Efekt pro zpracování STAG login callbacku při načtení aplikace
    useEffect(() => {
        const processLoginCallback = async () => {
            const queryParams = new URLSearchParams(window.location.search);
            const ticket = queryParams.get('stagUserTicket');
            const stagUserInfoBase64 = queryParams.get('stagUserInfo');
            const activeLoginFlow = localStorage.getItem(STAG_LOGIN_FLOW_KEY);

            if (ticket && activeLoginFlow) { // activeLoginFlow může být např. 'studentCourses'
                console.log("StagApiContext: Processing STAG login callback...");
                localStorage.removeItem(STAG_LOGIN_FLOW_KEY);

                // Vyčistit URL parametry
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);

                const loginSuccess = stagApiService.handleLoginCallback(queryParams);
                if (loginSuccess) {
                    setStagUserTicket(stagApiService.getStagUserTicket());
                    setUserInfo(stagApiService.getUserInfo());
                    setSelectedStagUserRole(stagApiService.getSelectedStagUserRole());
                    console.log("StagApiContext: STAG login successful. UserInfo:", stagApiService.getUserInfo());
                } else {
                    console.error("StagApiContext: STAG login callback processing failed.");
                    // Zde by mohl být nějaký fallback nebo notifikace uživateli
                }
            }
            setIsProcessingLoginCallback(false);
        };

        processLoginCallback();
    }, [stagApiService]);


    const redirectToStagLogin = useCallback((flowKey, requestLongTicket = false) => {
        localStorage.setItem(STAG_LOGIN_FLOW_KEY, flowKey);
        const currentAppBaseUrl = `${window.location.origin}${window.location.pathname}`;
        stagApiService.redirectToLogin(currentAppBaseUrl, true, requestLongTicket);
    }, [stagApiService]);

    const setRole = useCallback((roleIdentifier) => {
        stagApiService.setSelectedStagUserRole(roleIdentifier);
        setSelectedStagUserRole(stagApiService.getSelectedStagUserRole());
    }, [stagApiService]);

    const clearStagAuthData = useCallback(() => {
        stagApiService.setStagUserTicket(null);
        stagApiService.setUserInfoFromBase64(null); // Tím se resetuje i selectedStagUserRole uvnitř služby
        setStagUserTicket(null);
        setUserInfo({ jmeno: '', prijmeni: '', email: '', titulPred: '', titulZa: '', roles: [] });
        setSelectedStagUserRole(null);
        console.log("StagApiContext: STAG authentication data cleared.");
    }, [stagApiService]);


    const value = {
        stagApiService, // Přímý přístup k instanci pro volání API metod
        stagUserTicket,
        userInfo,
        selectedStagUserRole,
        isProcessingLoginCallback,
        redirectToStagLogin,
        setRole,
        clearStagAuthData,
    };

    return (
        <StagApiContext.Provider value={value}>
            {children}
        </StagApiContext.Provider>
    );
};

export const useStagApi = () => {
    const context = useContext(StagApiContext);
    if (!context) {
        throw new Error('useStagApi must be used within a StagApiProvider');
    }
    return context;
};