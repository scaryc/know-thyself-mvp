import { useTranslation as useI18nextTranslation } from 'react-i18next';

/**
 * Custom hook that wraps react-i18next's useTranslation hook
 * Provides a convenient interface for translating strings in the application
 */
export const useTranslation = (namespace: string = 'ui') => {
  const { t, i18n } = useI18nextTranslation(namespace);

  return {
    t,
    i18n,
    language: i18n.language,
  };
};

export default useTranslation;
