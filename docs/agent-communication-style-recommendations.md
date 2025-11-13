# Agent Communication Style Recommendations
**Date:** 2025-11-13
**Status:** Proposed Improvements
**Priority Levels:** 🔴 High | 🟡 Medium | 🟢 Low

---

## Executive Summary

This document provides specific recommendations for improving agent communication styles based on the audit of predetermined messages. Recommendations focus on:
1. **Naturalness** - Making AI agents feel more human and less scripted
2. **Professionalism** - Ensuring appropriate tone for medical education
3. **Flexibility** - Allowing agents to adapt to student needs
4. **Consistency** - Maintaining unified voice across the system

---

## 1. COGNITIVE COACH AGENT

### 🔴 HIGH PRIORITY

#### Issue 1.1: Overly Rigid Verbatim Scripts
**Current Problem:**
```
PHASE 1 SCRIPT (must be delivered verbatim):
"Before we begin the scenarios, let's prepare your thinking. I'm going to
ask you some challenging questions - not to test you, but to warm up your
clinical reasoning. There are no wrong answers here, just good thinking
and poor thinking. I want to hear HOW you think through complex situations,
not whether you know the 'right' answer. Ready? Let's start."
```

**Why It's Problematic:**
- Feels rehearsed and unnatural
- Doesn't adapt to student's energy/engagement level
- "Good thinking and poor thinking" sounds judgmental despite intent
- No personalization possible

**Recommendation:**
Replace "must be delivered verbatim" with "core message must include these elements":

**REQUIRED ELEMENTS:**
- Purpose: Prepare clinical reasoning (not testing)
- Focus: HOW you think, not correctness
- Tone: Supportive, no judgment
- Confirmation: Check student readiness

**ALLOWED VARIATIONS (examples):**
- "Before we jump into the scenarios, let's warm up your clinical thinking. I have a few challenging questions—not to test you, just to get your mind ready. I'm more interested in your reasoning process than 'right answers.' Sound good?"
- "Quick warm-up before we start: I'll ask some tricky questions to get you thinking like a paramedic on scene. There's no grade here—I just want to hear how you work through complexity. Ready?"

**Implementation:** Change prompt instruction from "Deliver this script verbatim" to "Convey these core ideas naturally"

---

#### Issue 1.2: Awkward Mental Organization Script
**Current Problem:**
```
"When you feel cognitive complexity - lots of information, competing
priorities, multiple decisions happening at once - use this technique:
Simplify and Focus.

Instead of thinking: 'This is overwhelming, so much is happening'
Think: 'This is ABC assessment - Airway, Breathing, Circulation'
Or: 'What's the immediate threat to life right now?'"
```

**Why It's Problematic:**
- The "Instead of thinking... Think..." format feels artificial
- Tells students what they're thinking (presumptuous)
- Too academic/textbook-like for spoken conversation

**Recommendation:**
Rewrite as practical coaching advice:

**SUGGESTED REWRITE:**
"Excellent work. One last tool before we start: When cases feel overwhelming with lots happening at once, fall back on fundamentals. ABC assessment. Immediate life threats. Your training gives you frameworks that work even under pressure—use them to cut through the noise. You'll practice this in the scenarios. Ready to go?"

**Key Changes:**
- Removed "cognitive complexity" jargon
- Removed prescriptive "think this not that" structure
- Shorter, more conversational
- Same concept, better delivery

---

### 🟡 MEDIUM PRIORITY

#### Issue 1.3: Forbidden Language List Too Restrictive
**Current:**
```
NEVER USE: "Wrong", "Incorrect", "That's not right", "You should have
said...", "The correct answer is...", "Protocol says..."
```

**Recommendation:**
The prohibition on "Protocol says..." is too broad. Protocols are legitimate teaching tools.

**REVISED GUIDELINE:**
- ❌ DON'T: "Protocol says X, so you're wrong"
- ✅ DO: "You mentioned protocol—what does protocol say about this specific situation?"
- ✅ DO: "Protocol gives us a starting point. How would you adapt it here?"

Allow protocol discussion when student initiates or when teaching clinical judgment vs. protocol memorization.

---

#### Issue 1.4: Edge Case Responses Feel Scripted
**Current Examples:**
- "Can you try to answer?" → "There's no single right answer here. If you were on scene right now, what would you be thinking about?"
- "Can you elaborate?" → "Walk me through your thinking on that - what factors are you considering?"

**Recommendation:**
These are good, but provide MORE variety (3-4 options per edge case) to avoid repetition if same student hits same edge case multiple times.

**EXPANDED OPTIONS for "I don't know":**
1. "Fair enough—no single right answer. What's going through your mind as you think about this?"
2. "That's honest. If you were actually on this call right now, what would be your first concern?"
3. "Okay. Let's approach it differently: what information would you want to know before deciding?"

---

### 🟢 LOW PRIORITY

#### Issue 1.5: Transition Transparency
**Current:** Agent switch from Cognitive Coach → Core Agent is completely hidden from student.

**Consideration:**
Is complete opacity necessary? Would a subtle transition be better?

**Option A (Current):** Seamless, invisible transition
**Option B (Transparent):** "Alright, warm-up complete. Now let's put this into practice. You're responding to a call..."

**Recommendation:** Keep current approach (seamless) for now, but monitor student feedback. If students report confusion about agent switching, revisit.

---

## 2. CORE AGENT (Patient Simulator)

### 🔴 HIGH PRIORITY

#### Issue 2.1: Overly Rigid Response Format
**Current Rule:**
```
MANDATORY RESPONSE STRUCTURE (every response must follow):
1. Physical Observation (third-person)
2. Patient Dialogue (quoted speech)

Example:
"The patient is pale, diaphoretic, and clutching their chest.
'My chest... it hurts so much.'"
```

**Why It's Problematic:**
- Real patients don't speak in this predictable pattern
- Some situations call for action-only responses (patient unconscious)
- Some situations call for dialogue-only (patient anxious and talkative)
- Reduces realism

**Recommendation:**
Change from "MANDATORY structure" to "DEFAULT structure with justified exceptions"

**REVISED GUIDELINE:**
**Default Pattern:** Physical observation + patient dialogue

**Allowed Exceptions:**
- Patient unconscious/unresponsive: Physical observation only
- Patient in extreme distress: Dialogue first, then physical state
- Patient highly anxious: Multiple dialogue exchanges before physical state
- Rapid deterioration: Physical observation only, emphasizing urgency

**Example Exception Cases:**
```
❌ RIGID FORMAT (unconscious patient):
"The patient lies motionless on the ground, unresponsive.
'[No response]'"

✅ FLEXIBLE FORMAT:
"The patient lies motionless on the ground. No response to your voice.
His chest rises and falls slowly—maybe 8 breaths per minute. His lips
have a bluish tint."
```

---

#### Issue 2.2: Communication State Rules Too Simplistic
**Current:**
```
- Severe distress (SpO2 <90%): 1-2 words only ("Help..." "Can't...")
- Moderate distress: Short phrases
- Mild distress: Full sentences
- Improving: Relaxed speech
```

**Why It's Problematic:**
- Real patients vary widely in their communication under distress
- Some patients talk MORE when anxious (nervous chatter)
- Cultural, personality, and age factors not considered
- Reduces authenticity

**Recommendation:**
Add patient personality variables that modify communication patterns.

**ENHANCED GUIDELINE:**
Base communication on BOTH physiological state AND personality profile:

**Personality Modifiers:**
- **Stoic patients:** Understate symptoms even in severe distress ("I'm okay, just a bit short of breath" when SpO2 is 86%)
- **Anxious patients:** Talk rapidly even when breathless, ask repeated questions
- **Minimizers:** Downplay severity, reluctant to go to hospital
- **Direct communicators:** Clear, concise responses regardless of state

**Implementation:** Add `personality` field to scenario's `patient_profile` with values: `stoic`, `anxious`, `minimizer`, `direct`, `expressive`

---

### 🟡 MEDIUM PRIORITY

#### Issue 2.3: Tool Call Instructions Repetitive
**Current:** Multiple warnings throughout prompt about tool calls being invisible.

**Recommendation:**
Consolidate into ONE clear section at the top:

```
## CRITICAL SYSTEM BEHAVIOR - READ FIRST

All function calls (update_vitals, reveal_patient_info) are INVISIBLE to
the student. Never mention them, never reference them, never explain them.

The student only sees your text descriptions. Tool calls happen silently
in the background.

Example workflow:
Student: "I check her pulse"
You (silently): Call update_vitals(HR: 128)
You (visible): "Her radial pulse is rapid and bounding—128 beats per minute."

That's it. No meta-commentary about updating systems.
```

---

## 3. AAR AGENT

### 🔴 HIGH PRIORITY

#### Issue 3.1: Emoji Usage May Be Unprofessional
**Current:**
```
✅ for strengths
⚠️ for concerns
💡 for teaching points
💭 for challenge questions
```

**Why It's Problematic:**
- May feel informal for serious medical education
- Not universally accessible (screen readers)
- Could undermine gravitas of safety feedback
- Inconsistent with formal medical education norms

**Recommendation:**
Replace emojis with professional text markers:

**OPTION A - Professional Markers:**
```
**STRENGTH:** [replaces ✅]
**DEVELOPMENT AREA:** [replaces ⚠️]
**CLINICAL PEARL:** [replaces 💡]
**REFLECTION POINT:** [replaces 💭]
```

**OPTION B - Color-Coded Text (if UI supports):**
```
[GREEN] STRENGTH: ...
[YELLOW] DEVELOPMENT AREA: ...
[BLUE] CLINICAL PEARL: ...
```

**OPTION C - Hybrid (Professional Default, Emoji Optional):**
Allow configuration: `USE_EMOJIS: true/false` in AAR settings
- Educational/casual contexts: Emojis enabled
- Formal assessments: Text markers only

**Recommended:** Option C (configurable) for maximum flexibility

---

#### Issue 3.2: "Sustains/Improves/Apply" Framework Not Consistently Labeled
**Current:** AAR uses these concepts but doesn't explicitly label them in feedback.

**Recommendation:**
Make framework explicit and consistent:

**STRUCTURED FEEDBACK FORMAT:**
```
### Scenario 1: Asthma Emergency

**What to SUSTAIN (Your Strengths):**
- High-flow oxygen delivered at 1:30 (90 seconds)—excellent recognition
- Systematic ABC approach throughout

**What to IMPROVE (Development Areas):**
- Salbutamol timing: Given at 8:15, target is <5 minutes
- Earlier bronchodilator prevents deterioration to critical state

**What to APPLY (Clinical Insight):**
- Silent chest = pre-arrest sign, not "getting better"
- When you hear silence, accelerate treatment immediately
```

**Benefits:**
- Clear, memorable framework
- Students know exactly what to sustain, improve, apply
- Professional and structured
- Aligns with standard AAR methodology

---

### 🟡 MEDIUM PRIORITY

#### Issue 3.3: Pattern Discussion Guidance Too Mechanical
**Current Instructions:**
```
"Looking across all three scenarios, I see [PATTERN NAME]. [Use AAR
Talking Point]. For example, in the asthma scenario [specific example]..."
```

**Why It's Problematic:**
- Templated language visible in output
- "I see Pattern 1.2" is technical jargon
- Doesn't encourage natural dialogue

**Recommendation:**
Rewrite pattern discussion as natural observation:

**IMPROVED APPROACH:**
```
Instead of: "I see the Assessment-to-Treatment Gap pattern..."
Use: "I noticed something interesting across all three scenarios—you're
excellent at identifying problems quickly, but there's usually a 3-4
minute gap before you start treatment..."
```

**Framework:**
1. Describe what you observe (not pattern name)
2. Give specific examples
3. Ask student if they noticed this
4. Explain significance
5. Suggest improvement

---

#### Issue 3.4: Phase Structure Overly Rigid
**Current:** Must complete all 5 phases in exact order.

**Recommendation:**
Allow PHASE 2 (Scenario Review) to be abbreviated if patterns are clear:

**FLEXIBLE APPROACH:**
- If student demonstrates strong self-awareness in opening → Move faster through scenarios
- If student struggles with reflection → Spend more time on scenario details
- If patterns are obvious and consistent → Jump to pattern analysis sooner
- If patterns are contradictory → Spend more time in scenario review

**Implementation:** Change prompt from "MUST follow this sequence" to "TYPICALLY follows this sequence, adapt based on student engagement"

---

### 🟢 LOW PRIORITY

#### Issue 3.5: Action Plan Always 3 Items
**Current:** "Here are three action items: (1)..., (2)..., (3)..."

**Recommendation:**
Make number flexible based on performance:
- **Strong overall performance:** 2 focused improvements
- **Moderate performance:** 3 balanced items
- **Significant gaps:** 4-5 items with prioritization

Quality over arbitrary number.

---

## 4. SYSTEM-WIDE IMPROVEMENTS

### 🔴 HIGH PRIORITY

#### Issue 4.1: No Error Recovery Guidance
**Current:** No predetermined messages for system failures, API errors, or agent confusion.

**Recommendation:**
Add graceful degradation messages for each agent:

**COGNITIVE COACH ERROR STATES:**
```
If question pool fails to load:
"I'm having trouble loading the warm-up questions right now. Let's skip
ahead to the scenarios—you can dive straight into the practical work."

If AI response fails:
"Let me rephrase that question..." [retry with simpler prompt]

If student input is unintelligible:
"I want to make sure I understand your thinking. Could you rephrase that?"
```

**CORE AGENT ERROR STATES:**
```
If vitals update fails:
Continue with narrative, log error silently, use last known vitals

If scenario data missing:
"The patient remains in distress, waiting for your next action."

If AI response generation fails:
Use predetermined patient response based on last student action:
- Last action was assessment → "The patient grimaces, waiting for help."
- Last action was treatment → Use treatment_responses from scenario data
```

**AAR AGENT ERROR STATES:**
```
If performance data incomplete:
"I notice we're missing some data from [scenario X]. Based on what I can
see from the other scenarios..."

If pattern analysis fails:
Fall back to scenario-by-scenario review only, skip Pattern Analysis phase

If AI response fails mid-AAR:
"Let me gather my thoughts... [retry with conversation context]"
```

---

#### Issue 4.2: No Timing/Pacing Guidance Across Agents
**Current:** Each agent has duration targets but no coordination.

**Recommendation:**
Add system-wide timing awareness:

**TOTAL SESSION TARGET:** 45-60 minutes
- Cognitive Coach: 2-5 minutes (current ✓)
- Core Agent Scenario 1: 15 minutes (add guidance)
- Core Agent Scenario 2: 15 minutes (add guidance)
- Core Agent Scenario 3: 15 minutes (add guidance)
- AAR: 10-15 minutes (current ✓)

**PACING SIGNALS BETWEEN AGENTS:**
- If Cognitive Coach runs long (>6 min) → Core Agent slightly more directive
- If scenarios run short (<12 min) → AAR provides deeper analysis
- If session approaching 60 min → AAR condenses to key points only

**Implementation:** Pass session timing metadata to each agent via context

---

### 🟡 MEDIUM PRIORITY

#### Issue 4.3: Inconsistent Encouragement Patterns
**Current Patterns Across Agents:**
- Cognitive Coach: "Good," "Right," "Exactly" (frequent)
- Core Agent: Mostly neutral patient responses
- AAR: "Great work," "Excellent," "Strong performance"

**Observation:**
Cognitive Coach uses lots of encouragement, Core Agent uses almost none, AAR uses moderate amounts.

**Recommendation:**
This is actually GOOD design—each agent serves different purpose:
- Cognitive Coach: Builds confidence before scenarios (encouragement appropriate)
- Core Agent: Maintains realism (neutral appropriate)
- AAR: Balances praise with growth areas (moderate appropriate)

**Minor Adjustment:**
Add subtle encouragement to Core Agent when student makes life-saving decisions:

```
Current: "After you administer the aspirin, the patient's chest pain begins to ease slightly."

Enhanced: "After you administer the aspirin, the patient's chest pain begins to ease slightly. 'Thank you... that's helping...'"
```

Gratitude from patient = indirect positive feedback for good care.

---

#### Issue 4.4: No Culturally Adaptive Communication
**Current:** All patients communicate in standard English with American medical expectations.

**Consideration:**
- Should patients have varied cultural communication styles?
- Should language barriers be simulated?
- Should cultural attitudes toward healthcare be varied?

**Recommendation:**
**Phase 1 (Current MVP):** Keep current standardized approach for consistency
**Phase 2 (Future Enhancement):** Add optional `cultural_context` to patient profiles:
```json
{
  "cultural_context": {
    "communication_style": "direct | indirect | formal",
    "healthcare_attitude": "trusting | skeptical | deferential",
    "language_fluency": "fluent | limited | translator_needed"
  }
}
```

---

### 🟢 LOW PRIORITY

#### Issue 4.5: Student Addressing Not Personalized
**Current:** Agents never use student's name.

**Observation:**
- Cognitive Coach: Generic "you"
- Core Agent: Patient wouldn't know student name (realistic)
- AAR: Generic "you"

**Recommendation:**
**Option A:** Keep current approach (maintains professional boundary)
**Option B:** AAR Agent uses student name occasionally for personalization:
  "Sarah, looking at your performance across all three scenarios..."

**Decision:** Team preference. Medical education often uses names in AAR for rapport building.

---

## 5. IMPLEMENTATION PRIORITIES

### Immediate (Sprint 1):
1. ✅ Issue 1.1: Make Cognitive Coach scripts flexible
2. ✅ Issue 2.1: Relax Core Agent format requirements
3. ✅ Issue 3.1: Replace emojis with professional markers
4. ✅ Issue 4.1: Add error recovery messages

### Short-term (Sprint 2):
5. Issue 1.2: Rewrite Mental Organization script
6. Issue 2.2: Add personality modifiers to patients
7. Issue 3.2: Implement explicit Sustains/Improves/Apply framework
8. Issue 4.2: Add cross-agent timing coordination

### Medium-term (Sprint 3+):
9. Issue 1.3: Refine forbidden language guidelines
10. Issue 3.3: Improve pattern discussion naturalness
11. Issue 2.3: Consolidate tool call instructions
12. Issue 4.3: Subtle Core Agent encouragement

### Future Consideration:
- Issue 4.4: Cultural communication variations
- Issue 4.5: Personalized student addressing
- Issue 3.4: Flexible AAR phase structure

---

## 6. TESTING & VALIDATION

### How to Test These Changes:

1. **A/B Testing:**
   - Run 20 sessions with current scripts
   - Run 20 sessions with revised scripts
   - Compare student feedback surveys on "natural conversation" rating

2. **Key Metrics:**
   - Student engagement (message count, response length)
   - Student satisfaction (post-session survey)
   - Educational outcomes (performance scores, pattern recognition)
   - Agent failure rate (error handling effectiveness)

3. **Qualitative Review:**
   - Instructor feedback on conversation quality
   - Student quotes about agent interactions
   - Transcript analysis for awkward moments

---

## 7. ROLLBACK PLAN

For each change:
- Maintain current prompts as `[agent]_v1.txt`
- New prompts as `[agent]_v2.txt`
- Configuration flag: `AGENT_PROMPT_VERSION: "v1" | "v2"`
- Can revert instantly if issues arise

---

## Conclusion

**Summary of Recommended Changes:**
- 🔴 **5 High Priority** improvements (immediate impact on naturalness & professionalism)
- 🟡 **7 Medium Priority** improvements (quality of life enhancements)
- 🟢 **5 Low Priority** considerations (future enhancements)

**Core Philosophy:**
Move from rigid scripts → flexible guidelines with required elements.
Trust the AI to be conversational while maintaining educational rigor.

**Next Steps:**
1. Review recommendations with team
2. Prioritize based on development capacity
3. Implement highest-priority changes first
4. Test with small cohort before full rollout

---

**Document Version:** 1.0
**Last Updated:** 2025-11-13
**Author:** Claude (AI Assistant)
