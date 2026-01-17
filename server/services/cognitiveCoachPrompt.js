// Cognitive Coach Prompt Builder (ES Module Version)
// Builds complete system prompt for Cognitive Coach Agent with dynamic context

import { loadPrompt } from '../utils/languageLoader.js';
import cognitiveCoachService from './cognitiveCoachService.js';

// Cache prompts by language
const promptCache = new Map();

function loadBasePrompt(language = 'en') {
  if (!promptCache.has(language)) {
    const basePromptTemplate = loadPrompt('cognitiveCoachAgent', language);
    promptCache.set(language, basePromptTemplate);
    console.log(`✅ Loaded Cognitive Coach base prompt (${language})`);
  }
  return promptCache.get(language);
}

/**
 * Build complete system prompt for Cognitive Coach Agent
 * @param {Object} session - Current session object
 * @returns {string} Complete system prompt with dynamic context
 */
export function buildCognitiveCoachPrompt(session) {
  const language = session.language || 'en';
  const basePrompt = loadBasePrompt(language);
  const { cognitiveCoach } = session;
  const { selectedQuestions, currentQuestionIndex } = cognitiveCoach;

  // Get selected question details with validation
  const questions = selectedQuestions.map(qID => {
    const question = cognitiveCoachService.getQuestionByID(qID, language);
    if (!question) {
      console.error(`[CognitiveCoach] Question ${qID} not found in pool for language ${language}`);
      throw new Error(`Question ${qID} not found in question pool`);
    }
    return question;
  });

  // Get all questions for reference with validation
  const allQuestions = cognitiveCoachService.getAllQuestions(language);
  if (!allQuestions || allQuestions.length === 0) {
    console.error(`[CognitiveCoach] No questions found for language ${language}`);
    throw new Error(`No cognitive coach questions available for language ${language}`);
  }
  
  // Calculate progress
  const questionsRemaining = selectedQuestions.length - currentQuestionIndex;
  const currentQuestionNumber = currentQuestionIndex + 1;
  
  // Determine current phase
  let currentPhase;
  if (currentQuestionIndex === 0 && session.messages.length <= 1) {
    currentPhase = 'PHASE_1_INTRODUCTION';
  } else if (currentQuestionIndex < selectedQuestions.length) {
    currentPhase = 'PHASE_2_QUESTIONS';
  } else if (!cognitiveCoach.communicationAnalysis?.phase3Completed) {
    currentPhase = 'PHASE_3_COMMUNICATION_GUIDANCE';
  } else {
    currentPhase = 'PHASE_3_AWAITING_TRANSITION';
  }
  
  // Get current question if in Phase 2
  const currentQuestion = currentQuestionIndex < selectedQuestions.length 
    ? questions[currentQuestionIndex] 
    : null;
  
  // Build dynamic context
  const dynamicContext = `

═══════════════════════════════════════════════════════════════
CURRENT SESSION CONTEXT (Dynamic Information)
═══════════════════════════════════════════════════════════════

SESSION INPUTS:

[QUESTION_COUNT]: ${selectedQuestions.length}
[SELECTED_QUESTIONS]: ${JSON.stringify(selectedQuestions)}
[QUESTION_POOL]: Available below in QUESTION POOL REFERENCE section

───────────────────────────────────────────────────────────────
CURRENT SESSION PROGRESS:
───────────────────────────────────────────────────────────────

• Total questions for this session: ${selectedQuestions.length}
• Current question number: ${currentQuestionNumber}
• Questions remaining: ${questionsRemaining}
• Current phase: ${currentPhase}

───────────────────────────────────────────────────────────────
SELECTED QUESTIONS FOR THIS SESSION:
───────────────────────────────────────────────────────────────

${questions.map((q, i) => `
${i + 1}. [${q.questionID}] ${q.category}
   ${i === currentQuestionIndex ? '👉 CURRENT QUESTION' : i < currentQuestionIndex ? '✅ COMPLETED' : '⏳ UPCOMING'}
`).join('')}

${currentQuestion ? `
───────────────────────────────────────────────────────────────
CURRENT QUESTION TO ASK (Question ${currentQuestionNumber}):
───────────────────────────────────────────────────────────────

**Question ID:** ${currentQuestion.questionID}
**Category:** ${currentQuestion.category}

**Setup (present verbatim):**
"${currentQuestion.setup}"

**Expected Good Reasoning:**
${currentQuestion.expectedGoodReasoning.map((r, i) => `${i + 1}. ${r}`).join('\n')}

**Common Flawed Reasoning:**
${currentQuestion.commonFlawedReasoning.map((r, i) => `${i + 1}. ${r}`).join('\n')}

**Coach Follow-Up Template:**
"${currentQuestion.coachFollowUp}"

**Instructions for this question:**
1. Present the setup exactly as written above
2. Listen to student response
3. Evaluate against the criteria above
4. Respond using the follow-up template (adapt to their specific answer)
5. Move to next question or Phase 3 if this was the last question
` : ''}

───────────────────────────────────────────────────────────────
QUESTION POOL REFERENCE (All 20 Questions):
───────────────────────────────────────────────────────────────

${JSON.stringify(allQuestions, null, 2)}

═══════════════════════════════════════════════════════════════
END OF DYNAMIC CONTEXT
═══════════════════════════════════════════════════════════════

**IMPORTANT EXECUTION INSTRUCTIONS:**

${currentPhase === 'PHASE_1_INTRODUCTION' ? `
You are starting with PHASE 1: INTRODUCTION
→ Deliver the introduction script verbatim as defined in your system prompt
→ After student confirms readiness, move to Phase 2 Question 1
` : ''}

${currentPhase === 'PHASE_2_QUESTIONS' ? `
You are in PHASE 2: CHALLENGE QUESTIONS
→ Present the current question (Question ${currentQuestionNumber}) shown above
→ Follow the 5-step evaluation loop as defined in your system prompt
→ After responding to this question, the backend will increment to Question ${currentQuestionNumber + 1}
${questionsRemaining === 1 ? '→ This is the LAST question - after this, move to Phase 3' : ''}
` : ''}

${currentPhase === 'PHASE_3_COMMUNICATION_GUIDANCE' ? `
You are at PHASE 3: COMMUNICATION GUIDANCE
→ All questions have been completed
→ Follow the 5-step process defined in your system prompt:
  1. Analyze communication patterns (internal)
  2. Deliver universal tips (all students)
  3. Add personalized nudge if applicable
  4. Offer Q&A opportunity
  5. Execute transition when student ready
→ This is delivered ONE TIME ONLY
→ After student confirms ready, execute transition markers: [COGNITIVE_COACH_COMPLETE] [TRANSITION_TO_CORE_AGENT]
` : ''}

${currentPhase === 'PHASE_3_AWAITING_TRANSITION' ? `
You are AWAITING TRANSITION after Phase 3
→ Phase 3 (Communication Guidance) has ALREADY been delivered
→ DO NOT repeat Phase 3 content
→ Student has confirmed readiness or is responding after Phase 3
→ Give a brief acknowledgment (1-2 sentences maximum)
→ IMMEDIATELY execute transition markers: [COGNITIVE_COACH_COMPLETE] [TRANSITION_TO_CORE_AGENT]
` : ''}

`;

  return basePrompt + dynamicContext;
}

// Default export
export default {
  buildCognitiveCoachPrompt
};