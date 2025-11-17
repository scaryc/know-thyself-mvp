# Agent Prompt Backups

This folder contains original versions of all agent prompts before implementing communication style improvements.

## Backup Date
**Created:** 2025-11-14

## Files Backed Up

### 1. `cognitiveCoachAgent_v1_original.txt` (20K)
- **Purpose:** Cognitive Coach Agent system prompt
- **Function:** Prepares students for scenarios with challenge-based warm-up questions
- **Duration:** 2-5 minutes
- **Key Features:** Question pool integration, mental organization technique, transition to Core Agent

### 2. Core Agent (Patient Simulator) Versions

#### `core-agent-ami_v1_original.txt` (8.5K) - ✅ WORKING VERSION
- **Status:** Original production prompt - KNOWN TO WORK
- **Lines:** 172
- **Function:** Realistic patient simulation with dynamic physiological responses
- **Key Features:** Simple mandatory response structure, state-dependent communication, tool integration
- **Perspective:** Third-person narration for physical observations, first-person only in quoted dialogue
- **Notes:** This version works correctly with clinical notes and maintains proper perspective

#### `core-agent-ami_v2_simplified.txt` (11K) - ⚠️ ATTEMPTED FIX
- **Status:** Simplified version with information disclosure boundaries
- **Lines:** 211
- **Changes from v1:** Added section on what to reveal without assessment (pupil findings fix)
- **Result:** Still had perspective violations - NOT WORKING
- **Created:** 2025-11-17 during perspective fix attempts

#### `core-agent-ami_v3_bloated.txt` (19K) - ❌ FAILED VERSION
- **Status:** Over-engineered with verbose perspective reinforcement
- **Lines:** 443
- **Changes from v1:** Added multiple WRONG examples, checklists, reinforcement sections throughout
- **Result:** Paradoxically caused MORE violations due to prompt bloat - WORSE THAN v2
- **Created:** 2025-11-17 during perspective fix attempts
- **Lesson:** More instructions ≠ better performance. Prompt bloat confuses the model.

### 3. `aarAgent_v1_original.txt` (24K)
- **Purpose:** AAR (After Action Review) Agent system prompt
- **Function:** Post-scenario performance review and feedback
- **Structure:** 5-phase conversation (Opening, Scenario Review, Pattern Analysis, Action Plan, Closing)
- **Key Features:** Sustains/Improves/Apply framework, pattern-based analysis, data-driven feedback

## Why These Backups Exist

These backups were created before implementing recommendations from:
- `docs/agent-communication-style-recommendations.md`

The recommendations include:
- Making scripts more flexible and natural
- Replacing emojis with professional text markers
- Adding personality modifiers to patient communication
- Improving error recovery messaging

## Rollback Instructions

If changes to agent prompts cause issues, revert by:

```bash
# Restore all prompts
cp server/prompts/backup/cognitiveCoachAgent_v1_original.txt server/prompts/cognitiveCoachAgent.txt
cp server/prompts/backup/core-agent-ami_v1_original.txt server/prompts/core-agent-ami.txt
cp server/prompts/backup/aarAgent_v1_original.txt server/prompts/aarAgent.txt

# Commit the rollback
git add server/prompts/*.txt
git commit -m "Rollback agent prompts to v1 originals"
git push
```

Or restore individual prompts as needed.

## Version History

### Core Agent Versions
- **v1 (Original - 2025-11-14):** Initial production prompt - 172 lines ✅ WORKING
- **v2 (Simplified - 2025-11-17):** Added information disclosure boundaries - 211 lines ⚠️ FAILED
- **v3 (Bloated - 2025-11-17):** Over-engineered with excessive reinforcement - 443 lines ❌ WORSE

**Current active version:** v1 (reverted on 2025-11-17)

### Other Agents
- **v1 (Original):** Initial production prompts (backed up 2025-11-14)
- **v2 (Planned):** Communication style improvements based on recommendations

## Notes

- These backups are READ-ONLY for safety
- Do not modify files in this folder
- Always create new backups before major prompt changes
- Document version changes in this README
