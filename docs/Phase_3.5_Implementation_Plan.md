# Phase 3.5 Implementation Plan: Communication Guidance

## Overview
This document outlines the implementation plan for Phase 3.5 - replacing the Mental Organization Technique with Effective Communication Bridge guidance in the Cognitive Coach Agent.

**Strategic Goal:** Guide users on effective communication practices for scenario interactions, framed as emergency best practices (not system limitations).

**Implementation Scope:** English version only (Slovak translation after validation)

---

## 1. Pattern Detection Logic

### Patterns to Recognize

#### Pattern 1: Sequential Thinking Level
**What to detect:**
- Temporal markers: "first", "then", "after", "next", "once I've", "before", "following", "subsequently"
- Step-by-step approach language
- Logical progression indicators

**Detection Thresholds:**
- **HIGH:** 2+ out of 3 responses contain sequential language
- **LOW:** 0-1 responses contain sequential markers

**Internal Evaluation Example:**
```
Response: "I would first check airway, then assess breathing, and after that check circulation"
→ Contains: "first", "then", "after that" → Sequential language detected
```

---

#### Pattern 2: Thoroughness Level
**What to detect:**
- Response length (word count)
- Consideration of multiple factors
- Weighing competing priorities explicitly
- Nuanced thinking ("on one hand... but also...", "however", "although")

**Detection Thresholds:**
- **HIGH THOROUGHNESS:** Average >100 words per response
- **MEDIUM:** Average 50-100 words per response
- **LOW:** Average <50 words per response

**Sub-pattern - Verbosity:**
- If HIGH thoroughness + rambling structure → Verbose pattern
- Rambling indicators: tangents, lack of clear conclusion, circular reasoning

---

#### Pattern 3: Conciseness & Clarity
**What to detect:**
- Short, focused responses
- Direct answers without excessive elaboration
- Clear decision statements
- Gets to the point quickly

**Detection Thresholds:**
- **HIGH CONCISENESS:** Average <50 words per response, clear structure
- **MEDIUM:** Average 50-100 words, reasonably focused
- **LOW CONCISENESS:** Average >100 words or rambling structure

---

#### Pattern 4: Action Bundling (Problem Pattern)
**What to detect:**
- Multiple distinct interventions/actions described in single message
- Action verbs indicating different procedures: "check", "administer", "position", "give", "apply", "establish", "monitor", "assess"

**Detection Thresholds:**
- **HIGH CONFIDENCE:** 3+ distinct actions in ANY single response
  - Example: "I would check vitals, position the patient, and administer oxygen"
- **MEDIUM CONFIDENCE:** 2+ actions in 2 out of 3 responses
  - Example: Two responses each contain 2 actions

**Important Distinction:**
- **Action Bundling (flag this):** "I would check vitals, give oxygen, and establish IV access"
- **Sequential Planning (DON'T flag):** "I would first check airway, then breathing, then circulation - following ABC"
  - Key difference: Sequential planning shows intent to work step-by-step
  - Use sequential language as indicator of planning vs bundling

---

### Pattern Detection Priority

```
Priority 1: PROBLEM PATTERN (Action Bundling)
  └─ If detected → Give action bundling nudge (positive framing)

Priority 2: STRONGEST POSITIVE PATTERN
  └─ If no problems detected:
      - HIGH Sequential Thinking + HIGH Conciseness → Combine both
      - HIGH Sequential Thinking only → Sequential nudge
      - HIGH Conciseness only → Conciseness nudge
      - HIGH Thoroughness (not verbose) → Thoroughness nudge
      - HIGH Thoroughness + Verbose → Thoroughness nudge with brevity suggestion

Priority 3: NO CLEAR PATTERN
  └─ Universal tips only (no personalized nudge)
```

---

## 2. Phase 3.5 Content Structure

### Component A: Universal Tips (Everyone Gets This)

**Framing:** Emergency communication best practices

**Content:**
```
"Before we jump into the scenario, let me share what tends to work best in real
emergencies - clear communication helps you stay organized:

→ When gathering information, leading with your most critical question often gets
  you the clearest answer. You can ask multiple things, but prioritizing what's
  most urgent helps in high-stress situations.

→ Taking actions one at a time - do something, observe the result, then decide
  next - is how experienced medics tend to work. It helps you adjust based on
  what you're seeing.

→ Narrating your actions - 'I'm checking vitals' or 'I need medication history' -
  helps you stay focused and systematic."
```

**Tone:** Professional, practical, mentoring (suggestions not rules)

**Delivery:** Consistent for all users (no adaptive emphasis)

---

### Component B: Personalized Nudge (Pattern-Based)

**Maximum:** 1 personalized nudge per user

**Positive Framing:** Always validate strength first, then gently redirect if needed

#### Nudge Templates by Pattern:

**1. HIGH Sequential Thinking (Positive)**
```
"I noticed you naturally think in steps - 'first, then, after' - that's exactly
how experienced medics work. Keep that same approach in the scenario."
```

**2. HIGH Conciseness (Positive)**
```
"You communicate clearly and directly - that's perfect for emergency situations.
Keep that clarity in the scenario."
```

**3. HIGH Sequential + HIGH Conciseness (Combined Positive)**
```
"You think in clear steps and communicate directly - both perfect for emergency
work. Keep that up."
```

**4. HIGH Thoroughness (Positive)**
```
"You think through multiple angles carefully - that depth is valuable. In the
scenario, that same thoughtfulness works great, just remember to translate it
into one clear action at a time so you can see how the patient responds."
```

**5. HIGH Thoroughness + Verbose (Gentle Redirect)**
```
"You explore situations thoroughly, which shows good thinking. During scenarios,
try to channel that into decisive action statements: identify your priority,
take that action, then reassess. Brevity helps in high-pressure moments."
```

**6. Action Bundling Detected (Problem - Positive Framing)**
```
"You're thinking through multiple interventions ahead - good forward planning!
During the scenario, take them one step at a time so you can see how the patient
responds before deciding what's next. That's how real assessment works."
```

**7. LOW Sequential Thinking (Gentle Redirect)**
```
"You have strong clinical reasoning - during the scenario, try approaching it
step-by-step: take one action, see the result, then decide the next move. That
rhythm will help you stay organized."
```

**8. No Clear Pattern (Skip Personalized Nudge)**
```
[No personalized nudge - Universal tips only]
```

---

### Component C: Q&A Transition

**Offer Questions Naturally:**
```
"Does that make sense? Ready to start the scenario, or do you have any questions
about how the simulation works?"
```

**Handle 1-2 Questions:**
- Answer briefly (2-3 sentences max)
- Common questions & answers:
  - "Can I make mistakes?" → "Yes - mistakes are part of learning. The scenario adapts to your decisions."
  - "How long is it?" → "5-15 minutes typically, depends on the situation and your decisions."
  - "Will I know if I'm doing it right?" → "The patient and scene give you realistic feedback - just like in the field."
  - "Can I ask the patient anything?" → "Yes - ask questions like you would on a real call. The patient will respond realistically."

**Soft Cap After 2 Questions:**
```
"Great questions! Many of these will make more sense once you're in the scenario
and see how it unfolds. Ready to jump in?"
```

**When Ready:**
```
"Perfect. Let's do this. [COGNITIVE_COACH_COMPLETE]"
```

---

## 3. Data Structure for Communication Analysis

### Addition to `cognitiveCoachSession` Object

```javascript
cognitiveCoachSession = {
  // ... existing fields ...

  communicationAnalysis: {
    // Pattern Detection Results
    patternsDetected: {
      sequentialThinking: "high" | "low" | "none",  // Based on 2+ responses
      thoroughness: "high" | "medium" | "low",       // Based on avg word count
      conciseness: "high" | "medium" | "low",        // Based on avg word count + structure
      actionBundling: boolean,                       // true if 3+ actions or 2+ in multiple
      verbose: boolean                               // true if high thoroughness + rambling
    },

    // Metrics Used for Detection
    metrics: {
      averageWordCount: number,
      sequentialLanguageCount: number,              // How many responses had sequential markers
      actionBundlingInstances: number,              // How many responses had action bundling
      responseStructureQuality: "clear" | "rambling" | "mixed"
    },

    // Nudge Given
    personalizedNudge: {
      type: "sequential_positive" | "conciseness_positive" | "thoroughness_positive" |
            "combined_positive" | "action_bundling" | "sequential_redirect" |
            "thoroughness_verbose" | "none",
      content: "[actual nudge text delivered]"
    },

    // Q&A Tracking
    studentQuestions: [
      {
        question: "[student question text]",
        answer: "[coach answer text]",
        timestamp: "[ISO timestamp]"
      }
      // max 2-3 entries typically
    ],

    // Completion
    phase3_5Completed: boolean,
    phase3_5Duration: number  // seconds
  }
}
```

---

## 4. Prompt Engineering Structure

### Updated Phase 3 Section (Now Phase 3.5)

**Replace existing PHASE 3: MENTAL ORGANIZATION TECHNIQUE section with:**

```markdown
### PHASE 3: COMMUNICATION GUIDANCE (30-60 seconds)

⚠️ **CRITICAL: PHASE 3 IS DELIVERED ONLY ONCE**

After all Phase 2 questions complete, provide communication guidance before transitioning to scenarios.

---

#### Step 1: Analyze Communication Patterns (Internal Only)

Review student's Phase 2 responses and detect patterns:

**Pattern Detection Checklist:**

1. **Sequential Thinking:**
   - Count responses containing temporal markers: "first", "then", "after", "next", "once"
   - HIGH: 2+ out of 3 responses → Sequential thinker
   - LOW: 0-1 responses → Needs sequential guidance

2. **Thoroughness & Conciseness:**
   - Calculate average word count across 3 responses
   - HIGH THOROUGHNESS: >100 words average
   - HIGH CONCISENESS: <50 words average
   - Check for rambling (tangents, circular reasoning)

3. **Action Bundling (Problem):**
   - Count distinct actions in each response
   - HIGH CONFIDENCE: 3+ actions in ANY response → Action bundling detected
   - MEDIUM: 2+ actions in 2 out of 3 responses → Action bundling detected
   - **Important:** Don't flag if student uses sequential planning language ("first X, then Y")

4. **Pattern Priority:**
   - If action bundling detected → Use action bundling nudge
   - Else if multiple positive patterns → Combine them briefly
   - Else if one strong positive → Use that nudge
   - Else → No personalized nudge

---

#### Step 2: Deliver Universal Tips

**Deliver to ALL students (consistent format):**

"Before we jump into the scenario, let me share what works best in real emergencies - clear communication saves time and prevents mistakes:

→ Ask your most critical question first, get that answer, then move to the next. In high-stress situations, this keeps information clear.

→ Take actions one at a time - do something, see the result, then decide your next move. This is how experienced medics work: observe, act, reassess.

→ Narrate your actions - 'I'm checking vitals' or 'I need medication history' - helps you stay focused and systematic."

**Tone:** Professional, practical, mentoring (not restrictive)

---

#### Step 3: Add Personalized Nudge (If Applicable)

**Based on pattern detected, add ONE of these nudges:**

**If HIGH Sequential Thinking + HIGH Conciseness:**
> "You think in clear steps and communicate directly - both perfect for emergency work. Keep that up."

**If HIGH Sequential Thinking only:**
> "I noticed you naturally think in steps - 'first, then, after' - that's exactly how experienced medics work. Keep that same approach in the scenario."

**If HIGH Conciseness only:**
> "You communicate clearly and directly - that's perfect for emergency situations. Keep that clarity in the scenario."

**If HIGH Thoroughness (not verbose):**
> "You think through multiple angles carefully - that depth is valuable. In the scenario, that same thoughtfulness works great, just remember to translate it into one clear action at a time so you can see how the patient responds."

**If HIGH Thoroughness + Verbose:**
> "You explore situations thoroughly, which shows good thinking. During scenarios, try to channel that into decisive action statements: identify your priority, take that action, then reassess. Brevity helps in high-pressure moments."

**If Action Bundling detected:**
> "You're thinking through multiple interventions ahead - good forward planning! During the scenario, take them one step at a time so you can see how the patient responds before deciding what's next. That's how real assessment works."

**If LOW Sequential Thinking:**
> "You have strong clinical reasoning - during the scenario, try approaching it step-by-step: take one action, see the result, then decide the next move. That rhythm will help you stay organized."

**If No Clear Pattern:**
> [Skip personalized nudge entirely]

---

#### Step 4: Offer Q&A Opportunity

**Ask naturally:**
> "Does that make sense? Ready to start the scenario, or do you have any questions about how the simulation works?"

**If student asks questions:**
- Answer briefly (2-3 sentences maximum)
- Common questions:
  - Mistakes allowed? → "Yes - mistakes are part of learning. The scenario adapts to your decisions."
  - Duration? → "5-15 minutes typically, depends on the situation and your decisions."
  - Feedback provided? → "The patient and scene give you realistic feedback - just like in the field."
  - Can ask anything? → "Yes - ask questions like you would on a real call. The patient responds realistically."

**Soft cap after 2 questions:**
- If student asks 3rd question: "Great questions! Many of these will make more sense once you're in the scenario and see how it unfolds. Ready to jump in?"

**When student confirms ready:**
- Brief acknowledgment (1-2 sentences)
- Execute transition markers

---

#### Step 5: Execute Transition

**When student confirms readiness:**

"Perfect. Let's do this."

**Then execute markers:**
```
[SAVE_COGNITIVE_COACH_DATA]
[COGNITIVE_COACH_COMPLETE]
[SAVE_COGNITIVE_METRICS]
[TRANSITION_TO_CORE_AGENT]
```

**CRITICAL: Do NOT describe the upcoming scenario. Do NOT mention patient details. Just acknowledge readiness and execute markers. The scenario presents after they click "Begin Scenario" button.**

---
```

---

## 5. Implementation Steps

### Step 1: Update Prompt File
- **File:** `server/prompts/en/cognitiveCoachAgent.txt`
- **Action:** Replace PHASE 3 section (lines 214-244) with new PHASE 3 content above
- **Update:** Change references from "Phase 3: Mental Organization" to "Phase 3: Communication Guidance"
- **Update:** Modify `[QUESTION_COUNT]` from "2-5" to "3" (always ask 3 questions)

### Step 2: Update Data Collection Section
- **File:** `server/prompts/en/cognitiveCoachAgent.txt`
- **Action:** Add `communicationAnalysis` object to DATA COLLECTION section (line 413-473)
- **Format:** Insert after `overallMetrics` field, before `completedSuccessfully`

### Step 3: Update Session Schema
- **File:** `server/index.js` (session state management)
- **Action:** Add `communicationAnalysis` field to `session.cognitiveCoach` object
- **Location:** Around line 2800-2900 where session state is initialized

### Step 4: Update Critical Constraints
- **File:** `server/prompts/en/cognitiveCoachAgent.txt`
- **Action:** Update CRITICAL CONSTRAINTS section (line 515-548)
- **Remove:** Reference to "Mental Organization Technique" from NEVER SKIP list
- **Add:** "Skip Phase 3 (Communication Guidance)" to NEVER DO list

### Step 5: Update Complete Example Interaction
- **File:** `server/prompts/en/cognitiveCoachAgent.txt`
- **Action:** Replace PHASE 3 example (lines 602-608) with Phase 3 Communication Guidance example
- **Include:** Universal tips delivery + personalized nudge + Q&A + transition

### Step 6: Test Pattern Detection
- **Create test scenarios:** 3 different user response styles
  - Test 1: Sequential thinker (uses "first, then, after")
  - Test 2: Action bundler (lists multiple actions)
  - Test 3: Verbose but thoughtful (long responses)
- **Verify:** Correct nudge delivered for each pattern

---

## 6. Edge Cases to Handle

### Edge Case 1: Very Negative Communication
**Pattern:** Rambling (>150 words) + No sequential thinking + Action bundling

**Handling:** More directive guidance (still supportive)
```
"I notice you explore a lot at once - totally natural! Emergency situations work
better with a different rhythm: short action, see result, decide next. Try that
approach in the scenario."
```

### Edge Case 2: Perfect Communication
**Pattern:** High sequential + High conciseness + No bundling

**Handling:** Enthusiastic validation
```
"Your communication is already spot-on - clear, sequential, focused. Keep exactly
that approach in the scenario."
```

### Edge Case 3: No Clear Patterns
**Pattern:** Medium responses, no distinctive style

**Handling:** Universal tips only, no personalized nudge

---

## 7. Testing Checklist

- [ ] Pattern detection works for sequential thinking (2+ responses with markers)
- [ ] Pattern detection works for action bundling (3+ actions in one response)
- [ ] Thoroughness correctly calculated (average word count)
- [ ] Correct nudge selected based on priority logic
- [ ] Universal tips delivered consistently to all users
- [ ] Q&A loop handles 0-2 questions gracefully
- [ ] Soft cap redirects after 2 questions
- [ ] Transition markers execute correctly
- [ ] Data persistence captures communication analysis
- [ ] No mention of "mental organization technique" remains in prompt
- [ ] Phase 2 always asks exactly 3 questions (not 2-5)

---

## 8. Success Metrics

**User Experience:**
- Users understand how to communicate effectively in scenarios
- Fewer multi-question/multi-action messages during scenarios
- Smoother Core Agent interactions

**Technical:**
- Pattern detection accuracy >80%
- Phase 3 completion time: 30-60 seconds average
- Q&A questions: 0-2 per user (95% of cases)

**Data Tracking:**
- Communication patterns tracked for all users
- Correlation data available for future analysis
- Can identify which nudges improve scenario performance

---

## 9. Future Iterations (Post-MVP)

**Phase 1 Enhancement:**
- Add communication analysis during Phase 2 (live detection)
- Provide micro-nudges during Phase 2 if severe bundling appears

**Slovak Translation:**
- Translate all nudge templates
- Verify cultural appropriateness of communication patterns
- Adjust for Slovak paramedic training norms

**Advanced Pattern Detection:**
- Detect decision avoidance patterns
- Identify confidence calibration issues
- Recognize patient-centered vs protocol-centered thinking

**Adaptive Universal Tips:**
- Adjust emphasis based on detected patterns
- Skip tips they're already demonstrating well

---

**END OF IMPLEMENTATION PLAN**
