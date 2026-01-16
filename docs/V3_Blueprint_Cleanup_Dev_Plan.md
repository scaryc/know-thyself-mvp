# Claude Code Development Plan: V3 Blueprint Cleanup

**Document Purpose:** Step-by-step instructions for fixing minor inconsistencies in V3 scenario blueprints  
**Target:** Claude Code or developer  
**Estimated Time:** 15-30 minutes  
**Files Affected:** 6 scenario JSON files

---

## Issue 1: Remove Deprecated Fields from `critical_actions_checklist`

### Problem Description
Old V2 fields (`time_target_minutes`, `points`) still exist alongside new V3 `competence_assessment` structure. Per V3 Implementation Guide, these deprecated fields should be removed.

### Files to Modify
- `anaphylaxis_v3_0.json`
- `asthma_v3_0.json`
- `hemorrhagic_shock_v3_0.json`
- `opioid_overdose_v3_0.json`
- `status_epilepticus_v3_0.json`
- `tbi_v3_0.json`

### Action Required
```
FOR EACH scenario file:
  FIND all objects in "critical_actions_checklist" array
  REMOVE these fields if present:
    - "time_target_minutes"
    - "points"
  KEEP all other fields including:
    - "id"
    - "action"
    - "category"
    - "importance"
    - "criteria"
    - "matching"
    - "competence_assessment"
    - "dosing"
    - "assessment_data_required"
```

### Example Transformation

**BEFORE:**
```json
{
  "id": "CA3",
  "action": "Administer epinephrine IM",
  "category": "treatment",
  "time_target_minutes": 3,
  "points": 35,
  "importance": "critical",
  "criteria": "0.5mg IM into lateral thigh",
  "matching": { ... },
  "competence_assessment": { ... }
}
```

**AFTER:**
```json
{
  "id": "CA3",
  "action": "Administer epinephrine IM",
  "category": "treatment",
  "importance": "critical",
  "criteria": "0.5mg IM into lateral thigh",
  "matching": { ... },
  "competence_assessment": { ... }
}
```

---

## Issue 2: Fix Status Epilepticus Milestone Mappings

### Problem Description
In `status_epilepticus_v3_0.json`, the milestone mappings have issues:
1. UM2 (Emergency Recognized) and UM5 (Assessment Complete) both map to CA4
2. UM6 includes CA8 which should be part of assessment

### File to Modify
- `status_epilepticus_v3_0.json` (ONLY this file)

### Reference: Critical Actions in Status Epilepticus
| ID | Action |
|----|--------|
| CA1 | Scene safety |
| CA2 | Position patient safely |
| CA3 | Apply oxygen |
| CA4 | Check blood glucose |
| CA5 | Administer glucose |
| CA6 | Administer benzodiazepine if needed |
| CA7 | Monitor respiratory status |
| CA8 | Reassess glucose |

### Current (Incorrect) Mapping
```json
"milestone_mappings": {
  "UM1": { "trigger_actions": ["CA1"] },
  "UM2": { "trigger_actions": ["CA4"] },
  "UM3": { "trigger_actions": ["CA2", "CA3"] },
  "UM4": { "trigger_actions": ["CA5"] },
  "UM5": { "trigger_actions": ["CA4"] },
  "UM6": { "trigger_actions": ["CA7", "CA8"] }
}
```

### Corrected Mapping
```json
"milestone_mappings": {
  "UM1": { "trigger_actions": ["CA1"] },
  "UM2": { "trigger_actions": ["CA4"] },
  "UM3": { "trigger_actions": ["CA2", "CA3"] },
  "UM4": { "trigger_actions": ["CA5"] },
  "UM5": { "trigger_actions": ["CA4", "CA8"] },
  "UM6": { "trigger_actions": ["CA7"] }
}
```

### Rationale for Changes
| Milestone | Name | Mapping | Rationale |
|-----------|------|---------|-----------|
| UM1 | Scene Secured | CA1 | No change needed |
| UM2 | Emergency Recognized | CA4 | Correct - glucose check reveals hypoglycemia as cause |
| UM3 | Breathing Supported | CA2, CA3 | No change needed |
| UM4 | Critical Treatment | CA5 | No change needed |
| UM5 | Assessment Complete | CA4, CA8 | **Changed** - includes initial AND reassessment glucose |
| UM6 | Monitoring Established | CA7 | **Changed** - respiratory monitoring only, CA8 moved to UM5 |

---

## Execution Checklist

### Phase 1: Remove Deprecated Fields (All 6 Files)

- [ ] Open `anaphylaxis_v3_0.json`
  - [ ] Remove all `time_target_minutes` fields from `critical_actions_checklist`
  - [ ] Remove all `points` fields from `critical_actions_checklist`
  - [ ] Verify JSON syntax valid
  - [ ] Save file

- [ ] Open `asthma_v3_0.json`
  - [ ] Remove all `time_target_minutes` fields from `critical_actions_checklist`
  - [ ] Remove all `points` fields from `critical_actions_checklist`
  - [ ] Verify JSON syntax valid
  - [ ] Save file

- [ ] Open `hemorrhagic_shock_v3_0.json`
  - [ ] Remove all `time_target_minutes` fields from `critical_actions_checklist`
  - [ ] Remove all `points` fields from `critical_actions_checklist`
  - [ ] Verify JSON syntax valid
  - [ ] Save file

- [ ] Open `opioid_overdose_v3_0.json`
  - [ ] Remove all `time_target_minutes` fields from `critical_actions_checklist`
  - [ ] Remove all `points` fields from `critical_actions_checklist`
  - [ ] Verify JSON syntax valid
  - [ ] Save file

- [ ] Open `status_epilepticus_v3_0.json`
  - [ ] Remove all `time_target_minutes` fields from `critical_actions_checklist`
  - [ ] Remove all `points` fields from `critical_actions_checklist`
  - [ ] Verify JSON syntax valid
  - [ ] Save file

- [ ] Open `tbi_v3_0.json`
  - [ ] Remove all `time_target_minutes` fields from `critical_actions_checklist`
  - [ ] Remove all `points` fields from `critical_actions_checklist`
  - [ ] Verify JSON syntax valid
  - [ ] Save file

### Phase 2: Fix Milestone Mappings (Status Epilepticus Only)

- [ ] In `status_epilepticus_v3_0.json`:
  - [ ] Locate `progress_milestones.milestone_mappings`
  - [ ] Change UM5 from `{ "trigger_actions": ["CA4"] }` to `{ "trigger_actions": ["CA4", "CA8"] }`
  - [ ] Change UM6 from `{ "trigger_actions": ["CA7", "CA8"] }` to `{ "trigger_actions": ["CA7"] }`
  - [ ] Verify JSON syntax valid
  - [ ] Save file

### Phase 3: Validation

- [ ] Run JSON linter on all 6 files
- [ ] Verify no `time_target_minutes` exists in any `critical_actions_checklist`
- [ ] Verify no `points` exists in any `critical_actions_checklist`
- [ ] Verify all `competence_assessment` structures remain intact
- [ ] Verify milestone mappings in status_epilepticus have no duplicates

---

## Validation Script (Optional)

```python
import json
import os

files = [
    "anaphylaxis_v3_0.json",
    "asthma_v3_0.json", 
    "hemorrhagic_shock_v3_0.json",
    "opioid_overdose_v3_0.json",
    "status_epilepticus_v3_0.json",
    "tbi_v3_0.json"
]

for filename in files:
    with open(filename, 'r') as f:
        data = json.load(f)
    
    # Check for deprecated fields
    for action in data.get("critical_actions_checklist", []):
        assert "time_target_minutes" not in action, f"{filename}: Found time_target_minutes in {action['id']}"
        assert "points" not in action, f"{filename}: Found points in {action['id']}"
    
    print(f"✓ {filename} validated successfully")

print("\nAll files passed validation!")
```

---

## Summary of Changes

| File | Deprecated Fields Removed | Milestone Mapping Fixed |
|------|---------------------------|------------------------|
| anaphylaxis_v3_0.json | Yes | N/A |
| asthma_v3_0.json | Yes | N/A |
| hemorrhagic_shock_v3_0.json | Yes | N/A |
| opioid_overdose_v3_0.json | Yes | N/A |
| status_epilepticus_v3_0.json | Yes | Yes |
| tbi_v3_0.json | Yes | N/A |

---

**Document Version:** 1.0  
**Created:** January 2025  
**Author:** Paramedic Master Development Team
