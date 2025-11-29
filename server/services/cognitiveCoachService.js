// Cognitive Coach Service (ES Module Version)
// Handles question pool loading, random selection, and question retrieval

import { loadQuestions } from '../utils/languageLoader.js';

// Cache question pools by language
const questionPoolCache = new Map();

function loadQuestionPool(language = 'en') {
  if (!questionPoolCache.has(language)) {
    const questionPool = loadQuestions(language);
    questionPoolCache.set(language, questionPool);
    console.log(`✅ Loaded ${questionPool.cognitiveCoachQuestionPool.length} cognitive coach questions (${language})`);
  }
  return questionPoolCache.get(language);
}

/**
 * Randomly select N questions from the pool
 * @param {number} count - Number of questions to select (2-5)
 * @param {string} language - Language code ('en' or 'sk')
 * @returns {Array} Selected question objects
 */
export function selectRandomQuestions(count = 3, language = 'en') {
  // Ensure question pool is loaded
  const pool = loadQuestionPool(language);
  
  // Validate count (between 2 and 5)
  const questionCount = Math.min(Math.max(count, 2), 5);
  
  // Shuffle and select
  const shuffled = [...pool.cognitiveCoachQuestionPool]
    .sort(() => Math.random() - 0.5);
  
  const selected = shuffled.slice(0, questionCount);
  
  console.log(`🎲 Selected ${questionCount} random questions:`, selected.map(q => q.questionID).join(', '));
  
  return selected;
}

/**
 * Get question by ID
 * @param {string} questionID - Question ID (e.g., "CC001")
 * @param {string} language - Language code ('en' or 'sk')
 * @returns {Object|null} Question object or null if not found
 */
export function getQuestionByID(questionID, language = 'en') {
  const pool = loadQuestionPool(language);
  return pool.cognitiveCoachQuestionPool.find(q => q.questionID === questionID) || null;
}

/**
 * Get all questions (for agent context)
 * @param {string} language - Language code ('en' or 'sk')
 * @returns {Array} All 20 questions
 */
export function getAllQuestions(language = 'en') {
  const pool = loadQuestionPool(language);
  return pool.cognitiveCoachQuestionPool;
}

/**
 * Get questions by category
 * @param {string} category - Category name
 * @param {string} language - Language code ('en' or 'sk')
 * @returns {Array} Questions in that category
 */
export function getQuestionsByCategory(category, language = 'en') {
  const pool = loadQuestionPool(language);
  return pool.cognitiveCoachQuestionPool.filter(q => q.category === category);
}

/**
 * Get all available categories
 * @param {string} language - Language code ('en' or 'sk')
 * @returns {Array} Unique category names
 */
export function getCategories(language = 'en') {
  const pool = loadQuestionPool(language);
  const categories = [...new Set(pool.cognitiveCoachQuestionPool.map(q => q.category))];
  return categories;
}

// Default export
export default {
  selectRandomQuestions,
  getQuestionByID,
  getAllQuestions,
  getQuestionsByCategory,
  getCategories
};