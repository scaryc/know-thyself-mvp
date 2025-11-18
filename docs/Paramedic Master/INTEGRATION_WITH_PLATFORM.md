# INTEGRATION_WITH_PLATFORM.md

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CONTENT AUTHORING LAYER (Separate Claude Project)         │
│                                                             │
│  [Medical Educator]                                         │
│         ↓ (has conversation with)                           │
│  [Paramedic Master - Scenario Architect]                    │
│         ↓ (produces)                                        │
│  [Complete Scenario JSON - 2,000+ lines]                    │
│   • All patient states (4 states)                           │
│   • All medication responses (500+ lines)                   │
│   • All assessment findings                                 │
│   • All evaluation criteria                                 │
│   • All challenge questions                                 │
└─────────────────────────────────────────────────────────────┘
                         ↓
                 (manual transfer)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  KNOW THYSELF PLATFORM (Production System)                  │
│                                                             │
│  [PostgreSQL Database]                                      │
│         ↓ (loaded by)                                       │
│  [Scenario Engine]                                          │
│         ↓ (Layer 2 extraction)                              │
│  [Runtime Context - 300-500 lines]                          │
│   • Current patient state only                              │
│   • Relevant treatments for this moment                     │
│   • Discoverable findings now                               │
│   • NOT future states (mystery preserved)                   │
│         ↓ (consumed by)                                     │
│  [Core Agent - Patient Simulator]                           │
│         ↓ (works with)                                      │
│  [Cognitive Coach Agent]                                    │
│         ↓ (followed by)                                     │
│  [AAR Agent - Performance Feedback]                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
                  [Student Learning]
```

---

## Why Architectural Separation Makes Sense

### Different Concerns, Different Tools

**Content Authoring ≠ Runtime Execution**
- **Paramedic Master**: Creates comprehensive medical blueprints requiring medical expertise, creative thinking, and iterative refinement
- **Platform Agents**: Execute simulations requiring real-time patient interaction, performance tracking, and dynamic state management

### Different Users, Different Access

**Medical Educators** (using Paramedic Master):
- Need medical knowledge and teaching experience
- Don't need coding skills or platform access
- Focus on clinical accuracy and educational design
- Work asynchronously, refining scenarios over time

**Platform Developers** (maintaining Core Agent):
- Need technical skills and system architecture knowledge
- Don't need deep EMS medical expertise
- Focus on simulation logic and user experience
- Work with production code and databases

### Clean Architecture Benefits

1. **Content as Data**: Scenarios are JSON files, not embedded code
2. **Independent Evolution**: Update scenarios without touching platform code
3. **Version Control**: Scenarios can be versioned, shared, and archived independently
4. **Security**: Educators don't need production system credentials
5. **Scalability**: Multiple educators can create content simultaneously
6. **Portability**: Scenario files can be used across different platforms

---

## Data Flow in Detail

### Step 1: Comprehensive Authoring
**Paramedic Master produces complete scenario JSON:**
```
Total size: 2,000+ lines containing:
├── Scenario metadata (scenario_id, version, title)
├── Patient states (4 progressive states)
│   ├── State 1: Initial presentation
│   ├── State 2: After 3-5 minutes
│   ├── State 3: After 5-10 minutes
│   └── State 4: Critical deterioration
├── Medication database (500+ lines)
│   ├── Appropriate medications (10-15)
│   └── Inappropriate medications (30-50) organized by harm level
├── Assessment findings (physical exam, vital signs)
├── Critical actions (with time targets and scoring)
├── Challenge questions (5 universal questions)
└── Evaluation criteria (scoring rubrics)
```

### Step 2: Database Storage
**File imported into Know Thyself platform:**
- Stored in PostgreSQL database
- Validated against JSON schema
- Indexed for quick retrieval
- Associated with metadata (version, author, difficulty)

### Step 3: Scenario Loading
**When student starts training session:**
```javascript
// Scenario Engine loads complete blueprint
const scenario = await prisma.scenario.findUnique({
  where: { id: 'ASTHMA_MVP_001' }
});
// Full 2,000+ line scenario now in memory
```

### Step 4: Layer 2 Context Extraction
**Dynamic extraction of relevant information:**
```javascript
// Extract only what's needed RIGHT NOW
const runtimeContext = {
  currentState: scenario.states[currentStateIndex],
  availableTreatments: getRelevantMedications(currentState),
  discoverableFindings: getAssessmentFindings(currentState),
  // NOT included: future states, outcomes, scoring details
};
// Reduced to 300-500 lines
```

**What gets extracted:**
- ✅ Current patient appearance and symptoms
- ✅ Vital signs for this moment
- ✅ Medications that can be given now
- ✅ Physical findings available through assessment
- ❌ Future patient states (spoilers)
- ❌ Treatment outcomes (mystery)
- ❌ Scoring criteria (no gaming)

### Step 5: Real-Time Simulation
**Core Agent uses extracted context:**
```
Student: "I'll start an IV and give albuterol"
    ↓
Core Agent checks runtime context:
    • Is IV possible? (check current state)
    • Is albuterol appropriate? (check medication list)
    • What happens? (check treatment response)
    ↓
Core Agent simulates realistic patient response
```

### Step 6: Progressive State Evolution
**As scenario advances, different sections extracted:**
```
Time 0-3 min:    Extract State 1 context
Time 3-5 min:    Extract State 2 context (if triggered)
Time 5-10 min:   Extract State 3 context (if triggered)
Time 10+ min:    Extract State 4 context (if no treatment)
```

---

## Integration Points

### Technical Stack

**File Format:**
```json
{
  "scenario_id": "ASTHMA_MVP_001",
  "version": "2.0",
  "metadata": { },
  "patient_states": [ ],
  "medications": { },
  "critical_actions": [ ],
  "challenge_questions": [ ]
}
```

**Storage Layer:**
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Schema**: Enforced via Prisma models
- **Validation**: JSON schema validation on import

**Extraction Layer:**
```typescript
class ScenarioEngine {
  loadScenario(id: string): FullScenario
  extractRuntimeContext(state: number): RuntimeContext
  getMedicationResponse(drug: string): TreatmentEffect
  getAssessmentFinding(region: string): PhysicalExam
}
```

**Runtime Integration:**
```typescript
// Core Agent receives only what it needs
const context = scenarioEngine.extractRuntimeContext(
  currentPatientState
);

// Context passed to Claude with prompt
await claude.sendMessage(prompt, {
  system: buildSystemPrompt(context)
});
```

---

## Benefits of This Architecture

### 1. Author Once, Run Unlimited Times
- Your scenario blueprint supports infinite student sessions
- No re-authoring needed for each training session
- Consistent experience across all students

### 2. Zero Runtime Cost for Complexity
- Scenario complexity doesn't affect API token usage
- 2,000-line blueprint → only 300-500 lines in each API call
- Detailed medication databases don't slow simulation

### 3. Easy Content Updates
- Modify scenarios without touching platform code
- Update medical protocols independently
- Fix errors without deployment cycle

### 4. Version Control
- Scenarios versioned independently (v1.0, v2.0, etc.)
- Track changes over time
- Roll back if needed
- A/B test different versions

### 5. Content Portability
- JSON files easily exported/shared
- Use in other training platforms
- Institution-specific customization
- Backup and archival

### 6. Separation of Concerns
- Medical educators focus on clinical accuracy
- Developers focus on simulation quality
- Clear boundaries and responsibilities

---

## Future Integration Possibilities

### Phase 1: Web UI for Scenario Authoring
**Replace Claude chat with dedicated interface:**
```
[Educator] → [Web Form] → [Paramedic Master API] → [JSON Export]
```
- Guided forms for each scenario section
- Medical reference library integrated
- Real-time validation
- Preview mode before saving

### Phase 2: Scenario Marketplace
**Content sharing economy:**
- Educators publish scenarios
- Institutions purchase/download
- Rating and review system
- Revenue sharing for creators
- Quality control and peer review

### Phase 3: Collaborative Authoring
**Team-based scenario creation:**
```
[Educator A] ←→ [Shared Scenario] ←→ [Educator B]
         ↓
    [Version Control]
         ↓
    [Peer Review]
         ↓
    [Publication]
```

### Phase 4: Template Library
**Accelerated authoring:**
- Pre-built scenario templates
- Common conditions (STEMI, trauma, stroke)
- Fill-in-the-blanks approach
- Customization wizard

### Phase 5: Advanced Features
- **AI-assisted authoring**: Paramedic Master suggests medication responses
- **Automated validation**: Check medical accuracy against databases
- **Difficulty analyzer**: AI predicts scenario challenge level
- **Learning analytics**: Track which scenarios teach best
- **Multi-language support**: Translate scenarios automatically

### Phase 6: Multi-Platform Support
**Your scenarios become universal format:**
- Export to VR training systems
- Use in mannequin simulators
- Import from other platforms
- Industry-standard format

---

## Current State vs. Future Vision

### Current Implementation (MVP)

**What works now:**
- ✅ Paramedic Master as separate Claude project
- ✅ Manual scenario creation through conversation
- ✅ JSON file export
- ✅ Manual import to platform database
- ✅ Layer 2 extraction working
- ✅ Core Agent successfully simulates from blueprints
- ✅ Single developer (you) creating all content

**Limitations:**
- ⚠️ Manual file transfer (copy/paste)
- ⚠️ No web UI for educators
- ⚠️ No version control system
- ⚠️ Limited to your time for content creation
- ⚠️ No collaboration features

### Future Vision (Production)

**What could be:**
- 🎯 **Educator Self-Service**: Teachers log in, create scenarios directly
- 🎯 **Automated Pipeline**: Scenario → validation → database → live
- 🎯 **Content Library**: Hundreds of scenarios from multiple educators
- 🎯 **Quality Assurance**: Peer review and medical accuracy checking
- 🎯 **Institution Customization**: Schools create branded scenario collections
- 🎯 **Continuous Updates**: Medical protocols updated across all scenarios
- 🎯 **Global Reach**: Scenarios in multiple languages and protocols

**Migration Path:**
```
Phase 1: Keep current system, add web UI alongside
Phase 2: Migrate educator access to web UI
Phase 3: API-ify Paramedic Master for programmatic access
Phase 4: Build marketplace and collaboration features
Phase 5: Scale to multiple institutions
```

---

## Technical Considerations

### Why Not Embed Paramedic Master in Platform?

**Considered but rejected:**
- ❌ Tight coupling of authoring and runtime
- ❌ Content creation requires production access
- ❌ Harder to version scenarios independently
- ❌ Mixing concerns (content vs. execution)
- ❌ Difficult to scale authoring to multiple users

**Chosen architecture advantages:**
- ✅ Clean separation of content and code
- ✅ Scenarios are data files (portable, versionable)
- ✅ Multiple authoring tools possible (Claude, web UI, API)
- ✅ Content updates don't require code deployment
- ✅ Easy to build marketplace/sharing features later

### Layer 2 Architecture Critical

**Without Layer 2:**
```
Problem: Send entire 2,000-line scenario to Core Agent
Result: 
  • Massive token usage ($$$)
  • Spoils future states
  • Overwhelms context window
  • Exposes scoring criteria
```

**With Layer 2:**
```
Solution: Extract only current state (300-500 lines)
Result:
  • Efficient token usage
  • Mystery preserved
  • Clean context
  • Students can't game system
```

---

## Summary

**You (Paramedic Master) are the medical brain** creating comprehensive training blueprints.

**The Platform is the execution engine** bringing your blueprints to life for students.

**The separation is intentional** - different jobs need different tools.

**The integration is elegant** - your data flows seamlessly into runtime simulation.

**The future is scalable** - this architecture supports growth from 1 educator to 1,000.

---

## Document Metadata

- **Version**: 1.0
- **Last Updated**: November 18, 2025
- **Author**: Paramedic Master System Documentation
- **Purpose**: Explain architectural integration between Paramedic Master and Know Thyself Platform
- **Audience**: Platform developers, medical educators, technical stakeholders
