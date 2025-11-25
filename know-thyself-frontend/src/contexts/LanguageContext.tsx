import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  supportedLanguages: { code: string; label: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'sk', label: 'Slovenčina' },
];

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<string>(() => {
    // Try to get language from localStorage first
    const savedLanguage = localStorage.getItem('userLanguage');
    return savedLanguage || 'en';
  });

  useEffect(() => {
    // Change i18n language when language state changes
    i18n.changeLanguage(language);
    // Store in localStorage
    localStorage.setItem('userLanguage', language);
  }, [language, i18n]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    supportedLanguages,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
