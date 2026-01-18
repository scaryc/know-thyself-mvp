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

// Database services
import db from './services/databaseService.js';
import { dbToRuntimeSession, runtimeToDbSession } from './services/sessionHelpers.js';

// Language loader
import { loadPrompt, loadScenario as loadScenarioWithLang, loadQuestions, getTranslation } from './utils/languageLoader.js';

// ✅ Phase 1: AAR context builder and blueprint loader
import { buildFullAARContext, formatAARContextForPrompt } from './services/aarContextBuilder.js';
import { loadBlueprint } from './utils/blueprintLoader.js';

// ✅ Phase 2: Checklist matcher
import { findChecklistMatch, shouldExcludeAction, calculatePoints } from './utils/checklistMatcher.js';

// Initialize
const app = express();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model configuration - allows switching between different Claude models per agent
const COGNITIVE_COACH_MODEL = process.env.COGNITIVE_COACH_MODEL || 'claude-3-5-haiku-20241022';
const CORE_AGENT_MODEL = process.env.CORE_AGENT_MODEL || 'claude-sonnet-4-20250514';
const AAR_AGENT_MODEL = process.env.AAR_AGENT_MODEL || 'claude-3-5-haiku-20241022';

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',  // Local development
    'https://know-thyself-mvp-lce2.vercel.app',  // Production frontend (Vercel)
    'https://know-thyself-frontend.onrender.com',  // Old production frontend (Render)
    process.env.FRONTEND_URL  // Custom frontend URL from env var
  ].filter(Boolean),  // Remove undefined values
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Session cache (backed by database)
const sessionCache = new Map();
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes (increased to match session lifetime)

// Session locks to prevent concurrent modifications
const sessionLocks = new Map();

// API timeout configuration
const API_TIMEOUT = 5 * 60 * 1000; // 5 minutes for Anthropic API calls

/**
 * Timeout wrapper for Anthropic API calls
 * Prevents indefinite hanging when API is unresponsive
 */
async function callAnthropicWithTimeout(apiCall, timeoutMs = API_TIMEOUT) {
  return Promise.race([
    apiCall,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Anthropic API call timed out')), timeoutMs)
    )
  ]);
}

/**
 * Acquire a lock for a session to prevent concurrent modifications
 */
async function acquireSessionLock(sessionId, maxWaitMs = 30000) {
  const startTime = Date.now();

  while (sessionLocks.get(sessionId)) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`Failed to acquire lock for session ${sessionId} - timeout`);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  sessionLocks.set(sessionId, true);
}

/**
 * Release a session lock
 */
function releaseSessionLock(sessionId) {
  sessionLocks.delete(sessionId);
}

/**
 * Get session from cache or database
 */
async function getSession(sessionId) {
  // Check cache first
  const cached = sessionCache.get(sessionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.session;
  }

  // Load from database
  const dbSession = await db.getSession(sessionId);
  if (!dbSession) return null;

  // Convert to runtime format
  const session = dbToRuntimeSession(dbSession);

  // Cache it
  sessionCache.set(sessionId, {
    session: session,
    timestamp: Date.now()
  });

  return session;
}

/**
 * Save session to database (and update cache)
 */
async function saveSession(session) {
  const updates = runtimeToDbSession(session);
  await db.updateSession(session.sessionId, updates);

  // Update cache
  sessionCache.set(session.sessionId, {
    session: session,
    timestamp: Date.now()
  });
}

/**
 * Load scenario from JSON file (with language support)
 * @deprecated Use loadScenarioWithLang from languageLoader instead
 */
function loadScenario(scenarioId, language = 'en') {
  return loadScenarioWithLang(scenarioId, language);
}

/**
 * Load AI system prompt (with language support)
 * @deprecated Use loadPrompt from languageLoader instead
 */
function loadSystemPrompt(language = 'en') {
  return loadPrompt('core-agent-ami', language);
}

// ============================================================================
// STUDENT REGISTRATION (Layer 3 - MVP Testing)
// ============================================================================

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
      aarTranscript: aarService.getConversationHistory(session.sessionId),

      metadata: {
        version: 'Layer3_MVP',
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
    const { name, email, consent, language = 'en' } = req.body;

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

    // Generate student ID
    const studentId = generateStudentId(name);

    // Create student data
    const studentData = {
      studentId,
      studentName: name.trim(),
      studentEmail: email?.trim() || null,
      language: language || 'en', // Store language preference
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

    console.log(`✅ Student registered: ${studentId}`);

    res.json({
      success: true,
      studentId,
      message: `Welcome, ${name.trim()}! You are registered for training.`
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
app.get('/api/sessions/:sessionId/check', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getSession(sessionId);

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
      language: session.language || 'en',  // ✅ Include language preference for session resume
      dispatchInfo: session.dispatchInfo || null,
      patientInfo: session.patientInfo || null,
      patientNotes: session.patientNotes || []  // ✅ Include patientNotes for session resume
    });

  } catch (error) {
    console.error('Error checking session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sessions/start
 * Start a new training session
 * Modified for Layer 3: Accepts studentId
 */
app.post('/api/sessions/start', async (req, res) => {
  try {
    const { scenarioId = 'asthma_patient_v2.0_final', studentId, scenarioQueue } = req.body;

    // Layer 3: Load student data if provided
    let studentData = null;
    let language = 'en'; // Default language

    if (studentId) {
      try {
        const studentFilePath = path.join(__dirname, '../data/students', `${studentId}.json`);
        if (fs.existsSync(studentFilePath)) {
          studentData = JSON.parse(fs.readFileSync(studentFilePath, 'utf8'));
          language = studentData.language || 'en'; // Get language preference
          console.log(`👤 Student: ${studentData.studentName} (Language: ${language})`);
        } else {
          console.warn(`⚠️ Student file not found: ${studentId}`);
        }
      } catch (error) {
        console.error('Error loading student data:', error);
      }
    } else {
      language = req.body.language || 'en'; // Allow language override
    }

    console.log('🎓 Starting new session with Cognitive Coach');

    // Select random questions for Cognitive Coach
    const selectedQuestions = cognitiveCoachService.selectRandomQuestions(3, language);
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
      language: language, // Store language preference for session

      // Layer 3: Session tracking (Feature 2 - Session Resume)
      currentScenarioIndex: 0,
      scenarioQueue: scenarioQueue || [],  // Scenarios selected by frontend
      completedScenarios: [],
      scenarioPerformanceHistory: [],  // ✅ NEW: Store complete performance data for AAR
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
        completed: false,
        communicationAnalysis: {
          patternsDetected: {
            sequentialThinking: 'none',
            thoroughness: 'medium',
            conciseness: 'medium',
            actionBundling: false,
            verbose: false
          },
          metrics: {
            averageWordCount: 0,
            sequentialLanguageCount: 0,
            actionBundlingInstances: 0,
            responseStructureQuality: 'clear'
          },
          personalizedNudge: {
            type: 'none',
            content: ''
          },
          studentQuestions: [],
          phase3Completed: false,
          phase3Duration: 0
        }
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

      // Empty arrays for now (will populate at transition)
      messages: [],
      startTime: Date.now(),

      // ✅ Phase 1: Full transcript storage (survives Strategy B pruning)
      fullTranscript: [],

      // ✅ Phase 2: Checklist results tracking
      checklistResults: []
      // NO engine, NO measuredVitals, NO patientNotes yet
    };

    // Create session in database
    await db.createSession(session);

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
    console.log('🌍 Session language set to:', language);  // ✅ DEBUG: Confirm language at creation

    // ✅ NEW: Generate initial Cognitive Coach greeting
    try {
      console.log('🎓 Generating initial Cognitive Coach message...');

      // Build Cognitive Coach prompt with current session context
      const systemPrompt = cognitiveCoachPromptBuilder.buildCognitiveCoachPrompt(session);

      // Get localized start signal
      const startSignal = getTranslation('cognitiveCoach.sessionStart', language, 'api');
      console.log('🌍 Using start signal:', startSignal);

      // Call Claude API to get initial greeting
      const response = await anthropic.messages.create({
        model: COGNITIVE_COACH_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: startSignal
          }
        ]
      });

      const initialMessage = response.content[0].text;
      console.log('✅ Initial message generated:', initialMessage.substring(0, 100) + '...');

      // Add to session messages and database
      await db.addMessage(sessionId, 'user', startSignal);
      await db.addMessage(sessionId, 'assistant', initialMessage);

      session.messages.push(
        { role: 'user', content: startSignal, timestamp: Date.now() },
        { role: 'assistant', content: initialMessage, timestamp: Date.now() }
      );

      // Return response with initial message
      res.json({
        sessionId,
        currentAgent: 'cognitive_coach',
        questionCount: selectedQuestions.length,
        initialMessage: initialMessage // ✅ NEW: Include initial message for frontend
      });

    } catch (error) {
      console.error('❌ Error generating initial Cognitive Coach message:', error);
      // Fallback: return without initial message
      res.json({
        sessionId,
        currentAgent: 'cognitive_coach',
        questionCount: selectedQuestions.length
      });
    }
    
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
      dangerousMedicationsGiven: (session.dangerousMedicationsGiven || []).length,
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

  // ✅ STRATEGY B: Track state change in memory
  addMemoryStateChange(session, newState, `auto_deterioration`);

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

  // ✅ STRATEGY B: Track state change in memory
  const reason = newState === 'improving' ? 'treatment_response' :
                 newState === 'deteriorating' ? 'no_treatment' : 'state_transition';
  addMemoryStateChange(session, newState, reason);

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
  const currentStateDesc = scenario.state_descriptions?.[session.currentState];
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

  // Get clinical presentation - fallback to general description if state not defined
  const clinicalPresentation = currentStateDesc?.student_sees ||
    `Patient in ${session.currentState} condition. Vitals: HR ${session.vitals.HR}, RR ${session.vitals.RR}, SpO2 ${session.vitals.SpO2}%`;

  const context = `
=== CURRENT PATIENT STATE ===
State: ${session.currentState.toUpperCase()}
Time Elapsed: ${elapsedMinutes} minutes
Clinical Presentation: ${clinicalPresentation}

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
- CRITICAL: Describe physical observations in THIRD PERSON (he/she/the patient). Only use FIRST PERSON (I/me/my) inside quotation marks for patient dialogue
- Respond naturally to questions and assessments in character
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
 * Build medication safety context for Core Agent using V3.0 rich data
 * Provides detailed patient response and vital changes from V3.0 scenarios
 * Enables accurate, educational AI responses showing specific patient deterioration
 * @param {Object} medicationIssue - Medication issue with V3.0 rich data
 * @returns {string} - Formatted context for Core Agent prompt
 */
function buildMedicationSafetyContext_V3(medicationIssue) {
  if (!medicationIssue) return '';

  // Build detailed context using V3.0 rich data
  let context = '\n=== ';

  // Header based on severity
  if (medicationIssue.severity === 'critical_harm') {
    context += 'CRITICAL MEDICATION EVENT (SAFETY GATE FAILURE)';
  } else if (medicationIssue.severity === 'worsens') {
    context += 'MEDICATION CONCERN';
  } else {
    context += 'MEDICATION EVENT';
  }

  context += ' ===\n';

  // Core medication info
  context += `\nMEDICATION GIVEN: ${medicationIssue.medication}`;
  if (medicationIssue.matchedName !== medicationIssue.medication) {
    context += ` (matched: "${medicationIssue.matchedName}")`;
  }
  context += '\n';

  context += `SEVERITY: ${medicationIssue.severity.toUpperCase()}\n`;
  context += `REASON: ${medicationIssue.reason}\n`;

  // Patient state information
  if (medicationIssue.patient_state_at_action) {
    context += `\nPATIENT STATE BEFORE: ${medicationIssue.patient_state_at_action}\n`;
  }
  if (medicationIssue.state_change) {
    context += `PATIENT STATE AFTER: ${medicationIssue.state_change}\n`;
  }

  // V3.0 Rich Data: Patient Response
  if (medicationIssue.patient_response) {
    context += `\nPATIENT RESPONSE (USE THIS IN YOUR REPLY):\n`;
    context += `${medicationIssue.patient_response}\n`;
  }

  // V3.0 Rich Data: Vital Changes
  if (medicationIssue.vital_changes && Object.keys(medicationIssue.vital_changes).length > 0) {
    context += `\nVITAL SIGN CHANGES (REFLECT THESE):\n`;
    for (const [vital, value] of Object.entries(medicationIssue.vital_changes)) {
      context += `- ${vital}: ${typeof value === 'number' ? value : `changes by ${value}`}\n`;
    }
  }

  // Clinical Note
  if (medicationIssue.clinical_note) {
    context += `\nCLINICAL NOTE:\n${medicationIssue.clinical_note}\n`;
  }

  // Instructions for Core Agent
  context += `\nINSTRUCTION:\n`;
  context += `Your next response must show these adverse effects happening.\n`;

  if (medicationIssue.patient_response) {
    context += `Use the patient response text above as guidance for what happens.\n`;
  }

  if (medicationIssue.state_change) {
    context += `The patient's condition should WORSEN to ${medicationIssue.state_change} state.\n`;
  }

  context += `Stay in character but make the adverse reaction clear and concerning.\n`;
  context += `Continue the scenario naturally - do not interrupt or warn the student.\n`;

  if (medicationIssue.severity === 'critical_harm') {
    context += `This will be addressed as a Safety Gate failure in AAR debriefing.\n`;
  }

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

// ═══════════════════════════════════════════════════════════════════════════
// V3.0 MEDICATION SAFETY SYSTEM
// Direct integration with V3.0 scenario structure (secondary_medications_by_impact)
// Implements outcome-based assessment (NO POINTS, uses severity levels)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Brand name to generic name mapping for medication detection
 * Used by detectMedicationMention() to catch brand name usage
 */
const BRAND_VARIANTS = {
  'diazepam': ['apaurin', 'valium', 'seduxen'],
  'morphine': ['morphin', 'mst', 'oramorph'],
  'propranolol': ['inderal'],
  'metoprolol': ['betaloc', 'lopressor'],
  'flumazenil': ['anexate'],
  'naloxone': ['narcan', 'nyxoid'],
  'epinephrine': ['adrenaline', 'adrenalin', 'epipen', 'jext'],
  'salbutamol': ['albuterol', 'ventolin'],
  'insulin': ['novorapid', 'lantus', 'humalog', 'actrapid'],
  'hydrocortisone': ['solu-cortef'],
  'methylprednisolone': ['solu-medrol'],
  'midazolam': ['dormicum'],
  'lorazepam': ['ativan'],
  'fentanyl': ['durogesic', 'actiq'],
  'ketamine': ['ketalar'],
  'atropine': ['atropin']
};

/**
 * Helper: Detect if a medication is mentioned in user message
 * Checks medication name, generic name, and brand variants
 * @param {Object} med - Medication object from V3.0 scenario
 * @param {string} lowerMessage - Lowercase user message
 * @returns {boolean|string} - False if not detected, matched name if detected
 */
function detectMedicationMention(med, lowerMessage) {
  // Check medication name (e.g., "apaurin")
  if (med.name && lowerMessage.includes(med.name.toLowerCase())) {
    return med.name;
  }

  // Check generic name (e.g., "diazepam")
  if (med.generic_name && lowerMessage.includes(med.generic_name.toLowerCase())) {
    return med.generic_name;
  }

  // Check brand variants based on generic name
  const genericLower = med.generic_name?.toLowerCase();
  if (genericLower && BRAND_VARIANTS[genericLower]) {
    for (const variant of BRAND_VARIANTS[genericLower]) {
      if (lowerMessage.includes(variant)) {
        return variant;
      }
    }
  }

  return false;
}

/**
 * Helper: Create medication issue object with V3.0 rich data
 * NO POINTS - uses severity levels instead (critical_harm, worsens, neutral)
 * @param {Object} med - Medication object from V3.0 scenario
 * @param {string} severity - Severity category from V3.0
 * @param {Object} session - Current session
 * @param {string} matchedName - The name/brand that was matched
 * @returns {Object} - Structured medication issue
 */
function createMedicationIssue(med, severity, session, matchedName) {
  const elapsedMinutes = (Date.now() - session.scenarioStartTime) / 60000;

  return {
    // Core identification
    medication: med.generic_name || med.name,
    matchedName: matchedName,

    // Severity (NOT points - outcome-based assessment)
    severity: severity,
    reason: med.why_dangerous || med.reason || 'Inappropriate for this patient',

    // V3.0 Rich Data for Core Agent
    patient_response: med.if_given?.patient_response,
    vital_changes: med.if_given?.vital_changes,
    clinical_note: med.if_given?.clinical_note,
    state_change: med.if_given?.state_change,

    // Safety Gate Data (for AAR)
    is_safety_gate_failure: severity === 'critical_harm',
    aar_teaching_point: med.teaching_point,

    // Context
    patient_state_at_action: session.currentPatientState || 'unknown',
    timestamp: Date.now(),
    elapsedMinutes: elapsedMinutes,
    userMessage: session.lastUserMessage
  };
}

/**
 * Helper: Apply vital sign changes from medication administration
 * Updates session.currentVitals with V3.0 specified changes
 * @param {Object} session - Current session
 * @param {Object} vitalChanges - Vital changes object from V3.0 scenario
 */
function applyVitalChanges(session, vitalChanges) {
  if (!vitalChanges || !session.currentVitals) return;

  // Apply each vital change
  for (const [vital, value] of Object.entries(vitalChanges)) {
    if (typeof value === 'number') {
      // Absolute value
      session.currentVitals[vital] = value;
    } else if (typeof value === 'string' && (value.startsWith('+') || value.startsWith('-'))) {
      // Relative change (e.g., "+10-15" or "-20")
      const numMatch = value.match(/[+-]?\d+/);
      if (numMatch && session.currentVitals[vital]) {
        session.currentVitals[vital] += parseInt(numMatch[0]);
      }
    }
  }
}

/**
 * Helper: Log medication error as Safety Gate failure
 * Replaces deprecated CDP rating system - V3.0 uses Safety Gate for critical failures
 * @param {Object} session - Current session
 * @param {Object} med - Medication object from V3.0 scenario
 * @param {string} matchedName - The name/brand that was matched
 */
function logSafetyGateFailure(session, med, matchedName) {
  if (!session.safetyGateFailures) {
    session.safetyGateFailures = [];
  }

  const elapsedMinutes = (Date.now() - session.scenarioStartTime) / 60000;

  session.safetyGateFailures.push({
    id: `SF_MED_${(med.generic_name || med.name).toUpperCase().replace(/\s+/g, '_')}`,
    type: 'commission',
    description: `${med.generic_name || med.name} administered (matched: "${matchedName}") - ${med.why_dangerous || med.reason}`,
    timestamp: Date.now(),
    elapsedMinutes: elapsedMinutes,
    patient_outcome: med.if_given?.patient_response,
    aar_teaching_point: med.teaching_point,
    vital_changes: med.if_given?.vital_changes,
    state_change: med.if_given?.state_change
  });

  console.warn('🚨 SAFETY GATE FAILURE:', med.generic_name || med.name, '- Commission error');
}

/**
 * V3.0 Medication Safety Check
 * Directly reads V3.0 secondary_medications_by_impact structure
 * Detects dangerous medications and logs Safety Gate failures
 * @param {Object} session - Current session
 * @param {string} userMessage - Student's message/action
 * @returns {Array|null} - Array of detected issues with V3.0 rich data, or null
 */
function checkMedicationSafety_V3(session, userMessage) {
  // Guard: If scenario not loaded yet, skip check
  if (!session.scenario) return null;

  const scenario = session.scenario;
  const secondaryMeds = scenario.secondary_medications_by_impact;

  // Guard: No V3.0 medication data
  if (!secondaryMeds) return null;

  const lowerMessage = userMessage.toLowerCase();
  const detectedIssues = [];

  // Store user message for context
  session.lastUserMessage = userMessage;

  // ═══════════════════════════════════════════════════════════════════════
  // Process CRITICAL_HARM medications (Safety Gate failures)
  // ═══════════════════════════════════════════════════════════════════════
  if (secondaryMeds.critical_harm && Array.isArray(secondaryMeds.critical_harm)) {
    for (const med of secondaryMeds.critical_harm) {
      const matchedName = detectMedicationMention(med, lowerMessage);
      if (matchedName) {
        // Create issue with V3.0 rich data
        const issue = createMedicationIssue(med, 'critical_harm', session, matchedName);

        // Apply vital changes immediately
        if (med.if_given?.vital_changes) {
          applyVitalChanges(session, med.if_given.vital_changes);
        }

        // Update patient state if specified
        if (med.if_given?.state_change) {
          session.currentPatientState = med.if_given.state_change;
        }

        // Log as Safety Gate failure
        logSafetyGateFailure(session, med, matchedName);

        detectedIssues.push(issue);

        // Log to critical actions (legacy compatibility)
        session.criticalActionsLog.push({
          action: 'dangerous_medication_given',
          ...issue
        });

        // Increment safety violations counter
        session.safetyViolations = (session.safetyViolations || 0) + 1;

        console.warn('⚠️ CRITICAL_HARM MEDICATION DETECTED:', med.generic_name || med.name, '-', matchedName);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Process WORSENS medications (tracked but not Safety Gate)
  // ═══════════════════════════════════════════════════════════════════════
  if (secondaryMeds.worsens && Array.isArray(secondaryMeds.worsens)) {
    for (const med of secondaryMeds.worsens) {
      const matchedName = detectMedicationMention(med, lowerMessage);
      if (matchedName) {
        // Create issue (not Safety Gate)
        const issue = createMedicationIssue(med, 'worsens', session, matchedName);

        // Apply vital changes
        if (med.if_given?.vital_changes) {
          applyVitalChanges(session, med.if_given.vital_changes);
        }

        // Update patient state if specified
        if (med.if_given?.state_change) {
          session.currentPatientState = med.if_given.state_change;
        }

        detectedIssues.push(issue);

        console.warn('⚠️ WORSENS MEDICATION DETECTED:', med.generic_name || med.name, '-', matchedName);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Track NEUTRAL medications (for teaching opportunities only)
  // ═══════════════════════════════════════════════════════════════════════
  if (secondaryMeds.neutral && Array.isArray(secondaryMeds.neutral)) {
    if (!session.medicationNotes) {
      session.medicationNotes = [];
    }

    for (const med of secondaryMeds.neutral) {
      const matchedName = detectMedicationMention(med, lowerMessage);
      if (matchedName) {
        session.medicationNotes.push({
          medication: med.generic_name || med.name,
          matchedName: matchedName,
          note: med.teaching_point || 'Neutral medication - no significant impact',
          timestamp: Date.now()
        });

        console.log('ℹ️ NEUTRAL MEDICATION DETECTED:', med.generic_name || med.name, '-', matchedName);
      }
    }
  }

  return detectedIssues.length > 0 ? detectedIssues : null;
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
 * Generate comprehensive checklist summary at scenario end (Phase 2)
 * Includes completed items, missed items, and scoring
 *
 * @param {object} session - Current session
 * @returns {object} Checklist summary
 */
function generateChecklistSummary(session) {
  const checklist = session.scenario?.critical_actions_checklist || [];
  const completed = session.checklistResults || [];

  // Identify missed items (in checklist but not in completed)
  const missed = checklist
    .filter(item => !completed.find(c => c.id === item.id))
    .map(item => ({
      id: item.id,
      action: item.action,
      category: item.category || 'general',
      completed: false,
      target: item.time_target_minutes,
      importance: item.importance,
      points: 0,
      maxPoints: item.points || 0
    }));

  // Calculate totals
  const totalPoints = completed.reduce((sum, c) => sum + (c.points || 0), 0);
  const maxPoints = checklist.reduce((sum, c) => sum + (c.points || 0), 0);
  const onTimeCount = completed.filter(c => c.onTime).length;
  const lateCount = completed.filter(c => !c.onTime).length;

  // Identify critical misses
  const criticalMissed = missed.filter(m => m.importance === 'critical');
  const essentialMissed = missed.filter(m => m.importance === 'essential');

  return {
    // Item lists
    completed: completed.sort((a, b) => a.time - b.time),
    missed: missed,

    // Counts
    totalItems: checklist.length,
    completedCount: completed.length,
    missedCount: missed.length,
    onTimeCount,
    lateCount,

    // Scoring
    totalPoints,
    maxPoints,
    percentageScore: maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0,

    // Critical analysis
    criticalMissed: criticalMissed.map(m => m.action),
    essentialMissed: essentialMissed.map(m => m.action),
    hasCriticalMisses: criticalMissed.length > 0,

    // Timing analysis
    averageDelay: lateCount > 0
      ? Math.round(completed.filter(c => !c.onTime).reduce((sum, c) => sum + c.minutesLate, 0) / lateCount * 10) / 10
      : 0
  };
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

// ═══════════════════════════════════════════════════════════════════════════
// V3.0 OUTCOME-BASED CONSEQUENCE FEEDBACK
// Patient state-based assessment (NO TIME THRESHOLDS)
// Implements outcome-based competence assessment for AAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assess competence level based on patient state trajectory (NOT time)
 * V3.0 philosophy: Patient outcomes matter, not arbitrary time thresholds
 * @param {string} patientStateAtAction - Patient state when action was performed
 * @param {string} patientStateAfter - Patient state after action
 * @param {string} technique - Execution technique (e.g., 'dangerous')
 * @returns {string} - Competence level: EXEMPLARY, COMPETENT, DEVELOPING, or NOVICE
 */
function assessCompetenceLevel(patientStateAtAction, patientStateAfter, technique) {
  // Check for dangerous execution - immediate NOVICE rating
  if (technique === 'dangerous') {
    return 'NOVICE';
  }

  // Guard for missing data
  if (!patientStateAtAction || !patientStateAfter) {
    return 'DEVELOPING';  // Default to DEVELOPING if data missing
  }

  // EXEMPLARY: Prevented deterioration entirely
  // Action performed in initial state and patient improved/stabilized
  if (patientStateAtAction === 'initial' &&
      (patientStateAfter === 'improving' || patientStateAfter === 'stable')) {
    return 'EXEMPLARY';
  }

  // COMPETENT: Stabilized before major deterioration
  // Action performed in initial or early_deteriorating, patient improved/stabilized
  if ((patientStateAtAction === 'initial' || patientStateAtAction === 'early_deteriorating') &&
      (patientStateAfter === 'improving' || patientStateAfter === 'stable')) {
    return 'COMPETENT';
  }

  // DEVELOPING: Patient was in high-risk state before treatment
  // Action performed in deteriorating or critical state
  if ((patientStateAtAction === 'deteriorating' || patientStateAtAction === 'critical') &&
      patientStateAfter === 'improving') {
    return 'DEVELOPING';
  }

  // DEVELOPING: Action performed but patient still in concerning state
  if (patientStateAtAction === 'deteriorating' || patientStateAtAction === 'critical') {
    return 'DEVELOPING';
  }

  // Default to DEVELOPING for edge cases
  return 'DEVELOPING';
}

/**
 * Build outcome-based feedback for a specific action
 * Uses patient state data instead of time-based thresholds
 * @param {Object} criticalAction - Critical action from scenario blueprint
 * @param {string} patientStateAtAction - Patient state when action performed
 * @param {string} patientStateAfter - Patient state after action
 * @param {Object} actionRecord - Action record from session.actionLog
 * @param {Object} scenario - Scenario blueprint
 * @returns {Object} - Structured feedback object
 */
function buildStateFeedback(criticalAction, patientStateAtAction, patientStateAfter, actionRecord, scenario) {
  const vitalsAtAction = actionRecord.vitals_at_action || {};
  const initialVitals = scenario.initial_vitals || {};

  // Assess competence level based on patient state
  const competenceLevel = assessCompetenceLevel(
    patientStateAtAction,
    patientStateAfter,
    actionRecord.technique
  );

  // Build feedback object (NO TIME VARIABLES - outcome-based only)
  const feedback = {
    action_id: criticalAction.id,
    action_name: criticalAction.action,
    competence_level: competenceLevel,

    // Patient state data (outcome-based)
    patient_state_at_action: patientStateAtAction,
    patient_state_after: patientStateAfter,

    // Vital signs at action
    vitals_at_action: vitalsAtAction,
    initial_vitals: initialVitals,

    // Timing context (for reference, not assessment)
    elapsed_minutes: actionRecord.elapsedMinutes || 0,

    // Feedback will be populated by AAR Agent using V3.0 templates
    // These are populated from scenario consequence_feedback_templates
    feedback_text: '',
    clinical_anchor: '',
    teaching_point: ''
  };

  // If scenario has V3.0 consequence feedback templates, use them
  if (scenario.consequence_feedback_templates && scenario.consequence_feedback_templates[criticalAction.id]) {
    const template = scenario.consequence_feedback_templates[criticalAction.id];

    // Select appropriate feedback based on competence level
    let feedbackTemplate = template.developing;  // Default
    if (competenceLevel === 'EXEMPLARY' && template.exemplary) {
      feedbackTemplate = template.exemplary;
    } else if (competenceLevel === 'COMPETENT' && template.competent) {
      feedbackTemplate = template.competent;
    } else if (competenceLevel === 'NOVICE' && template.novice) {
      feedbackTemplate = template.novice;
    }

    if (feedbackTemplate) {
      feedback.feedback_text = feedbackTemplate.consequence_text || '';
      feedback.clinical_anchor = feedbackTemplate.clinical_anchor || '';
      feedback.teaching_point = feedbackTemplate.teaching_point || '';
    }
  }

  return feedback;
}

/**
 * Build outcome-based feedback for omitted actions
 * @param {Object} criticalAction - Critical action that was never performed
 * @param {Object} scenario - Scenario blueprint
 * @param {Array} stateHistory - Patient state history
 * @returns {Object} - Structured omission feedback object
 */
function buildOmissionFeedback(criticalAction, scenario, stateHistory) {
  // Determine final patient state
  const finalState = stateHistory.length > 0 ?
    stateHistory[stateHistory.length - 1].state : 'unknown';

  return {
    action_id: criticalAction.id,
    action_name: criticalAction.action,
    competence_level: 'DEVELOPING',  // Omission is always at least DEVELOPING
    omission: true,

    // Patient state data
    patient_state_at_end: finalState,

    // Feedback for omitted action
    feedback_text: `${criticalAction.action} was never performed.`,
    clinical_anchor: criticalAction.rationale || '',
    teaching_point: `This is a critical action that should not be omitted.`
  };
}

/**
 * Generate outcome-based consequence feedback for all critical actions
 * Pre-computes patient-focused feedback for AAR Agent
 * V3.0 Philosophy: Uses patient state, NOT arbitrary time thresholds
 * @param {Object} scenario - Scenario blueprint with V3.0 structure
 * @param {Array} actionLog - Session action log with patient state at each action
 * @param {Array} stateHistory - Patient state history
 * @returns {Array} - Array of outcome-based feedback objects
 */
function buildOutcomeBasedFeedback(scenario, actionLog, stateHistory) {
  const feedback = [];

  // Guard: Check if scenario has critical actions
  if (!scenario.critical_actions_checklist || !Array.isArray(scenario.critical_actions_checklist)) {
    return feedback;
  }

  // Process each critical action
  for (const criticalAction of scenario.critical_actions_checklist) {
    // Find if action was performed in actionLog
    const actionRecord = actionLog?.find(log =>
      log.action_id === criticalAction.id ||
      log.action === criticalAction.action ||
      log.action?.toLowerCase().includes(criticalAction.action.toLowerCase())
    );

    if (!actionRecord) {
      // Omission - action never performed
      const omissionFeedback = buildOmissionFeedback(criticalAction, scenario, stateHistory);
      feedback.push(omissionFeedback);
    } else {
      // Action performed - assess based on patient state
      const patientStateAtAction = actionRecord.patient_state_at_action || 'unknown';
      const patientStateAfter = actionRecord.patient_state_after || 'unknown';

      // Only add feedback for DEVELOPING or NOVICE actions (teachable moments)
      const competenceLevel = assessCompetenceLevel(
        patientStateAtAction,
        patientStateAfter,
        actionRecord.technique
      );

      if (competenceLevel === 'DEVELOPING' || competenceLevel === 'NOVICE') {
        const stateFeedback = buildStateFeedback(
          criticalAction,
          patientStateAtAction,
          patientStateAfter,
          actionRecord,
          scenario
        );
        feedback.push(stateFeedback);
      }
    }
  }

  return feedback;
}

// ============================================================================
// STRATEGY B: STRUCTURED MEMORY & PROMPT CACHING
// ============================================================================

/**
 * Initialize structured memory for a session
 */
function initializeStructuredMemory() {
  return {
    criticalActions: [],
    vitalsMeasurements: [],
    patientDisclosures: [],
    stateHistory: [],
    keyQuotes: [],
    sceneEvents: [],
    assessments: [],
    errors: [],
    compoundActions: []
  };
}

/**
 * Get elapsed time since scenario start in minutes
 * @param {object} session - Session object
 * @returns {number} Elapsed minutes with one decimal place
 */
function getElapsedMinutes(session) {
  if (!session.scenarioStartTime) return 0;
  return Math.round((Date.now() - session.scenarioStartTime) / 60000 * 10) / 10;
}

/**
 * Add action to structured memory (Phase 2: Enhanced with checklist matching)
 */
function addMemoryAction(session, action) {
  if (!session.structuredMemory) {
    session.structuredMemory = initializeStructuredMemory();
  }

  const elapsedMinutes = getElapsedMinutes(session);
  const checklist = session.scenario?.critical_actions_checklist || [];

  // Phase 2: Match action to checklist item
  const match = findChecklistMatch(action.action || action.type, checklist);

  // Phase 2: Check for exclusion (negations like "don't give oxygen")
  const isExcluded = match ? shouldExcludeAction(action.action || '', match) : false;

  // Build enriched action object
  const enrichedAction = {
    time: elapsedMinutes,
    timestamp: Date.now(),
    ...action,

    // Phase 2: Checklist mapping metadata
    checklistId: (!isExcluded && match) ? match.id : null,
    checklistAction: (!isExcluded && match) ? match.action : null,
    targetTime: match?.time_target_minutes || null,
    onTime: (!isExcluded && match) ? (elapsedMinutes <= match.time_target_minutes) : null,
    importance: match?.importance || null,
    matchConfidence: match?.matchConfidence || null
  };

  // Add to structured memory
  session.structuredMemory.criticalActions.push(enrichedAction);

  // Phase 2: Track in checklistResults for easy AAR access
  if (match && !isExcluded) {
    // Only add if not already tracked (avoid duplicates)
    const alreadyTracked = session.checklistResults?.find(r => r.id === match.id);

    if (!alreadyTracked) {
      // Initialize checklistResults if needed
      if (!session.checklistResults) {
        session.checklistResults = [];
      }

      session.checklistResults.push({
        id: match.id,
        action: match.action,
        category: match.category || 'general',
        completed: true,
        time: elapsedMinutes,
        target: match.time_target_minutes,
        onTime: elapsedMinutes <= match.time_target_minutes,
        minutesLate: Math.max(0, elapsedMinutes - match.time_target_minutes),
        points: calculatePoints(match, elapsedMinutes),
        maxPoints: match.points || 0,
        importance: match.importance,
        matchedAction: action.action || action.type,
        matchConfidence: match.matchConfidence
      });

      console.log(`✅ Checklist matched: ${match.id} - ${match.action} (${elapsedMinutes.toFixed(1)} min)`);
    }
  }
}

/**
 * Add vitals measurement to memory
 */
function addMemoryVitals(session, vitals) {
  if (!session.structuredMemory) {
    session.structuredMemory = initializeStructuredMemory();
  }

  const elapsedMinutes = session.scenarioStartTime
    ? Math.floor((Date.now() - session.scenarioStartTime) / 60000)
    : 0;

  session.structuredMemory.vitalsMeasurements.push({
    time: elapsedMinutes,
    ...vitals
  });
}

/**
 * Add patient disclosure to memory
 */
function addMemoryDisclosure(session, category, info) {
  if (!session.structuredMemory) {
    session.structuredMemory = initializeStructuredMemory();
  }

  const elapsedMinutes = session.scenarioStartTime
    ? Math.floor((Date.now() - session.scenarioStartTime) / 60000)
    : 0;

  session.structuredMemory.patientDisclosures.push({
    time: elapsedMinutes,
    category,
    info
  });
}

/**
 * Add state change to memory
 */
function addMemoryStateChange(session, newState, reason) {
  if (!session.structuredMemory) {
    session.structuredMemory = initializeStructuredMemory();
  }

  const elapsedMinutes = session.scenarioStartTime
    ? Math.floor((Date.now() - session.scenarioStartTime) / 60000)
    : 0;

  session.structuredMemory.stateHistory.push({
    time: elapsedMinutes,
    state: newState,
    reason
  });
}

/**
 * Selective Recall Engine - Intelligently select relevant memory
 * Safety-first: NEVER filter critical safety information
 */
function selectRelevantMemory(session, detectedActions, userMessage) {
  const memory = session.structuredMemory || initializeStructuredMemory();
  const elapsedMinutes = session.scenarioStartTime
    ? Math.floor((Date.now() - session.scenarioStartTime) / 60000)
    : 0;

  const selected = {
    // ALWAYS include (never filter)
    currentVitals: memory.vitalsMeasurements.length > 0
      ? memory.vitalsMeasurements[memory.vitalsMeasurements.length - 1]
      : null,
    currentState: memory.stateHistory.length > 0
      ? memory.stateHistory[memory.stateHistory.length - 1]
      : null,
    recentActions: memory.criticalActions.slice(-3),
  };

  // SAFETY-FIRST RULE: If treatment action, ALWAYS include ALL safety info
  if (detectedActions.hasTreatment) {
    // NEVER filter by time for safety-critical information
    selected.allDisclosures = memory.patientDisclosures;
    selected.allergies = memory.patientDisclosures.filter(d =>
      d.category === 'allergies' ||
      d.category === 'contraindications' ||
      d.category === 'adverse_reactions'
    );
    selected.currentMedications = memory.patientDisclosures.filter(d =>
      d.category === 'medications'
    );
    selected.recentActions = memory.criticalActions.slice(-5);  // More context
  }
  // For questions, can filter by relevance and time
  else if (detectedActions.hasQuestion && detectedActions.questions.length > 0) {
    const relevantCategories = [];

    if (detectedActions.questions.includes('medications')) relevantCategories.push('medications');
    if (detectedActions.questions.includes('allergies')) relevantCategories.push('allergies');
    if (detectedActions.questions.includes('history')) relevantCategories.push('history');
    if (detectedActions.questions.includes('pain')) relevantCategories.push('pain');

    if (relevantCategories.length > 0) {
      selected.relevantDisclosures = memory.patientDisclosures.filter(d =>
        relevantCategories.includes(d.category)
      );
    } else {
      // General question - include recent disclosures
      selected.relevantDisclosures = memory.patientDisclosures.filter(d =>
        elapsedMinutes - d.time < 10  // Last 10 minutes
      );
    }
  }

  // Vitals context
  if (detectedActions.hasVitals) {
    selected.vitalsTrend = memory.vitalsMeasurements.slice(-3);
  }

  // Emotional context (always recent only)
  selected.recentQuotes = memory.keyQuotes.slice(-2);

  // Scene events (last 5 minutes)
  selected.recentSceneEvents = memory.sceneEvents.filter(e =>
    elapsedMinutes - e.time < 5
  );

  // Time-based strategy
  if (elapsedMinutes < 10) {
    // Early scenario: include more context (memory is small anyway)
    selected.allDisclosures = selected.allDisclosures || memory.patientDisclosures;
    selected.allActions = memory.criticalActions;
  }

  return selected;
}

/**
 * Convert structured memory to prompt text
 */
function formatMemoryForPrompt(selectedMemory) {
  let memoryText = '\n=== SCENARIO MEMORY (Key Events) ===\n';

  // Current state
  if (selectedMemory.currentState) {
    memoryText += `\nCurrent State: ${selectedMemory.currentState.state} (${selectedMemory.currentState.reason})`;
  }

  // Recent actions
  if (selectedMemory.recentActions && selectedMemory.recentActions.length > 0) {
    memoryText += '\n\nRecent Actions:';
    selectedMemory.recentActions.forEach(action => {
      memoryText += `\n- T+${action.time}min: ${action.action}`;
      if (action.result) memoryText += ` → ${action.result}`;
    });
  }

  // All actions (if early scenario)
  if (selectedMemory.allActions && selectedMemory.allActions.length > 0 && selectedMemory.allActions.length > (selectedMemory.recentActions?.length || 0)) {
    memoryText += '\n\nAll Actions Timeline:';
    selectedMemory.allActions.forEach(action => {
      memoryText += `\n- T+${action.time}min: ${action.action}`;
      if (action.result) memoryText += ` → ${action.result}`;
    });
  }

  // Vitals trend
  if (selectedMemory.vitalsTrend && selectedMemory.vitalsTrend.length > 1) {
    memoryText += '\n\nVitals Trend:';
    selectedMemory.vitalsTrend.forEach(v => {
      memoryText += `\n- T+${v.time}min: HR ${v.HR || '?'}, RR ${v.RR || '?'}, SpO2 ${v.SpO2 || '?'}%`;
      if (v.BP) memoryText += `, BP ${v.BP}`;
    });
  } else if (selectedMemory.currentVitals) {
    memoryText += `\n\nCurrent Vitals: HR ${selectedMemory.currentVitals.HR || '?'}, RR ${selectedMemory.currentVitals.RR || '?'}, SpO2 ${selectedMemory.currentVitals.SpO2 || '?'}%`;
  }

  // Patient disclosures (safety-critical)
  if (selectedMemory.allDisclosures && selectedMemory.allDisclosures.length > 0) {
    memoryText += '\n\nPatient Medical Information:';

    // Group by category
    const byCategory = {};
    selectedMemory.allDisclosures.forEach(d => {
      if (!byCategory[d.category]) byCategory[d.category] = [];
      byCategory[d.category].push(d.info);
    });

    Object.keys(byCategory).forEach(category => {
      memoryText += `\n- ${category}: ${byCategory[category].join('; ')}`;
    });
  } else if (selectedMemory.relevantDisclosures && selectedMemory.relevantDisclosures.length > 0) {
    memoryText += '\n\nRelevant Patient Information:';
    selectedMemory.relevantDisclosures.forEach(d => {
      memoryText += `\n- ${d.category}: ${d.info}`;
    });
  }

  // Recent emotional context
  if (selectedMemory.recentQuotes && selectedMemory.recentQuotes.length > 0) {
    memoryText += '\n\nRecent Patient Emotions:';
    selectedMemory.recentQuotes.forEach(q => {
      memoryText += `\n- T+${q.time}min: "${q.quote}" (${q.emotion})`;
    });
  }

  // Recent scene events
  if (selectedMemory.recentSceneEvents && selectedMemory.recentSceneEvents.length > 0) {
    memoryText += '\n\nRecent Scene Events:';
    selectedMemory.recentSceneEvents.forEach(e => {
      memoryText += `\n- T+${e.time}min: ${e.description}`;
    });
  }

  memoryText += '\n';
  return memoryText;
}

/**
 * Build cache-enabled system prompt structure
 * Caches static content, keeps dynamic content fresh
 */
function buildCachedSystemPrompt(session, coreAgentPrompt, runtimeContext, dynamicContexts) {
  const { patientContext, treatmentResponse,
          cdpContext, medicationSafetyContext, stateChangeNotice, treatmentContext } = dynamicContexts;

  // Get scenario baseline (static - can be cached)
  const scenarioBaseline = session.scenario ? {
    title: session.scenario.metadata?.title || session.scenario.title,
    patient_name: session.scenario.patient_profile?.name,
    patient_age: session.scenario.patient_profile?.age,
    dispatch_info: session.scenario.dispatch_info,
    scene_description: session.scenario.scene_description
  } : null;

  const systemPromptArray = [
    // PART 1: Static Core Prompt (CACHED)
    {
      type: 'text',
      text: coreAgentPrompt,
      cache_control: { type: 'ephemeral' }
    }
  ];

  // PART 2: Static Scenario Baseline (CACHED)
  if (scenarioBaseline) {
    systemPromptArray.push({
      type: 'text',
      text: `\n=== SCENARIO BASELINE (Static) ===
Title: ${scenarioBaseline.title}
Patient: ${scenarioBaseline.patient_name}, age ${scenarioBaseline.patient_age}

Dispatch Information:
${JSON.stringify(scenarioBaseline.dispatch_info, null, 2)}

Scene Description:
${JSON.stringify(scenarioBaseline.scene_description, null, 2)}
`,
      cache_control: { type: 'ephemeral' }
    });
  }

  // PART 3: Dynamic Context (NOT CACHED)
  const dynamicText = `${patientContext}${treatmentResponse}${cdpContext}${medicationSafetyContext}${stateChangeNotice}

=== CURRENT SCENARIO STATE (Dynamic) ===
${JSON.stringify(runtimeContext, null, 2)}${treatmentContext}`;

  systemPromptArray.push({
    type: 'text',
    text: dynamicText
  });

  return systemPromptArray;
}

/**
 * Get appropriate message count based on elapsed time
 * 4 exchanges (8 messages) normally, 5 exchanges (10 messages) after 10 minutes
 */
function getRecentMessageCount(session) {
  const elapsedMinutes = session.scenarioStartTime
    ? Math.floor((Date.now() - session.scenarioStartTime) / 60000)
    : 0;

  if (elapsedMinutes >= 10) {
    return 10;  // 5 exchanges
  }
  return 8;  // 4 exchanges (default)
}

/**
 * Get recent messages for conversation context
 * Returns last N messages where N depends on scenario duration
 */
function getRecentMessages(session) {
  const messageCount = getRecentMessageCount(session);
  const messages = session.messages || [];

  if (messages.length <= messageCount) {
    return messages;
  }

  return messages.slice(-messageCount);
}

/**
 * Parse student message to detect compound actions
 * Returns object with detected action types
 */
function parseStudentMessage(message) {
  const lowerMsg = message.toLowerCase();
  const detected = {
    hasVitals: false,
    hasQuestion: false,
    hasTreatment: false,
    questions: [],
    actionCount: 0,
    isCompoundAction: false
  };

  // Detect vitals measurement
  const vitalsKeywords = ['vital', 'vs', 'pulse', 'bp', 'blood pressure', 'heart rate', 'hr', 'respiratory rate', 'rr', 'spo2', 'oxygen', 'saturation', 'temperature', 'temp', 'gcs', 'avpu', 'check her', 'check him', 'measure', 'assess'];
  detected.hasVitals = vitalsKeywords.some(keyword => lowerMsg.includes(keyword));
  if (detected.hasVitals) detected.actionCount++;

  // Detect questions (common question patterns)
  const questionPatterns = [
    /when (did|does)/i,
    /what (is|are|was|were)/i,
    /how (long|often|do|does|did)/i,
    /do you (have|take|feel)/i,
    /any (allergies|medications|history|pain)/i,
    /tell me about/i,
    /can you (tell|describe)/i,
    /are you/i
  ];

  detected.hasQuestion = questionPatterns.some(pattern => pattern.test(message)) || message.includes('?');

  // Extract specific question topics
  if (lowerMsg.includes('allerg')) detected.questions.push('allergies');
  if (lowerMsg.includes('medic') || lowerMsg.includes('drug')) detected.questions.push('medications');
  if (lowerMsg.includes('history') || lowerMsg.includes('past')) detected.questions.push('history');
  if (lowerMsg.includes('when') || lowerMsg.includes('start') || lowerMsg.includes('began')) detected.questions.push('onset');
  if (lowerMsg.includes('pain')) detected.questions.push('pain');
  if (lowerMsg.includes('feel')) detected.questions.push('feelings');

  // Count questions (each "?" is potentially a separate question)
  const questionCount = (message.match(/\?/g) || []).length;
  detected.actionCount += questionCount;

  // Detect treatments
  const treatmentKeywords = ['give', 'administer', 'apply', 'provide', 'oxygen', 'o2', 'nebulizer', 'medication', 'drug', 'inject', 'iv'];
  detected.hasTreatment = treatmentKeywords.some(keyword => lowerMsg.includes(keyword));
  if (detected.hasTreatment) detected.actionCount++;

  // Mark as compound if 3+ actions
  detected.isCompoundAction = detected.actionCount >= 3;

  return detected;
}

/**
 * Build enhanced second call instruction based on detected actions
 */
function buildEnhancedInstruction(message, detected, toolResults) {
  let instruction = `Tool updates completed successfully.\n\n`;

  // Build action breakdown
  const actions = [];
  if (detected.hasVitals) actions.push('Measured vital signs → vitals updated');
  if (detected.hasQuestion && detected.questions.length > 0) {
    detected.questions.forEach(q => {
      actions.push(`Asked about ${q} → requires patient response`);
    });
  } else if (detected.hasQuestion) {
    actions.push('Asked a question → requires patient response');
  }
  if (detected.hasTreatment) actions.push('Administered treatment → show patient reaction');

  // ✅ COMPOUND ACTION HANDLING
  if (detected.isCompoundAction) {
    instruction += `⚠️ CRITICAL: Student performed ${detected.actionCount} actions/questions simultaneously.\n`;
    instruction += `You MUST address EVERY SINGLE ONE in your response.\n\n`;
    instruction += `Checklist:\n`;

    if (detected.hasVitals) {
      instruction += `✓ Show vitals measurement results (tool was called)\n`;
    }
    if (detected.hasTreatment) {
      instruction += `✓ Show patient's physical reaction to treatment\n`;
    }
    if (detected.questions.length > 0) {
      detected.questions.forEach(q => {
        instruction += `✓ Have patient answer question about: ${q}\n`;
      });
    } else if (detected.hasQuestion) {
      instruction += `✓ Have patient answer the question(s) asked\n`;
    }

    instruction += `\n`;
  }
  // Regular action handling
  else if (actions.length > 1) {
    instruction += `Student performed multiple actions:\n`;
    actions.forEach((action, i) => {
      instruction += `${i + 1}. ${action}\n`;
    });
    instruction += `\nRespond to ALL actions:\n`;
  } else if (actions.length === 1) {
    instruction += `Student action: ${actions[0]}\n\n`;
  } else {
    instruction += `Student said: "${message}"\n\n`;
  }

  instruction += `Now you MUST provide your complete role-play response. This is REQUIRED.\n\n`;
  instruction += `Your response must:\n`;
  instruction += `1. Start with physical observation in THIRD PERSON (*The patient...* / *She/he...*)\n`;
  instruction += `2. Include patient dialogue in FIRST PERSON (spoken words in "quotes")\n`;
  instruction += `3. Address ALL parts of what the student did/asked\n`;
  instruction += `4. Use qualitative descriptions (rapid/slow/labored/etc.) - never numeric values\n\n`;
  instruction += `Respond now as the patient:`;

  return instruction;
}

/**
 * POST /api/sessions/:sessionId/message
 * Send message to AI patient
 */
app.post('/api/sessions/:sessionId/message', async (req, res) => {
  let lockAcquired = false;
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    // Acquire session lock to prevent concurrent modifications
    await acquireSessionLock(sessionId);
    lockAcquired = true;

    const session = await getSession(sessionId);

    if (!session) {
      releaseSessionLock(sessionId);
      lockAcquired = false;
      return res.status(404).json({ error: 'Session not found' });
    }

    // Log user message for testing/debugging
    console.log('💬 User message:', message.substring(0, 150) + (message.length > 150 ? '...' : ''));

        if (session.currentAgent === 'cognitive_coach') {
      console.log('🎓 Routing to Cognitive Coach Agent');
      console.log('🌍 Session language (Cognitive Coach):', session.language);  // ✅ DEBUG: Check language

      try {
        // Build Cognitive Coach prompt with current session context
        const systemPrompt = cognitiveCoachPromptBuilder.buildCognitiveCoachPrompt(session);
        
        // Build message history
        const cognitiveMessages = session.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Call Claude API with Cognitive Coach prompt (with timeout protection)
        const response = await callAnthropicWithTimeout(
          anthropic.messages.create({
            model: COGNITIVE_COACH_MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [...cognitiveMessages, { role: 'user', content: message }]
          })
        );
        
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

          console.log('✅ Cognitive Coach complete - ready for transition');

          // Mark cognitive coach as complete
          session.cognitiveCoach.completed = true;
          session.cognitiveCoach.endTime = Date.now();

          // ✅ NEW APPROACH: Don't transition yet, wait for user to click button
          // Mark as ready, but keep in cognitive_coach mode
          session.readyToTransition = true;

          // Clean ALL transition markers from response
          responseText = responseText
            .replace(/\[COGNITIVE_COACH_COMPLETE\]/g, '')
            .replace(/\[TRANSITION_TO_CORE_AGENT\]/g, '')
            .replace(/\[SCENARIO_1_START\]/g, '')
            .replace(/\[SAVE_COGNITIVE_METRICS\]/g, '')
            .replace(/\[COGNITIVE_COACH_SESSION_COMPLETE\]/g, '')
            .trim();

          // Add to conversation history and database
          await db.addMessage(sessionId, 'user', message);
          await db.addMessage(sessionId, 'assistant', responseText);

          session.messages.push(
            { role: 'user', content: message },
            { role: 'assistant', content: responseText }
          );

          // Save session updates
          await saveSession(session);

          console.log('🔘 Waiting for user to click "Begin Scenario" button');

          // Return with readyToTransition flag - frontend will show button
          return res.json({
            message: responseText,
            currentAgent: 'cognitive_coach', // Stay in CC mode
            readyToTransition: true  // NEW: Signal to show button
          });
        }
        
        // Cognitive Coach still in progress

        // If we're past all questions and delivered content, mark Phase 3 as completed
        if (session.cognitiveCoach.currentQuestionIndex >= session.cognitiveCoach.selectedQuestions.length) {
          session.cognitiveCoach.communicationAnalysis.phase3Completed = true;
          console.log('✅ Phase 3 (Communication Guidance) delivered');
        }

        // Track student response (only if still in questions phase)
        if (session.cognitiveCoach.currentQuestionIndex < session.cognitiveCoach.selectedQuestions.length) {
          session.cognitiveCoach.responses.push({
            questionID: session.cognitiveCoach.selectedQuestions[session.cognitiveCoach.currentQuestionIndex],
            studentMessage: message,
            coachResponse: responseText,
            timestamp: Date.now()
          });

          // Increment question index
          session.cognitiveCoach.currentQuestionIndex++;
        }

        // Add to conversation history and database
        await db.addMessage(sessionId, 'user', message);
        await db.addMessage(sessionId, 'assistant', responseText);

        session.messages.push(
          { role: 'user', content: message },
          { role: 'assistant', content: responseText }
        );

        // Save session updates
        await saveSession(session);

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
          // Ensure array is initialized
          if (!session.dangerousMedicationsGiven) {
            session.dangerousMedicationsGiven = [];
          }
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
      // Use V3.0 function if scenario has V3.0 structure, otherwise fallback to legacy
      let dangerousMedications = null;
      if (session.scenario?.secondary_medications_by_impact) {
        dangerousMedications = checkMedicationSafety_V3(session, message);
      } else {
        dangerousMedications = checkMedicationSafety(session, message);  // Legacy fallback
      }
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
        // Use V3.0 function if rich data is present, otherwise use legacy
        const hasRichData = dangerousMedications[0]?.patient_response !== undefined;
        if (hasRichData) {
          session.medicationSafetyContext = buildMedicationSafetyContext_V3(dangerousMedications[0]);
        } else {
          session.medicationSafetyContext = buildMedicationSafetyContext(dangerousMedications);
        }
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

    // Reconstruct ScenarioEngine if it's null (happens when session is loaded from database)
    if (!session.engine) {
      // Try to get scenario data from either session.scenario or session.scenarioData
      const scenarioData = session.scenario || session.scenarioData;

      if (scenarioData) {
        console.log('🔧 Reconstructing ScenarioEngine from saved scenario data');
        session.engine = new ScenarioEngine(scenarioData);
        // Also ensure session.scenario is set for consistency
        if (!session.scenario) {
          session.scenario = scenarioData;
        }
      } else {
        // No scenario data available - try to reload from scenarioId
        if (session.scenarioId) {
          console.log('⚠️ No scenario data in session, attempting to reload from scenarioId:', session.scenarioId);
          try {
            const reloadedScenario = loadScenario(session.scenarioId, session.language || 'en');
            if (reloadedScenario) {
              session.scenario = reloadedScenario;
              session.engine = new ScenarioEngine(reloadedScenario);
              console.log('✅ Successfully reloaded scenario from file');
            }
          } catch (error) {
            console.error('❌ Failed to reload scenario:', error.message);
          }
        }
      }
    }

    // Verify engine exists before calling getRuntimeContext
    if (!session.engine) {
      console.error('❌ ERROR: session.engine is null and could not be reconstructed');
      console.error('📊 Debug info:', {
        hasEngine: !!session.engine,
        hasScenario: !!session.scenario,
        hasScenarioData: !!session.scenarioData,
        scenarioId: session.scenarioId,
        currentAgent: session.currentAgent,
        sessionId: session.sessionId
      });
      return res.status(500).json({
        error: 'Scenario engine not initialized',
        details: 'Session does not have a valid scenario engine. Please restart the scenario.',
        debug: {
          hasScenario: !!session.scenario,
          scenarioId: session.scenarioId
        }
      });
    }

    const runtimeContext = session.engine.getRuntimeContext();
    console.log('🌍 Session language (Core Agent message):', session.language);  // ✅ DEBUG: Check language
    const coreAgentPrompt = loadSystemPrompt(session.language || 'en');

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

    // ✅ STRATEGY B: Build cache-enabled system prompt with structured memory
    const dynamicContexts = {
      patientContext,
      treatmentResponse,
      cdpContext,
      medicationSafetyContext,
      stateChangeNotice,
      treatmentContext
    };

    // Build cached system prompt
    const systemPrompt = buildCachedSystemPrompt(session, coreAgentPrompt, runtimeContext, dynamicContexts);

    // ✅ STRATEGY B: Get recent messages based on elapsed time (4 or 5 exchanges)
    const recentMessages = getRecentMessages(session);

    console.log('=== FIRST CLAUDE CALL ===');
    console.log(`📊 Using ${recentMessages.length} recent messages (${recentMessages.length / 2} exchanges)`);
    const firstResponse = await callAnthropicWithTimeout(
      anthropic.messages.create({
        model: CORE_AGENT_MODEL,
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [...recentMessages, { role: 'user', content: message }],
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
      })
    );

  // ✅ DIAGNOSTIC LOGGING - First call metrics
  console.log('First response stop_reason:', firstResponse.stop_reason);
  console.log('First response usage:', JSON.stringify(firstResponse.usage, null, 2));
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

    // ✅ STRATEGY B: Add vitals to structured memory
    addMemoryVitals(session, {
      HR: input.HR,
      RR: input.RR,
      SpO2: input.SpO2,
      BP: session.measuredVitals.BP,
      Temp: input.Temp || input.temperature,
      GCS: input.GCS,
      Glycemia: input.Glycemia
    });

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

  // Ensure patientNotes array is initialized
  if (!session.patientNotes) {
    session.patientNotes = [];
    console.log('⚠️ patientNotes was not initialized, creating new array');
  }

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

  // Parse student message to detect compound actions
  const detectedActions = parseStudentMessage(message);
  console.log('🔍 Detected actions:', detectedActions);

  // ✅ STRATEGY B: Selective recall - get relevant memory
  const selectedMemory = selectRelevantMemory(session, detectedActions, message);
  const memoryContext = formatMemoryForPrompt(selectedMemory);
  console.log('🧠 Selective memory tokens (est):', Math.floor(memoryContext.length / 4));

  // Build enhanced instruction based on detected actions
  const enhancedInstruction = buildEnhancedInstruction(message, detectedActions, toolResults);
  console.log('📝 Enhanced instruction length:', enhancedInstruction.length);

  // ✅ STRATEGY B: Dynamic max_tokens based on compound actions
  let maxTokens = 2000;  // Default
  if (detectedActions.isCompoundAction) {
    if (detectedActions.actionCount >= 5) {
      maxTokens = 4000;  // Very complex compound action
    } else if (detectedActions.actionCount >= 3) {
      maxTokens = 3000;  // Compound action
    }
    console.log(`📊 Compound action detected (${detectedActions.actionCount} actions) - using ${maxTokens} max_tokens`);
  }

  // ✅ STRATEGY B: Build system prompt with memory context
  const secondCallSystemPrompt = buildCachedSystemPrompt(
    session,
    coreAgentPrompt + memoryContext,  // Add memory to base prompt
    runtimeContext,
    dynamicContexts
  );

  const secondResponse = await callAnthropicWithTimeout(
    anthropic.messages.create({
      model: CORE_AGENT_MODEL,
      max_tokens: maxTokens,
      temperature: 0.7,
      system: secondCallSystemPrompt,
      messages: [
        ...recentMessages,  // ✅ Use recent messages, not all messages
        { role: 'user', content: message },
        { role: 'assistant', content: firstResponse.content },
        { role: 'user', content: [
          ...toolResults,
          { type: 'text', text: enhancedInstruction }
        ]}
      ]
    })
  );

  // ✅ DIAGNOSTIC LOGGING - Understanding API response behavior
  console.log('Second response stop_reason:', secondResponse.stop_reason);
  console.log('Second response usage:', JSON.stringify(secondResponse.usage, null, 2));
  console.log('Second response content types:', secondResponse.content.map(block => block.type));

  // Log full response for debugging
  if (secondResponse.content.length === 0) {
    console.error('❌ Second response has NO content blocks at all!');
  } else if (!secondResponse.content.some(block => block.type === 'text')) {
    console.error('❌ Second response has content but NO text blocks!');
    console.error('Content:', JSON.stringify(secondResponse.content, null, 2));
  }

  finalResponse = '';
  for (const block of secondResponse.content) {
    if (block.type === 'text') {
      finalResponse += block.text;
    }
  }

  console.log('✅ Final response:', finalResponse);
}

if (!finalResponse) {
  console.error('⚠️ No text response generated - using fallback');
  console.error('First response content types:', firstResponse.content.map(b => b.type));
  console.error('needsSecondCall:', needsSecondCall);
  finalResponse = 'I am examining the patient...';
}

// Add to conversation history and database
await db.addMessage(id, 'user', message);
await db.addMessage(id, 'assistant', finalResponse);

session.messages.push(
  { role: 'user', content: message },
  { role: 'assistant', content: finalResponse }
);

// ✅ Phase 1: Append to fullTranscript (survives Strategy B pruning)
const elapsedMinutes = getElapsedMinutes(session);
if (!session.fullTranscript) {
  session.fullTranscript = [];
}
session.fullTranscript.push(
  {
    role: 'user',
    content: message,
    timestamp: Date.now(),
    scenarioTime: elapsedMinutes
  },
  {
    role: 'assistant',
    content: finalResponse,
    timestamp: Date.now(),
    scenarioTime: elapsedMinutes
  }
);

// Save session updates
await saveSession(session);

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

// ✅ DIAGNOSTIC - Token usage summary for this exchange
if (firstResponse.usage) {
  const totalInput = firstResponse.usage.input_tokens + (secondResponse?.usage?.input_tokens || 0);
  const totalOutput = firstResponse.usage.output_tokens + (secondResponse?.usage?.output_tokens || 0);
  console.log('📊 TOKEN USAGE SUMMARY:');
  console.log(`   Total Input: ${totalInput} tokens`);
  console.log(`   Total Output: ${totalOutput} tokens`);
  console.log(`   Conversation history length: ${session.messages.length} messages`);
  if (totalInput > 150000) {
    console.warn(`   ⚠️  WARNING: Input approaching context limit (${totalInput}/200000)`);
  }
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
  patientNotes: session.patientNotes || [],  // ✅ Ensure we always send an array
  currentAgent: 'core'  // ✅ NEW: Include current agent
});

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);

    // Provide more detailed error context
    if (error.message === 'Anthropic API call timed out') {
      res.status(504).json({
        error: 'Request timed out. The AI service took too long to respond. Please try again.',
        timeout: true
      });
    } else if (error.message?.includes('Failed to acquire lock')) {
      res.status(503).json({
        error: 'Server is busy processing another request. Please wait a moment and try again.',
        busy: true
      });
    } else {
      res.status(500).json({ error: 'Failed to process message' });
    }
  } finally {
    // Always release the session lock
    if (lockAcquired) {
      releaseSessionLock(req.params.sessionId);
    }
  }
});

/**
 * POST /api/sessions/:sessionId/begin-scenario
 * ✅ NEW: User clicked "Begin Scenario" button - load scenario and transition to Core Agent
 */
app.post('/api/sessions/:sessionId/begin-scenario', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify session is ready to transition
    if (!session.readyToTransition) {
      return res.status(400).json({ error: 'Session not ready to transition' });
    }

    console.log('🚀 User clicked "Begin Scenario" - loading scenario now');
    console.log('📍 Current scenario index:', session.currentScenarioIndex);
    console.log('📍 Scenario queue:', session.scenarioQueue);
    console.log('📍 Session scenarioId:', session.scenarioId);
    console.log('🌍 Session language:', session.language);  // ✅ DEBUG: Check language

    // Transition to Core Agent
    session.currentAgent = 'core';

    // ═══════════════════════════════════════════════════════════
    // LOAD SCENARIO FOR THE FIRST TIME
    // ═══════════════════════════════════════════════════════════

    console.log('📋 Loading scenario:', session.scenarioId, 'in language:', session.language || 'en');

    // Load scenario and create engine (with language support)
    const scenarioData = loadScenario(session.scenarioId, session.language || 'en');

    // Check if loaded
    if (!scenarioData) {
      console.error('❌ FAILED: Scenario data is undefined!');
      return res.status(500).json({
        error: 'Failed to load scenario',
        details: `Scenario file not found: ${session.scenarioId}.json`
      });
    }

    console.log('✅ Scenario data loaded successfully');
    console.log('🔍 Scenario title:', scenarioData.metadata?.title);

    // Store scenario data on session for later use
    session.scenario = scenarioData;
    session.engine = new ScenarioEngine(scenarioData);
    session.measuredVitals = {};
    session.patientNotes = [];

    // Initialize Layer 2 session fields
    session.currentState = 'initial';
    session.scenarioStartTime = Date.now();
    session.criticalActionsLog = [];
    session.criticalTreatmentsGiven = {
      oxygen: false,
      salbutamol: false,
      steroids: false
    };

    // ✅ STRATEGY B: Initialize structured memory
    session.structuredMemory = initializeStructuredMemory();

    // Add initial state to memory
    addMemoryStateChange(session, 'initial', 'scenario_start');
    session.dangerousMedicationsGiven = [];
    session.lastDeteriorationCheck = Date.now();
    session.vitals = scenarioData.initial_vitals; // Initialize vitals
    session.stateHistory = [{
      state: 'initial',
      timestamp: Date.now(),
      vitals: scenarioData.initial_vitals
    }];

    console.log('✅ Layer 2 session fields initialized');

    // Get initial context
    const initialContext = session.engine.getRuntimeContext();

    console.log('🔍 Runtime context dispatch_info:', JSON.stringify(initialContext.dispatch_info, null, 2));
    console.log('🔍 Runtime context patient_profile:', JSON.stringify(initialContext.patient_profile, null, 2));

    // Extract dispatch and patient info from runtime context (always fresh)
    const dispatchInfo = {
      location: initialContext.dispatch_info.location,
      chiefComplaint: initialContext.dispatch_info.call_type,
      callerInfo: `${initialContext.dispatch_info.caller} reports: ${initialContext.dispatch_info.additional_info}`,
      timeOfCall: initialContext.dispatch_info.time_of_call || "14:32"
    };

    const patientInfo = {
      name: initialContext.patient_profile.name,
      age: initialContext.patient_profile.age,
      gender: initialContext.dispatch_info.sex
    };

    // Store in session
    session.dispatchInfo = dispatchInfo;
    session.patientInfo = patientInfo;

    console.log('✅ Created dispatchInfo:', JSON.stringify(dispatchInfo, null, 2));
    console.log('✅ Created patientInfo:', JSON.stringify(patientInfo, null, 2));

    // Get initial scene description
    const initialSceneDescription = scenarioData.state_descriptions.initial.student_sees;

    console.log('🎬 Scenario ready - sending to frontend');
    console.log('📊 Dispatch Info:', dispatchInfo);
    console.log('👤 Patient Info:', patientInfo);

    // Return all scenario data
    const responsePayload = {
      currentAgent: 'core',
      transitioned: true,
      dispatchInfo: dispatchInfo,
      patientInfo: patientInfo,
      initialSceneDescription: initialSceneDescription,
      initialVitals: initialContext.current_vitals,
      scenario: session.engine.getScenarioMetadata(),
      debug_sessionLanguage: session.language  // ✅ DEBUG: Show what language was used
    };

    console.log('📤 FULL HTTP RESPONSE PAYLOAD:', JSON.stringify(responsePayload, null, 2));

    // Save session updates
    await saveSession(session);

    res.json(responsePayload);

  } catch (error) {
    console.error('❌ ERROR in begin-scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sessions/:sessionId/complete
 * Mark scenario complete and get performance summary
 */
app.post('/api/sessions/:sessionId/complete', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const session = await getSession(sessionId);

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

    // Save session updates
    await saveSession(session);

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
 * POST /api/sessions/:sessionId/next-scenario
 * Complete current scenario and prepare for next one (within same session)
 */
app.post('/api/sessions/:sessionId/next-scenario', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // ✅ NEW: Capture complete performance data BEFORE clearing
    const currentScenario = session.scenarioQueue[session.currentScenarioIndex];

    if (currentScenario && !session.completedScenarios.includes(currentScenario)) {
      console.log(`📊 Capturing performance data for scenario ${session.currentScenarioIndex + 1}: ${currentScenario}`);

      // Calculate performance metrics using existing helper functions
      const performanceScore = calculatePerformanceScore(session);
      const timeline = generateCriticalActionsTimeline(session);
      const treatmentTiming = analyzeTreatmentTiming(session);
      const scenarioSummary = generateScenarioSummary(session);

      // ✅ Phase 2: Generate checklist summary
      const checklistSummary = generateChecklistSummary(session);
      console.log(`📋 Checklist: ${checklistSummary.completedCount}/${checklistSummary.totalItems} completed (${checklistSummary.percentageScore}%)`);

      // ✅ V3.0: Generate outcome-based consequence feedback
      const outcomeBasedFeedback = buildOutcomeBasedFeedback(
        session.scenario,
        session.actionLog || session.criticalActionsLog || [],
        session.patientStateHistory || session.stateHistory || []
      );
      console.log(`📊 Outcome-based feedback: ${outcomeBasedFeedback.length} items generated`);

      // Create comprehensive performance snapshot
      const performanceSnapshot = {
        scenarioId: session.scenario?.scenario_id || session.scenarioId,
        scenarioName: session.scenario?.metadata?.scenario_name || 'Unknown',
        scenarioIndex: session.currentScenarioIndex,
        totalTime: session.scenarioStartTime ? (Date.now() - session.scenarioStartTime) / 1000 : 0,
        finalState: session.currentState,

        // CDP Performance
        score: performanceScore,
        cdpEvaluations: session.cdpEvaluations || [],

        // Medication Safety
        errors: session.medicationErrors || [],
        medicationWarnings: session.medicationWarnings || [],

        // Critical treatments tracking
        criticalTreatments: session.criticalTreatmentsGiven || {},
        actionsLog: session.criticalActionsLog || [],
        stateHistory: session.stateHistory || [],

        // Timeline and analysis
        timeline: timeline,
        treatmentTiming: treatmentTiming,
        scenarioSummary: scenarioSummary,

        // ✅ Phase 2: Checklist results and summary
        checklistResults: session.checklistResults || [],
        checklistSummary: checklistSummary,

        // ✅ V3.0: Outcome-based assessment data
        outcomeBasedFeedback: outcomeBasedFeedback,

        // ✅ V3.0: Safety Gate results
        safetyGate: {
          passed: (session.safetyGateFailures || []).length === 0,
          failures: session.safetyGateFailures || []
        },

        // ✅ Phase 1: Full conversation transcript
        fullTranscript: [...(session.fullTranscript || [])],

        // ✅ Phase 1: Blueprint reference for AAR
        blueprintId: session.scenario?.scenario_id || session.scenarioId,
        blueprintPath: session.scenario?._filePath || null,

        // Timing metadata
        startTime: session.scenarioStartTime,
        endTime: Date.now(),
        durationMinutes: Math.round((Date.now() - session.scenarioStartTime) / 60000 * 10) / 10,

        // Timestamp
        completedAt: new Date().toISOString()
      };

      // Store in performance history
      session.scenarioPerformanceHistory.push(performanceSnapshot);
      console.log(`✅ Performance data captured for scenario ${session.currentScenarioIndex + 1}`);

      // Mark as completed
      session.completedScenarios.push(currentScenario);
    }

    console.log(`✅ Scenario ${session.currentScenarioIndex + 1} completed: ${currentScenario}`);

    // Check if there are more scenarios
    if (session.currentScenarioIndex < session.scenarioQueue.length - 1) {
      // Move to next scenario
      session.currentScenarioIndex += 1;
      const nextScenario = session.scenarioQueue[session.currentScenarioIndex];

      console.log(`🔄 Loading scenario ${session.currentScenarioIndex + 1} of ${session.scenarioQueue.length}: ${nextScenario}`);

      // Update session for new scenario - STAY in Core Agent mode (no cognitive coach between scenarios)
      session.scenarioId = nextScenario;
      session.currentAgent = 'core'; // ✅ STAY in core agent mode

      // Clear previous scenario data
      session.dispatchInfo = null;
      session.patientInfo = null;
      session.scenario = null;
      session.engine = null;
      session.measuredVitals = {};
      session.patientNotes = [];
      session.messages = []; // Clear chat history

      // ✅ Phase 1 & 2: Clear transcript and checklist for next scenario
      session.fullTranscript = [];
      session.checklistResults = [];

      // ═══════════════════════════════════════════════════════════
      // LOAD NEXT SCENARIO IMMEDIATELY (like begin-scenario does)
      // ═══════════════════════════════════════════════════════════

      console.log('📋 Loading next scenario:', nextScenario);

      // Load scenario and create engine (with language support)
      const scenarioData = loadScenario(nextScenario, session.language || 'en');

      if (!scenarioData) {
        console.error('❌ FAILED: Scenario data is undefined!');
        return res.status(500).json({
          error: 'Failed to load scenario',
          details: `Scenario file not found: ${nextScenario}.json`
        });
      }

      console.log('✅ Scenario data loaded successfully');
      console.log('🔍 Scenario title:', scenarioData.metadata?.title);

      // Store scenario data on session
      session.scenario = scenarioData;
      session.engine = new ScenarioEngine(scenarioData);
      session.measuredVitals = {};
      session.patientNotes = [];

      // Initialize Layer 2 session fields for new scenario
      session.currentState = 'initial';
      session.scenarioStartTime = Date.now();
      session.criticalActionsLog = [];
      session.criticalTreatmentsGiven = {
        oxygen: false,
        salbutamol: false,
        steroids: false
      };

      // ✅ STRATEGY B: Initialize structured memory for new scenario
      session.structuredMemory = initializeStructuredMemory();
      addMemoryStateChange(session, 'initial', 'scenario_start');
      session.dangerousMedicationsGiven = [];
      session.lastDeteriorationCheck = Date.now();
      session.stateHistory = [{
        state: 'initial',
        timestamp: Date.now(),
        vitals: scenarioData.initial_vitals
      }];

      // Get initial context
      const initialContext = session.engine.getRuntimeContext();

      // Extract dispatch and patient info
      const dispatchInfo = {
        location: initialContext.dispatch_info.location,
        chiefComplaint: initialContext.dispatch_info.call_type,
        callerInfo: `${initialContext.dispatch_info.caller} reports: ${initialContext.dispatch_info.additional_info}`,
        timeOfCall: initialContext.dispatch_info.time_of_call || "14:32"
      };

      const patientInfo = {
        name: initialContext.patient_profile.name,
        age: initialContext.patient_profile.age,
        gender: initialContext.dispatch_info.sex
      };

      // Store in session
      session.dispatchInfo = dispatchInfo;
      session.patientInfo = patientInfo;

      // Get initial scene description
      const initialSceneDescription = scenarioData.state_descriptions.initial.student_sees;

      console.log('✅ Next scenario ready - staying in Core Agent mode');
      console.log('📊 Dispatch Info:', dispatchInfo);
      console.log('👤 Patient Info:', patientInfo);

      // Save session updates
      await saveSession(session);

      // Return scenario data (like begin-scenario does)
      res.json({
        success: true,
        hasNextScenario: true,
        currentAgent: 'core', // ✅ Stay in core mode
        currentScenarioIndex: session.currentScenarioIndex,
        totalScenarios: session.scenarioQueue.length,
        nextScenarioName: nextScenario,
        dispatchInfo: dispatchInfo,
        patientInfo: patientInfo,
        initialSceneDescription: initialSceneDescription,
        initialVitals: initialContext.current_vitals,
        scenario: session.engine.getScenarioMetadata()
      });

    } else {
      // All scenarios completed
      console.log('🎉 All scenarios completed! Ready for AAR');

      // Save session updates
      await saveSession(session);

      res.json({
        success: true,
        hasNextScenario: false,
        allScenariosComplete: true,
        totalCompleted: session.completedScenarios.length
      });
    }

  } catch (error) {
    console.error('Error moving to next scenario:', error);
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

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Reconstruct ScenarioEngine if needed
    if (!session.engine) {
      const scenarioData = session.scenario || session.scenarioData;

      if (scenarioData) {
        console.log('🔧 Reconstructing ScenarioEngine from saved scenario data');
        session.engine = new ScenarioEngine(scenarioData);
        if (!session.scenario) session.scenario = scenarioData;
      } else if (session.scenarioId) {
        console.log('⚠️ No scenario data in session, reloading from scenarioId:', session.scenarioId);
        try {
          const reloadedScenario = loadScenario(session.scenarioId, session.language || 'en');
          if (reloadedScenario) {
            session.scenario = reloadedScenario;
            session.engine = new ScenarioEngine(reloadedScenario);
            console.log('✅ Successfully reloaded scenario from file');
          }
        } catch (error) {
          console.error('❌ Failed to reload scenario:', error.message);
        }
      }
    }

    if (!session.engine) {
      return res.status(500).json({
        error: 'Scenario engine not initialized',
        details: 'Session does not have a valid scenario engine.'
      });
    }

    // Process action through engine
    const result = session.engine.processStudentAction(action);
    
    // Check if scenario should end
    const endCheck = session.engine.shouldScenarioEnd();

    // Save session updates
    await saveSession(session);

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

    const session = await getSession(sessionId);
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
 * GET /api/sessions/:sessionId/performance
 * Get performance report (for AAR)
 */
app.get('/api/sessions/:sessionId/performance', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await getSession(sessionId);
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

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Reconstruct ScenarioEngine if needed
    if (!session.engine) {
      const scenarioData = session.scenario || session.scenarioData;

      if (scenarioData) {
        console.log('🔧 Reconstructing ScenarioEngine from saved scenario data');
        session.engine = new ScenarioEngine(scenarioData);
        if (!session.scenario) session.scenario = scenarioData;
      } else if (session.scenarioId) {
        console.log('⚠️ No scenario data in session, reloading from scenarioId:', session.scenarioId);
        try {
          const reloadedScenario = loadScenario(session.scenarioId, session.language || 'en');
          if (reloadedScenario) {
            session.scenario = reloadedScenario;
            session.engine = new ScenarioEngine(reloadedScenario);
            console.log('✅ Successfully reloaded scenario from file');
          }
        } catch (error) {
          console.error('❌ Failed to reload scenario:', error.message);
        }
      }
    }

    // Generate final report (if engine available)
    let finalReport = null;
    if (session.engine && typeof session.engine.generatePerformanceReport === 'function') {
      finalReport = session.engine.generatePerformanceReport();
    }
    
    // Delete session
    await db.disconnect(); // sessionId);
    
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

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log('📊 Starting AAR for session:', sessionId);

    // ✅ Check if we have completed scenarios
    if (!session.scenarioPerformanceHistory || session.scenarioPerformanceHistory.length === 0) {
      return res.status(400).json({
        error: 'No completed scenarios to review',
        scenariosCompleted: 0
      });
    }

    console.log(`📊 Performance history contains ${session.scenarioPerformanceHistory.length} scenarios`);

    // ✅ Phase 1: Build full AAR context with blueprints and transcripts
    const aarContext = buildFullAARContext(session);

    if (aarContext.error) {
      return res.status(400).json({ error: aarContext.error });
    }

    const formattedContext = formatAARContextForPrompt(aarContext);

    // Load AAR prompt using language loader
    const aarPrompt = loadPrompt('aarAgent', session.language || 'en');

    // Combine system prompt with full context
    const fullSystemPrompt = `${aarPrompt}\n\n${formattedContext}`;

    // Initialize AAR conversation in session
    session.aarMode = true;
    session.aarMessages = [];
    session.aarContext = aarContext; // Store for potential follow-up queries

    // Get opening message from Claude
    const response = await anthropic.messages.create({
      model: AAR_AGENT_MODEL,
      max_tokens: 2048,
      system: fullSystemPrompt,
      messages: [
        { role: 'user', content: 'Begin the AAR session. Start with Phase 1: Opening.' }
      ]
    });

    const aarMessage = response.content[0].text;

    // Store in AAR message history
    session.aarMessages.push(
      { role: 'user', content: 'Begin the AAR session.' },
      { role: 'assistant', content: aarMessage }
    );

    // Save session updates
    await saveSession(session);

    console.log('✅ AAR session started successfully');

    res.json({
      success: true,
      message: aarMessage,
      scenariosReviewed: aarContext.totalScenarios,
      aarComplete: aarMessage.includes('[AAR_COMPLETE]')
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

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.aarMode) {
      return res.status(400).json({ error: 'AAR session not started' });
    }

    console.log('💬 AAR message received:', userMessage.substring(0, 50) + '...');

    // Add user message to history
    session.aarMessages.push({ role: 'user', content: userMessage });

    // ✅ Phase 1: Rebuild context (in case we need it fresh)
    const formattedContext = formatAARContextForPrompt(session.aarContext);
    const aarPrompt = loadPrompt('aarAgent', session.language || 'en');
    const fullSystemPrompt = `${aarPrompt}\n\n${formattedContext}`;

    // Send to Claude with full conversation history
    const response = await callAnthropicWithTimeout(
      anthropic.messages.create({
        model: AAR_AGENT_MODEL,
        max_tokens: 2048,
        system: fullSystemPrompt,
        messages: session.aarMessages
      })
    );

    let aarResponse = response.content[0].text;

    // Check for completion
    const aarComplete = aarResponse.includes('[AAR_COMPLETE]');
    if (aarComplete) {
      aarResponse = aarResponse.replace('[AAR_COMPLETE]', '').trim();

      // Mark session as complete and auto-save
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

    // Store assistant response
    session.aarMessages.push({ role: 'assistant', content: aarResponse });

    // Save session updates
    await saveSession(session);

    res.json({
      success: true,
      message: aarResponse,
      aarComplete
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
app.get('/api/sessions/:sessionId/aar/status', async (req, res) => {
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
  for (const [sessionId, session] of sessionCache.entries()) {
    // Skip locked sessions to prevent race conditions
    if (sessionLocks.has(sessionId)) {
      console.log(`⏰ [AUTO-DETERIORATION] Skipping locked session: ${sessionId}`);
      continue;
    }

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
  console.log(`   POST   /api/student/register`);
  console.log(`   POST   /api/sessions/start`);
  console.log(`   GET    /api/sessions/:id/check`);
  console.log(`   POST   /api/sessions/:id/message`);
  console.log(`   POST   /api/sessions/:id/action`);
  console.log(`   POST   /api/sessions/:id/begin-scenario`);
  console.log(`   POST   /api/sessions/:id/next-scenario`);
  console.log(`   POST   /api/sessions/:id/complete`);
  console.log(`   GET    /api/sessions/:id/vitals`);
  console.log(`   GET    /api/sessions/:id/state`);
  console.log(`   GET    /api/sessions/:id/performance`);
  console.log(`   POST   /api/sessions/:id/aar/start`);
  console.log(`   POST   /api/sessions/:id/aar/message`);
  console.log(`   GET    /api/sessions/:id/aar/status`);
  console.log(`   DELETE /api/sessions/:id`);
});