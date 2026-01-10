// server/utils/blueprintLoader.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCENARIOS_DIR = path.join(__dirname, '..', '..', 'scenarios', 'en');

/**
 * Load a full blueprint by scenario ID
 * @param {string} scenarioId - e.g., "asthma_patient_v2_0_final"
 * @returns {object|null} Full blueprint JSON or null if not found
 */
export function loadBlueprint(scenarioId) {
  try {
    // Try direct filename match
    const directPath = path.join(SCENARIOS_DIR, `${scenarioId}.json`);
    if (fs.existsSync(directPath)) {
      const content = fs.readFileSync(directPath, 'utf-8');
      return JSON.parse(content);
    }

    // Try searching directory for matching file
    const files = fs.readdirSync(SCENARIOS_DIR);
    const matchingFile = files.find(f =>
      f.includes(scenarioId) && f.endsWith('.json')
    );

    if (matchingFile) {
      const content = fs.readFileSync(path.join(SCENARIOS_DIR, matchingFile), 'utf-8');
      return JSON.parse(content);
    }

    console.warn(`Blueprint not found for scenario: ${scenarioId}`);
    return null;
  } catch (error) {
    console.error(`Error loading blueprint ${scenarioId}:`, error);
    return null;
  }
}

/**
 * Load multiple blueprints
 * @param {string[]} scenarioIds - Array of scenario IDs
 * @returns {object} Map of scenarioId -> blueprint
 */
export function loadBlueprints(scenarioIds) {
  const blueprints = {};
  for (const id of scenarioIds) {
    blueprints[id] = loadBlueprint(id);
  }
  return blueprints;
}

/**
 * Extract AAR-relevant sections from full blueprint
 * Reduces token usage while preserving essential educational content
 * @param {object} blueprint - Full blueprint JSON
 * @returns {object} Filtered blueprint with AAR-relevant sections
 */
export function extractAARRelevantContent(blueprint) {
  if (!blueprint) return null;

  return {
    metadata: blueprint.metadata || {},
    patient_profile: blueprint.patient_profile || {},

    // Educational content
    critical_decision_points: blueprint.critical_decision_points || {},
    critical_actions_checklist: blueprint.critical_actions_checklist || [],
    common_errors: blueprint.common_errors || [],
    challenge_points: blueprint.challenge_points || [],

    // State information for understanding patient progression
    patient_states: blueprint.patient_states || {},

    // Treatment information for understanding student actions
    medications_available: blueprint.medications_available || {},
    treatment_responses: blueprint.treatment_responses || {},

    // Optional: consequence templates if they exist
    consequence_templates: blueprint.consequence_templates || null,
    educational_gaps: blueprint.educational_gaps || null
  };
}

export default {
  loadBlueprint,
  loadBlueprints,
  extractAARRelevantContent
};
