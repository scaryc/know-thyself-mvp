# Slovak (SK) Scenarios Upgrade Analysis

## Executive Summary

The Slovak scenario files are **V3.0 versions but missing critical V3.0 Enhanced features** that were added to the English scenarios. All 6 SK scenarios need substantial upgrades to match the current EN V3.0 Enhanced structure.

**Gap Size**: 167-258 lines missing per scenario
**Status**: SK scenarios are approximately 20-30% incomplete compared to EN versions

---

## File Size Comparison

| Scenario | EN Lines | SK Lines | Missing Lines | % Complete |
|----------|----------|----------|---------------|------------|
| Anaphylaxis / Anafylaxia | 902 | 696 | 206 | 77% |
| Asthma / Astma | 980 | 799 | 181 | 82% |
| Hemorrhagic Shock / Hemoragický šok | 789 | 584 | 205 | 74% |
| Opioid Overdose / Opioidové predávkovanie | 840 | 652 | 188 | 78% |
| Status Epilepticus | 866 | 699 | 167 | 81% |
| TBI | 850 | 592 | 258 | 70% |

**Average Completion**: 77% (23% of content missing)

---

## Critical Missing Features

### 1. ❌ Progress Milestones Section (HIGH PRIORITY)

**Status**: Completely absent from all SK scenarios

**What's Missing**:
```json
"progress_milestones": {
  "enabled": true,
  "tracking_mode": "silent",
  "display_mode": "progressive_reveal",
  "milestone_definitions": {
    "UM1": {
      "name": "Scene Safety Established",
      "description": "Initial approach and safety assessment completed"
    },
    "UM2": { ... },
    "UM3": { ... },
    "UM4": { ... },
    "UM5": { ... },
    "UM6": { ... }
  },
  "milestone_mappings": {
    "UM1": { "trigger_actions": ["CA1"] },
    "UM2": { "trigger_actions": ["CA2"] },
    ...
  }
}
```

**Impact**:
- Students using SK scenarios don't see milestone progression in AAR
- No positive reinforcement mechanism
- Inconsistent learning experience between EN and SK
- MilestoneTracker service won't function for SK scenarios

**SK Translation Needed**: Yes - all milestone names and descriptions need Slovak translation

---

### 2. ❌ Safety Gate Section (HIGH PRIORITY)

**Status**: Completely absent from all SK scenarios

**What's Missing**:
```json
"safety_gate": {
  "enabled": true,
  "tracking_mode": "silent",
  "interrupt_scenario": false,
  "critical_failures": [
    {
      "id": "SF1",
      "type": "omission",
      "description": "Critical action never performed",
      "detection_criteria": { ... },
      "severity": "critical",
      "teaching_point": "..."
    }
  ]
}
```

**Impact**:
- No safety gate validation for SK students
- Critical omissions (like never giving epinephrine in anaphylaxis) not tracked
- AAR feedback incomplete - won't mention critical safety failures
- Inconsistent assessment between EN and SK versions

**SK Translation Needed**: Yes - all safety gate descriptions and teaching points

---

### 3. ❌ Scenario States Section (MEDIUM PRIORITY)

**Status**: Completely absent from all SK scenarios

**What's Missing**:
```json
"scenario_states": {
  "initial": {
    "duration_minutes": 5,
    "auto_deteriorate": true,
    "deterioration_trigger": "time_based"
  },
  "early_deteriorating": { ... },
  "deteriorating": { ... },
  "critical": { ... },
  "improving": { ... },
  "stable": { ... }
}
```

**Impact**:
- Patient state progression timing might not work correctly
- Auto-deterioration behavior undefined for SK scenarios
- Fallback to default timing (might not match scenario design)

**SK Translation Needed**: Minimal - mostly numeric configuration

---

### 4. ⚠️  Inconsistent Importance Vocabulary (LOW PRIORITY)

**Current SK Terms Found**:
- `"kritické"` (critical) - 22 instances ✓
- `"dôležité"` (important) - 21 instances ✓
- `"nevyhnutné"` (essential) - 7 instances ✓
- `"podporné"/"podporná"` (supportive) - 2 instances ✓
- **Non-standard terms** (need fixing):
  - `"podmienečne_dôležité"` → should be `"dôležité"`
  - `"len_adjuvans"` → should be `"podporné"`
  - `"kritický_adjuvans"` → should be `"podporné"`
  - `"dôležité_sekundárne"` → should be `"dôležité"`
  - `"dôležité_ale_transport_priorita"` → should be `"dôležité"`
  - `"dôležité_adjuvans"` → should be `"podporné"`
  - `"ak_hypotenzia"` → should be `"dôležité"`

**Impact**: Same as EN - data inconsistency, but doesn't break functionality

---

## Detailed Issues by Scenario

### Status Epilepticus SK

**Missing Sections**:
1. ✗ `progress_milestones` (entire section)
2. ✗ `safety_gate` (entire section)
3. ✗ `scenario_states` (entire section)

**Potential Issues** (need to check if present after adding missing sections):
- May have CA4 duplicate in milestone_mappings (once section is added)
- Need to verify after adding progress_milestones section

**Lines Missing**: 167

---

### TBI SK

**Missing Sections**:
1. ✗ `progress_milestones` (entire section)
2. ✗ `safety_gate` (entire section)
3. ✗ `scenario_states` (entire section)

**Potential Issues**:
- May have UM2 multiple action ambiguity (once section is added)
- Need to verify after adding progress_milestones section

**Lines Missing**: 258 (largest gap - most incomplete)

---

### Anaphylaxis SK / Anafylaxia

**Missing Sections**:
1. ✗ `progress_milestones` (entire section)
2. ✗ `safety_gate` (entire section)
3. ✗ `scenario_states` (entire section)

**Importance vocabulary issues**: 3 non-standard terms

**Lines Missing**: 206

---

### Asthma SK / Astma

**Missing Sections**:
1. ✗ `progress_milestones` (entire section)
2. ✗ `safety_gate` (entire section)
3. ✗ `scenario_states` (entire section)

**Lines Missing**: 181

---

### Hemorrhagic Shock SK / Hemoragický šok

**Missing Sections**:
1. ✗ `progress_milestones` (entire section)
2. ✗ `safety_gate` (entire section)
3. ✗ `scenario_states` (entire section)

**Lines Missing**: 205

---

### Opioid Overdose SK / Opioidové predávkovanie

**Missing Sections**:
1. ✗ `progress_milestones` (entire section)
2. ✗ `safety_gate` (entire section)
3. ✗ `scenario_states` (entire section)

**Lines Missing**: 188

---

## Upgrade Strategy

### Option A: Full Manual Translation (Recommended for Quality)

**Process**:
1. For each EN scenario, extract the 3 missing sections
2. Translate all text content to Slovak:
   - Milestone names and descriptions
   - Safety gate failure descriptions
   - Teaching points
   - Error messages
3. Keep numeric values and structure identical
4. Insert translated sections into SK scenarios
5. Fix importance vocabulary
6. Validate JSON structure
7. Test with backend

**Estimated Effort**:
- Per scenario: 3-4 hours (translation + validation)
- Total for 6 scenarios: ~20-24 hours
- Requires Slovak language expertise

**Pros**:
- Highest quality
- Culturally appropriate translations
- Consistent terminology across all SK scenarios
- Full feature parity with EN

**Cons**:
- Time-consuming
- Requires bilingual expertise
- Manual process prone to errors

---

### Option B: Copy EN Sections + Targeted Translation

**Process**:
1. Copy entire `progress_milestones`, `safety_gate`, and `scenario_states` sections from EN
2. Keep structure and logic identical
3. Only translate user-facing text fields:
   - milestone names
   - milestone descriptions
   - safety gate teaching points
   - error descriptions
4. Use translation tool or service for speed
5. Manual review for quality
6. Fix importance vocabulary

**Estimated Effort**:
- Per scenario: 1.5-2 hours (copy + targeted translation)
- Total for 6 scenarios: ~10-12 hours

**Pros**:
- Faster implementation
- Guaranteed structural consistency
- Can use automated translation tools
- Easy to maintain sync with EN updates

**Cons**:
- May have less natural Slovak phrasing
- Requires quality review by Slovak speaker
- Some context might be lost in translation

---

### Option C: Hybrid Approach (Recommended for Balance)

**Process**:
1. **Copy structures from EN** for `scenario_states` (minimal translation needed)
2. **Machine translate + manual review** for `progress_milestones` (moderate text)
3. **Manual translation** for `safety_gate` (critical teaching content)
4. **Automated fix** for importance vocabulary (find-replace)
5. Comprehensive testing

**Estimated Effort**:
- Per scenario: 2-3 hours
- Total for 6 scenarios: ~15-18 hours

**Pros**:
- Balanced speed and quality
- Prioritizes translation effort where it matters most
- Maintains structural consistency
- Cost-effective

**Cons**:
- Still requires Slovak language expertise for review
- Mixed approach may feel inconsistent

---

## Implementation Plan (Recommended: Option C)

### Phase 1: Automated Structure Addition (Low Risk)
**Files**: All 6 SK scenarios

1. Copy `scenario_states` section from EN to SK (minimal translation)
2. Translate only state names:
   - `"initial"` → `"počiatočný"`
   - `"deteriorating"` → `"zhoršujúci_sa"`
   - `"critical"` → `"kritický"`
   - `"improving"` → `"zlepšujúci_sa"`
   - `"stable"` → `"stabilný"`

**Estimated Time**: 2 hours for all scenarios

---

### Phase 2: Progress Milestones (Medium Complexity)
**Files**: All 6 SK scenarios

1. Copy `progress_milestones` structure from EN
2. Translate milestone definitions:
   - Use standardized Slovak terminology
   - Maintain consistency across all scenarios
3. Copy `milestone_mappings` exactly (no translation needed - it's logic)
4. Apply bug fixes from EN:
   - Fix Status Epilepticus CA4 duplicate (UM5 should only have CA8)
   - Fix TBI UM2 to only have CA3

**Milestone Names Translation**:
- UM1: "Scene Safety Established" → "Zabezpečená bezpečnosť miesta"
- UM2: "Recognition Achieved" → "Rozpoznanie dosiahnuté"
- UM3: "Critical Intervention Initiated" → "Kritická intervencia začatá"
- UM4: "Airway Management Complete" → "Manažment dýchacích ciest dokončený"
- UM5: "Definitive Treatment Applied" → "Definitívna liečba aplikovaná"
- UM6: "Monitoring Established" → "Monitorovanie zavedené"

**Estimated Time**: 8 hours for all scenarios

---

### Phase 3: Safety Gate (High Priority for Quality)
**Files**: All 6 SK scenarios

1. Copy `safety_gate` structure from EN
2. **Manual translation** of all teaching points (critical content)
3. Translate failure descriptions
4. Keep detection criteria logic identical

**Critical Teaching Points Require Expert Translation**:
- These are core learning messages
- Must be culturally appropriate for Slovak medical education
- Should use proper Slovak medical terminology
- Requires subject matter expert review

**Estimated Time**: 10 hours for all scenarios

---

### Phase 4: Importance Vocabulary Standardization
**Files**: All 6 SK scenarios

**Automated Find-Replace**:
- `"podmienečne_dôležité"` → `"dôležité"`
- `"len_adjuvans"` → `"podporné"`
- `"kritický_adjuvans"` → `"podporné"`
- `"dôležité_sekundárne"` → `"dôležité"`
- `"dôležité_ale_transport_priorita"` → `"dôležité"`
- `"dôležité_adjuvans"` → `"podporné"`
- `"ak_hypotenzia"` → `"dôležité"`

**Estimated Time**: 1 hour for all scenarios

---

### Phase 5: Validation & Testing
**All SK scenarios**

1. Validate JSON syntax (automated)
2. Test each scenario loads correctly
3. Verify milestone tracking works
4. Verify safety gate triggers
5. Check state progression
6. AAR generation testing
7. End-to-end Slovak user flow

**Estimated Time**: 4 hours

---

## Total Estimated Effort

**Option C (Hybrid Approach)**:
- Phase 1: 2 hours
- Phase 2: 8 hours
- Phase 3: 10 hours
- Phase 4: 1 hour
- Phase 5: 4 hours
- **Total: 25 hours**

---

## Risks & Mitigation

### Risk 1: Translation Quality
**Mitigation**:
- Use professional translator or Slovak medical expert for Phase 3
- Have medical terminology reviewed by Slovak paramedic educator

### Risk 2: Structural Inconsistencies
**Mitigation**:
- Copy entire sections from EN (don't manually recreate)
- Use diff tools to verify structure matches

### Risk 3: Breaking Existing SK Scenarios
**Mitigation**:
- Create git branch for SK upgrades
- Test each scenario individually before committing
- Keep backup of original SK files

### Risk 4: Bug Propagation
**Mitigation**:
- Apply all EN bug fixes during translation
- Don't copy bugs from EN to SK
- Reference the fixed EN versions (post-bug-fix commit)

---

## Success Criteria

✅ All 6 SK scenarios have identical structure to EN scenarios
✅ All text content professionally translated to Slovak
✅ Milestone tracking works for SK scenarios
✅ Safety gate triggers correctly
✅ Importance vocabulary standardized
✅ All scenarios pass JSON validation
✅ End-to-end testing successful in Slovak language
✅ No degradation of existing SK scenario functionality

---

## Recommendation

**Proceed with Option C (Hybrid Approach)** for the best balance of:
- Speed (25 hours vs 24+ hours for full manual)
- Quality (manual translation for critical content)
- Maintainability (structural consistency with EN)
- Cost-effectiveness

**Critical Success Factor**: Engage a Slovak medical/paramedic educator to review safety gate teaching points and milestone descriptions to ensure they are:
- Medically accurate in Slovak
- Culturally appropriate
- Using correct Slovak medical terminology
- Pedagogically sound

---

## Next Steps

1. **Decision**: Choose upgrade approach (recommend Option C)
2. **Resource**: Identify Slovak translator/medical expert for Phase 3
3. **Backup**: Create git branch `sk-scenarios-v3-upgrade`
4. **Execute**: Implement phases sequentially
5. **Test**: Comprehensive validation
6. **Deploy**: Merge to main after testing
