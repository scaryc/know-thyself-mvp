import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Language Loader Utility
 * Dynamically loads content based on language preference
 * Supports fallback to English if translation not available
 */

/**
 * Load agent prompt based on agent type and language
 * @param {string} agentType - Type of agent (core-agent-ami, cognitiveCoachAgent, aarAgent)
 * @param {string} language - Language code (en, sk)
 * @returns {string} Prompt content
 */
function loadPrompt(agentType, language = 'en') {
  try {
    const promptPath = path.join(__dirname, '..', 'prompts', language, `${agentType}.txt`);

    // Check if language-specific prompt exists
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf-8');
    }

    // Fallback to English if translation not available
    console.warn(`[LanguageLoader] ⚠️  FALLBACK TRIGGERED: Prompt '${agentType}' not found for language '${language}', using English instead`);
    console.warn(`[LanguageLoader] Expected path: ${promptPath}`);
    const fallbackPath = path.join(__dirname, '..', 'prompts', 'en', `${agentType}.txt`);
    return fs.readFileSync(fallbackPath, 'utf-8');
  } catch (error) {
    console.error(`Error loading prompt ${agentType} in ${language}:`, error);
    throw new Error(`Failed to load prompt: ${agentType}`);
  }
}

/**
 * Load scenario JSON based on scenario ID and language
 * @param {string} scenarioId - Scenario filename (e.g., 'asthma_patient_v2.0_final')
 * @param {string} language - Language code (en, sk)
 * @returns {object} Scenario data
 */
function loadScenario(scenarioId, language = 'en') {
  try {
    // Add .json extension if not present
    const filename = scenarioId.endsWith('.json') ? scenarioId : `${scenarioId}.json`;
    const scenarioPath = path.join(__dirname, '..', '..', 'scenarios', language, filename);

    // Check if language-specific scenario exists
    if (fs.existsSync(scenarioPath)) {
      const content = fs.readFileSync(scenarioPath, 'utf-8');
      return JSON.parse(content);
    }

    // Fallback to English if translation not available
    console.warn(`[LanguageLoader] ⚠️  FALLBACK TRIGGERED: Scenario '${scenarioId}' not found for language '${language}', using English instead`);
    console.warn(`[LanguageLoader] Expected path: ${scenarioPath}`);
    const fallbackPath = path.join(__dirname, '..', '..', 'scenarios', 'en', filename);
    const content = fs.readFileSync(fallbackPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading scenario ${scenarioId} in ${language}:`, error);
    throw new Error(`Failed to load scenario: ${scenarioId}`);
  }
}

/**
 * Load cognitive coach questions based on language
 * @param {string} language - Language code (en, sk)
 * @returns {array} Array of question objects
 */
function loadQuestions(language = 'en') {
  try {
    const questionsPath = path.join(__dirname, '..', 'data', language, 'cognitiveCoachQuestions.json');

    // Check if language-specific questions exist
    if (fs.existsSync(questionsPath)) {
      const content = fs.readFileSync(questionsPath, 'utf-8');
      return JSON.parse(content);
    }

    // Fallback to English if translation not available
    console.warn(`[LanguageLoader] ⚠️  FALLBACK TRIGGERED: Cognitive questions not found for language '${language}', using English instead`);
    console.warn(`[LanguageLoader] Expected path: ${questionsPath}`);
    const fallbackPath = path.join(__dirname, '..', 'data', 'en', 'cognitiveCoachQuestions.json');
    const content = fs.readFileSync(fallbackPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading questions in ${language}:`, error);
    throw new Error('Failed to load cognitive coach questions');
  }
}

/**
 * Load translation strings from locale JSON files
 * @param {string} language - Language code (en, sk)
 * @param {string} namespace - Translation namespace (ui, api, common)
 * @returns {object} Translation object
 */
function loadTranslations(language = 'en', namespace = 'api') {
  try {
    const translationsPath = path.join(__dirname, '..', '..', 'public', 'locales', language, `${namespace}.json`);

    // Check if language-specific translations exist
    if (fs.existsSync(translationsPath)) {
      const content = fs.readFileSync(translationsPath, 'utf-8');
      return JSON.parse(content);
    }

    // Fallback to English if translation not available
    console.warn(`[LanguageLoader] ⚠️  FALLBACK TRIGGERED: Translations '${namespace}' not found for language '${language}', using English instead`);
    console.warn(`[LanguageLoader] Expected path: ${translationsPath}`);
    const fallbackPath = path.join(__dirname, '..', '..', 'public', 'locales', 'en', `${namespace}.json`);
    const content = fs.readFileSync(fallbackPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading translations ${namespace} in ${language}:`, error);
    return {}; // Return empty object if all fails
  }
}

/**
 * Get a specific translation string by key path
 * @param {string} key - Dot-notation key path (e.g., 'registration.success')
 * @param {string} language - Language code (en, sk)
 * @param {string} namespace - Translation namespace (ui, api, common)
 * @returns {string} Translated string
 */
function getTranslation(key, language = 'en', namespace = 'api') {
  try {
    const translations = loadTranslations(language, namespace);

    // Navigate through nested object using key path
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key} in ${namespace}.${language}`);
        return key; // Return key itself if not found
      }
    }

    return value;
  } catch (error) {
    console.error(`Error getting translation for ${key} in ${language}:`, error);
    return key; // Return key itself on error
  }
}

/**
 * Get all available scenarios for a language
 * @param {string} language - Language code (en, sk)
 * @returns {array} Array of scenario filenames
 */
function getAvailableScenarios(language = 'en') {
  try {
    const scenariosDir = path.join(__dirname, '..', '..', 'scenarios', language);

    if (fs.existsSync(scenariosDir)) {
      return fs.readdirSync(scenariosDir)
        .filter(file => file.endsWith('.json'));
    }

    // Fallback to English scenarios
    const fallbackDir = path.join(__dirname, '..', '..', 'scenarios', 'en');
    return fs.readdirSync(fallbackDir)
      .filter(file => file.endsWith('.json'));
  } catch (error) {
    console.error(`Error getting available scenarios in ${language}:`, error);
    return [];
  }
}

export {
  loadPrompt,
  loadScenario,
  loadQuestions,
  loadTranslations,
  getTranslation,
  getAvailableScenarios
};
