// Konfigurace překladů v aplikaci pomocí knihovny i18next
// Umožňuje snadnou lokalizaci textů a podporu více jazyků
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

i18n.use(HttpApi) // Načítá překlady např. z /public/locales
    .use(LanguageDetector) // Detekuje jazyk uživatele
    .use(initReactI18next) // Předává i18n instanci do react-i18next
    .init({
        supportedLngs: ['cs', 'en'], // Podporované jazyky aplikace
        fallbackLng: 'cs', // Výchozí jazyk, pokud není detekovaný jazyk podporován
        debug: import.meta.env.DEV, // Zapnutí debug módu v development prostředí
        interpolation: {
            escapeValue: false, // React sám řeší escapování, není potřeba duplikovat
        },
        backend: {
            loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`, // Cesta k souborům s překlady
        },
    });

export default i18n;
