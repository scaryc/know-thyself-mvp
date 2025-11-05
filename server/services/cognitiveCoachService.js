// Cognitive Coach Service (ES Module Version)
// Handles question pool loading, random selection, and question retrieval

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load question pool once at startup
let questionPool = null;

function loadQuestionPool() {
  if (!questionPool) {
    const questionPoolPath = path.join(__dirname, '../data/cognitiveCoachQuestions.json');
    const rawData = fs.readFileSync(questionPoolPath, 'utf8');
    questionPool = JSON.parse(rawData);
    console.log(`✅ Loaded ${questionPool.cognitiveCoachQuestionPool.length} cognitive coach questions`);
  }
  return questionPool;
}

/**
 * Randomly select N questions from the pool
 * @param {number} count - Number of questions to select (2-5)
 * @returns {Array} Selected question objects
 */
export function selectRandomQuestions(count = 3) {
  // Ensure question pool is loaded
  const pool = loadQuestionPool();
  
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
 * @returns {Object|null} Question object or null if not found
 */
export function getQuestionByID(questionID) {
  const pool = loadQuestionPool();
  return pool.cognitiveCoachQuestionPool.find(q => q.questionID === questionID) || null;
}

/**
 * Get all questions (for agent context)
 * @returns {Array} All 20 questions
 */
export function getAllQuestions() {
  const pool = loadQuestionPool();
  return pool.cognitiveCoachQuestionPool;
}

/**
 * Get questions by category
 * @param {string} category - Category name
 * @returns {Array} Questions in that category
 */
export function getQuestionsByCategory(category) {
  const pool = loadQuestionPool();
  return pool.cognitiveCoachQuestionPool.filter(q => q.category === category);
}

/**
 * Get all available categories
 * @returns {Array} Unique category names
 */
export function getCategories() {
  const pool = loadQuestionPool();
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