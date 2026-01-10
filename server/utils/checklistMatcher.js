// server/utils/checklistMatcher.js

/**
 * Match a student action to a checklist item
 * Uses keyword matching with blueprint-defined or default keywords
 *
 * @param {string} action - Detected action string from structured memory
 * @param {array} checklist - Blueprint's critical_actions_checklist
 * @returns {object|null} Matched checklist item with match confidence, or null
 */
export function findChecklistMatch(action, checklist) {
  if (!action || !checklist || checklist.length === 0) {
    return null;
  }

  const actionLower = action.toLowerCase();

  for (const item of checklist) {
    const keywords = getKeywordsForChecklistItem(item);
    const matchedKeyword = keywords.find(kw => actionLower.includes(kw.toLowerCase()));

    if (matchedKeyword) {
      return {
        ...item,
        matchedKeyword,
        matchConfidence: item.matching ? 'high' : 'medium'
      };
    }
  }

  return null;
}

/**
 * Get keywords for matching a checklist item
 * Priority: blueprint-defined keywords > generated keywords
 *
 * @param {object} checklistItem - Single checklist item from blueprint
 * @returns {array} Array of keywords to match against
 */
function getKeywordsForChecklistItem(checklistItem) {
  // If blueprint has explicit matching config, use it
  if (checklistItem.matching?.keywords) {
    const allKeywords = [
      ...(checklistItem.matching.keywords || []),
      ...(checklistItem.matching.synonyms || []),
      ...(checklistItem.matching.tool_mappings || [])
    ];
    return allKeywords;
  }

  // Otherwise, generate keywords from action text and category
  return generateDefaultKeywords(checklistItem);
}

/**
 * Generate default keywords when blueprint doesn't specify them
 * @param {object} checklistItem - Checklist item
 * @returns {array} Generated keywords
 */
function generateDefaultKeywords(checklistItem) {
  const actionLower = checklistItem.action.toLowerCase();
  const category = checklistItem.category?.toLowerCase() || '';

  // Default keyword mappings for common medical actions
  const defaultMappings = {
    // Oxygen-related
    'oxygen': ['oxygen', 'o2', 'non-rebreather', 'nrb', 'nasal cannula', 'high-flow', 'mask'],
    'high-flow': ['high-flow', 'high flow', '15l', '15 l', 'non-rebreather'],

    // Medications
    'salbutamol': ['salbutamol', 'albuterol', 'ventolin', 'bronchodilator', 'nebulizer', 'neb'],
    'corticosteroid': ['steroid', 'corticosteroid', 'hydrocortisone', 'methylprednisolone', 'dexamethasone', 'prednisolone'],
    'adrenaline': ['adrenaline', 'epinephrine', 'epi'],
    'aspirin': ['aspirin', 'asa'],
    'nitro': ['nitro', 'nitroglycerin', 'gtn', 'nitrate'],

    // Assessment
    'abcde': ['abcde', 'abc', 'primary survey', 'systematic assessment'],
    'sample': ['sample', 'history', 'allergies', 'medications', 'past medical'],
    'vital': ['vitals', 'vital signs', 'blood pressure', 'bp', 'pulse', 'heart rate', 'hr', 'spo2', 'respiratory rate', 'rr'],
    'auscultation': ['auscultate', 'auscultation', 'listen', 'breath sounds', 'lung sounds', 'chest sounds'],

    // Scene/Safety
    'scene': ['scene', 'safety', 'safe', 'hazard', 'bsi', 'ppe'],

    // Monitoring
    'ecg': ['ecg', 'ekg', 'cardiac monitor', '12-lead', '12 lead', 'rhythm'],
    'monitor': ['monitor', 'reassess', 'recheck', 're-assess', 're-check'],

    // IV/Access
    'iv': ['iv', 'intravenous', 'cannula', 'access', 'line'],

    // Airway
    'airway': ['airway', 'bvm', 'bag valve', 'intubate', 'suction'],

    // C-spine
    'spine': ['c-spine', 'cspine', 'cervical', 'spine', 'immobilization', 'collar']
  };

  // Find matching default keywords
  for (const [key, keywords] of Object.entries(defaultMappings)) {
    if (actionLower.includes(key)) {
      return keywords;
    }
  }

  // Fallback: extract significant words from action (4+ characters)
  const words = actionLower
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 4);

  return words.length > 0 ? words : [actionLower];
}

/**
 * Check if action should be excluded from matching (negations)
 * @param {string} action - Action string
 * @param {object} checklistItem - Checklist item with potential exclusion keywords
 * @returns {boolean} True if action should be excluded
 */
export function shouldExcludeAction(action, checklistItem) {
  const exclusionKeywords = checklistItem.matching?.exclusion_keywords || [
    "don't", "dont", "not yet", "haven't", "havent", "won't", "wont",
    "shouldn't", "shouldnt", "wouldn't", "wouldnt", "no ", "didn't", "didnt"
  ];

  const actionLower = action.toLowerCase();
  return exclusionKeywords.some(kw => actionLower.includes(kw));
}

/**
 * Calculate points based on timing
 * @param {object} checklistItem - Checklist item with points and time_target_minutes
 * @param {number} actualTime - Actual time action was performed (minutes)
 * @returns {number} Points earned
 */
export function calculatePoints(checklistItem, actualTime) {
  if (!checklistItem.points) return 0;

  const target = checklistItem.time_target_minutes;

  if (!target || actualTime <= target) {
    return checklistItem.points; // Full points if on time or no target
  }

  // Graduated scoring based on how late
  const minutesLate = actualTime - target;

  if (minutesLate <= 2) {
    return Math.round(checklistItem.points * 0.75); // 75% if 1-2 min late
  } else if (minutesLate <= 5) {
    return Math.round(checklistItem.points * 0.5); // 50% if 3-5 min late
  } else {
    return Math.round(checklistItem.points * 0.25); // 25% if >5 min late
  }
}

export default {
  findChecklistMatch,
  shouldExcludeAction,
  calculatePoints
};
