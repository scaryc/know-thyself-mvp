# Know Thyself - Instructor Guide

**Emergency Medical Training Platform - Layer 2 MVP**

This guide provides instructors with comprehensive information on how to deploy, configure, monitor, and leverage Know Thyself for paramedic student training.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Setup & Deployment](#setup--deployment)
3. [Training Flow](#training-flow)
4. [Features & Configuration](#features--configuration)
5. [Monitoring Student Performance](#monitoring-student-performance)
6. [A/B Testing Guide](#ab-testing-guide)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [Future Roadmap](#future-roadmap)

---

## Platform Overview

### What is Know Thyself?

Know Thyself is an AI-powered training platform that provides paramedic students with realistic emergency scenarios, real-time feedback, and structured performance reviews.

### Layer 2 MVP Features

**Core Training Flow**:
1. **Cognitive Coach**: Pre-scenario warm-up (2-5 min)
2. **Emergency Scenarios**: 3 sequential scenarios (10-20 min each)
3. **AAR Agent**: Structured performance review (10-15 min)
4. **Session Complete**: Summary and reset

**Advanced Features**:
- **State Progression**: Patient condition changes dynamically
- **Auto-Deterioration**: Patients worsen without treatment
- **CDP Evaluation**: Critical Decision Point tracking and scoring
- **Medication Safety**: Detects dangerous medications
- **Challenge Points**: Optional Socratic questioning (A/B testing ready)
- **Comprehensive Performance Data**: Timestamped action logs, vitals history, timing analysis

### Educational Philosophy

Know Thyself emphasizes:
- **Active Learning**: Students make real decisions
- **Immediate Feedback**: Patient responds in real-time
- **Reflective Practice**: Cognitive Coach + AAR promote metacognition
- **Mistake-Friendly**: Safe environment to learn from errors
- **Evidence-Based**: CDP evaluation based on clinical guidelines

---

## Setup & Deployment

### System Requirements

**Server**:
- Node.js 18+
- 4GB RAM minimum
- 10GB disk space

**Client (Student Machines)**:
- Modern browser (Chrome, Firefox, Safari, Edge)
- 1280x720 resolution minimum
- Stable internet connection

### Installation

#### 1. Clone Repository
```bash
git clone <repository-url>
cd know-thyself-mvp
```

#### 2. Install Dependencies
```bash
# Backend
cd server
npm install

# Frontend
cd ../know-thyself-frontend
npm install
```

#### 3. Configure Environment
Create `server/.env`:
```
ANTHROPIC_API_KEY=your_api_key_here
PORT=3001
```

#### 4. Start Server
```bash
cd server
npm start
```

Server will start on `http://localhost:3001`

#### 5. Start Frontend
```bash
cd know-thyself-frontend
npm run dev
```

Frontend will start on `http://localhost:5173`

### Deployment for Classroom

**Option A: Single Instructor Machine**
- Run both server and frontend on one machine
- Students access via `http://instructor-machine-ip:5173`
- Good for small classes (5-10 students)

**Option B: Dedicated Server**
- Deploy server on dedicated machine/VM
- Students access from their own devices
- Better for larger classes (10+ students)

**Option C: Cloud Deployment**
- Deploy to cloud provider (AWS, Azure, Heroku)
- Students access via URL
- Best for remote learning

### Network Configuration

Ensure firewall allows:
- Port 3001 (API server)
- Port 5173 (Frontend)

---

## Training Flow

### Overview

Each student session follows this structure:

```
START
  ↓
Cognitive Coach (2-5 min)
  ↓
Scenario 1 (10-20 min)
  ↓
Scenario 2 (10-20 min)
  ↓
Scenario 3 (10-20 min)
  ↓
AAR Agent (10-15 min)
  ↓
Session Complete
```

### Phase Descriptions

#### 1. Cognitive Coach (2-5 minutes)
**Purpose**: Activate clinical reasoning before scenarios

**What Happens**:
- Student answers 2-3 metacognitive questions
- Questions randomly selected from question bank
- No "right" answers - encourages reflection

**Example Questions**:
- "What factors do you consider when prioritizing treatments in a multi-trauma patient?"
- "How do you approach diagnostic uncertainty in the field?"

**Instructor Note**: This phase prepares students for more thoughtful scenario management.

#### 2. Emergency Scenarios (30-60 minutes total)
**Purpose**: Practice clinical skills in realistic emergencies

**What Happens**:
- 2 scenarios randomly selected from pool of 4
- Each scenario: different patient, emergency, clinical presentation
- Students assess, treat, monitor patient
- Timer starts at 00:00, min completion 10:00, auto-complete at 20:00

**Scenarios Available (MVP)**:
1. **ASTHMA_MVP_001**: Life-threatening asthma exacerbation
2. **STEMI_MVP_001**: ST-Elevation Myocardial Infarction
3. **SEIZURE_MVP_001**: Status epilepticus
4. **TBI_MVP_001**: Traumatic brain injury

**Dynamic Elements**:
- Vitals update every 5 seconds
- Patient state changes based on treatments
- Auto-deterioration if not treated
- CDP evaluation at critical moments

#### 3. AAR Agent (10-15 minutes)
**Purpose**: Structured performance review

**AAR Structure**:
1. **Opening**: Student self-reflection
2. **Scenario Review**: Sustains/Improves/Apply for each scenario
3. **Pattern Analysis**: Cross-scenario themes
4. **Action Plan**: Future learning goals
5. **Closing**: Summary and encouragement

**Instructor Note**: AAR is evidence-based, referencing specific actions, timestamps, and vitals from the session.

#### 4. Session Complete
**Purpose**: Clean end to session

**What Happens**:
- Completion confirmation
- Option to start new session
- (Future: performance summary, certificate)

---

## Features & Configuration

### Critical Decision Points (CDPs)

CDPs are key moments where student decisions significantly impact outcomes.

**How It Works**:
1. Each scenario has 3-5 CDPs defined
2. CDPs have time windows and trigger conditions
3. System evaluates student actions
4. Assigns rating: Optimal, Acceptable, Suboptimal, Dangerous

**Example CDP**: Bronchodilator Timing (Asthma)
- **Time Window**: 0-10 minutes
- **Optimal**: Salbutamol within 5 minutes
- **Acceptable**: Salbutamol within 5-7 minutes
- **Suboptimal**: Salbutamol within 7-10 minutes
- **Dangerous**: Wrong medication or no bronchodilator

**Instructor Configuration**:
Edit scenario JSON files in `/scenarios/` to:
- Add new CDPs
- Adjust time windows
- Modify rating criteria
- Update feedback messages

### State Progression

Patients change condition dynamically based on treatments and time.

**States**:
- **Initial**: Baseline presentation
- **Improving**: Responding to treatment
- **Deteriorating**: Worsening (no treatment or wrong treatment)
- **Critical**: Life-threatening

**Transition Rules** (Example: Asthma):
- Initial → Improving: Oxygen + Salbutamol given
- Initial → Deteriorating: No treatment after 5+ minutes
- Deteriorating → Critical: No treatment after 10+ minutes

**Auto-Deterioration**:
Background process checks patient state every 30 seconds. Patients WILL worsen if not treated, simulating real urgency.

**Instructor Note**: Teaches students that emergency medicine is time-sensitive.

### Challenge Points (Socratic Questioning)

Optional feature that prompts students to explain their clinical reasoning.

**Example**:
- Student: "Give oxygen"
- Challenge: "Can you be more specific? What flow rate and delivery method?"
- Student: "High-flow oxygen at 15 L/min via non-rebreather because SpO2 is 88%"

**Configuration**:
Toggle per session via API or globally in scenario files.

**A/B Testing Ready**:
- Group A: Challenge Points enabled
- Group B: Challenge Points disabled
- Compare learning outcomes

**Limits**:
- Maximum 2 challenges per scenario
- Must be within time window
- Won't trigger if student already being specific

**Instructor Decision**: Enable for students who need to develop deeper thinking, disable for protocol-focused training.

### Medication Safety

System detects dangerous medications and impacts patient condition.

**How It Works**:
1. Student types: "Give diazepam"
2. System checks scenario's `dangerous_medications` list
3. Detects "diazepam" (respiratory depressant)
4. Patient condition worsens
5. Logged as medication error
6. Mentioned in AAR

**Instructor Configuration**:
Edit scenario files to add/remove dangerous medications.

Example:
```json
"dangerous_medications": [
  {
    "medication": "Diazepam",
    "keywords": ["diazepam", "valium", "benzodiazepine"],
    "reason": "May worsen respiratory depression in asthma",
    "severity": "high"
  }
]
```

### Vitals Polling

Vitals auto-update every 5 seconds during scenarios.

**Why**: Students don't need to ask "check vitals" - monitor updates automatically like a real vitals monitor.

**Instructor Note**: Teaches students to continuously monitor, not just check vitals once.

---

## Monitoring Student Performance

### Accessing Performance Data

**Current (MVP)**:
Performance data is available via API endpoint:
```
GET /api/sessions/:sessionId/performance
```

Use browser dev tools or API client (Postman, curl) to retrieve.

**Future (Layer 3)**:
Instructor dashboard with:
- Live session monitoring
- Historical performance data
- Class analytics
- Individual student tracking

### Key Performance Metrics

**Per Session**:
1. **Overall Score**: Based on CDP ratings
2. **CDP Evaluations**: List of critical decisions with ratings
3. **Treatment Timing**: Whether treatments met time targets
4. **Medication Errors**: Dangerous medications given
5. **State Progression**: How patient responded
6. **Actions Log**: Timestamped list of all actions
7. **Final Outcome**: Patient state at scenario end

### Example Performance Report

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
      "cdp_title": "Bronchodilator Timing",
      "rating": "optimal",
      "explanation": "Salbutamol given within 5 minutes"
    }
  ],

  "medicationErrors": [],

  "treatmentTiming": {
    "oxygen": {
      "given": true,
      "timeGiven": 126,
      "withinTarget": true
    }
  }
}
```

### Interpreting Results

**Excellent Performance (>85%)**:
- All CDPs optimal or acceptable
- Timely treatments
- No medication errors
- Patient improved

**Good Performance (70-85%)**:
- Most CDPs acceptable
- Some delays in treatment
- No dangerous errors
- Patient stabilized

**Needs Improvement (<70%)**:
- Multiple suboptimal CDPs
- Significant treatment delays
- Medication errors
- Patient deteriorated

### Providing Feedback

**AAR Agent Handles Most Feedback**, but instructors can:
1. Review performance data
2. Identify patterns across multiple sessions
3. Provide supplemental teaching
4. Adjust training focus

---

## A/B Testing Guide

### Purpose

Challenge Points A/B testing allows you to compare learning outcomes between two groups:
- **Group A**: Socratic questioning enabled
- **Group B**: Standard training (no questioning)

### Setting Up A/B Testing

#### Option 1: Random Assignment
Modify `server/index.js` line 68-73:
```javascript
const challengePointsEnabled = Math.random() < 0.5; // 50/50 split
```

#### Option 2: Manual Assignment
Have students use different URLs:
- Group A: `?challenges=enabled`
- Group B: `?challenges=disabled`

Then modify frontend to pass this to API.

#### Option 3: Instructor Control
Create instructor interface to toggle per student.

### Data Collection

For each student, collect:
1. **Group Assignment**: A or B
2. **Performance Score**: From performance report
3. **Time to Complete**: Total session time
4. **CDP Ratings**: Distribution of optimal/acceptable/suboptimal
5. **Student Feedback**: Post-session survey

### Analysis Metrics

**Primary Outcome**:
- Performance score difference between groups

**Secondary Outcomes**:
- CDP quality distribution
- Treatment timing
- Student engagement (qualitative)
- Perceived learning value (survey)

### Sample Size

For statistical significance:
- Minimum: 20 students per group (40 total)
- Recommended: 30 students per group (60 total)

### Hypothesis

**H1**: Students with Challenge Points (Group A) will have:
- Higher performance scores
- More "optimal" CDP ratings
- Better clinical reasoning (qualitative)

**H0**: No significant difference between groups

---

## Troubleshooting

### Common Issues

#### Issue: Server won't start
**Symptoms**: Error on `npm start`
**Causes**:
- Missing API key
- Port 3001 already in use
- Dependencies not installed

**Solutions**:
```bash
# Check .env file exists with ANTHROPIC_API_KEY
cat server/.env

# Check port availability
lsof -i :3001

# Reinstall dependencies
cd server && npm install
```

#### Issue: Students can't connect
**Symptoms**: "Cannot connect to server"
**Causes**:
- Server not running
- Firewall blocking ports
- Wrong URL

**Solutions**:
- Verify server is running
- Check firewall settings
- Provide correct IP/URL

#### Issue: Vitals not updating
**Symptoms**: Vitals frozen
**Causes**:
- API polling failing
- Server overloaded

**Solutions**:
- Check browser console for errors
- Restart server
- Reduce concurrent users

#### Issue: AAR not starting
**Symptoms**: Stuck after scenario 3
**Causes**:
- API key limit reached
- Server error

**Solutions**:
- Check server logs
- Verify API key is valid
- Check Anthropic API status

#### Issue: Patient not responding to treatments
**Symptoms**: Vitals don't improve
**Causes**:
- Wrong treatment given
- Patient too deteriorated
- State progression bug

**Solutions**:
- Verify correct treatment was given
- Check patient state in performance data
- Review server logs for state changes

### Debugging Tools

**Server Logs**:
Monitor console output:
```bash
cd server
npm start
# Watch for errors, state changes, treatment detection
```

**Browser Dev Tools**:
- Console: Check for JavaScript errors
- Network: Verify API calls succeeding
- Application: Check session storage

**API Testing**:
Test endpoints directly:
```bash
# Get performance data
curl http://localhost:3001/api/sessions/SESSION_ID/performance
```

---

## Best Practices

### For Instructors

**Before Training**:
1. Test system with sample session
2. Verify all scenarios load correctly
3. Prepare student orientation (15 min)
4. Distribute USER_GUIDE.md
5. Set expectations for session duration

**During Training**:
1. Monitor student progress (walk around lab)
2. Don't interrupt unless technical issue
3. Observe but don't give answers
4. Note common struggles for group debrief

**After Training**:
1. Review performance data
2. Group debrief (20-30 min)
3. Address common mistakes
4. Reinforce AAR teaching points
5. Collect student feedback

### For Students

**Orient Students On**:
1. Total time commitment (60-90 min)
2. Need for uninterrupted time
3. Importance of being specific with treatments
4. How to interpret vitals
5. Purpose of Challenge Questions
6. AAR is for learning, not grading

**Set Expectations**:
- Mistakes are okay
- Patients will deteriorate if not treated
- Focus on learning, not score
- AAR feedback is personalized

### Classroom Integration

**Standalone Training**:
- Students complete independently
- Review performance in 1-on-1 meetings

**Lab Session**:
- All students train simultaneously
- Group debrief after
- Compare approaches

**Flipped Classroom**:
- Students train as homework
- Class time for discussion and advanced scenarios

**Assessment**:
- Use as formative assessment (feedback)
- Not recommended for summative grading (MVP limitations)

---

## Future Roadmap

### Layer 3 (Planned)

**Instructor Dashboard**:
- Real-time session monitoring
- Historical data visualization
- Class analytics
- Export reports

**Enhanced Scenarios**:
- 10+ scenarios
- Multi-patient scenarios
- Team-based scenarios

**Advanced Features**:
- Voice interaction
- VR/AR integration
- Skill tracking over time
- Adaptive difficulty

**Assessment Tools**:
- Competency tracking
- Certification preparation
- Skill gap analysis

---

## Scenario Management

### Current Scenarios (MVP)

Located in `/scenarios/` directory:

1. **ASTHMA_MVP_001.json**: Life-threatening asthma
2. **STEMI_MVP_001.json**: ST-elevation MI
3. **SEIZURE_MVP_001.json**: Status epilepticus
4. **TBI_MVP_001.json**: Traumatic brain injury

### Scenario Structure

Each scenario JSON file contains:
- **metadata**: ID, title, description
- **dispatch_info**: Initial call information
- **patient_demographics**: Age, gender, name
- **initial_vitals**: Starting vital signs
- **state_descriptions**: What student sees in each state
- **state_vitals**: Vitals for each patient state
- **critical_decision_points**: CDPs with evaluation criteria
- **challenge_points**: Socratic questions (if enabled)
- **dangerous_medications**: Meds to avoid
- **aar_teaching_points**: Key concepts for AAR

### Creating Custom Scenarios

To add a new scenario:

1. Copy existing scenario file
2. Rename to `YOUR_SCENARIO_ID.json`
3. Update all fields
4. Test thoroughly
5. Document CDPs clearly

**Instructor Tip**: Start with modified versions of existing scenarios before creating entirely new ones.

---

## Data Privacy & Ethics

### Current (MVP)
- No student authentication
- Sessions stored in memory only
- No persistent user data
- No identifiable information collected

### Best Practices
- Inform students data is collected
- Use session data for educational purposes only
- Don't share individual performance publicly
- Aggregate data for research

### Future Considerations
- User authentication
- Data persistence
- Privacy policy
- FERPA compliance (if used in formal education)

---

## Support & Resources

### Documentation
- **USER_GUIDE.md**: For students
- **API_LAYER2.md**: Technical API reference
- **testingplan.md**: Testing procedures
- **Layer_2_MVP_Development_Plan.md**: Feature specifications

### Technical Support
- GitHub Issues: Bug reports
- Server Logs: Error diagnostics
- Browser Console: Frontend errors

### Community
- Instructor forum (coming soon)
- Best practices sharing
- Scenario exchange

---

## Conclusion

Know Thyself Layer 2 MVP provides paramedic students with realistic, engaging training that combines active learning with personalized feedback. As an instructor, you can leverage this platform to supplement hands-on training, assess student progress, and identify areas for focused teaching.

**Remember**:
- Orient students properly
- Monitor performance data
- Use AAR feedback for teaching
- Iterate and improve based on student outcomes

**Questions? Feedback?**
Contact the development team or review documentation in `/docs/`.

---

**Document Version**: 1.0
**Last Updated**: December 2024
**For**: Paramedic Instructors and Training Coordinators
