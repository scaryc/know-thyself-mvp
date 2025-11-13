/**
 * Know Thyself MVP - Express Server
 * Integrates ScenarioEngine with Claude AI
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ScenarioEngine from './services/scenarioEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import cognitiveCoachPromptBuilder from './services/cognitiveCoachPrompt.js';
import cognitiveCoachService from './services/cognitiveCoachService.js';
import aarService from './services/aarService.js';

// Initialize
const app = express();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory session storage (MVP - replace with database later)
const sessions = new Map();

/**
 * Load scenario from JSON file
 */
function loadScenario(scenarioId) {
  const scenarioPath = path.join(__dirname, `../scenarios/${scenarioId}.json`);
  return JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
}

/**
 * Load AI system prompt
 */
function loadSystemPrompt() {
  const promptPath = path.join(__dirname, '../prompts/core-agent-ami.txt');
  if (fs.existsSync(promptPath)) {
    return fs.readFileSync(promptPath, 'utf8');
  }
  // Fallback prompt if file doesn't exist
  return `You are simulating a patient in a medical training scenario. 
Respond as the patient would, showing realistic symptoms and reactions.
Be authentic and follow the scenario context provided.`;
}

// ============================================================================
// STUDENT REGISTRATION (Layer 3 - MVP Testing)
// ============================================================================

// Track A/B group counts for automatic balancing
let groupCounts = { A: 0, B: 0 };

/**
 * Generate unique student ID from name
 * Format: {name_part}_{timestamp}{random}
 * Example: "alice_smith_lx3k9p2m7"
 */
function generateStudentId(name) {
  // Create URL-safe name part
  const namePart = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')      // Spaces to underscores
    .replace(/[^a-z0-9_]/g, '') // Remove special chars
    .substring(0, 30);          // Max 30 chars

  // Add unique suffix
  const timestamp = Date.now().toString(36); // Base-36 timestamp
  const random = Math.random().toString(36).substring(2, 7); // 5 random chars

  return `${namePart}_${timestamp}${random}`;
}

/**
 * Assign A/B group with automatic 50/50 balancing
 * Strategy: If groups equal, random. Otherwise, assign to smaller group.
 */
function assignGroup() {
  // If equal, randomly assign
  if (groupCounts.A === groupCounts.B) {
    const group = Math.random() < 0.5 ? 'A' : 'B';
    groupCounts[group]++;
    return group;
  }

  // If unbalanced, assign to smaller group to maintain balance
  const group = groupCounts.A < groupCounts.B ? 'A' : 'B';
  groupCounts[group]++;
  return group;
}

/**
 * Initialize group counts from existing student files on server start
 */
function initializeGroupCounts() {
  try {
    const studentsDir = path.join(__dirname, '../data/students');
    if (!fs.existsSync(studentsDir)) {
      fs.mkdirSync(studentsDir, { recursive: true });
      return;
    }

    const files = fs.readdirSync(studentsDir);
    groupCounts = { A: 0, B: 0 };

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(studentsDir, file);
        const studentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (studentData.group === 'A' || studentData.group === 'B') {
          groupCounts[studentData.group]++;
        }
      }
    });

    console.log('📊 Initialized group counts:', groupCounts);
  } catch (error) {
    console.error('Error initializing group counts:', error);
    groupCounts = { A: 0, B: 0 };
  }
}

// Initialize on server start
initializeGroupCounts();

// ============================================================================
// LAYER 3: FEATURE 3 - AUTO-SAVE ON COMPLETION
// ============================================================================

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins} minutes ${secs} seconds`;
}

/**
 * Generate scenario summaries from session data
 */
function generateScenarioSummaries(session) {
  const summaries = [];
  const completedScenarios = session.completedScenarios || [];

  completedScenarios.forEach((scenarioData, index) => {
    const duration = scenarioData.duration || 'unknown';
    const finalState = scenarioData.finalState || 'unknown';
    const finalVitals = scenarioData.finalVitals || {};

    summaries.push({
      scenarioId: scenarioData.scenarioId || `scenario_${index + 1}`,
      scenarioTitle: scenarioData.title || scenarioData.scenarioId || `Scenario ${index + 1}`,
      duration: duration,
      finalState: finalState,
      finalVitals: finalVitals
    });
  });

  return summaries;
}

/**
 * Save student data to disk when session completes
 * Layer 3: Feature 3 - Auto-Save on Completion
 */
async function saveStudentData(session) {
  try {
    // Calculate elapsed time
    const elapsedSeconds = (Date.now() - session.startTime) / 1000;

    const studentData = {
      studentId: session.studentId,
      studentName: session.studentName,
      studentEmail: session.studentEmail,
      group: session.group,
      sessionId: session.sessionId,

      timestamps: {
        registered: session.registeredAt || null,
        sessionStarted: new Date(session.startTime).toISOString(),
        sessionCompleted: session.completedAt,
        totalElapsed: formatDuration(elapsedSeconds)
      },

      performance: calculatePerformanceScore(session),
      scenarios: generateScenarioSummaries(session),
      criticalActions: session.criticalActionsLog || [],
      challengePoints: session.challengePointsUsed || [],
      aarTranscript: aarService.getConversationHistory(session.sessionId),

      metadata: {
        version: 'Layer3_MVP',
        challengePointsEnabled: session.challengePointsEnabled,
        scenariosCompleted: (session.completedScenarios || []).length,
        totalMessages: (session.messages || []).length,
        sessionComplete: true
      }
    };

    // Save to primary location
    const primaryPath = path.join(__dirname, '../data/students', `${session.studentId}.json`);
    await fs.promises.mkdir(path.dirname(primaryPath), { recursive: true });
    await fs.promises.writeFile(primaryPath, JSON.stringify(studentData, null, 2));

    // Save to backup location (organized by date)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const backupDir = path.join(__dirname, '../data/backups', today);
    await fs.promises.mkdir(backupDir, { recursive: true });

    const backupPath = path.join(backupDir, `${session.studentId}.json`);
    await fs.promises.writeFile(backupPath, JSON.stringify(studentData, null, 2));

    console.log(`💾 Saved: ${primaryPath}`);
    console.log(`💾 Backup: ${backupPath}`);

    return { success: true, primaryPath, backupPath };
  } catch (error) {
    console.error('❌ Error saving student data:', error);
    throw error;
  }
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/student/register
 * Register a new student for MVP testing
 * Generates unique student ID and assigns A/B group with automatic balancing
 */
app.post('/api/student/register', async (req, res) => {
  try {
    const { name, email, consent } = req.body;

    // Validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your full name (at least 2 characters)'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Name must be less than 100 characters'
      });
    }

    // Validate name contains only letters and spaces
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return res.status(400).json({
        success: false,
        error: 'Name must contain only letters and spaces'
      });
    }

    // Validate email if provided
    if (email && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address'
        });
      }
    }

    // Validate consent
    if (!consent) {
      return res.status(400).json({
        success: false,
        error: 'You must consent to data collection to participate'
      });
    }

    // Generate student ID and assign group
    const studentId = generateStudentId(name);
    const group = assignGroup();

    // Create student data
    const studentData = {
      studentId,
      studentName: name.trim(),
      studentEmail: email?.trim() || null,
      group,
      registeredAt: new Date().toISOString(),
      sessionId: null,
      status: 'registered'
    };

    // Save to disk immediately
    const studentsDir = path.join(__dirname, '../data/students');
    if (!fs.existsSync(studentsDir)) {
      fs.mkdirSync(studentsDir, { recursive: true });
    }

    const studentFilePath = path.join(studentsDir, `${studentId}.json`);
    fs.writeFileSync(studentFilePath, JSON.stringify(studentData, null, 2));

    console.log(`✅ Student registered: ${studentId} (Group ${group})`);
    console.log(`📊 Current group counts: A=${groupCounts.A}, B=${groupCounts.B}`);

    res.json({
      success: true,
      studentId,
      group,
      message: `Welcome, ${name.trim()}! You've been assigned to Group ${group}.`
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration. Please try again.'
    });
  }
});

/**
 * GET /api/sessions/:sessionId/check
 * Check if session exists and get its current state
 * Layer 3: Used for session resume on browser refresh
 */
app.get('/api/sessions/:sessionId/check', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.json({ exists: false });
    }

    // Check if session is complete
    const isComplete = session.sessionComplete === true;

    res.json({
      exists: true,
      complete: isComplete,
      currentAgent: session.currentAgent,
      currentScenarioIndex: session.currentScenarioIndex || 0,
      scenarioQueue: session.scenarioQueue || [],
      completedScenarios: session.completedScenarios || [],
      isAARMode: session.isAARMode || false,
      studentId: session.studentId,
      studentName: session.studentName,
      group: session.group,
      dispatchInfo: session.dispatchInfo || null,
      patientInfo: session.patientInfo || null
    });

  } catch (error) {
    console.error('Error checking session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sessions/start
 * Start a new training session
 * Modified for Layer 3: Accepts studentId and auto-configures based on A/B group
 */
app.post('/api/sessions/start', async (req, res) => {
  try {
    const { scenarioId = 'asthma_patient_v2.0_final', studentId, scenarioQueue } = req.body;

    // Layer 3: Load student data if provided
    let studentData = null;
    let challengePointsEnabled = true; // Default

    if (studentId) {
      try {
        const studentFilePath = path.join(__dirname, '../data/students', `${studentId}.json`);
        if (fs.existsSync(studentFilePath)) {
          studentData = JSON.parse(fs.readFileSync(studentFilePath, 'utf8'));
          // Auto-configure based on A/B group
          // Group A = Challenge Points ENABLED
          // Group B = Challenge Points DISABLED
          challengePointsEnabled = studentData.group === 'A';
          console.log(`👤 Student: ${studentData.studentName} (Group ${studentData.group})`);
        } else {
          console.warn(`⚠️ Student file not found: ${studentId}`);
        }
      } catch (error) {
        console.error('Error loading student data:', error);
      }
    } else {
      // Fallback: Allow manual A/B testing configuration (backward compatibility)
      challengePointsEnabled = req.body.challengePointsEnabled !== undefined
        ? req.body.challengePointsEnabled
        : true;
    }

    console.log('🎓 Starting new session with Cognitive Coach');
    console.log('Challenge Points:', challengePointsEnabled ? 'ENABLED' : 'DISABLED');

    // Select random questions for Cognitive Coach
    const selectedQuestions = cognitiveCoachService.selectRandomQuestions(3);
    console.log('Selected questions:', selectedQuestions.map(q => q.questionID));

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store MINIMAL session (scenario loads later at transition)
    const session = {
      sessionId,
      currentAgent: 'cognitive_coach',
      scenarioId: scenarioId, // Store for later use

      // Layer 3: Student identity (MVP testing)
      studentId: studentData?.studentId || null,
      studentName: studentData?.studentName || null,
      studentEmail: studentData?.studentEmail || null,
      group: studentData?.group || null,

      // Layer 3: Session tracking (Feature 2 - Session Resume)
      currentScenarioIndex: 0,
      scenarioQueue: scenarioQueue || [],  // Scenarios selected by frontend
      completedScenarios: [],
      sessionComplete: false,
      isAARMode: false,
      dispatchInfo: null,
      patientInfo: null,

      // Cognitive Coach state
      cognitiveCoach: {
        selectedQuestions: selectedQuestions.map(q => q.questionID),
        currentQuestionIndex: 0,
        responses: [],
        startTime: Date.now(),
        completed: false
      },

      // CDP Performance Tracking (Task 2.1)
      cdpEvaluations: [],
      performanceScore: 0,
      optimalCount: 0,
      acceptableCount: 0,
      suboptimalCount: 0,
      dangerousCount: 0,

      // Medication Safety Tracking (Task 2.2)
      medicationErrors: [],
      medicationWarnings: [],
      safetyViolations: 0,

      // Challenge Points System (Task 3.1)
      challengePointsEnabled: challengePointsEnabled,  // Use configured value
      challengePointsUsed: [],
      activeChallenge: null,

      // Empty arrays for now (will populate at transition)
      messages: [],
      startTime: Date.now()
      // NO engine, NO measuredVitals, NO patientNotes yet
    };

    sessions.set(sessionId, session);

    // Layer 3: Update student file with session ID
    if (studentData) {
      try {
        studentData.sessionId = sessionId;
        studentData.status = 'active';
        const studentFilePath = path.join(__dirname, '../data/students', `${studentId}.json`);
        fs.writeFileSync(studentFilePath, JSON.stringify(studentData, null, 2));
      } catch (error) {
        console.error('Error updating student file:', error);
      }
    }
    
    console.log('✅ Session created (Cognitive Coach mode):', sessionId);
    
    // Return MINIMAL response (no scenario data yet)
    res.json({
      sessionId,
      currentAgent: 'cognitive_coach',
      questionCount: selectedQuestions.length
      // NO scenario, NO vitals, NO dispatch info, NO scene description
    });
    
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS - Layer 2 (Task 1.2)
// ═══════════════════════════════════════════════════════════

// Detect treatment keywords in user messages
function detectTreatment(message, session) {
  const lowerMessage = message.toLowerCase();
  const treatments = {
    oxygen: ['oxygen', 'o2', 'non-rebreather', 'nebulizer oxygen', 'high flow'],
    salbutamol: ['salbutamol', 'ventolin', 'bronchodilator', 'nebulizer', 'albuterol'],
    steroids: ['steroid', 'corticosteroid', 'hydrocortisone', 'prednisone', 'syntophyllin'],

    // Dangerous medications (expanded for respiratory scenarios)
    dangerous: {
      // Respiratory depression (CRITICAL for asthma/respiratory scenarios)
      morphine: ['morphine', 'morphin'],
      fentanyl: ['fentanyl'],

      // Sedation (respiratory depression risk)
      propofol: ['propofol'],
      midazolam: ['midazolam', 'dormicum'],
      apaurin: ['apaurin', 'diazepam'],

      // Pain management (respiratory depression)
      tramal: ['tramal', 'tramadol'],
      novalgin: ['novalgin', 'metamizole'],

      // Beta blockers (bronchospasm in asthma)
      tensiomin: ['tensiomin', 'metoprolol', 'beta blocker', 'beta-blocker', 'propranolol', 'atenolol'],

      // Diuretics (can worsen in some scenarios)
      furosemid: ['furosemid', 'furosemide', 'lasix']
    }
  };

  const detected = [];

  // Check critical treatments
  for (const [key, keywords] of Object.entries(treatments)) {
    if (key !== 'dangerous') {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          detected.push({ type: key, keyword });
          break;
        }
      }
    }
  }

  // Check dangerous medications
  for (const [drug, keywords] of Object.entries(treatments.dangerous)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        detected.push({
          type: 'dangerous_medication',
          drug: drug,
          keyword
        });

        // Console warning for dangerous medications
        console.warn(`⚠️  DANGEROUS MEDICATION DETECTED: ${drug} (keyword: "${keyword}")`);
        console.warn(`⚠️  Student message: "${message}"`);

        break;
      }
    }
  }

  return detected;
}

/**
 * Evaluate and update patient state based on treatments and time progression
 * Implements state transition rules from Layer 2 Development Plan (Task 1.3)
 * @param {Object} session - Current session object
 * @returns {string} - New patient state ('initial' | 'stable' | 'improving' | 'deteriorating' | 'critical')
 */
function evaluateStateProgression(session) {
  // Only evaluate state for active sessions with scenarios
  if (!session || !session.scenario || session.currentAgent !== 'core') {
    return session.currentState;
  }

  const scenario = session.scenario;
  const currentState = session.currentState;

  // Calculate elapsed time since scenario start (in minutes)
  const elapsedTime = (Date.now() - session.scenarioStartTime) / 1000 / 60;

  // Get critical treatments status
  const { oxygen, salbutamol, steroids } = session.criticalTreatmentsGiven;

  let newState = currentState;
  let newVitals = { ...session.vitals };

  // ═══════════════════════════════════════════════════════════
  // DANGEROUS MEDICATION CHECK - Task 2.2
  // ═══════════════════════════════════════════════════════════

  // Check for dangerous medications - force deterioration
  if (session.medicationErrors && session.medicationErrors.length > 0) {
    // Get most recent dangerous medication
    const recentDanger = session.medicationErrors[session.medicationErrors.length - 1];
    const timeSinceDanger = (Date.now() - recentDanger.timestamp) / 60000; // minutes

    // If dangerous med given in last 2 minutes, force deterioration
    if (timeSinceDanger < 2) {
      console.warn('⚠️ Forcing deterioration due to dangerous medication');

      // Worsen vitals based on danger type
      if (recentDanger.reason.toLowerCase().includes('respiratory')) {
        newVitals.SpO2 = Math.max(80, newVitals.SpO2 - 5);
        newVitals.RR = Math.min(40, newVitals.RR + 4);
      }

      if (recentDanger.reason.toLowerCase().includes('bronchospasm')) {
        newVitals.SpO2 = Math.max(82, newVitals.SpO2 - 4);
        newVitals.RR = Math.min(38, newVitals.RR + 6);
        newVitals.HR = Math.min(150, newVitals.HR + 10);
      }

      // Force state to deteriorating or critical
      if (currentState === 'initial' || currentState === 'stable') {
        newState = 'deteriorating';
      } else if (currentState === 'improving') {
        newState = 'deteriorating';
      } else if (currentState === 'deteriorating') {
        newState = 'critical';
      }

      // Log dangerous medication impact
      session.stateHistory.push({
        state: newState,
        previousState: currentState,
        timestamp: Date.now(),
        elapsedTime: (Date.now() - session.scenarioStartTime) / 1000,
        timeSinceStart: elapsedTime,
        vitals: { ...newVitals },
        previousVitals: { ...session.vitals },
        treatmentsGiven: { ...session.criticalTreatmentsGiven },
        dangerousMedicationsGiven: session.dangerousMedicationsGiven?.length || 0,
        reason: 'Dangerous medication: ' + recentDanger.medication
      });

      // Update session state and vitals
      session.currentState = newState;
      session.vitals = newVitals;
      session.lastDeteriorationCheck = Date.now();

      console.log(`[Medication Impact] ${currentState} → ${newState} due to ${recentDanger.medication}`);
      console.log(`[Vitals Impact] SpO2: ${session.vitals.SpO2}%, HR: ${newVitals.HR}, RR: ${newVitals.RR}`);

      return newState;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STATE TRANSITION LOGIC - Asthma Scenario Rules
  // ═══════════════════════════════════════════════════════════

  // Get critical decision points from scenario (if available)
  const criticalDecisionPoints = scenario.critical_decision_points || {};
  const oxygenThreshold = criticalDecisionPoints.oxygen_administration?.time_threshold_minutes || 3;
  const salbutamolThreshold = criticalDecisionPoints.salbutamol_administration?.time_threshold_minutes || 5;

  // STATE TRANSITION RULES BY CURRENT STATE
  switch (currentState) {
    case 'initial':
      // INITIAL → IMPROVING: Both critical treatments given
      if (oxygen && salbutamol) {
        newState = 'improving';

        // Apply treatment responses from scenario JSON
        const oxygenResponse = scenario.treatment_responses?.oxygen;
        const salbutamolResponse = scenario.treatment_responses?.salbutamol;
        const steroidsResponse = scenario.treatment_responses?.steroids;

        if (oxygenResponse) newVitals = { ...newVitals, ...oxygenResponse.vital_changes };
        if (salbutamolResponse) newVitals = { ...newVitals, ...salbutamolResponse.vital_changes };
        if (steroids && steroidsResponse) newVitals = { ...newVitals, ...steroidsResponse.vital_changes };

        console.log(`[State Transition] INITIAL → IMPROVING: Critical treatments given (O2 + Salbutamol)`);
      }
      // INITIAL → DETERIORATING: Missing critical treatments after thresholds
      else if (!oxygen && elapsedTime >= oxygenThreshold) {
        newState = 'deteriorating';

        const noTreatmentProgression = scenario.no_treatment_progression;
        if (noTreatmentProgression && noTreatmentProgression['3min']) {
          newVitals = noTreatmentProgression['3min'].vitals || newVitals;
        }

        console.log(`[State Transition] INITIAL → DETERIORATING: No oxygen after ${oxygenThreshold} minutes`);
      }
      else if (!salbutamol && elapsedTime >= salbutamolThreshold) {
        newState = 'deteriorating';

        const noTreatmentProgression = scenario.no_treatment_progression;
        if (noTreatmentProgression && noTreatmentProgression['5min']) {
          newVitals = noTreatmentProgression['5min'].vitals || newVitals;
        }

        console.log(`[State Transition] INITIAL → DETERIORATING: No salbutamol after ${salbutamolThreshold} minutes`);
      }
      // INITIAL → STABLE: Partial treatment (oxygen only, early)
      else if (oxygen && !salbutamol && elapsedTime < 5) {
        newState = 'stable';

        const oxygenResponse = scenario.treatment_responses?.oxygen;
        if (oxygenResponse) {
          newVitals = { ...newVitals, ...oxygenResponse.vital_changes };
        }

        console.log(`[State Transition] INITIAL → STABLE: Oxygen given, temporarily stable`);
      }
      break;

    case 'stable':
      // STABLE → IMPROVING: Salbutamol added to oxygen
      if (oxygen && salbutamol) {
        newState = 'improving';

        const oxygenResponse = scenario.treatment_responses?.oxygen;
        const salbutamolResponse = scenario.treatment_responses?.salbutamol;
        const steroidsResponse = scenario.treatment_responses?.steroids;

        if (oxygenResponse) newVitals = { ...newVitals, ...oxygenResponse.vital_changes };
        if (salbutamolResponse) newVitals = { ...newVitals, ...salbutamolResponse.vital_changes };
        if (steroids && steroidsResponse) newVitals = { ...newVitals, ...steroidsResponse.vital_changes };

        console.log(`[State Transition] STABLE → IMPROVING: Salbutamol added to oxygen therapy`);
      }
      // STABLE → DETERIORATING: No salbutamol after threshold
      else if (oxygen && !salbutamol && elapsedTime >= 7) {
        newState = 'deteriorating';

        newVitals = {
          ...newVitals,
          RR: Math.min(newVitals.RR + 3, 32),
          HR: Math.min(newVitals.HR + 5, 140),
          SpO2: Math.max(newVitals.SpO2 - 2, 89)
        };

        console.log(`[State Transition] STABLE → DETERIORATING: No bronchodilator after 7 minutes`);
      }
      break;

    case 'deteriorating':
      // DETERIORATING → IMPROVING: Critical treatments finally given
      if (oxygen && salbutamol) {
        newState = 'improving';

        const oxygenResponse = scenario.treatment_responses?.oxygen;
        const salbutamolResponse = scenario.treatment_responses?.salbutamol;
        const steroidsResponse = scenario.treatment_responses?.steroids;

        if (oxygenResponse) newVitals = { ...newVitals, ...oxygenResponse.vital_changes };
        if (salbutamolResponse) newVitals = { ...newVitals, ...salbutamolResponse.vital_changes };
        if (steroids && steroidsResponse) newVitals = { ...newVitals, ...steroidsResponse.vital_changes };

        console.log(`[State Transition] DETERIORATING → IMPROVING: Critical treatments given`);
      }
      // DETERIORATING → CRITICAL: Still missing treatments after extended time
      else if (!oxygen && elapsedTime >= 10) {
        newState = 'critical';

        const noTreatmentProgression = scenario.no_treatment_progression;
        if (noTreatmentProgression && noTreatmentProgression['10min']) {
          newVitals = noTreatmentProgression['10min'].vitals || newVitals;
        }

        console.log(`[State Transition] DETERIORATING → CRITICAL: No oxygen after 10 minutes`);
      }
      else if (!salbutamol && elapsedTime >= 10) {
        newState = 'critical';

        const noTreatmentProgression = scenario.no_treatment_progression;
        if (noTreatmentProgression && noTreatmentProgression['10min']) {
          newVitals = noTreatmentProgression['10min'].vitals || newVitals;
        }

        console.log(`[State Transition] DETERIORATING → CRITICAL: No salbutamol after 10 minutes`);
      }
      break;

    case 'improving':
      // IMPROVING → STABLE: Vitals stabilized after treatment
      // Check if SpO2 is improving and time has passed for stabilization
      if (oxygen && salbutamol && elapsedTime >= 2 && newVitals.SpO2 >= 92) {
        // Patient has stabilized - could transition to stable in future
        // For now, keep as improving unless vitals are very good
        console.log(`[State Check] IMPROVING: Patient responding well to treatment`);
      }

      // Note: IMPROVING state typically doesn't transition back unless treatment is withdrawn
      // which is not modeled in this MVP
      break;

    case 'critical':
      // CRITICAL → IMPROVING: Aggressive treatment finally given
      if (oxygen && salbutamol) {
        newState = 'improving';

        const oxygenResponse = scenario.treatment_responses?.oxygen;
        const salbutamolResponse = scenario.treatment_responses?.salbutamol;
        const steroidsResponse = scenario.treatment_responses?.steroids;

        if (oxygenResponse) newVitals = { ...newVitals, ...oxygenResponse.vital_changes };
        if (salbutamolResponse) newVitals = { ...newVitals, ...salbutamolResponse.vital_changes };
        if (steroids && steroidsResponse) newVitals = { ...newVitals, ...steroidsResponse.vital_changes };

        console.log(`[State Transition] CRITICAL → IMPROVING: Aggressive treatment initiated`);
      }
      // CRITICAL state persists if treatments not given
      break;

    default:
      console.warn(`[State Evaluation] Unknown state: ${currentState}`);
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE VITALS FROM STATE DESCRIPTIONS OR CALCULATE CHANGES
  // ═══════════════════════════════════════════════════════════

  // Check if scenario has specific vitals defined for this state
  const stateDescriptions = scenario.state_descriptions?.[newState];

  if (stateDescriptions?.vitals) {
    // Use vitals from state_descriptions if available
    const stateVitals = stateDescriptions.vitals;
    newVitals = { ...newVitals, ...stateVitals };
    console.log(`[Vitals Update] Using state-specific vitals for '${newState}':`, stateVitals);
  }
  else if (newState !== currentState) {
    // Calculate vitals changes based on state transition
    const initialVitals = session.stateHistory?.[0]?.vitals || scenario.initial_vitals;

    if (newState === 'improving') {
      // Improving: vitals trending toward normal
      newVitals.HR = Math.max(initialVitals.HR - 15, 80);
      newVitals.RR = Math.max(initialVitals.RR - 6, 16);
      newVitals.SpO2 = Math.min(newVitals.SpO2 + 5, 94);
      if (initialVitals.BP_systolic) {
        newVitals.BP_systolic = Math.max(initialVitals.BP_systolic - 5, 110);
        newVitals.BP_diastolic = Math.max(initialVitals.BP_diastolic - 3, 70);
      }
      console.log(`[Vitals Update] Calculated improving vitals: HR↓${15}, RR↓${6}, SpO2↑${5}%`);
    }
    else if (newState === 'stable') {
      // Stable: vitals slightly improved but not fully recovered
      newVitals.HR = initialVitals.HR - 5;
      newVitals.RR = initialVitals.RR - 2;
      newVitals.SpO2 = Math.min(newVitals.SpO2 + 2, 91);
      console.log(`[Vitals Update] Calculated stable vitals: HR↓${5}, RR↓${2}, SpO2↑${2}%`);
    }
    else if (newState === 'deteriorating') {
      // Deteriorating: vitals getting worse
      newVitals.HR = Math.min(initialVitals.HR + 10, 150);
      newVitals.RR = Math.min(initialVitals.RR + 4, 36);
      newVitals.SpO2 = Math.max(newVitals.SpO2 - 3, 85);
      if (initialVitals.BP_systolic) {
        newVitals.BP_systolic = Math.min(initialVitals.BP_systolic + 8, 145);
        newVitals.BP_diastolic = Math.min(initialVitals.BP_diastolic + 5, 92);
      }
      console.log(`[Vitals Update] Calculated deteriorating vitals: HR↑${10}, RR↑${4}, SpO2↓${3}%`);
    }
    else if (newState === 'critical') {
      // Critical: vitals severely compromised
      newVitals.HR = Math.min(initialVitals.HR + 25, 160);
      newVitals.RR = Math.min(initialVitals.RR + 8, 40);
      newVitals.SpO2 = Math.max(newVitals.SpO2 - 8, 80);
      if (initialVitals.BP_systolic) {
        newVitals.BP_systolic = Math.min(initialVitals.BP_systolic + 15, 155);
        newVitals.BP_diastolic = Math.min(initialVitals.BP_diastolic + 8, 98);
      }
      console.log(`[Vitals Update] Calculated critical vitals: HR↑${25}, RR↑${8}, SpO2↓${8}%`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // LOG STATE CHANGE IF OCCURRED
  // ═══════════════════════════════════════════════════════════

  if (newState !== currentState) {
    console.log(`[State Change] ${currentState} → ${newState} at ${formatTime(elapsedTime * 60)}`);

    // Log detailed vitals change
    const oldVitals = session.vitals;
    console.log(`[Vitals Change] OLD: HR ${oldVitals.HR}, RR ${oldVitals.RR}, SpO2 ${oldVitals.SpO2}%, BP ${oldVitals.BP_systolic || '?'}/${oldVitals.BP_diastolic || '?'}`);
    console.log(`[Vitals Change] NEW: HR ${newVitals.HR}, RR ${newVitals.RR}, SpO2 ${newVitals.SpO2}%, BP ${newVitals.BP_systolic || '?'}/${newVitals.BP_diastolic || '?'}`);

    // Determine reason for state change
    let reason = '';
    if (oxygen && salbutamol) {
      reason = 'Critical treatments (oxygen + salbutamol) administered - patient improving';
    } else if (oxygen && !salbutamol) {
      if (newState === 'stable') {
        reason = 'Oxygen administered - temporarily stable but needs bronchodilator';
      } else {
        reason = 'Only oxygen given without bronchodilator - patient deteriorating';
      }
    } else if (!oxygen && salbutamol) {
      reason = 'Only salbutamol given without oxygen - patient deteriorating';
    } else if (!oxygen && !salbutamol) {
      if (newState === 'critical') {
        reason = `No critical treatments given for ${elapsedTime.toFixed(1)} minutes - patient critical`;
      } else {
        reason = `No critical treatments given for ${elapsedTime.toFixed(1)} minutes - patient deteriorating`;
      }
    } else {
      reason = 'State changed due to treatment response';
    }

    // Add to state history with complete information for AAR
    session.stateHistory.push({
      state: newState,
      previousState: currentState,
      timestamp: Date.now(),
      elapsedTime: (Date.now() - session.scenarioStartTime) / 1000, // seconds
      timeSinceStart: elapsedTime, // minutes (kept for backward compatibility)
      vitals: { ...newVitals },
      previousVitals: { ...oldVitals },
      treatmentsGiven: { ...session.criticalTreatmentsGiven },
      dangerousMedicationsGiven: session.dangerousMedicationsGiven.length,
      reason: reason
    });

    // Log as critical action
    logCriticalAction(session, `state_change_to_${newState}`, 'state_change', {
      previousState: currentState,
      newState: newState,
      vitals: newVitals,
      elapsedTime: elapsedTime
    });
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE SESSION STATE AND VITALS
  // ═══════════════════════════════════════════════════════════

  session.currentState = newState;
  session.vitals = newVitals;
  session.lastDeteriorationCheck = Date.now();

  return newState;
}

// Log critical action with timestamp
function logCriticalAction(session, action, category, extraData = {}) {
  const timeSinceStart = (Date.now() - session.scenarioStartTime) / 1000; // seconds

  session.criticalActionsLog.push({
    action: action,
    category: category, // 'treatment' | 'assessment' | 'error' | 'challenge'
    timestamp: Date.now(),
    timeSinceStart: timeSinceStart,
    elapsedTime: timeSinceStart, // Alias for compatibility
    scenarioTime: formatTime(timeSinceStart),
    ...extraData // Include treatment name, message, etc.
  });

  console.log(`[Action Logged] ${action} at ${formatTime(timeSinceStart)}`);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Calculate patient state based on treatments and time
function updatePatientState(session) {
  // Only update state for active sessions with scenarios
  if (!session || !session.scenario || session.currentAgent !== 'core') {
    return session;
  }

  const timeSinceStart = (Date.now() - session.scenarioStartTime) / 1000 / 60; // minutes
  const { oxygen, salbutamol, steroids } = session.criticalTreatmentsGiven;

  const scenario = session.scenario;
  let newState = session.currentState;
  let newVitals = session.vitals;

  // IMPROVEMENT PATH: Both critical treatments given (oxygen + salbutamol)
  if (oxygen && salbutamol) {
    newState = 'improving';

    // Apply treatment responses from scenario JSON
    const oxygenResponse = scenario.treatment_responses?.oxygen;
    const salbutamolResponse = scenario.treatment_responses?.salbutamol;

    if (oxygenResponse && salbutamolResponse) {
      // Merge vital changes from both treatments
      newVitals = {
        ...session.vitals,
        ...oxygenResponse.vital_changes,
        ...salbutamolResponse.vital_changes
      };
    }
  }

  // DETERIORATION PATH: No critical treatments given
  else if (!oxygen && !salbutamol) {
    const noTreatmentProgression = scenario.no_treatment_progression;

    if (noTreatmentProgression) {
      // Check time thresholds for deterioration
      if (timeSinceStart >= 10) {
        newState = 'critical';
        newVitals = noTreatmentProgression['10min']?.vitals || session.vitals;
      }
      else if (timeSinceStart >= 5) {
        newState = 'deteriorating';
        newVitals = noTreatmentProgression['5min']?.vitals || session.vitals;
      }
      else if (timeSinceStart >= 3) {
        newState = 'deteriorating';
        newVitals = noTreatmentProgression['3min']?.vitals || session.vitals;
      }
    }
  }

  // PARTIAL TREATMENT: Only oxygen given (no bronchodilator)
  else if (oxygen && !salbutamol) {
    if (timeSinceStart >= 7) {
      newState = 'deteriorating';
      // Partial improvement from oxygen alone
      newVitals = {
        ...session.vitals,
        SpO2: 91, // Some improvement from oxygen
        RR: 30,
        HR: 138
      };
    }
  }

  // Check if state changed and log it
  if (newState !== session.currentState) {
    console.log(`[State Change] ${session.currentState} → ${newState} at ${formatTime(timeSinceStart * 60)}`);

    // Add to state history
    session.stateHistory.push({
      state: newState,
      timestamp: Date.now(),
      vitals: newVitals,
      timeSinceStart: timeSinceStart
    });

    // Log as critical action
    logCriticalAction(session, `state_change_to_${newState}`, 'state_change', {
      previousState: session.currentState,
      newState: newState,
      vitals: newVitals
    });
  }

  // Update session state and vitals
  session.currentState = newState;
  session.vitals = newVitals;
  session.lastDeteriorationCheck = Date.now();

  return session;
}

/**
 * Build patient context for AI agent
 * Packages all relevant session data for the AI to provide accurate, state-aware responses
 * @param {Object} session - Current session object
 * @returns {string} - Formatted context string for AI system prompt
 */
function buildPatientContext(session) {
  const scenario = session.scenario;
  const currentStateDesc = scenario.state_descriptions[session.currentState];
  const elapsedMinutes = Math.floor((Date.now() - session.scenarioStartTime) / 60000);

  // Build treatment status
  const treatmentStatus = [];
  if (session.criticalTreatmentsGiven.oxygen) treatmentStatus.push('oxygen administered');
  if (session.criticalTreatmentsGiven.salbutamol) treatmentStatus.push('salbutamol administered');
  if (session.criticalTreatmentsGiven.steroids) treatmentStatus.push('steroids administered');

  // Build recent actions log (last 5 actions)
  let recentActionsText = 'None yet';
  if (session.criticalActionsLog && session.criticalActionsLog.length > 0) {
    recentActionsText = session.criticalActionsLog.slice(-5).map(log => {
      const minutes = Math.floor(log.elapsedTime / 60);
      const seconds = Math.floor(log.elapsedTime % 60);
      const timestamp = `${minutes}:${String(seconds).padStart(2, '0')}`;
      const detail = log.treatment || log.newState || log.toState || '';
      return `[${timestamp}] ${log.action}${detail ? ': ' + detail : ''}`;
    }).join('\n');
  }

  const context = `
=== CURRENT PATIENT STATE ===
State: ${session.currentState.toUpperCase()}
Time Elapsed: ${elapsedMinutes} minutes
Clinical Presentation: ${currentStateDesc.student_sees}

=== CURRENT VITALS ===
Heart Rate: ${session.vitals.HR} bpm
Respiratory Rate: ${session.vitals.RR} breaths/min
SpO2: ${session.vitals.SpO2}%
Blood Pressure: ${session.vitals.BP_systolic}/${session.vitals.BP_diastolic} mmHg
GCS: ${session.vitals.GCS}
Temperature: ${session.vitals.temperature}°C

=== TREATMENTS ADMINISTERED ===
${treatmentStatus.length > 0 ? treatmentStatus.join(', ') : 'None yet'}

=== RECENT ACTIONS (Last 5) ===
${recentActionsText}

=== RESPONSE INSTRUCTIONS ===
- Describe the patient exactly as shown in the clinical presentation above
- Use the current vitals when student checks them
- If treatments were just given, acknowledge them and show appropriate response
- Stay in character as the patient - respond naturally to questions and assessments
- Be realistic about timing - don't improve instantly, show gradual changes
`;

  return context;
}

/**
 * Build treatment response guidance for AI agent
 * Provides specific instructions on how patient should respond to detected treatments
 * @param {Array} detectedTreatments - Array of treatment type strings (e.g., ['oxygen', 'salbutamol'])
 * @param {Object} session - Current session object
 * @returns {string} - Formatted treatment response guidance for AI
 */
function buildTreatmentResponse(detectedTreatments, session) {
  if (detectedTreatments.length === 0) return '';

  const scenario = session.scenario;
  let responseText = '\n=== TREATMENT RESPONSE GUIDANCE ===\n';

  detectedTreatments.forEach(treatment => {
    // Find treatment response in scenario
    const treatmentData = scenario.treatment_responses?.[treatment];
    if (treatmentData) {
      responseText += `\nTreatment: ${treatment}\n`;
      responseText += `Response: ${treatmentData.immediate_response || 'Patient tolerates treatment'}\n`;

      // Add timing expectations
      if (treatmentData.optimal_timing) {
        const elapsed = (Date.now() - session.scenarioStartTime) / 60000;
        const onTime = elapsed <= treatmentData.optimal_timing;
        responseText += `Timing: ${onTime ? 'Optimal' : 'Delayed'} (given at ${elapsed.toFixed(1)} min)\n`;
      }
    }
  });

  responseText += '\nRespond to the student acknowledging the treatment and describing the patient\'s reaction.\n';
  return responseText;
}

/**
 * Build CDP context for AI agent
 * Provides performance feedback awareness to the AI
 * @param {Array} cdpEvaluations - Array of CDP evaluation objects
 * @returns {string} - Formatted CDP context for AI system prompt
 */
function buildCDPContext(cdpEvaluations) {
  if (!cdpEvaluations || cdpEvaluations.length === 0) return '';

  let context = '\n=== PERFORMANCE EVALUATION ===\n';

  for (const evaluation of cdpEvaluations) {
    context += `\nDecision Point: ${evaluation.cdp_title}\n`;
    context += `Rating: ${evaluation.rating.toUpperCase()}\n`;
    context += `Feedback: ${evaluation.explanation}\n`;
  }

  context += '\nYou may subtly acknowledge the student\'s performance in your response, but stay in character as the patient.\n';

  return context;
}

/**
 * Build medication safety context for AI agent
 * Provides critical safety alert when dangerous medications are administered
 * @param {Array} dangerousMedications - Array of detected dangerous medication objects
 * @returns {string} - Formatted medication safety context for AI system prompt
 */
function buildMedicationSafetyContext(dangerousMedications) {
  if (!dangerousMedications || dangerousMedications.length === 0) return '';

  let context = '\n=== ⚠️ CRITICAL SAFETY ALERT ===\n';

  for (const danger of dangerousMedications) {
    context += `\nDANGEROUS MEDICATION: ${danger.medication}\n`;
    context += `REASON: ${danger.reason}\n`;
    context += `SEVERITY: ${danger.severity.toUpperCase()}\n`;
    context += `CONTRAINDICATION: ${danger.contraindication}\n`;
  }

  context += `\n⚠️ CRITICAL INSTRUCTION: The patient will experience ADVERSE EFFECTS from this medication.\n`;
  context += `Show realistic negative consequences immediately (within seconds to minutes).\n`;
  context += `Examples: respiratory depression, bronchospasm worsening, altered mental status, hemodynamic instability.\n`;
  context += `The patient's condition should WORSEN noticeably. This is a teaching moment about medication safety.\n`;
  context += `Stay in character but make the adverse reaction clear and concerning.\n`;

  return context;
}

/**
 * Helper functions for CDP criteria checking
 * These check if student actions meet various performance criteria
 */

/**
 * Check if student action meets optimal criteria
 * @param {Object} criteria - Optimal criteria from CDP definition
 * @param {Object} session - Current session object
 * @param {string} userMessage - Student's message/action
 * @returns {boolean} - True if criteria met
 */
function checkOptimalCriteria(criteria, session, userMessage) {
  if (!criteria) return false;

  const lowerMessage = userMessage.toLowerCase();

  // Check timing
  const elapsedMinutes = (Date.now() - session.scenarioStartTime) / 60000;
  if (criteria.timing_window) {
    const [min, max] = criteria.timing_window;
    if (elapsedMinutes < min || elapsedMinutes > max) return false;
  }

  // Check required treatments
  if (criteria.required_treatments) {
    for (const treatment of criteria.required_treatments) {
      if (!session.criticalTreatmentsGiven[treatment]) return false;
    }
  }

  // Check keywords in message
  if (criteria.keywords) {
    const hasKeyword = criteria.keywords.some(keyword =>
      lowerMessage.includes(keyword.toLowerCase())
    );
    if (!hasKeyword) return false;
  }

  // Check state requirements
  if (criteria.required_state && session.currentState !== criteria.required_state) {
    return false;
  }

  return true;
}

/**
 * Check if student action meets acceptable criteria
 * @param {Object} criteria - Acceptable criteria from CDP definition
 * @param {Object} session - Current session object
 * @param {string} userMessage - Student's message/action
 * @returns {boolean} - True if criteria met
 */
function checkAcceptableCriteria(criteria, session, userMessage) {
  if (!criteria) return false;
  // Similar logic to optimal, but with relaxed timing/requirements
  return checkOptimalCriteria(criteria, session, userMessage);
}

/**
 * Check if student action meets suboptimal criteria
 * @param {Object} criteria - Suboptimal criteria from CDP definition
 * @param {Object} session - Current session object
 * @param {string} userMessage - Student's message/action
 * @returns {boolean} - True if criteria met
 */
function checkSuboptimalCriteria(criteria, session, userMessage) {
  if (!criteria) return false;

  const elapsedMinutes = (Date.now() - session.scenarioStartTime) / 60000;

  // Usually indicates delayed action or missing treatments
  if (criteria.delayed_timing) {
    const [min, max] = criteria.delayed_timing;
    if (elapsedMinutes >= min && elapsedMinutes <= max) {
      // Check if critical treatments still missing
      if (criteria.missing_treatments) {
        for (const treatment of criteria.missing_treatments) {
          if (!session.criticalTreatmentsGiven[treatment]) return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if student action meets dangerous criteria
 * @param {Object} criteria - Dangerous criteria from CDP definition
 * @param {Object} session - Current session object
 * @param {string} userMessage - Student's message/action
 * @returns {boolean} - True if criteria met
 */
function checkDangerousCriteria(criteria, session, userMessage) {
  if (!criteria) return false;

  const lowerMessage = userMessage.toLowerCase();

  // Check for dangerous medications
  if (criteria.dangerous_medications) {
    for (const med of criteria.dangerous_medications) {
      if (lowerMessage.includes(med.toLowerCase())) return true;
    }
  }

  // Check for contraindicated actions
  if (criteria.contraindicated_actions) {
    for (const action of criteria.contraindicated_actions) {
      if (lowerMessage.includes(action.toLowerCase())) return true;
    }
  }

  // Check for critical omissions
  if (criteria.critical_omissions) {
    const elapsedMinutes = (Date.now() - session.scenarioStartTime) / 60000;
    if (elapsedMinutes > criteria.critical_omissions.time_threshold) {
      for (const treatment of criteria.critical_omissions.missing_treatments) {
        if (!session.criticalTreatmentsGiven[treatment]) return true;
      }
    }
  }

  return false;
}

/**
 * Evaluate Critical Decision Points (CDPs)
 * Identifies when students hit critical decision points and evaluates their performance
 * @param {Object} session - Current session object
 * @param {string} userMessage - The student's message/action
 * @returns {Array|null} - Array of CDP evaluations or null if no CDPs evaluated
 */
function evaluateCDP(session, userMessage) {
  const scenario = session.scenario;

  // ✅ FIX: critical_decision_points is an object with available_evaluations array
  const cdps = scenario.critical_decision_points?.available_evaluations || [];

  if (!cdps || cdps.length === 0) return null;

  const elapsedMinutes = (Date.now() - session.scenarioStartTime) / 60000;

  // ✅ FIX: Filter out CDPs that don't have time_window (different scenario formats)
  // Some scenarios use time_window, others use evaluate_if
  const applicableCDPs = cdps.filter(cdp => {
    // Skip CDPs without time_window (they use different evaluation logic)
    if (!cdp.time_window) return false;

    const [minTime, maxTime] = cdp.time_window;
    return elapsedMinutes >= minTime && elapsedMinutes <= maxTime;
  });

  if (applicableCDPs.length === 0) return null;

  // Evaluate each CDP
  const evaluations = [];

  for (const cdp of applicableCDPs) {
    // Check if this CDP was already evaluated
    const alreadyEvaluated = session.criticalActionsLog.some(
      log => log.action === 'cdp_evaluation' && log.cdp_id === cdp.cdp_id
    );

    if (alreadyEvaluated) continue;

    // Determine rating based on student action
    let rating = 'not_performed';
    let explanation = '';

    // Check for optimal response
    if (checkOptimalCriteria(cdp.optimal_criteria, session, userMessage)) {
      rating = 'optimal';
      explanation = cdp.optimal_criteria.feedback;
    }
    // Check for acceptable response
    else if (checkAcceptableCriteria(cdp.acceptable_criteria, session, userMessage)) {
      rating = 'acceptable';
      explanation = cdp.acceptable_criteria.feedback;
    }
    // Check for suboptimal response
    else if (checkSuboptimalCriteria(cdp.suboptimal_criteria, session, userMessage)) {
      rating = 'suboptimal';
      explanation = cdp.suboptimal_criteria.feedback;
    }
    // Check for dangerous response
    else if (checkDangerousCriteria(cdp.dangerous_criteria, session, userMessage)) {
      rating = 'dangerous';
      explanation = cdp.dangerous_criteria.feedback;
    }

    // Log evaluation
    const evaluation = {
      cdp_id: cdp.cdp_id,
      cdp_title: cdp.decision_point,
      rating: rating,
      explanation: explanation,
      timestamp: Date.now(),
      elapsedTime: elapsedMinutes,
      userMessage: userMessage
    };

    // Update performance counters
    switch (rating) {
      case 'optimal':
        session.optimalCount = (session.optimalCount || 0) + 1;
        session.performanceScore = (session.performanceScore || 0) + 10;
        break;
      case 'acceptable':
        session.acceptableCount = (session.acceptableCount || 0) + 1;
        session.performanceScore = (session.performanceScore || 0) + 7;
        break;
      case 'suboptimal':
        session.suboptimalCount = (session.suboptimalCount || 0) + 1;
        session.performanceScore = (session.performanceScore || 0) + 3;
        break;
      case 'dangerous':
        session.dangerousCount = (session.dangerousCount || 0) + 1;
        session.performanceScore = (session.performanceScore || 0) - 5;
        break;
    }

    session.criticalActionsLog.push({
      action: 'cdp_evaluation',
      category: 'challenge',
      ...evaluation
    });

    evaluations.push(evaluation);
  }

  return evaluations.length > 0 ? evaluations : null;
}

/**
 * Check for dangerous medication administration (Task 2.2)
 * Scans user message for dangerous medications and logs safety violations
 * @param {Object} session - Current session object
 * @param {string} userMessage - Student's message/action
 * @returns {Array|null} - Array of detected dangerous medications or null
 */
function checkMedicationSafety(session, userMessage) {
  // Guard: If scenario not loaded yet (e.g., during Cognitive Coach), skip check
  if (!session.scenario) return null;

  const scenario = session.scenario;
  const dangerousMeds = scenario.dangerous_medications || [];

  if (dangerousMeds.length === 0) return null;

  const lowerMessage = userMessage.toLowerCase();
  const detectedDangers = [];

  // Check each dangerous medication
  for (const medData of dangerousMeds) {
    // Check if any keyword matches
    const detected = medData.keywords.some(keyword =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (detected) {
      const danger = {
        medication: medData.medication,
        reason: medData.reason,
        severity: medData.severity || 'high',
        contraindication: medData.contraindication || 'General contraindication',
        timestamp: Date.now(),
        elapsedTime: (Date.now() - session.scenarioStartTime) / 60000,
        userMessage: userMessage
      };

      detectedDangers.push(danger);

      // Log to critical actions
      session.criticalActionsLog.push({
        action: 'dangerous_medication_given',
        ...danger
      });

      // Increment dangerous counter
      session.dangerousCount = (session.dangerousCount || 0) + 1;

      console.warn('⚠️ DANGEROUS MEDICATION DETECTED:', medData.medication, '-', medData.reason);

      // Update safety violation counter
      session.safetyViolations = (session.safetyViolations || 0) + 1;

      // Add to CDP evaluations as automatic 'dangerous' rating
      if (!session.cdpEvaluations) {
        session.cdpEvaluations = [];
      }

      session.cdpEvaluations.push({
        cdp_id: 'safety_violation_' + Date.now(),
        cdp_title: 'Medication Safety',
        rating: 'dangerous',
        explanation: 'Administered contraindicated medication: ' + medData.medication + '. Reason: ' + medData.reason,
        timestamp: Date.now(),
        elapsedTime: (Date.now() - session.scenarioStartTime) / 60000,
        userMessage: userMessage
      });
    }
  }

  return detectedDangers.length > 0 ? detectedDangers : null;
}

/**
 * Check for medication warnings (caution needed but not dangerous)
 * Provides educational warnings for medications that require careful consideration
 * @param {Object} session - Current session object
 * @param {string} userMessage - Student's message/action
 * @returns {Array|null} - Array of medication warnings or null
 */
function checkMedicationWarnings(session, userMessage) {
  const scenario = session.scenario;
  const warningMeds = scenario.warning_medications || [];

  if (warningMeds.length === 0) return null;

  const lowerMessage = userMessage.toLowerCase();
  const warnings = [];

  for (const medData of warningMeds) {
    const detected = medData.keywords.some(keyword =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (detected) {
      warnings.push({
        medication: medData.medication,
        warning: medData.warning,
        severity: 'moderate',
        recommendation: medData.recommendation || 'Use with caution'
      });

      console.warn('⚠️ MEDICATION WARNING:', medData.medication, '-', medData.warning);
    }
  }

  return warnings.length > 0 ? warnings : null;
}

/**
 * Calculate comprehensive performance score (Task 2.3)
 * Evaluates student performance across all Critical Decision Points
 * @param {Object} session - Current session object
 * @returns {Object} - Performance score object with breakdown and interpretation
 */
function calculatePerformanceScore(session) {
  // Score weights
  const weights = {
    optimal: 100,
    acceptable: 75,
    suboptimal: 50,
    dangerous: 0,
    not_performed: 0
  };

  // Count each rating type
  const optimalCount = session.optimalCount || 0;
  const acceptableCount = session.acceptableCount || 0;
  const suboptimalCount = session.suboptimalCount || 0;
  const dangerousCount = session.dangerousCount || 0;

  const totalCDPs = optimalCount + acceptableCount + suboptimalCount + dangerousCount;

  if (totalCDPs === 0) {
    return {
      overallScore: 0,
      breakdown: {
        optimal: 0,
        acceptable: 0,
        suboptimal: 0,
        dangerous: 0
      },
      totalCDPs: 0,
      interpretation: 'No critical decisions evaluated yet'
    };
  }

  // Calculate weighted score
  const totalPoints = (
    (optimalCount * weights.optimal) +
    (acceptableCount * weights.acceptable) +
    (suboptimalCount * weights.suboptimal) +
    (dangerousCount * weights.dangerous)
  );

  const maxPossiblePoints = totalCDPs * weights.optimal;
  const overallScore = Math.round((totalPoints / maxPossiblePoints) * 100);

  // Determine interpretation
  let interpretation = '';
  if (overallScore >= 90) {
    interpretation = 'Excellent performance - Optimal clinical decision making';
  } else if (overallScore >= 75) {
    interpretation = 'Good performance - Safe and effective care with minor areas for improvement';
  } else if (overallScore >= 60) {
    interpretation = 'Acceptable performance - Patient care provided but significant learning opportunities';
  } else if (overallScore >= 40) {
    interpretation = 'Needs improvement - Multiple critical gaps in clinical decision making';
  } else {
    interpretation = 'Unsafe performance - Serious patient safety concerns identified';
  }

  return {
    overallScore: overallScore,
    breakdown: {
      optimal: optimalCount,
      acceptable: acceptableCount,
      suboptimal: suboptimalCount,
      dangerous: dangerousCount
    },
    totalCDPs: totalCDPs,
    interpretation: interpretation,
    percentages: {
      optimal: Math.round((optimalCount / totalCDPs) * 100),
      acceptable: Math.round((acceptableCount / totalCDPs) * 100),
      suboptimal: Math.round((suboptimalCount / totalCDPs) * 100),
      dangerous: Math.round((dangerousCount / totalCDPs) * 100)
    }
  };
}

/**
 * Generate critical actions timeline for AAR
 * Creates a formatted timeline of all critical actions during the scenario
 * @param {Object} session - Current session object
 * @returns {Array} - Sorted timeline of critical actions
 */
function generateCriticalActionsTimeline(session) {
  // Handle case where criticalActionsLog is not initialized
  if (!session.criticalActionsLog || !Array.isArray(session.criticalActionsLog)) {
    return [];
  }

  const timeline = session.criticalActionsLog.map(log => {
    const minutes = Math.floor(log.elapsedTime / 60);
    const seconds = Math.floor(log.elapsedTime % 60);
    const timestamp = minutes + ':' + String(seconds).padStart(2, '0');

    return {
      timestamp: timestamp,
      elapsedSeconds: log.elapsedTime,
      action: log.action,
      details: formatActionDetails(log),
      rating: log.rating || null,
      isPositive: isPositiveAction(log)
    };
  });

  // Sort by elapsed time
  timeline.sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);

  return timeline;
}

/**
 * Format action details for timeline display
 * @param {Object} log - Critical action log entry
 * @returns {string} - Formatted action description
 */
function formatActionDetails(log) {
  switch (log.action) {
    case 'treatment_given':
      return 'Administered: ' + log.treatment;
    case 'dangerous_medication_given':
      return '⚠️ DANGER: ' + log.medication + ' - ' + log.reason;
    case 'cdp_evaluation':
      return log.cdp_title + ' (' + log.rating.toUpperCase() + ')';
    case 'auto_deterioration':
      return 'Patient deteriorated: ' + log.fromState + ' → ' + log.toState;
    case 'state_change':
      return 'State: ' + log.toState;
    case 'medication_warning':
      return '⚠️ Warning: ' + log.medication + ' - ' + log.warning;
    default:
      return log.action;
  }
}

/**
 * Determine if action is positive, negative, or neutral
 * @param {Object} log - Critical action log entry
 * @returns {boolean|null} - true (positive), false (negative), null (neutral)
 */
function isPositiveAction(log) {
  if (log.action === 'dangerous_medication_given') return false;
  if (log.action === 'auto_deterioration') return false;
  if (log.rating === 'dangerous' || log.rating === 'suboptimal') return false;
  if (log.action === 'treatment_given') return true;
  if (log.rating === 'optimal' || log.rating === 'acceptable') return true;
  return null; // neutral
}

/**
 * Analyze treatment timing against optimal windows
 * Evaluates when critical treatments were administered relative to scenario timing thresholds
 * @param {Object} session - Current session object
 * @returns {Array} - Timing analysis for each critical treatment
 */
function analyzeTreatmentTiming(session) {
  const scenario = session.scenario;
  if (!scenario) return [];

  const criticalTreatments = scenario.critical_treatments || [];
  if (!session.criticalActionsLog || !Array.isArray(session.criticalActionsLog)) {
    return [];
  }

  const timingAnalysis = [];

  for (const treatment of criticalTreatments) {
    // Find when treatment was given
    const treatmentLog = session.criticalActionsLog.find(
      log => log.action === 'treatment_given' && log.treatment === treatment.name
    );

    if (treatmentLog) {
      const timingMinutes = treatmentLog.elapsedTime / 60;

      let assessment = '';
      if (timingMinutes <= treatment.optimal_timing) {
        assessment = 'optimal';
      } else if (timingMinutes <= treatment.acceptable_timing) {
        assessment = 'acceptable';
      } else if (timingMinutes <= treatment.critical_timing) {
        assessment = 'delayed';
      } else {
        assessment = 'critically_delayed';
      }

      timingAnalysis.push({
        treatment: treatment.name,
        givenAt: Math.round(timingMinutes * 10) / 10, // round to 1 decimal
        optimalWindow: treatment.optimal_timing,
        acceptableWindow: treatment.acceptable_timing,
        assessment: assessment,
        impact: treatment.importance
      });
    } else {
      // Treatment never given
      timingAnalysis.push({
        treatment: treatment.name,
        givenAt: null,
        optimalWindow: treatment.optimal_timing,
        acceptableWindow: treatment.acceptable_timing,
        assessment: 'not_given',
        impact: treatment.importance
      });
    }
  }

  return timingAnalysis;
}

/**
 * Generate comprehensive scenario summary for AAR
 * Creates a complete end-of-scenario report with all key metrics
 * @param {Object} session - Current session object
 * @returns {Object} - Comprehensive scenario summary
 */
function generateScenarioSummary(session) {
  const performanceScore = calculatePerformanceScore(session);
  const timeline = generateCriticalActionsTimeline(session);
  const timingAnalysis = analyzeTreatmentTiming(session);
  const challengeSummary = summarizeChallenges(session);

  // Calculate scenario duration
  const durationMinutes = session.scenarioStartTime ?
    Math.round((Date.now() - session.scenarioStartTime) / 60000) : 0;

  // Count key metrics (with null checks)
  const criticalActionsLog = session.criticalActionsLog || [];
  const treatmentsGiven = criticalActionsLog.filter(
    log => log.action === 'treatment_given'
  ).length;

  const dangerousActions = criticalActionsLog.filter(
    log => log.action === 'dangerous_medication_given'
  ).length;

  // Final patient state
  const finalState = session.currentState;
  const finalVitals = session.vitals ? { ...session.vitals } : {};

  // State progression path (with null check)
  const stateHistory = session.stateHistory || [];
  const stateProgression = stateHistory.map(h => ({
    state: h.state,
    timestamp: Math.floor(h.elapsedTime / 60) + ':' + String(Math.floor(h.elapsedTime % 60)).padStart(2, '0'),
    reason: h.reason || 'State transition'
  }));

  const scenario = session.scenario || {};
  return {
    scenarioId: scenario.scenario_id || 'unknown',
    scenarioTitle: scenario.metadata?.title || 'Unknown Scenario',
    duration: durationMinutes,
    performanceScore: performanceScore,
    challengeSummary: challengeSummary,
    finalState: finalState,
    finalVitals: finalVitals,
    stateProgression: stateProgression,
    treatmentsGiven: treatmentsGiven,
    dangerousActions: dangerousActions,
    safetyViolations: session.safetyViolations || 0,
    timeline: timeline,
    timingAnalysis: timingAnalysis,
    completedAt: new Date().toISOString()
  };
}

/**
 * Detect if a challenge point should trigger (Task 3.1)
 * Evaluates whether student actions/context warrant a challenge
 * @param {Object} session - Current session object
 * @param {string} userMessage - Student's message/action
 * @param {Array} detectedTreatments - Array of detected treatment types
 * @returns {Object|null} - Challenge point object or null
 */
function detectChallengePoint(session, userMessage, detectedTreatments) {
  // Only trigger if Challenge Points enabled (A/B testing)
  if (!session.challengePointsEnabled) return null;

  // Check if already in active challenge
  if (session.activeChallenge) return null;

  // Limit to 2 challenges per scenario
  const challengeCount = session.challengePointsUsed?.length || 0;
  if (challengeCount >= 2) return null;

  const scenario = session.scenario;
  const challengePoints = scenario.challenge_points || [];

  if (challengePoints.length === 0) return null;

  const lowerMessage = userMessage.toLowerCase();
  const elapsedMinutes = (Date.now() - session.scenarioStartTime) / 60000;

  // Find applicable challenge points
  for (const cp of challengePoints) {
    // Check if already used
    const alreadyUsed = session.challengePointsUsed?.some(
      used => used.challenge_id === cp.challenge_id
    );
    if (alreadyUsed) continue;

    // Check time window
    const [minTime, maxTime] = cp.time_window;
    if (elapsedMinutes < minTime || elapsedMinutes > maxTime) continue;

    // Check if trigger condition met
    let triggered = false;

    // Treatment trigger
    if (cp.trigger_on_treatment && detectedTreatments.length > 0) {
      triggered = detectedTreatments.some(treatment =>
        cp.trigger_on_treatment.includes(treatment)
      );
    }

    // Keyword trigger
    if (cp.trigger_keywords && !triggered) {
      triggered = cp.trigger_keywords.some(keyword =>
        lowerMessage.includes(keyword.toLowerCase())
      );
    }

    // State trigger
    if (cp.trigger_on_state && !triggered) {
      triggered = session.currentState === cp.trigger_on_state;
    }

    if (triggered) {
      return cp;
    }
  }

  return null;
}

/**
 * Activate a challenge point (Task 3.1)
 * Sets up challenge state and logs activation for AAR
 * @param {Object} session - Current session object
 * @param {Object} challengePoint - Challenge point definition from scenario
 * @returns {Object} - Active challenge object
 */
function activateChallenge(session, challengePoint) {
  const challenge = {
    challenge_id: challengePoint.challenge_id,
    question: challengePoint.question,
    context: challengePoint.context || '',
    expectedElements: challengePoint.expected_reasoning_elements || [],
    activatedAt: Date.now(),
    elapsedTime: (Date.now() - session.scenarioStartTime) / 60000,
    studentResponse: null,
    evaluation: null
  };

  // Set as active challenge
  session.activeChallenge = challenge;

  // Log activation
  session.criticalActionsLog.push({
    action: 'challenge_point_triggered',
    challenge_id: challenge.challenge_id,
    question: challenge.question,
    timestamp: Date.now(),
    elapsedTime: challenge.elapsedTime
  });

  console.log('🧠 Challenge Point Activated:', challenge.challenge_id);
  console.log('❓ Question:', challenge.question);

  return challenge;
}

/**
 * Build challenge point context for AI prompt (Task 3.1)
 * Instructs the AI how to naturally pose the challenge question to the student
 * @param {Object} activeChallenge - Current active challenge object
 * @returns {string} - Formatted challenge context for AI system prompt
 */
function buildChallengeContext(activeChallenge) {
  if (!activeChallenge) return '';

  let context = '\n=== 🧠 CHALLENGE POINT ACTIVATED ===\n';
  context += '\nYou must now transition into a teaching moment. Ask the student the following question:\n';
  context += '\nQUESTION: "' + activeChallenge.question + '"\n';

  if (activeChallenge.context) {
    context += '\nCONTEXT FOR QUESTION: ' + activeChallenge.context + '\n';
  }

  context += '\nINSTRUCTIONS:\n';
  context += '- Stay in character as the patient, but pause the scenario\n';
  context += '- Ask this question conversationally and naturally\n';
  context += '- Wait for the student to explain their reasoning\n';
  context += '- Do NOT answer the question yourself\n';
  context += '- Do NOT continue with treatment responses until they answer\n';
  context += '- Frame it as wanting to understand their thought process\n';
  context += '\nExample: "Before we continue... can you walk me through your thinking? ' + activeChallenge.question + '"\n';
  context += '\n=== END CHALLENGE POINT ===\n';

  return context;
}

/**
 * Detect if user message is a response to active challenge (Task 3.2)
 * Identifies reasoning-based explanations from the student
 * @param {Object} session - Current session object
 * @param {string} userMessage - Student's message
 * @returns {boolean} - True if message is a challenge response
 */
function detectChallengeResponse(session, userMessage) {
  // Only if there's an active challenge and no response yet
  if (!session.activeChallenge || session.activeChallenge.studentResponse) {
    return false;
  }

  const lowerMessage = userMessage.toLowerCase();

  // Also detect skip/deflection attempts
  const skipPhrases = [
    'don\'t know', 'not sure', 'unsure', 'skip',
    'can we continue', 'move on', 'let\'s proceed'
  ];

  const isSkipping = skipPhrases.some(phrase =>
    lowerMessage.includes(phrase)
  );

  if (isSkipping) {
    session.activeChallenge.studentResponse = userMessage;
    session.activeChallenge.skipped = true;
    session.activeChallenge.respondedAt = Date.now();

    console.log('⏭️ Challenge Skipped');
    return true;
  }

  // Check if message contains reasoning indicators
  const reasoningIndicators = [
    'because', 'since', 'due to', 'considering',
    'based on', 'given that', 'indicates', 'suggests',
    'assessment', 'finding', 'priority', 'risk',
    'protocol', 'guidelines', 'treatment', 'management'
  ];

  const hasReasoning = reasoningIndicators.some(indicator =>
    lowerMessage.includes(indicator)
  );

  // Check if message is long enough (more than 20 words suggests explanation)
  const wordCount = userMessage.trim().split(/\s+/).length;
  const isSubstantial = wordCount >= 20;

  // If it looks like an explanation, consider it a response
  if (hasReasoning || isSubstantial) {
    session.activeChallenge.studentResponse = userMessage;
    session.activeChallenge.respondedAt = Date.now();
    session.activeChallenge.responseTime = (Date.now() - session.activeChallenge.activatedAt) / 1000;

    console.log('💭 Challenge Response Received:', wordCount, 'words');
    return true;
  }

  return false;
}

/**
 * Evaluate challenge response quality (Task 3.2)
 * Analyzes student's clinical reasoning against expected elements
 * @param {Object} session - Current session object
 * @returns {Object|null} - Evaluation object or null
 */
function evaluateChallengeResponse(session) {
  const challenge = session.activeChallenge;

  if (!challenge || !challenge.studentResponse) return null;

  const response = challenge.studentResponse.toLowerCase();
  const expectedElements = challenge.expectedElements || [];

  // Count how many expected reasoning elements are present
  let elementsFound = 0;
  const foundElements = [];
  const missingElements = [];

  for (const element of expectedElements) {
    const keywords = element.keywords || [];
    const found = keywords.some(keyword =>
      response.includes(keyword.toLowerCase())
    );

    if (found) {
      elementsFound++;
      foundElements.push(element.concept);
    } else {
      missingElements.push(element.concept);
    }
  }

  // Calculate quality score
  const totalElements = expectedElements.length;
  const percentageFound = totalElements > 0 ? (elementsFound / totalElements) * 100 : 0;

  // Determine rating
  let rating = '';
  let feedback = '';

  if (challenge.skipped) {
    rating = 'skipped';
    feedback = 'Challenge question skipped - missed learning opportunity';
  } else if (percentageFound >= 75) {
    rating = 'excellent';
    feedback = 'Excellent clinical reasoning demonstrated';
  } else if (percentageFound >= 50) {
    rating = 'good';
    feedback = 'Good reasoning with some key concepts identified';
  } else if (percentageFound >= 25) {
    rating = 'basic';
    feedback = 'Basic understanding shown but missing critical reasoning elements';
  } else {
    rating = 'poor';
    feedback = 'Insufficient clinical reasoning - protocol-based response only';
  }

  const evaluation = {
    challenge_id: challenge.challenge_id,
    rating: rating,
    percentageFound: Math.round(percentageFound),
    elementsFound: elementsFound,
    totalElements: totalElements,
    foundConcepts: foundElements,
    missingConcepts: missingElements,
    feedback: feedback,
    studentResponse: challenge.studentResponse,
    responseTime: challenge.responseTime,
    evaluatedAt: Date.now()
  };

  // Store evaluation in challenge
  challenge.evaluation = evaluation;

  // Log to critical actions
  session.criticalActionsLog.push({
    action: 'challenge_evaluated',
    category: 'challenge',
    ...evaluation
  });

  // Add to used challenges
  if (!session.challengePointsUsed) {
    session.challengePointsUsed = [];
  }
  session.challengePointsUsed.push(challenge);

  // Clear active challenge
  session.activeChallenge = null;

  console.log('🎓 Challenge Evaluated:', rating.toUpperCase(), '-', percentageFound + '% concepts found');

  return evaluation;
}

/**
 * Build challenge feedback context for AI prompt (Task 3.2)
 * Instructs the AI how to deliver evaluation feedback to the student
 * @param {Object} evaluation - Challenge evaluation object
 * @returns {string} - Formatted feedback context for AI system prompt
 */
function buildChallengeFeedbackContext(evaluation) {
  if (!evaluation) return '';

  let context = '\n=== 🎓 CHALLENGE EVALUATION COMPLETE ===\n';
  context += '\nStudent Response Quality: ' + evaluation.rating.toUpperCase() + '\n';
  context += 'Clinical Reasoning Score: ' + evaluation.percentageFound + '%\n';

  if (evaluation.foundConcepts.length > 0) {
    context += '\nStrengths identified: ' + evaluation.foundConcepts.join(', ') + '\n';
  }

  if (evaluation.missingConcepts.length > 0) {
    context += 'Concepts to reinforce: ' + evaluation.missingConcepts.join(', ') + '\n';
  }

  context += '\nFEEDBACK TO PROVIDE:\n';
  context += evaluation.feedback + '\n';

  context += '\nINSTRUCTIONS:\n';
  context += '- Acknowledge their response briefly and positively\n';
  context += '- If excellent/good: Reinforce their reasoning\n';
  context += '- If basic/poor: Gently guide them to missing concepts\n';
  context += '- Stay in character as patient but provide teaching moment\n';
  context += '- After feedback, resume the scenario naturally\n';

  if (evaluation.rating === 'excellent') {
    context += '\nExample: "That\'s exactly right - you\'ve identified the key issues. Now let\'s see how I respond to your treatment..."\n';
  } else if (evaluation.rating === 'good') {
    context += '\nExample: "Good thinking. You might also consider [missing concept]. Now let\'s continue..."\n';
  } else {
    context += '\nExample: "I see you\'re thinking about [found concept], which is good. Also important to consider [missing concept]. Let\'s proceed..."\n';
  }

  context += '\n=== END CHALLENGE FEEDBACK ===\n';

  return context;
}

/**
 * Summarize challenge point performance for AAR (Task 3.3)
 * Provides statistics and details on student's challenge responses
 * @param {Object} session - Current session object
 * @returns {Object} - Challenge performance summary
 */
function summarizeChallenges(session) {
  const challenges = session.challengePointsUsed || [];

  if (challenges.length === 0) {
    return {
      challengesTriggered: 0,
      challengesCompleted: 0,
      averageReasoning: 0,
      summary: 'No challenges triggered (Challenge Points may be disabled)'
    };
  }

  const completed = challenges.filter(c => c.evaluation).length;
  const skipped = challenges.filter(c => c.skipped).length;

  // Calculate average reasoning quality
  const ratings = { excellent: 4, good: 3, basic: 2, poor: 1, skipped: 0 };
  const scores = challenges
    .filter(c => c.evaluation)
    .map(c => ratings[c.evaluation.rating] || 0);

  const averageScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  const averagePercentage = Math.round(averageScore * 25); // Convert 0-4 to 0-100

  return {
    challengesTriggered: challenges.length,
    challengesCompleted: completed,
    challengesSkipped: skipped,
    averageReasoning: averagePercentage,
    details: challenges.map(c => ({
      question: c.question,
      rating: c.evaluation?.rating || 'not_evaluated',
      conceptsFound: c.evaluation?.percentageFound || 0,
      responseTime: c.responseTime
    }))
  };
}

/**
 * POST /api/sessions/:id/message
 * Send message to AI patient
 */
app.post('/api/sessions/:id/message', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const session = sessions.get(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

        if (session.currentAgent === 'cognitive_coach') {
      console.log('🎓 Routing to Cognitive Coach Agent');
      
      try {
        // Build Cognitive Coach prompt with current session context
        const systemPrompt = cognitiveCoachPromptBuilder.buildCognitiveCoachPrompt(session);
        
        // Build message history
        const cognitiveMessages = session.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        // Call Claude API with Cognitive Coach prompt
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [...cognitiveMessages, { role: 'user', content: message }]
        });
        
        // Extract text response
        let responseText = '';
        for (const block of response.content) {
          if (block.type === 'text') {
            responseText += block.text;
          }
        }
        
        console.log('Cognitive Coach response:', responseText.substring(0, 100) + '...');
        
// Check if Cognitive Coach is complete
        if (responseText.includes('[COGNITIVE_COACH_COMPLETE]') || 
            responseText.includes('[TRANSITION_TO_CORE_AGENT]')) {
          
          console.log('✅ Cognitive Coach complete - transitioning to Core Agent');
          
          // Mark cognitive coach as complete
          session.cognitiveCoach.completed = true;
          session.cognitiveCoach.endTime = Date.now();
          
          // Transition to Core Agent
          session.currentAgent = 'core';
          
// ═══════════════════════════════════════════════════════════
// NOW LOAD SCENARIO FOR THE FIRST TIME
// ═══════════════════════════════════════════════════════════

console.log('📋 Loading scenario:', session.scenarioId);

// 🔍 ADD DEBUGGING
console.log('🔍 Full scenario path will be:', path.join(__dirname, `../scenarios/${session.scenarioId}.json`));

// Load scenario and create engine
const scenarioData = loadScenario(session.scenarioId);

// 🔍 CHECK IF LOADED
if (!scenarioData) {
  console.error('❌ FAILED: Scenario data is undefined!');
  console.error('❌ Looking for file:', session.scenarioId);
  console.error('❌ Check if file exists:', path.join(__dirname, `../scenarios/${session.scenarioId}.json`));
  
  // Return error to frontend
  return res.status(500).json({ 
    error: 'Failed to load scenario',
    details: `Scenario file not found: ${session.scenarioId}.json`
  });
}

console.log('✅ Scenario data loaded successfully');
console.log('🔍 Scenario has metadata?', !!scenarioData.metadata);
console.log('🔍 Scenario title:', scenarioData.metadata?.title);

// Store scenario data on session for later use
session.scenario = scenarioData;
session.engine = new ScenarioEngine(scenarioData);
session.measuredVitals = {};
session.patientNotes = [];

// ═══════════════════════════════════════════════════════════
// NEW FIELDS - Layer 2 (Task 1.1)
// ═══════════════════════════════════════════════════════════
session.currentState = 'initial'; // initial | improving | deteriorating | critical
session.scenarioStartTime = Date.now();
session.criticalActionsLog = [];
session.criticalTreatmentsGiven = {
  oxygen: false,
  salbutamol: false,
  steroids: false
};
session.dangerousMedicationsGiven = []; // Track dangerous meds administered
session.lastDeteriorationCheck = Date.now();
// Challenge fields already initialized at session creation (Task 3.1)
session.stateHistory = [{
  state: 'initial',
  timestamp: Date.now(),
  vitals: scenarioData.initial_vitals
}];

console.log('✅ Layer 2 session fields initialized');

// Get initial context
const initialContext = session.engine.getRuntimeContext();

// Extract dispatch and patient info
const dispatchInfo = {
  location: scenarioData.dispatch_info.location,
  chiefComplaint: scenarioData.dispatch_info.call_type,
  callerInfo: `${scenarioData.dispatch_info.caller} reports: ${scenarioData.dispatch_info.additional_info}`,
  timeOfCall: "14:32"
};

const patientInfo = {
  name: scenarioData.patient_profile.name,
  age: scenarioData.patient_profile.age,
  gender: scenarioData.dispatch_info.sex
};

console.log('✅ Scenario loaded:', scenarioData.metadata.title);

          // ✅ IMPORTANT: Store dispatch and patient info in session for later use
          session.dispatchInfo = dispatchInfo;
          session.patientInfo = patientInfo;

          // ═══════════════════════════════════════════════════════════
          // END SCENARIO LOADING
          // ═══════════════════════════════════════════════════════════
          
          // Clean ALL transition markers from response
          responseText = responseText
            .replace(/\[COGNITIVE_COACH_COMPLETE\]/g, '')
            .replace(/\[TRANSITION_TO_CORE_AGENT\]/g, '')
            .replace(/\[SCENARIO_1_START\]/g, '')
            .replace(/\[SAVE_COGNITIVE_METRICS\]/g, '')
            .replace(/\[COGNITIVE_COACH_SESSION_COMPLETE\]/g, '')
            .trim();

          // ✅ FIX: Don't save Cognitive Coach's transition message to conversation history
          // Only save the user message, not the assistant's transition message
          session.messages.push(
            { role: 'user', content: message }
          );

          // ✅ FIX: Send ONLY the initial scene description, not the Cognitive Coach's message
          // This ensures NO dispatch info or transition text appears in chat
          const initialSceneDescription = scenarioData.state_descriptions.initial.student_sees;

          // Add the scene description to conversation history for Core Agent context
          session.messages.push(
            { role: 'assistant', content: initialSceneDescription }
          );

          console.log('🎬 Now in Core Agent mode - scenario ready');
          console.log('📝 Sending initial scene as message:', initialSceneDescription.substring(0, 100) + '...');
          console.log('📊 Dispatch Info being sent:', dispatchInfo);
          console.log('👤 Patient Info being sent:', patientInfo);

          // Return WITH scenario data for the first time
          return res.json({
            message: initialSceneDescription,  // ✅ FIX: Send scene description, NOT Cognitive Coach message
            currentAgent: 'core',
            transitioned: true,

            // NOW send scenario data
            scenario: session.engine.getScenarioMetadata(),
            initialVitals: initialContext.current_vitals,
            patientProfile: initialContext.patient_profile,
            sceneDescription: initialContext.current_scene,
            dispatchInfo: dispatchInfo,
            patientInfo: patientInfo,
            initialSceneDescription: initialSceneDescription
          });
        }
        
        // Cognitive Coach still in progress
        
        // Track student response
        session.cognitiveCoach.responses.push({
          questionID: session.cognitiveCoach.selectedQuestions[session.cognitiveCoach.currentQuestionIndex],
          studentMessage: message,
          coachResponse: responseText,
          timestamp: Date.now()
        });
        
        // Increment question index
        session.cognitiveCoach.currentQuestionIndex++;
        
        // Add to conversation history
        session.messages.push(
          { role: 'user', content: message },
          { role: 'assistant', content: responseText }
        );
        
        return res.json({ 
          message: responseText,
          currentAgent: 'cognitive_coach'
        });
        
      } catch (error) {
        console.error('Error in Cognitive Coach:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CHALLENGE RESPONSE DETECTION - Task 3.2 (HIGHEST PRIORITY)
    // ═══════════════════════════════════════════════════════════

    // Check if student is responding to an active challenge
    if (session.activeChallenge && !session.activeChallenge.studentResponse) {
      const isResponse = detectChallengeResponse(session, message);
      if (isResponse) {
        console.log('✅ Challenge response captured, proceeding to evaluation');
      }
    }

    // Evaluate challenge response if one was just given
    let challengeEvaluation = null;
    if (session.activeChallenge && session.activeChallenge.studentResponse && !session.activeChallenge.evaluation) {
      challengeEvaluation = evaluateChallengeResponse(session);
      console.log('✅ Challenge evaluation complete:', challengeEvaluation.rating);
    }

    // Build challenge feedback context
    const challengeFeedbackContext = buildChallengeFeedbackContext(challengeEvaluation);
    session.challengeFeedbackContext = challengeFeedbackContext;

    // ═══════════════════════════════════════════════════════════
    // CORE AGENT PROCESSING - Detect treatments (Task 1.2)
    // ═══════════════════════════════════════════════════════════

    // Detect treatments in user message (only if Layer 2 fields exist)
    if (session.criticalActionsLog) {
      const detectedTreatments = detectTreatment(message, session);

      if (detectedTreatments.length > 0) {
        console.log('🔍 Treatments detected:', detectedTreatments);
      }

      for (const treatment of detectedTreatments) {
        if (treatment.type === 'oxygen') {
          session.criticalTreatmentsGiven.oxygen = true;
          logCriticalAction(session, 'treatment_given', 'treatment', {
            treatment: 'oxygen',
            message: message
          });
        }
        else if (treatment.type === 'salbutamol') {
          session.criticalTreatmentsGiven.salbutamol = true;
          logCriticalAction(session, 'treatment_given', 'treatment', {
            treatment: 'salbutamol',
            message: message
          });
        }
        else if (treatment.type === 'steroids') {
          session.criticalTreatmentsGiven.steroids = true;
          logCriticalAction(session, 'treatment_given', 'treatment', {
            treatment: 'steroids',
            message: message
          });
        }
        else if (treatment.type === 'dangerous_medication') {
          // Add to dangerous medications array
          session.dangerousMedicationsGiven.push({
            drug: treatment.drug,
            keyword: treatment.keyword,
            timestamp: Date.now(),
            message: message
          });

          // Log as dangerous medication given
          logCriticalAction(session, 'dangerous_medication_given', 'error', {
            treatment: treatment.drug,
            dangerous: true,
            message: message
          });

          console.warn(`⚠️  CRITICAL: Dangerous medication "${treatment.drug}" added to patient record`);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // MEDICATION SAFETY CHECK - Task 2.2
      // ═══════════════════════════════════════════════════════════

      // Check for dangerous medications FIRST (before state changes)
      const dangerousMedications = checkMedicationSafety(session, message);
      if (dangerousMedications && dangerousMedications.length > 0) {
        console.warn('⚠️ MEDICATION SAFETY ALERT:', dangerousMedications.length, 'dangerous medication(s) detected');

        // Store in session for AAR
        if (!session.medicationErrors) {
          session.medicationErrors = [];
        }
        session.medicationErrors.push(...dangerousMedications);

        // Increment safety violations counter
        session.safetyViolations = (session.safetyViolations || 0) + dangerousMedications.length;

        // Update performance score after medication safety violation (CDP added inside checkMedicationSafety)
        const updatedScore = calculatePerformanceScore(session);
        session.performanceScore = updatedScore.overallScore;
        console.log('📊 Updated Performance Score (Medication Safety):', updatedScore.overallScore + '%', updatedScore.interpretation);

        // Build medication safety context for AI prompt
        session.medicationSafetyContext = buildMedicationSafetyContext(dangerousMedications);
      } else {
        session.medicationSafetyContext = '';
      }

      // Check for medication warnings (caution needed but not dangerous)
      const medicationWarnings = checkMedicationWarnings(session, message);
      if (medicationWarnings && medicationWarnings.length > 0) {
        console.log('⚠️ MEDICATION WARNINGS:', medicationWarnings.length, 'medication(s) require caution');

        // Store in session for educational feedback
        if (!session.medicationWarnings) {
          session.medicationWarnings = [];
        }
        session.medicationWarnings.push(...medicationWarnings);

        // Log as educational note (not error)
        for (const warning of medicationWarnings) {
          logCriticalAction(session, 'medication_warning', 'assessment', {
            medication: warning.medication,
            warning: warning.warning,
            recommendation: warning.recommendation,
            message: message
          });
        }
      }

      // ═══════════════════════════════════════════════════════════
      // CHALLENGE POINT DETECTION - Task 3.1
      // ═══════════════════════════════════════════════════════════

      // Check for challenge points (if enabled and not already active)
      if (!session.activeChallenge) {
        const detectedTreatmentTypes = detectedTreatments
          .filter(t => t.type !== 'dangerous_medication')
          .map(t => t.type);

        const challengePoint = detectChallengePoint(session, message, detectedTreatmentTypes);
        if (challengePoint) {
          activateChallenge(session, challengePoint);
        }
      }

      // Build challenge context if active and store in session
      session.challengeContext = buildChallengeContext(session.activeChallenge);

      // ═══════════════════════════════════════════════════════════
      // EVALUATE STATE PROGRESSION - Task 1.3
      // ═══════════════════════════════════════════════════════════

      // Evaluate state progression (treatment response + time-based)
      const previousState = session.currentState;
      const newState = evaluateStateProgression(session);

      // Build state change notice for AI prompt
      let stateChangeNotice = '';
      if (newState !== previousState) {
        console.log(`✅ State changed: ${previousState} → ${newState}`);

        // Determine reason for state change
        const stateChangeReason =
          newState === 'improving' ? 'Patient responding to treatment' :
          newState === 'deteriorating' ? 'Patient condition worsening' :
          newState === 'critical' ? 'Patient critically deteriorating' :
          newState === 'stable' ? 'Patient temporarily stabilized' :
          'State transition';

        stateChangeNotice = `
\n=== IMPORTANT: PATIENT STATE CHANGED ===
Previous State: ${previousState}
New State: ${newState}
Reason: ${stateChangeReason}

Describe this change in your response - the patient's condition is actively changing.
===
`;
      }

      // Store stateChangeNotice for use in prompt construction
      session.stateChangeNotice = stateChangeNotice;

      // ═══════════════════════════════════════════════════════════
      // EVALUATE CRITICAL DECISION POINTS - Task 2.1
      // ═══════════════════════════════════════════════════════════

      // Evaluate Critical Decision Points
      const cdpEvaluations = evaluateCDP(session, message);
      if (cdpEvaluations && cdpEvaluations.length > 0) {
        console.log('📊 CDP Evaluations:', cdpEvaluations);

        // Store in session for AAR
        if (!session.cdpEvaluations) {
          session.cdpEvaluations = [];
        }
        session.cdpEvaluations.push(...cdpEvaluations);

        // Update performance score after each CDP evaluation
        const updatedScore = calculatePerformanceScore(session);
        session.performanceScore = updatedScore.overallScore;
        console.log('📊 Updated Performance Score:', updatedScore.overallScore + '%', updatedScore.interpretation);

        // Performance counters are now updated inside evaluateCDP function
        console.log(`📈 Performance: Score=${session.performanceScore}, Optimal=${session.optimalCount}, Acceptable=${session.acceptableCount}, Suboptimal=${session.suboptimalCount}, Dangerous=${session.dangerousCount}`);

        // Build CDP context for AI prompt
        session.cdpContext = buildCDPContext(cdpEvaluations);
      } else {
        session.cdpContext = '';
      }
    }

    const messages = session.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const runtimeContext = session.engine.getRuntimeContext();
    const coreAgentPrompt = loadSystemPrompt();

    // Build rich patient context (for all Core Agent messages)
    let patientContext = '';
    if (session.scenario && session.currentState && session.vitals && session.scenarioStartTime) {
      patientContext = buildPatientContext(session);
    }

    // Build treatment detection context
    let treatmentContext = '';
    let treatmentResponse = '';
    if (session.criticalActionsLog) {
      const detectedTreatments = detectTreatment(message, session);

      // Build treatment response guidance for AI
      if (detectedTreatments.length > 0) {
        const treatmentTypes = detectedTreatments
          .filter(t => t.type !== 'dangerous_medication')
          .map(t => t.type);

        if (treatmentTypes.length > 0) {
          treatmentResponse = buildTreatmentResponse(treatmentTypes, session);
        }
      }

      if (detectedTreatments.length > 0) {
        const treatmentList = detectedTreatments
          .filter(t => t.type !== 'dangerous_medication')
          .map(t => t.type)
          .join(', ');

        if (treatmentList) {
          treatmentContext = `\n\nTREATMENT DETECTED: Student just administered: ${treatmentList}. Acknowledge this in your response and describe the patient's reaction based on the scenario's treatment_responses section. Show realistic clinical effects.`;
        }

        // Check for dangerous medications
        const dangerousMeds = detectedTreatments.filter(t => t.type === 'dangerous_medication');
        if (dangerousMeds.length > 0) {
          treatmentContext += `\n\nWARNING: Student administered contraindicated medication(s): ${dangerousMeds.map(d => d.drug).join(', ')}. Show realistic adverse effects based on the scenario.`;
        }
      }
    }

    // Build state context for AI (legacy - now replaced by patientContext)
    let stateContext = '';
    if (session.currentState && session.scenario && session.vitals) {
      const stateDescription = session.scenario.state_descriptions?.[session.currentState]?.student_sees || 'Patient condition unchanged.';
      const bp = session.vitals.BP || `${session.vitals.BP_systolic || '?'}/${session.vitals.BP_diastolic || '?'}`;

      stateContext = `

CURRENT PATIENT STATE: ${session.currentState}
STATE DESCRIPTION: ${stateDescription}
CURRENT VITALS: HR ${session.vitals.HR || '?'}, RR ${session.vitals.RR || '?'}, SpO2 ${session.vitals.SpO2 || '?'}%, BP ${bp}
`;
    }

    // Get state change notice if available
    const stateChangeNotice = session.stateChangeNotice || '';

    // Get CDP context if available
    const cdpContext = session.cdpContext || '';

    // Get medication safety context if available
    const medicationSafetyContext = session.medicationSafetyContext || '';

    // Get challenge context if available
    const challengeContext = session.challengeContext || '';

    // Challenge feedback context already declared earlier in function
    // No need to redeclare - just use the existing variable

    // Build system prompt with CHALLENGE CONTEXT as HIGHEST PRIORITY
    // When a challenge is active, AI must ask the question BEFORE continuing scenario
    // When challenge evaluated, AI must provide feedback BEFORE continuing scenario
    // Order: Challenge → Challenge Feedback → Patient Context → Treatment → CDP → Medication Safety → State Changes
    const systemPrompt = `${challengeContext}${challengeFeedbackContext}${patientContext}${treatmentResponse}${cdpContext}${medicationSafetyContext}${stateChangeNotice}

${coreAgentPrompt}${stateContext}

CURRENT SCENARIO CONTEXT:
${JSON.stringify(runtimeContext, null, 2)}${treatmentContext}`;

    console.log('=== FIRST CLAUDE CALL ===');
    const firstResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [...messages, { role: 'user', content: message }],
      tools: [{
    name: 'update_vitals',
    description: 'Update patient vital signs when measured',
    input_schema: {
      type: 'object',
      properties: {
        HR: { type: 'number' },
        RR: { type: 'number' },
        SpO2: { type: 'number' },
        BP_systolic: { type: 'number' },
        BP_diastolic: { type: 'number' },
        Temp: { type: 'number' },
        temperature: { type: 'number' },
        GCS: { type: 'number' },
        Glycemia: { type: 'number' }
      }
    }
  },

{
  name: 'reveal_patient_info',
  description: 'Add important patient information to clinical notes',
  input_schema: {
    type: 'object',
    properties: {
      note: {
        type: 'string',
        description: 'Clinical note to add (e.g., "History: Asthma since age 8")'
      }
    },
    required: ['note']
  }
}
]
    });

 console.log('Response content types:', firstResponse.content.map(block => block.type));

let finalResponse = '';
let vitalsUpdated = false;
let infoUpdated = false;
let needsSecondCall = false;
let toolResults = [];

for (const block of firstResponse.content) {
  if (block.type === 'text') {
    finalResponse += block.text;
  } else if (block.type === 'tool_use' && block.name === 'update_vitals') {  // ✅ VITALS BLOCK
    needsSecondCall = true;
    console.log('✅ Tool called with input:', block.input);
    
    const input = block.input;
    
    // Update only measured vitals
    if (input.HR) session.measuredVitals.HR = input.HR;
    if (input.RR) session.measuredVitals.RR = input.RR;
    if (input.SpO2) session.measuredVitals.SpO2 = input.SpO2;
    if (input.BP_systolic && input.BP_diastolic) {
      session.measuredVitals.BP = `${input.BP_systolic}/${input.BP_diastolic}`;
    }
    if (input.Temp) session.measuredVitals.Temp = input.Temp;
    if (input.temperature) session.measuredVitals.Temp = input.temperature;
    if (input.GCS) session.measuredVitals.GCS = input.GCS;
    if (input.Glycemia) session.measuredVitals.Glycemia = input.Glycemia;
    
    // Update engine vitals
    const currentVitals = session.engine.getCurrentVitals();
    session.engine.vitalsSimulator.vitals = {
      ...currentVitals,
      ...session.measuredVitals
    };
    
    vitalsUpdated = true;
    console.log('✅ Measured vitals updated to:', session.measuredVitals);
    
    toolResults.push({
      type: 'tool_result',
      tool_use_id: block.id,
      content: 'Vitals updated successfully'
    });
  } else if (block.type === 'tool_use' && block.name === 'reveal_patient_info') {
  needsSecondCall = true;
  console.log('📋 Note added:', block.input);
  
  session.patientNotes.push(block.input.note);
  infoUpdated = true;
  
  toolResults.push({
    type: 'tool_result',
    tool_use_id: block.id,
    content: 'Note added successfully'
  });
}
}

if (needsSecondCall) {
  console.log('=== SECOND CLAUDE CALL (with tool_result) ===');
  
  const secondResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: firstResponse.content },
      { role: 'user', content: [
        ...toolResults,
        { type: 'text', text: 'Now respond as the patient, describing what the student observes.' }
      ]}
    ]
  });
  
  console.log('Second response content types:', secondResponse.content.map(block => block.type));
  
  finalResponse = '';
  for (const block of secondResponse.content) {
    if (block.type === 'text') {
      finalResponse += block.text;
    }
  }
  
  console.log('✅ Final response:', finalResponse);
}

if (!finalResponse) {
  console.warn('⚠️ No text response generated');
  finalResponse = 'I am examining the patient...';
}

session.messages.push(
  { role: 'user', content: message },
  { role: 'assistant', content: finalResponse }
);

// Clear state change notice after use (so it doesn't persist to next message)
if (session.stateChangeNotice) {
  session.stateChangeNotice = '';
}

// Clear CDP context after use (so it doesn't persist to next message)
if (session.cdpContext) {
  session.cdpContext = '';
}

// Clear medication safety context after use (so it doesn't persist to next message)
if (session.medicationSafetyContext) {
  session.medicationSafetyContext = '';
}

// Clear challenge context after use (will be rebuilt if challenge still active)
if (session.challengeContext) {
  session.challengeContext = '';
}

// Clear challenge feedback context after use (one-time feedback delivery)
if (session.challengeFeedbackContext) {
  session.challengeFeedbackContext = '';
}

console.log('=== RESPONSE SENT TO FRONTEND ===');
console.log('Message:', finalResponse);
console.log('Vitals updated:', vitalsUpdated);
console.log('Measured vitals:', session.measuredVitals);
console.log('Info updated:', infoUpdated);
console.log('Patient notes:', session.patientNotes);

    // ✅ Send only measured vitals
    const formattedVitals = vitalsUpdated ? session.measuredVitals : undefined;
    
    console.log('🔍 Formatted vitals being sent:', formattedVitals);

    console.log('Info updated:', infoUpdated);
    console.log('Patient notes array:', session.patientNotes); 

res.json({
  message: finalResponse || 'The patient waits for your next action...',  // ✅ ADD FALLBACK
  vitalsUpdated: vitalsUpdated,
  vitals: formattedVitals,
  infoUpdated: infoUpdated,
  patientNotes: session.patientNotes,
  currentAgent: 'core',  // ✅ NEW: Include current agent
  isChallenge: session.activeChallenge && !session.activeChallenge.evaluation ? true : false,  // ✅ NEW: Challenge active?
  challengeResolved: session.activeChallenge && session.activeChallenge.evaluation ? true : false  // ✅ NEW: Challenge resolved?
});

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * POST /api/sessions/:id/complete
 * Mark scenario complete and get performance summary
 */
app.post('/api/sessions/:id/complete', (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Generate comprehensive summary
    const summary = generateScenarioSummary(session);

    // Mark scenario as completed
    session.scenarioCompleted = true;
    session.completedAt = Date.now();
    session.summary = summary;

    console.log('📊 Scenario completed:', summary.scenarioId);
    console.log('🎯 Performance Score:', summary.performanceScore.overallScore + '%');
    console.log('📈 Breakdown:', summary.performanceScore.breakdown);

    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    console.error('Error completing scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sessions/:sessionId/action
 * Process student action (treatment, assessment, etc)
 */
app.post('/api/sessions/:sessionId/action', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { action } = req.body;
    
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Process action through engine
    const result = session.engine.processStudentAction(action);
    
    // Check if scenario should end
    const endCheck = session.engine.shouldScenarioEnd();
    
    res.json({
      success: result.success,
      results: result.results,
      vitals: session.engine.getCurrentVitals(),
      patientState: session.engine.stateManager.getStateName(),
      shouldEnd: endCheck
    });
  } catch (error) {
    console.error('Error processing action:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId/vitals
 * Get current vital signs
 */
app.get('/api/sessions/:sessionId/vitals', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // ✅ FIX: Return only MEASURED vitals, not engine's auto-calculated vitals
    // This ensures vitals panel is empty until user explicitly measures them
    const vitals = session.measuredVitals || {};

    res.json({
      raw: vitals,
      formatted: vitals, // Keep same structure for compatibility
      concerns: {} // No concerns for empty vitals
    });
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId/state
 * Get current session state and vitals (for frontend polling)
 * Phase 5, Task 5.3 - Vitals Polling Enhancement
 */
app.get('/api/sessions/:sessionId/state', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update state before sending (ensure latest progression)
    if (session.scenario && session.currentState) {
      evaluateStateProgression(session);
    }

    res.json({
      currentState: session.currentState,
      vitals: session.vitals,
      timeSinceStart: session.scenarioStartTime ? (Date.now() - session.scenarioStartTime) / 1000 : 0,
      criticalTreatmentsGiven: session.criticalTreatmentsGiven || {},
      stateHistory: session.stateHistory || []
    });
  } catch (error) {
    console.error('Error fetching session state:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId/performance
 * Get performance report (for AAR)
 */
app.get('/api/sessions/:sessionId/performance', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Calculate CDP performance score
    const performanceScore = calculatePerformanceScore(session);

    // Generate critical actions timeline
    const timeline = generateCriticalActionsTimeline(session);

    // Analyze treatment timing
    const treatmentTiming = analyzeTreatmentTiming(session);

    // Generate comprehensive scenario summary
    const scenarioSummary = generateScenarioSummary(session);

    // Generate comprehensive report
    const report = {
      sessionId: session.sessionId,
      scenarioId: session.scenario?.scenario_id || session.scenarioId,
      totalTime: session.scenarioStartTime ? (Date.now() - session.scenarioStartTime) / 1000 : 0,
      finalState: session.currentState,

      // CDP Performance (Task 2.1)
      performanceScore: performanceScore,
      cdpEvaluations: session.cdpEvaluations || [],

      // Medication Safety (Task 2.2)
      medicationErrors: session.medicationErrors || [],
      medicationWarnings: session.medicationWarnings || [],
      safetyViolations: session.safetyViolations || 0,

      // Critical treatments tracking
      criticalTreatments: session.criticalTreatmentsGiven || {},
      actionsLog: session.criticalActionsLog || [],
      stateHistory: session.stateHistory || [],

      // Timeline for AAR visualization
      timeline: timeline,

      // Treatment timing analysis
      treatmentTiming: treatmentTiming,

      // Comprehensive scenario summary (Task 2.3)
      scenarioSummary: scenarioSummary,

      // Summary (backward compatibility)
      summary: {
        oxygenGiven: session.criticalTreatmentsGiven?.oxygen || false,
        salbutamolGiven: session.criticalTreatmentsGiven?.salbutamol || false,
        steroidsGiven: session.criticalTreatmentsGiven?.steroids || false,
        patientOutcome: session.currentState,
        totalActions: (session.criticalActionsLog || []).length,
        dangerousMedicationsCount: (session.medicationErrors || []).length
      }
    };

    // Add engine report if available (for backward compatibility)
    if (session.engine && typeof session.engine.generatePerformanceReport === 'function') {
      report.engineReport = session.engine.generatePerformanceReport();
    }

    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * End session and cleanup
 */
app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Generate final report
    const finalReport = session.engine.generatePerformanceReport();
    
    // Delete session
    sessions.delete(sessionId);
    
    res.json({
      message: 'Session ended',
      finalReport: finalReport
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AAR AGENT ENDPOINTS (Task 4.3)
// ============================================================================

/**
 * POST /api/sessions/:sessionId/aar/start
 * Initialize After Action Review
 */
app.post('/api/sessions/:sessionId/aar/start', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log('📊 Starting AAR for session:', sessionId);

    // Calculate CDP performance score
    const performanceScore = calculatePerformanceScore(session);

    // Generate critical actions timeline
    const timeline = generateCriticalActionsTimeline(session);

    // Analyze treatment timing
    const treatmentTiming = analyzeTreatmentTiming(session);

    // Generate comprehensive scenario summary
    const scenarioSummary = generateScenarioSummary(session);

    // Prepare comprehensive performance data
    const performanceData = {
      sessionId: session.sessionId,
      scenarioId: session.scenario?.scenario_id || session.scenarioId,
      totalTime: session.scenarioStartTime ? (Date.now() - session.scenarioStartTime) / 1000 : 0,
      finalState: session.currentState,

      // CDP Performance
      performanceScore: performanceScore,
      cdpEvaluations: session.cdpEvaluations || [],

      // Medication Safety
      medicationErrors: session.medicationErrors || [],
      medicationWarnings: session.medicationWarnings || [],

      // Critical treatments tracking
      criticalTreatments: session.criticalTreatmentsGiven || {},
      actionsLog: session.criticalActionsLog || [],
      stateHistory: session.stateHistory || [],

      // Timeline and analysis
      timeline: timeline,
      treatmentTiming: treatmentTiming,
      scenarioSummary: scenarioSummary
    };

    // Initialize AAR session
    const aarSession = aarService.initializeAAR(sessionId, performanceData);

    // Load AAR prompt
    const aarPromptPath = path.join(__dirname, './prompts/aarAgent.txt');
    const aarPrompt = fs.readFileSync(aarPromptPath, 'utf-8');

    // Build performance context
    const context = aarService.buildAARContext(sessionId);

    // Get opening message from Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: aarPrompt + '\n\n' + context,
      messages: [
        { role: 'user', content: 'Start the AAR session. Begin with a warm greeting and ask the student for their initial reflection.' }
      ]
    });

    const aarMessage = response.content[0].text;

    // Add to conversation history
    aarService.addMessage(sessionId, 'assistant', aarMessage);

    console.log('✅ AAR session started successfully');

    res.json({
      message: aarMessage,
      phase: aarSession.phase,
      aarActive: true
    });
  } catch (error) {
    console.error('❌ Error starting AAR:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sessions/:sessionId/aar/message
 * Continue AAR conversation
 */
app.post('/api/sessions/:sessionId/aar/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message: userMessage } = req.body;

    const aarSession = aarService.getAAR(sessionId);
    if (!aarSession) {
      return res.status(404).json({ error: 'AAR session not found' });
    }

    console.log('💬 AAR message received:', userMessage.substring(0, 50) + '...');

    // Add user message to history
    aarService.addMessage(sessionId, 'user', userMessage);

    // Load AAR prompt
    const aarPromptPath = path.join(__dirname, './prompts/aarAgent.txt');
    const aarPrompt = fs.readFileSync(aarPromptPath, 'utf-8');

    // Build performance context
    const context = aarService.buildAARContext(sessionId);

    // Get conversation history
    const conversationHistory = aarService.getConversationHistory(sessionId);

    // Get Claude response
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: aarPrompt + '\n\n' + context,
      messages: conversationHistory
    });

    let aarMessage = response.content[0].text;

    // Check for completion marker
    const isComplete = aarMessage.includes('[AAR_COMPLETE]');
    if (isComplete) {
      aarMessage = aarMessage.replace('[AAR_COMPLETE]', '').trim();
      aarService.updatePhase(sessionId, 'complete');

      // Layer 3: Feature 3 - Mark session as complete and auto-save
      const session = sessions.get(sessionId);
      if (session) {
        session.sessionComplete = true;
        session.completedAt = new Date().toISOString();

        // AUTO-SAVE to disk (if student is registered)
        if (session.studentId) {
          try {
            await saveStudentData(session);
            console.log('✅ AAR session completed and data saved:', session.studentId);
          } catch (error) {
            console.error('❌ Error saving student data:', error);
            // Don't fail the request if save fails - student data is still in memory
          }
        } else {
          console.log('✅ AAR session completed (no student ID - data not saved)');
        }
      }
    }

    // Add response to history
    aarService.addMessage(sessionId, 'assistant', aarMessage);

    res.json({
      message: aarMessage,
      phase: aarSession.phase,
      aarComplete: isComplete
    });
  } catch (error) {
    console.error('❌ Error in AAR conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId/aar/status
 * Get AAR session status
 */
app.get('/api/sessions/:sessionId/aar/status', (req, res) => {
  try {
    const { sessionId } = req.params;
    const aarSession = aarService.getAAR(sessionId);

    if (!aarSession) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      phase: aarSession.phase,
      isComplete: aarService.isComplete(sessionId),
      messageCount: aarSession.conversationHistory.length,
      duration: Math.floor((Date.now() - aarSession.startTime) / 1000)
    });
  } catch (error) {
    console.error('Error getting AAR status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// BACKGROUND MONITORING - Auto-Deterioration (Task 1.4)
// ============================================================================

/**
 * Auto-deterioration monitor
 * Checks patient state every 30 seconds for time-based deterioration
 * This ensures patients deteriorate even if student doesn't interact
 */
setInterval(() => {
  for (const [sessionId, session] of sessions.entries()) {
    // Only check active Core Agent scenarios
    if (session.currentAgent === 'core' && session.scenario && session.currentState !== 'aar') {
      // Only evaluate if at least 25 seconds passed since last check
      // This prevents double-checking if state was just evaluated via message
      const timeSinceLastCheck = Date.now() - session.lastDeteriorationCheck;
      if (timeSinceLastCheck < 25000) continue;

      // Update check timestamp before evaluation
      session.lastDeteriorationCheck = Date.now();

      const previousState = session.currentState;
      const newState = evaluateStateProgression(session);

      if (newState !== previousState) {
        console.log(`⏰ [AUTO-DETERIORATION] ${sessionId}: ${previousState} → ${newState}`);

        // State is already updated by evaluateStateProgression
        // Just log the automatic deterioration
        const elapsedTime = (Date.now() - session.scenarioStartTime) / 1000;

        session.criticalActionsLog.push({
          action: 'auto_deterioration',
          category: 'system',
          fromState: previousState,
          toState: newState,
          timestamp: Date.now(),
          elapsedTime: elapsedTime,
          reason: 'Time-based deterioration due to lack of treatment'
        });
      }
    }
  }
}, 30000); // Check every 30 seconds

console.log('✅ Auto-deterioration monitor started (30-second intervals)');

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Know Thyself MVP Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST   /api/sessions/start`);
  console.log(`   POST   /api/sessions/:id/message`);
  console.log(`   POST   /api/sessions/:id/action`);
  console.log(`   GET    /api/sessions/:id/vitals`);
  console.log(`   GET    /api/sessions/:id/performance`);
  console.log(`   POST   /api/sessions/:id/aar/start`);
  console.log(`   POST   /api/sessions/:id/aar/message`);
  console.log(`   GET    /api/sessions/:id/aar/status`);
  console.log(`   DELETE /api/sessions/:id`);
});