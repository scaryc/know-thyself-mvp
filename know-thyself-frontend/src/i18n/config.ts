import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: 'en', // default language
    fallbackLng: 'en',
    supportedLngs: ['en', 'sk'],

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    ns: ['ui', 'api', 'common'],
    defaultNS: 'ui',

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false,
    },

    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;
