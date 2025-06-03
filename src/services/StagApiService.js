// PROJEKT/NEW/src/services/StagApiService.js

// Použijeme proxy cestu pro vývoj, pokud je vite.config.js nastaven
// V produkci byste zde měli plnou URL.
const IS_DEV = import.meta.env.DEV;
const PROXY_PATH = '/api-stag'; // Stejné jako ve vite.config.js

const DEFAULT_STAG_WS_BASE_URL = IS_DEV ? `${PROXY_PATH}/ws/services/rest2` : "https://stag-ws.zcu.cz/ws/services/rest2";
const DEFAULT_STAG_LOGIN_URL = "https://stag-ws.zcu.cz/ws/login";

// const DEFAULT_STAG_WS_BASE_URL = "https://stag-ws.zcu.cz/ws/services/rest2"; // Původní
// //const DEFAULT_STAG_WS_BASE_URL = "/api-stag/ws/services/rest2"; // Nová relativní cesta pro proxy
//
// // Login URL pro přesměrování zůstává absolutní, proxy se na ni nevztahuje
// const DEFAULT_STAG_LOGIN_URL = "https://stag-ws.zcu.cz/ws/login";

class StagApiService {
    constructor(options = {}) {
        this.wsBaseUrl = options.wsBaseUrl || DEFAULT_STAG_WS_BASE_URL;
        this.loginUrl = options.loginUrl || DEFAULT_STAG_LOGIN_URL;
        this.stagUserTicket = options.initialTicket || null;
        this.userInfo = options.initialUserInfo || { jmeno: '', prijmeni: '', email: '', titulPred: '', titulZa: '', roles: [] };
        this.selectedStagUserRole = null; // Identifikátor vybrané role (např. "A23N0001P")
    }

    setStagUserTicket(ticket) {
        this.stagUserTicket = (ticket === "anonymous" || !ticket) ? null : ticket;
    }

    setUserInfoFromBase64(base64UserInfo) {
        if (!base64UserInfo) {
            this.userInfo = { jmeno: '', prijmeni: '', email: '', titulPred: '', titulZa: '', roles: [] };
            this.selectedStagUserRole = null;
            return;
        }
        try {
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
                roles: Array.isArray(parsedData.stagUserInfo) ? parsedData.stagUserInfo : []
            };

            console.log("StagApiService: Parsed userInfo from Base64. Full userInfo object:", this.userInfo);

            // Automatický výběr první studentské role, pokud existuje a žádná není aktivní
            if (this.userInfo.roles && this.userInfo.roles.length > 0 && !this.selectedStagUserRole) {
                const studentRole = this.userInfo.roles.find(r => r.role === 'ST' && r.userName);
                this.selectedStagUserRole = studentRole ? studentRole.userName : (this.userInfo.roles[0].userName || this.userInfo.roles[0].stagUser);
                console.log("StagApiService: Automatically selected role:", this.selectedStagUserRole);
            }
        } catch (error) {
            console.error("StagApiService: Chyba při parsování stagUserInfo z Base64:", error, "Base64 data:", base64UserInfo.substring(0,100));
            this.userInfo = { jmeno: '', prijmeni: '', email: '', titulPred: '', titulZa: '', roles: [] };
            this.selectedStagUserRole = null;
        }
    }

    getStagUserTicket() { return this.stagUserTicket; }
    getUserInfo() { return this.userInfo; }

    setSelectedStagUserRole(stagUserIdentifier) {
        if (this.userInfo && this.userInfo.roles && this.userInfo.roles.find(role => (role.userName === stagUserIdentifier || role.stagUser === stagUserIdentifier))) {
            this.selectedStagUserRole = stagUserIdentifier;
            console.log("StagApiService: Selected role set to - ", stagUserIdentifier);
        } else {
            console.warn(`StagApiService: Role '${stagUserIdentifier}' nenalezena. Dostupné role:`, this.userInfo?.roles);
            // Můžeme nechat null nebo vybrat první, pokud je to žádoucí
            // this.selectedStagUserRole = (this.userInfo?.roles?.[0]?.userName || this.userInfo?.roles?.[0]?.stagUser || null);
        }
    }
    getSelectedStagUserRole() { return this.selectedStagUserRole; }

    redirectToLogin(originalURL, useOnlyMainLogin = true, requestLongTicket = false) {
        const encodedOriginalURL = encodeURIComponent(originalURL);
        let loginRedirectUrl = `${this.loginUrl}?originalURL=${encodedOriginalURL}`;
        if (useOnlyMainLogin) loginRedirectUrl += "&onlyMainLoginMethod=1"; // [cite: 61]
        if (requestLongTicket) loginRedirectUrl += "&longTicket=1"; // [cite: 62]
        window.location.href = loginRedirectUrl;
    }

    handleLoginCallback(queryParams) {
        const ticket = queryParams.get('stagUserTicket');
        const userInfoBase64 = queryParams.get('stagUserInfo');
        if (ticket) {
            this.setStagUserTicket(ticket); // [cite: 63]
            if (userInfoBase64) this.setUserInfoFromBase64(userInfoBase64); // [cite: 64]
            return true;
        }
        return false;
    }

    async _doRequest(endpoint, params = {}, method = 'GET', requiresAuth = true, useSelectedRoleAsStagUser = false) {
        const queryParams = new URLSearchParams(params);
        if (params.outputFormat !== null) { // outputFormat=null znamená, že nechceme outputFormat parametr
            queryParams.set("outputFormat", params.outputFormat || "JSON"); // [cite: 91]
        }


        // Automatické přidání `stagUser` parametru, pokud je role vybrána a `useSelectedRoleAsStagUser` je true
        // a parametr `stagUser` nebo `osCislo` již není explicitně v `params`.
        if (useSelectedRoleAsStagUser && this.selectedStagUserRole && !params.stagUser && !params.osCislo) {
            queryParams.set("stagUser", this.selectedStagUserRole);
        }

        const url = `${this.wsBaseUrl}/${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const options = { method, headers: {} };

        if (requiresAuth) {
            if (!this.stagUserTicket) {
                console.warn(`API volání na ${endpoint} vyžaduje autentizaci, ale není dostupný ticket.`);
                // Můžeme zde vyhodit chybu, nebo nechat STAG API, aby ji vrátilo
                // throw new Error("Chybí autentizační ticket pro požadavek.");
            } else {
                options.headers['Authorization'] = 'Basic ' + btoa(`${this.stagUserTicket}:`); // [cite: 55, 57, 66]
            }
        }

        try {
            console.log(`StagApiService: Requesting ${method} ${url}`);
            const response = await fetch(url, options);
            if (!response.ok) { // [cite: 71]
                let errorData;
                try {
                    errorData = await response.json(); // Zkusíme parsovat chybovou odpověď jako JSON
                } catch (e) {
                    errorData = await response.text(); // Pokud není JSON, vezmeme text
                }
                console.error(`Chyba API (${response.status}) pro ${url}:`, errorData);
                if (response.status === 401 || response.status === 403) { // [cite: 71]
                    this.setStagUserTicket(null); // Invalidace ticketu
                    this.setUserInfoFromBase64(null);
                }
                throw new Error(`STAG API chyba ${response.status}: ${response.statusText}. Detail: ${typeof errorData === 'string' ? errorData : JSON.stringify(errorData)}`);
            }
            const responseText = await response.text();
            if (!responseText && response.status === 204) return null; // No content
            if (!responseText) return {}; // Prázdná odpověď, ale OK

            return JSON.parse(responseText);
        } catch (error) {
            console.error(`StagApiService: Chyba síťového požadavku nebo parsování pro ${endpoint}:`, error);
            throw error;
        }
    }

    // --- Veřejné metody pro STAG API endpointy ---

    async getCurrentSemesterInfo() { // [cite: 85]
        return this._doRequest("kalendar/getAktualniObdobiInfo", {}, 'GET', false);
    }

    async getStagUserListForLoginTicket(ticket = this.stagUserTicket) { // [cite: 77]
        if (!ticket || ticket === "anonymous") {
            console.warn("getStagUserListForLoginTicket: Chybí platný ticket.");
            return [];
        }
        try {
            const rolesV2 = await this._doRequest("help/getStagUserListForLoginTicketV2", { ticket }, 'GET', false);
            return Array.isArray(rolesV2) ? rolesV2 : []; // V2 by měla vracet přímo pole
        } catch (errorV2) {
            console.warn("getStagUserListForLoginTicketV2 selhal, zkouším V1:", errorV2.message);
            try {
                const rolesV1 = await this._doRequest("help/getStagUserListForLoginTicket", { ticket }, 'GET', false);
                return Array.isArray(rolesV1?.role) ? rolesV1.role : (rolesV1?.role ? [rolesV1.role] : []);
            } catch (errorV1) {
                console.error("getStagUserListForLoginTicket V1 také selhal:", errorV1.message);
                return [];
            }
        }
    }

    async getSubjectInfo(departmentCode, subjectShortCode, year, lang = 'cs') { // [cite: 82]
        return this._doRequest("predmety/getPredmetInfo", { katedra: departmentCode, zkratka: subjectShortCode, lang, rok:year }, 'GET', false);
    }

    async getScheduleEvents(criteria, lang = 'cs') { // [cite: 83]
        if (!criteria.rok || !criteria.semestr) throw new Error("Rok a semestr jsou povinné pro getRozvrhoveAkce.");
        const response = await this._doRequest("rozvrhy/getRozvrhoveAkce", { ...criteria, lang }, 'GET', true, true); // requiresAuth=true, useSelectedRole=true (pro případ, že by některé akce byly vázané na roli)
        return Array.isArray(response?.rozvrhovaAkce) ? response.rozvrhovaAkce : (response?.rozvrhovaAkce ? [response.rozvrhovaAkce] : []);
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
        if (!osCislo) throw new Error("osCislo je povinné pro getStudentInfo.");
        // 'rok' je volitelný dle dokumentace, ale pro kontext studia může být užitečný
        const params = { osCislo, zobrazovatSimsUdaje: zobrazovatSimsUdaje ? 'A' : 'N', lang };
        if (rok) params.rok = rok; // Přidáme rok, pokud je specifikován
        return this._doRequest("student/getStudentInfo", params, 'GET', true); // Vyžaduje autentizaci
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
    async getPredmetyByObor(oborIdno, rok, vyznamPredmetu = '%', lang = 'en') { // STAG často používá '%' jako wildcard
        if (!oborIdno) throw new Error("oborIdno je povinné pro getPredmetyByObor.");
        if (!rok) throw new Error("rok je povinný pro getPredmetyByObor.");
        const params = { oborIdno, rok, lang };
        if (vyznamPredmetu && vyznamPredmetu !== '%') { // Pokud chceme filtrovat dle významu (statutu)
            params.vyznamPredmetu = vyznamPredmetu; // Nebo jiný parametr, pokud STAG API používá jiný název pro statut
        }
        const response = await this._doRequest("predmety/getPredmetyByObor", params, 'GET', true); // Předpokládáme autentizaci
        // Dokumentace (JSON response formáty STAG API.pdf, str. 2) ukazuje, že odpověď je { "predmetOboru": [...] }
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
            throw new Error("Katedra, zkratka, rok a semestr jsou povinné pro getRozvrhByPredmet.");
        }
        const params = { ...criteria, jenRozvrhoveAkce: true ,lang };
        const response = await this._doRequest("rozvrhy/getRozvrhByPredmet", params, 'GET', true); // Může vyžadovat auth
        // Dokumentace (JSON response formáty STAG API.pdf, str. 16) ukazuje, že odpověď je { "rozvrhovaAkce": [...] }
        return Array.isArray(response?.rozvrhovaAkce) ? response.rozvrhovaAkce : [];
    }


    // Původní getScheduleEvents přejmenujeme, aby nedošlo ke kolizi a bylo jasnější, že je obecnější
    async getScheduleEventsForSubjectCriteria(criteria, lang = 'en') { //
        if (!criteria.rok || !criteria.semestr) {
            throw new Error("Rok a semestr jsou povinné pro getRozvrhoveAkce.");
        }
        const params = { ...criteria, lang: lang };
        const response = await this._doRequest("rozvrhy/getRozvrhoveAkce", params, 'GET', true);
        return Array.isArray(response?.rozvrhovaAkce) ? response.rozvrhovaAkce : (response?.rozvrhovaAkce ? [response.rozvrhovaAkce] : []);
    }

    /**
     * Vrátí předměty studijního plánu studenta.
     * Toto je ZJEDNODUŠENÍ. Reálnější by bylo použít např. programy/getPlanyOboru, pak programy/getBlokyPlanu, pak predmety/getPredmetyByBlok.
     * Prozatím můžeme použít predmety/getPredmetyByStudent a doufat, že vrátí dostatek informací,
     * nebo předpokládat, že budeme mít ID studijního plánu (stplIdno).
     * Dokument "IS_STAG - Webové služby.pdf" uvádí "studium/getPredmetyByPlanId" (str. 128)
     * @param {string} stplIdno - ID studijního plánu.
     * @param {string} rok - Akademický rok.
     * @param {string} [lang='cs'] - Jazyk.
     * @returns {Promise<Array<object>>} Předměty plánu.
     */
    async getPredmetyByPlanId(stplIdno, rok, lang = 'cs') {
        if (!stplIdno) throw new Error("stplIdno je povinné pro getPredmetyByPlanId.");
        // 'rok' zde může být rok platnosti plánu, nebo aktuální akademický rok pro zobrazení nabízených předmětů
        const response = await this._doRequest("studium/getPredmetyByPlanId", { stplIdno, rok, lang }, 'GET', true);
        // Struktura odpovědi může být složitější, např. { planBlokInfo: [{ predmetInfo: [] }] }
        // Zde je nutné parsovat odpověď dle skutečné struktury.
        // Příklad (velmi zjednodušený, nutno ověřit strukturu odpovědi!):
        let predmety = [];
        if (response && Array.isArray(response.planBlokInfo)) {
            response.planBlokInfo.forEach(blok => {
                if (blok.predmetInfo && Array.isArray(blok.predmetInfo)) {
                    predmety = predmety.concat(blok.predmetInfo.map(p => ({ ...p, rokVarianty: rok /* Abychom měli rok pro filtrování */}))); // Přidáme rok pro filtrování
                }
            });
        } else if (Array.isArray(response?.predmet)) { // Alternativní možná struktura
            predmety = response.predmet.map(p => ({ ...p, rokVarianty: rok }));
        }
        return predmety;
    }

    // MOCK verze, dokud neznáme přesný endpoint pro "GetPredmetyByOborFull"
    // Tato metoda by měla vrátit VŠECHNY předměty daného oboru/programu napříč ročníky a semestry
    // aby je pak EditorPage mohl filtrovat dle uživatelského výběru roku, semestru a statutu.
    async getAllSubjectsForStudyContext(context, lang = 'cs') {
        // context by měl obsahovat např. currentStudentContext.oborIdno nebo stplIdno
        console.warn("StagApiService.getAllSubjectsForStudyContext: Používám mockovaná data. Implementujte reálné volání API!");
        if (!context || (!context.stplIdno && !context.oborIdno)) {
            throw new Error("Chybí ID studijního plánu nebo oboru pro getAllSubjectsForStudyContext.");
        }

        // Příklad: Pokud máme stplIdno (ID studijního plánu)
        // Mohli bychom zkusit getPredmetyByPlanId pro několik relevantních let (např. aktuální, +1, -1)
        // a poté je spojit. To je ale jen odhad.
        // Nebo pokud máme oborIdno, můžeme zkusit programy/getPlanyOboru a pak pro každý plán volat getPredmetyByPlanId.

        // Prozatím mock:
        const currentYear = new Date().getFullYear();
        const yearsToFetch = [`${currentYear - 1}/${currentYear}`, `${currentYear}/${currentYear + 1}`, `${currentYear + 1}/${currentYear + 2}`];
        let allMockSubjects = [];

        for (const year of yearsToFetch) {
            allMockSubjects.push(
                { katedra: "KIV", zkratka: `PPA${year.substring(2,4)}`, nazev: `Programování 1 (${year})`, kreditu: 6, rok: year, semestr: "Z", statut: "A", predmetId: `STAG_MOCK_PPA_${year.replace('/','')}` },
                { katedra: "KIV", zkratka: `PPR${year.substring(2,4)}`, nazev: `Principy Poč. (${year})`, kreditu: 5, rok: year, semestr: "L", statut: "A", predmetId: `STAG_MOCK_PPR_${year.replace('/','')}` },
                { katedra: "KMA", zkratka: `MA1${year.substring(2,4)}`, nazev: `Matematika 1 (${year})`, kreditu: 7, rok: year, semestr: "Z", statut: "A", predmetId: `STAG_MOCK_MA1_${year.replace('/','')}` },
                { katedra: "KIV", zkratka: `UUR${year.substring(2,4)}`, nazev: `Uživatelská Rozhr. (${year})`, kreditu: 4, rok: year, semestr: "L", statut: "B", predmetId: `STAG_MOCK_UUR_${year.replace('/','')}` },
                { katedra: "KIV", zkratka: `WWW${year.substring(2,4)}`, nazev: `Tvorba WWW (${year})`, kreditu: 5, rok: year, semestr: "Z", statut: "B", predmetId: `STAG_MOCK_WWW_${year.replace('/','')}` },
                { katedra: "KJP", zkratka: `AN1${year.substring(2,4)}`, nazev: `Angličtina 1 (${year})`, kreditu: 3, rok: year, semestr: "Z", statut: "C", predmetId: `STAG_MOCK_AN1_${year.replace('/','')}` }
            );
        }
        return allMockSubjects.map(s => ({...s, rokVarianty: s.rok})); // Přidáme rokVarianty pro konzistenci
    }


}

export default StagApiService;