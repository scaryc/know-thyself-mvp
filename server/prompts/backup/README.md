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

### 2. `core-agent-ami_v1_original.txt` (8.5K)
- **Purpose:** Core Agent (Patient Simulator) system prompt
- **Function:** Realistic patient simulation with dynamic physiological responses
- **Key Features:** Mandatory response structure, state-dependent communication, tool integration (update_vitals, reveal_patient_info)

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

- **v1 (Original):** Initial production prompts (backed up 2025-11-14)
- **v2 (Planned):** Communication style improvements based on recommendations

## Notes

- These backups are READ-ONLY for safety
- Do not modify files in this folder
- Always create new backups before major prompt changes
- Document version changes in this README
