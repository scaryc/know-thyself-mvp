# Layer 2 MVP API Documentation

**Version**: 2.0
**Base URL**: `http://localhost:3001/api`
**Last Updated**: December 2024

---

## Overview

This document describes the Layer 2 MVP API endpoints for the Know Thyself emergency medical training platform. Layer 2 introduces advanced features including:
- State progression and auto-deterioration
- Critical Decision Point (CDP) evaluation
- Challenge Points system (Socratic questioning)
- After Action Review (AAR) Agent
- Comprehensive performance tracking

---

## Authentication

Currently, no authentication is required (MVP). Future versions will implement user authentication.

---

## Core Training Endpoints

### 1. Start Training Session

**Endpoint**: `POST /api/sessions/start`

**Description**: Initializes a new training session with Layer 2 features enabled.

**Request Body**:
```json
{
  "scenarioId": "asthma_mvp_001",
  "challengePointsEnabled": true
}
```

**Request Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `scenarioId` | string | No | `"asthma_mvp_001"` | Scenario to load |
| `challengePointsEnabled` | boolean | No | `true` | Enable/disable Challenge Points for A/B testing |

**Response** (200 OK):
```json
{
  "sessionId": "session_1234567890_abc123",
  "currentAgent": "cognitive_coach",
  "message": "Welcome to training...",
  "challengePointsEnabled": true
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique session identifier |
| `currentAgent` | string | Current agent type: `cognitive_coach`, `core`, or `aar` |
| `message` | string | Initial message from agent |
| `challengePointsEnabled` | boolean | Challenge Points status |

**Example**:
```javascript
const response = await fetch('http://localhost:3001/api/sessions/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scenarioId: 'asthma_mvp_001',
    challengePointsEnabled: true
  })
});
const data = await response.json();
console.log(data.sessionId); // session_1234567890_abc123
```

---

### 2. Send Message to Agent

**Endpoint**: `POST /api/sessions/:sessionId/message`

**Description**: Sends a message to the current active agent (Cognitive Coach or Core Agent). Automatically detects treatments, evaluates CDPs, triggers Challenge Points, and updates patient state.

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID from start endpoint |

**Request Body**:
```json
{
  "message": "I will apply high-flow oxygen at 15 L/min via non-rebreather mask"
}
```

**Response** (200 OK):
```json
{
  "message": "The patient accepts the oxygen mask. SpO2 begins to improve slightly...",
  "vitals": {
    "HR": 125,
    "RR": 28,
    "SpO2": 91,
    "BP": "140/90",
    "Temp": 37.2,
    "GCS": 14,
    "Glycemia": 95
  },
  "vitalsUpdated": true,
  "currentAgent": "core",
  "currentState": "initial",
  "isChallenge": false,
  "cdpEvaluated": true,
  "cdpRating": "optimal",
  "transitioned": false
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Agent's response message |
| `vitals` | object | Current patient vitals (if Core Agent) |
| `vitalsUpdated` | boolean | Whether vitals changed |
| `currentAgent` | string | Current agent type |
| `currentState` | string | Patient state: `initial`, `improving`, `deteriorating`, `critical` |
| `isChallenge` | boolean | Whether response contains a Challenge Point |
| `cdpEvaluated` | boolean | Whether a CDP was evaluated this turn |
| `cdpRating` | string | CDP rating: `optimal`, `acceptable`, `suboptimal`, `dangerous` |
| `transitioned` | boolean | Whether agent transition occurred |

**Treatment Detection**:
The system automatically detects when treatments are mentioned and logs them:
- Oxygen: "oxygen", "O2", "high-flow"
- Salbutamol: "salbutamol", "ventolin", "bronchodilator"
- Steroids: "hydrocortisone", "prednisolone", "corticosteroid"

**CDP Evaluation**:
Critical Decision Points are evaluated based on:
- Time window (e.g., 0-5 minutes for bronchodilator)
- Action taken (e.g., salbutamol given)
- Patient state (e.g., initial, deteriorating)

**Challenge Points**:
May trigger Socratic questioning if:
- Challenge Points enabled for session
- Trigger conditions met (treatment, keyword, or state)
- Within time window
- Limit of 2 challenges per scenario not exceeded

---

### 3. Get Vitals

**Endpoint**: `GET /api/sessions/:sessionId/vitals`

**Description**: Retrieves current patient vitals. Used for auto-polling every 5 seconds.

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID |

**Response** (200 OK):
```json
{
  "raw": {
    "HR": 125,
    "RR": 28,
    "SpO2": 91,
    "BP": "140/90",
    "Temp": 37.2,
    "GCS": 14,
    "Glycemia": 95
  },
  "formatted": {
    "HR": "125 bpm (High)",
    "RR": "28 breaths/min (Tachypneic)",
    "SpO2": "91% (Low)"
  },
  "concerns": {
    "HR": "warning",
    "RR": "critical",
    "SpO2": "critical"
  }
}
```

---

### 4. Get Performance Report

**Endpoint**: `GET /api/sessions/:sessionId/performance`

**Description**: Retrieves comprehensive performance data including CDP evaluations, medication errors, critical actions, and state history.

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID |

**Response** (200 OK):
```json
{
  "sessionId": "session_123",
  "scenarioId": "asthma_mvp_001",
  "totalTime": 720,
  "finalState": "improving",

  "performanceScore": {
    "raw": 85,
    "percentage": 85,
    "grade": "B"
  },

  "cdpEvaluations": [
    {
      "cdp_id": "asthma_bronchodilator_timing",
      "cdp_title": "Bronchodilator Administration Timing",
      "rating": "optimal",
      "explanation": "Salbutamol given within critical 5-minute window",
      "timestamp": 1234567890,
      "elapsedTime": 4.5
    }
  ],

  "medicationErrors": [
    {
      "medication": "Diazepam",
      "reason": "Contraindicated - may worsen respiratory depression",
      "severity": "high",
      "timestamp": 1234567890,
      "elapsedTime": 8.2
    }
  ],

  "criticalTreatments": {
    "oxygen": true,
    "salbutamol": true,
    "steroids": false
  },

  "actionsLog": [
    {
      "action": "treatment_given",
      "treatment": "oxygen",
      "category": "treatment",
      "timestamp": 1234567890,
      "elapsedTime": 2.1
    },
    {
      "action": "state_change_to_improving",
      "category": "state_change",
      "previousState": "initial",
      "newState": "improving",
      "timestamp": 1234567891,
      "elapsedTime": 6.3
    }
  ],

  "stateHistory": [
    {
      "state": "initial",
      "timestamp": 1234567889,
      "elapsedTime": 0,
      "vitals": { "HR": 130, "RR": 32, "SpO2": 88 }
    },
    {
      "state": "improving",
      "previousState": "initial",
      "timestamp": 1234567891,
      "elapsedTime": 6.3,
      "vitals": { "HR": 120, "RR": 28, "SpO2": 93 }
    }
  ],

  "treatmentTiming": {
    "oxygen": {
      "given": true,
      "timeGiven": 126,
      "withinTarget": true,
      "target": 180
    },
    "salbutamol": {
      "given": true,
      "timeGiven": 270,
      "withinTarget": true,
      "target": 300
    }
  },

  "scenarioSummary": {
    "completionTime": "12:00",
    "treatmentsGiven": 2,
    "dangerousActions": 0,
    "criticalMissed": 1,
    "overallOutcome": "Good - patient stabilized"
  }
}
```

**Key Metrics**:
- **performanceScore**: Overall score based on CDP evaluations
- **cdpEvaluations**: Array of evaluated critical decision points
- **medicationErrors**: Dangerous medications administered
- **criticalTreatments**: Key treatments given (scenario-specific)
- **actionsLog**: Timestamped log of all actions and events
- **stateHistory**: Patient state transitions with vitals
- **treatmentTiming**: Whether treatments met time targets

---

## AAR (After Action Review) Endpoints

### 5. Start AAR Session

**Endpoint**: `POST /api/sessions/:sessionId/aar/start`

**Description**: Initializes After Action Review session after completing 2 scenarios. Generates performance analysis and starts AAR Agent conversation.

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID |

**Request Body**: None

**Response** (200 OK):
```json
{
  "message": "Congratulations on completing your training session! You worked through two challenging emergency scenarios. Before we dive into the review, how do you feel about your performance overall?",
  "phase": "opening",
  "aarActive": true
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `message` | string | AAR Agent's opening message |
| `phase` | string | Current AAR phase: `opening`, `scenario_review`, `pattern_analysis`, `action_plan`, `closing` |
| `aarActive` | boolean | AAR session active status |

**Example**:
```javascript
const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/aar/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
console.log(data.message); // Opening AAR message
```

---

### 6. Send AAR Message

**Endpoint**: `POST /api/sessions/:sessionId/aar/message`

**Description**: Continues AAR conversation. Send student responses and receive feedback.

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID |

**Request Body**:
```json
{
  "message": "I think I did well on recognizing the severity, but I could have been faster with treatments."
}
```

**Response** (200 OK):
```json
{
  "message": "That's excellent self-awareness. You're absolutely right - you quickly identified the life-threatening asthma presentation within the first minute. Your assessment was thorough and systematic...",
  "phase": "scenario_review",
  "aarComplete": false
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `message` | string | AAR Agent's feedback |
| `phase` | string | Current AAR phase |
| `aarComplete` | boolean | Whether AAR is complete |

**AAR Phases**:
1. **opening**: Initial greeting and self-reflection
2. **scenario_review**: Scenario-by-scenario feedback (Sustains/Improves/Apply)
3. **pattern_analysis**: Cross-scenario pattern identification
4. **action_plan**: Future learning goals
5. **closing**: Summary and encouragement
6. **complete**: AAR finished

**AAR Completion**:
When `aarComplete: true`, the session is finished and the Session Complete screen should be shown.

---

### 7. Get AAR Status

**Endpoint**: `GET /api/sessions/:sessionId/aar/status`

**Description**: Check AAR session status and progress.

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID |

**Response** (200 OK):
```json
{
  "exists": true,
  "phase": "scenario_review",
  "isComplete": false,
  "messageCount": 6,
  "duration": 420
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `exists` | boolean | Whether AAR session exists |
| `phase` | string | Current AAR phase |
| `isComplete` | boolean | Whether AAR is complete |
| `messageCount` | number | Number of messages exchanged |
| `duration` | number | AAR duration in seconds |

---

## State Management

### Patient States

| State | Description | Typical Vitals |
|-------|-------------|----------------|
| `initial` | Patient's baseline presentation | SpO2: 88%, HR: 130, RR: 32 |
| `improving` | Responding to treatment | SpO2: 93-96%, HR: 110-120, RR: 22-26 |
| `deteriorating` | Worsening despite/without treatment | SpO2: 85-88%, HR: 135-145, RR: 34-38 |
| `critical` | Life-threatening, near-arrest | SpO2: <85%, HR: >145 or <60, RR: >38 or <10 |

### State Transition Rules

**From `initial`**:
- → `improving`: Both oxygen AND salbutamol given
- → `deteriorating`: No treatments after 5+ minutes

**From `improving`**:
- Stays improving with continued treatment
- → `deteriorating`: Dangerous medication given

**From `deteriorating`**:
- → `improving`: Late treatments given (may take longer)
- → `critical`: No treatments after 10+ minutes

**From `critical`**:
- → `improving`: Aggressive treatment (rare, slow recovery)
- Stays critical without intervention

### Auto-Deterioration

The system runs a background monitor every 30 seconds that evaluates patient state based on:
- Time elapsed since scenario start
- Treatments given
- Current state

Patients **will deteriorate** automatically if not treated, simulating real-world urgency.

---

## CDP Evaluation System

### CDP Rating Criteria

| Rating | Description | Score Impact |
|--------|-------------|--------------|
| `optimal` | Best practice, ideal timing/action | +10 points |
| `acceptable` | Correct action, slightly delayed | +7 points |
| `suboptimal` | Action taken but significantly delayed | +3 points |
| `dangerous` | Contraindicated or harmful action | -5 points |
| `not_performed` | Critical action not taken | 0 points |

### Example CDP: Bronchodilator Timing

**Time Window**: 0-10 minutes

**Criteria**:
- **Optimal**: Salbutamol given within 0-5 minutes
- **Acceptable**: Salbutamol given within 5-7 minutes
- **Suboptimal**: Salbutamol given within 7-10 minutes
- **Dangerous**: Wrong bronchodilator or contraindicated medication

---

## Challenge Points System

### Trigger Conditions

Challenge Points can be triggered by:
1. **Treatment trigger**: Specific treatment given (e.g., oxygen)
2. **Keyword trigger**: Vague language detected (e.g., "give meds")
3. **State trigger**: Patient reaches certain state (e.g., deteriorating)

### Challenge Structure

```json
{
  "challenge_id": "asthma_oxygen_delivery",
  "question": "Can you be more specific about oxygen delivery? What flow rate and delivery method?",
  "context": "Oxygen effectiveness varies greatly by delivery method",
  "trigger_on_treatment": ["oxygen"],
  "time_window": [0, 15],
  "expected_reasoning_elements": ["flow_rate", "delivery_method"]
}
```

### Evaluation

Student responses are evaluated for:
- **Good reasoning**: Demonstrates clinical thinking
- **Protocol only**: Recites protocol without understanding
- **Incomplete**: Partial answer
- **Off-topic**: Doesn't address question

### A/B Testing

Sessions can toggle Challenge Points via `challengePointsEnabled`:
- **Group A (Enabled)**: Receives Socratic questioning
- **Group B (Disabled)**: Standard training without challenges

This allows comparison of learning outcomes.

---

## Error Handling

### Common Error Responses

**404 Not Found**:
```json
{
  "error": "Session not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Error message describing the issue"
}
```

### Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Missing required fields |
| 404 | Not Found | Invalid session ID |
| 500 | Server Error | Server crash, database error |

---

## Rate Limiting

Currently no rate limiting (MVP). Production should implement:
- 100 requests per minute per session
- 10 concurrent sessions per IP

---

## Data Persistence

**Current (MVP)**: In-memory storage (data lost on server restart)
**Future**: PostgreSQL database for persistence

Sessions are stored in memory for the duration of the server process.

---

## Logging

Server logs include:
- Session initialization
- Treatment detection
- State changes
- CDP evaluations
- Challenge Point triggers
- AAR session events

**Example Log Output**:
```
🎓 Starting new session with Cognitive Coach
Challenge Points: ENABLED
✅ Treatment detected: oxygen at 2.1 minutes
[State Change] initial → improving at 06:18
🧠 Challenge Point Activated: asthma_oxygen_delivery
📊 Starting AAR for session: session_123
```

---

## Testing

### Running Backend Tests

```bash
cd server
node test-layer2.js
```

### Sample API Calls

**Using curl**:
```bash
# Start session
curl -X POST http://localhost:3001/api/sessions/start \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"asthma_mvp_001","challengePointsEnabled":true}'

# Send message
curl -X POST http://localhost:3001/api/sessions/session_123/message \
  -H "Content-Type: application/json" \
  -d '{"message":"I will apply high-flow oxygen"}'

# Get performance
curl http://localhost:3001/api/sessions/session_123/performance

# Start AAR
curl -X POST http://localhost:3001/api/sessions/session_123/aar/start

# Send AAR message
curl -X POST http://localhost:3001/api/sessions/session_123/aar/message \
  -H "Content-Type: application/json" \
  -d '{"message":"I think I did well overall"}'
```

---

## Future Enhancements

Planned for Layer 3:
- User authentication and authorization
- Session persistence to database
- Multi-user instructor dashboard
- Real-time session monitoring
- Advanced analytics and reporting
- Scenario builder UI

---

## Support

**Technical Issues**: Check server logs (`server/logs/`)
**Bug Reports**: GitHub Issues
**Documentation**: `/docs/`

---

**Document Version**: 2.0
**API Version**: Layer 2 MVP
**Last Updated**: December 2024
