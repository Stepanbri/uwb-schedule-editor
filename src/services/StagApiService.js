// Služba pro komunikaci se STAG API
// Poskytuje metody pro autentizaci, získávání dat o předmětech a studijních plánech

// Přímé URL pro STAG servery pro login redirect a API volání
const DIRECT_PROD_STAG_URL = 'https://stag-ws.zcu.cz';
const DIRECT_DEMO_STAG_URL = 'https://stag-demo.zcu.cz';

class StagApiService {
    // Konstruktor inicializuje cesty pro API a přihlášení
    // apiRootPath: např. '/api/stag-production/' (pro API volání přes proxy)
    // useDemoServer: boolean, indikuje, zda se má použít demo STAG pro login
    constructor(apiRootPath, useDemoServer) {
        if (!apiRootPath) {
            throw new Error('StagApiService: apiRootPath is required in constructor!');
        }
        // Zajistíme, aby apiRootPath končil lomítkem
        const internalApiBasePath = apiRootPath.endsWith('/') ? apiRootPath : `${apiRootPath}/`;

        this.wsBaseUrl = `${internalApiBasePath}ws/services/rest2`; // Pro API volání přes proxy

        // Sestavení přímé login URL
        const loginDomain = useDemoServer ? DIRECT_DEMO_STAG_URL : DIRECT_PROD_STAG_URL;
        this.loginUrl = `${loginDomain}/ws/login`; // Standardní cesta pro login přímo na STAG server

        console.log(
            `StagApiService initialized with wsBaseUrl: ${this.wsBaseUrl}, direct loginUrl: ${this.loginUrl}`
        );

        // Inicializace stavových proměnných
        this.stagUserTicket = null;
        this.userInfo = {
            jmeno: '',
            prijmeni: '',
            email: '',
            titulPred: '',
            titulZa: '',
            roles: [],
        };
        this.selectedStagUserRole = null;
    }

    // Nastavení přístupového tokenu pro STAG API
    setStagUserTicket(ticket) {
        this.stagUserTicket = ticket === 'anonymous' || !ticket ? null : ticket;
    }

    // Dekódování a nastavení informací o uživateli z base64 řetězce
    // Tato data přicházejí z callback URL po přihlášení do STAGu
    setUserInfoFromBase64(base64UserInfo) {
        if (!base64UserInfo) {
            this.userInfo = {
                jmeno: '',
                prijmeni: '',
                email: '',
                titulPred: '',
                titulZa: '',
                roles: [],
            };
            this.selectedStagUserRole = null;
            return;
        }
        try {
            // Dekódování base64 řetězce
            const binaryString = atob(base64UserInfo);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const jsonUserInfoDecoded = new TextDecoder('utf-8').decode(bytes);
            const parsedData = JSON.parse(jsonUserInfoDecoded);

            this.userInfo = {
                jmeno: parsedData.jmeno || '',
                prijmeni: parsedData.prijmeni || '',
                email: parsedData.email || '',
                titulPred: parsedData.titulPred || '',
                titulZa: parsedData.titulZa || '',
                // Očekáváme, že stagUserInfo je pole rolí, jak je vidět v debug výstupu.
                // Každá role by měla mít 'userName' (např. A21N0001P) a 'roleNazev' (např. "Student").
                roles: Array.isArray(parsedData.stagUserInfo) ? parsedData.stagUserInfo : [],
            };

            console.log(
                'StagApiService: Parsed userInfo from Base64. Full userInfo object:',
                this.userInfo
            );

            // Automatický výběr první studentské role, pokud existuje a žádná není aktivní
            if (
                this.userInfo.roles &&
                this.userInfo.roles.length > 0 &&
                !this.selectedStagUserRole
            ) {
                const studentRole = this.userInfo.roles.find(r => r.role === 'ST' && r.userName);
                this.selectedStagUserRole = studentRole
                    ? studentRole.userName
                    : this.userInfo.roles[0].userName || this.userInfo.roles[0].stagUser;
                console.log(
                    'StagApiService: Automatically selected role:',
                    this.selectedStagUserRole
                );
            }
        } catch (error) {
            console.error(
                'StagApiService: Chyba při parsování stagUserInfo z Base64:',
                error,
                'Base64 data:',
                base64UserInfo.substring(0, 100)
            );
            this.userInfo = {
                jmeno: '',
                prijmeni: '',
                email: '',
                titulPred: '',
                titulZa: '',
                roles: [],
            };
            this.selectedStagUserRole = null;
        }
    }

    getStagUserTicket() {
        return this.stagUserTicket;
    }
    getUserInfo() {
        return this.userInfo;
    }

    setSelectedStagUserRole(stagUserIdentifier) {
        if (
            this.userInfo &&
            this.userInfo.roles &&
            this.userInfo.roles.find(
                role => role.userName === stagUserIdentifier || role.stagUser === stagUserIdentifier
            )
        ) {
            this.selectedStagUserRole = stagUserIdentifier;
            console.log('StagApiService: Selected role set to - ', stagUserIdentifier);
        } else {
            console.warn(
                `StagApiService: Role '${stagUserIdentifier}' nenalezena. Dostupné role:`,
                this.userInfo?.roles
            );
            // Můžeme nechat null nebo vybrat první, pokud je to žádoucí
            // this.selectedStagUserRole = (this.userInfo?.roles?.[0]?.userName || this.userInfo?.roles?.[0]?.stagUser || null);
        }
    }
    getSelectedStagUserRole() {
        return this.selectedStagUserRole;
    }

    redirectToLogin(originalURL, useOnlyMainLogin = true, requestLongTicket = false) {
        const encodedOriginalURL = encodeURIComponent(originalURL);
        let loginRedirectUrl = `${this.loginUrl}?originalURL=${encodedOriginalURL}`;
        if (useOnlyMainLogin) loginRedirectUrl += '&onlyMainLoginMethod=1';
        if (requestLongTicket) loginRedirectUrl += '&longTicket=1';
        console.log('StagApiService: Redirecting to STAG login:', loginRedirectUrl);
        window.location.href = loginRedirectUrl;
    }

    handleLoginCallback(queryParams) {
        const ticket = queryParams.get('stagUserTicket');
        const userInfoBase64 = queryParams.get('stagUserInfo');
        if (ticket) {
            this.setStagUserTicket(ticket);
            if (userInfoBase64) this.setUserInfoFromBase64(userInfoBase64);
            return true;
        }
        return false;
    }

    async _doRequest(
        endpoint,
        params = {},
        method = 'GET',
        requiresAuth = true,
        useSelectedRoleAsStagUser = false
    ) {
        const queryParams = new URLSearchParams(params);
        if (params.outputFormat !== null) {
            // outputFormat=null znamená, že nechceme outputFormat parametr
            queryParams.set('outputFormat', params.outputFormat || 'JSON');
        }

        // Automatické přidání `stagUser` parametru, pokud je role vybrána a `useSelectedRoleAsStagUser` je true
        // a parametr `stagUser` nebo `osCislo` již není explicitně v `params`.
        if (
            useSelectedRoleAsStagUser &&
            this.selectedStagUserRole &&
            !params.stagUser &&
            !params.osCislo
        ) {
            queryParams.set('stagUser', this.selectedStagUserRole);
        }

        const url = `${this.wsBaseUrl}/${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const options = { method, headers: {} };

        if (requiresAuth) {
            if (!this.stagUserTicket) {
                console.warn(
                    `API volání na ${endpoint} možná vyžaduje autentizaci, ale není dostupný ticket.`
                );
            } else {
                options.headers['Authorization'] = 'Basic ' + btoa(`${this.stagUserTicket}:`);
            }
        }

        try {
            console.log(`StagApiService: Requesting ${method} ${url}`);
            const response = await fetch(url, options);
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json(); // Zkusíme parsovat chybovou odpověď jako JSON
                } catch {
                    errorData = await response.text(); // Pokud není JSON, vezmeme text
                }
                console.error(`Chyba API (${response.status}) pro ${url}:`, errorData);
                if (response.status === 401 || response.status === 403) {
                    this.setStagUserTicket(null); // Invalidace ticketu
                    this.setUserInfoFromBase64(null);
                }
                throw new Error(
                    `STAG API chyba ${response.status}: ${response.statusText}. Detail: ${typeof errorData === 'string' ? errorData : JSON.stringify(errorData)}`
                );
            }
            const responseText = await response.text();
            if (!responseText && response.status === 204) return null; // No content
            if (!responseText) return {}; // Prázdná odpověď, ale OK

            return JSON.parse(responseText);
        } catch (error) {
            console.error(
                `StagApiService: Chyba síťového požadavku nebo parsování pro ${endpoint}:`,
                error
            );
            throw error;
        }
    }

    // --- Veřejné metody pro STAG API endpointy ---

    async getCurrentSemesterInfo() {
        return this._doRequest('kalendar/getAktualniObdobiInfo', {}, 'GET', false);
    }

    async getStagUserListForLoginTicket(ticket = this.stagUserTicket) {
        if (!ticket || ticket === 'anonymous') {
            console.warn('getStagUserListForLoginTicket: Chybí platný ticket.');
            return [];
        }
        try {
            const rolesV2 = await this._doRequest(
                'help/getStagUserListForLoginTicketV2',
                { ticket },
                'GET',
                false
            );
            return Array.isArray(rolesV2) ? rolesV2 : []; // V2 by měla vracet přímo pole
        } catch (errorV2) {
            console.warn('getStagUserListForLoginTicketV2 selhal, zkouším V1:', errorV2.message);
            try {
                const rolesV1 = await this._doRequest(
                    'help/getStagUserListForLoginTicket',
                    { ticket },
                    'GET',
                    false
                );
                return Array.isArray(rolesV1?.role)
                    ? rolesV1.role
                    : rolesV1?.role
                      ? [rolesV1.role]
                      : [];
            } catch (errorV1) {
                console.error('getStagUserListForLoginTicket V1 také selhal:', errorV1.message);
                return [];
            }
        }
    }

    async getSubjectInfo(departmentCode, subjectShortCode, year, lang = 'en') {
        lang = 'en';
        return this._doRequest(
            'predmety/getPredmetInfo',
            { katedra: departmentCode, zkratka: subjectShortCode, lang, rok: year },
            'GET',
            false
        );
    }

    async getScheduleEvents(criteria, lang = 'en') {
        lang = en;
        if (!criteria.rok || !criteria.semestr)
            throw new Error('Rok a semestr jsou povinné pro getRozvrhoveAkce.');
        const response = await this._doRequest(
            'rozvrhy/getRozvrhoveAkce',
            { ...criteria, lang },
            'GET',
            true,
            true
        ); // requiresAuth=true, useSelectedRole=true (pro případ, že by některé akce byly vázané na roli)
        return Array.isArray(response?.rozvrhovaAkce)
            ? response.rozvrhovaAkce
            : response?.rozvrhovaAkce
              ? [response.rozvrhovaAkce]
              : [];
    }

    /**
     * Vrátí informace o studentovi.
     * Endpoint: student/getStudentInfo
     * @param {string} osCislo - Osobní číslo studenta.
     * @param {string} rok - Akademický rok pro kontext (může být relevantní pro zobrazení studia v daném roce).
     * @param {boolean} [zobrazovatSimsUdaje=false]
     * @param {string} [lang='en'] - Jazyk odpovědi.
     * @returns {Promise<object>}
     */
    async getStudentInfo(osCislo, rok, zobrazovatSimsUdaje = false, lang = 'en') {
        lang = 'en';
        if (!osCislo) throw new Error('osCislo je povinné pro getStudentInfo.');
        // 'rok' je volitelný dle dokumentace, ale pro kontext studia může být užitečný
        const params = { osCislo, zobrazovatSimsUdaje: zobrazovatSimsUdaje ? 'A' : 'N', lang };
        if (rok) params.rok = rok; // Přidáme rok, pokud je specifikován
        return this._doRequest('student/getStudentInfo', params, 'GET', true); // Vyžaduje autentizaci
    }

    /**
     * Vrátí seznam předmětů pro daný obor a akademický rok.
     * Endpoint: predmety/getPredmetyByObor
     * @param {string} oborIdno - ID oboru.
     * @param {string} rok - Akademický rok.
     * @param {string} [vyznamPredmetu] - Filtr pro význam předmětu (např. 'A', 'B', 'C').
     * @param {string} [lang='en'] - Jazyk odpovědi.
     * @returns {Promise<Array<object>>} Pole předmětů oboru.
     */
    async getPredmetyByObor(oborIdno, rok, vyznamPredmetu = '%', lang = 'en') {
        // STAG často používá '%' jako wildcard
        lang = 'en';
        if (!oborIdno) throw new Error('oborIdno je povinné pro getPredmetyByObor.');
        if (!rok) throw new Error('rok je povinný pro getPredmetyByObor.');
        const params = { oborIdno, rok, lang };
        if (vyznamPredmetu && vyznamPredmetu !== '%') {
            // Pokud chceme filtrovat dle významu (statutu)
            params.vyznamPredmetu = vyznamPredmetu; // Nebo jiný parametr, pokud STAG API používá jiný název pro statut
        }
        const response = await this._doRequest('predmety/getPredmetyByObor', params, 'GET', true); // nemělo by vyžadovat autentizaci
        // Dokumentace ukazuje, že odpověď je { "predmetOboru": [...] }
        return Array.isArray(response?.predmetOboru) ? response.predmetOboru : [];
    }

    /**
     * Vrátí rozvrhové akce pro jeden konkrétní předmět.
     * Endpoint: rozvrhy/getRozvrhByPredmet
     * Tento endpoint je vhodnější než getRozvrhoveAkce, pokud máme kompletní identifikaci předmětu.
     * @param {object} criteria
     * @param {string} criteria.katedra - Katedra předmětu.
     * @param {string} criteria.zkratka - Zkratka předmětu.
     * @param {string} criteria.rok - Akademický rok.
     * @param {string} criteria.semestr - Semestr (ZS, LS, nebo % pro oba).
     * @param {string} [lang='en'] - Jazyk odpovědi.
     * @returns {Promise<Array<object>>} Pole rozvrhových akcí.
     */
    async getRozvrhByPredmet(criteria, lang = 'en') {
        if (!criteria.katedra || !criteria.zkratka || !criteria.rok || !criteria.semestr) {
            throw new Error('Katedra, zkratka, rok a semestr jsou povinné pro getRozvrhByPredmet.');
        }
        lang = 'en';
        const params = { ...criteria, jenRozvrhoveAkce: true, lang };
        const response = await this._doRequest('rozvrhy/getRozvrhByPredmet', params, 'GET', true); // auth?
        return Array.isArray(response?.rozvrhovaAkce) ? response.rozvrhovaAkce : [];
    }
}

export default StagApiService;
