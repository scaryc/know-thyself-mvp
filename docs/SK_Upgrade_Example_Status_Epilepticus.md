# SK Scenario Upgrade Example: Status Epilepticus

## Practical Implementation Example

This document shows **exactly what needs to be added** to `status_epilepticus_v3_0_sk.json` to bring it to full V3.0 Enhanced parity with the English version.

---

## Section 1: progress_milestones

**Insert After**: `"secondary_medications_by_impact"` section
**Insert Before**: `"critical_actions_checklist"` section

```json
  "progress_milestones": {
    "enabled": true,
    "tracking_mode": "silent",
    "display_mode": "progressive_reveal",
    "display_location": "clinical_notes_panel",
    "milestone_definitions": {
      "UM1": {
        "name": "Miesto zabezpečené",
        "description": "Bezpečnosť miesta zaistená, BSI prijaté"
      },
      "UM2": {
        "name": "Núdzová situácia rozpoznaná",
        "description": "Primárny problém identifikovaný"
      },
      "UM3": {
        "name": "Dýchanie podporené",
        "description": "Intervencia dýchacích ciest/dýchania začatá"
      },
      "UM4": {
        "name": "Kritická liečba",
        "description": "Primárna život zachraňujúca liečba podaná"
      },
      "UM5": {
        "name": "Hodnotenie dokončené",
        "description": "ABCDE/SAMPLE/sekundárne vyšetrenie dokončené"
      },
      "UM6": {
        "name": "Monitorovanie zavedené",
        "description": "Prebiehajúce opätovné hodnotenie začaté"
      }
    },
    "milestone_mappings": {
      "UM1": { "trigger_actions": ["CA1"] },
      "UM2": { "trigger_actions": ["CA4"] },
      "UM3": { "trigger_actions": ["CA2", "CA3"] },
      "UM4": { "trigger_actions": ["CA5"] },
      "UM5": { "trigger_actions": ["CA8"] },
      "UM6": { "trigger_actions": ["CA7"] }
    }
  },
```

**Translation Notes**:
- "Scene Secured" → "Miesto zabezpečené"
- "Emergency Recognized" → "Núdzová situácia rozpoznaná"
- "Breathing Supported" → "Dýchanie podporené"
- "Critical Treatment" → "Kritická liečba"
- "Assessment Complete" → "Hodnotenie dokončené"
- "Monitoring Established" → "Monitorovanie zavedené"

**IMPORTANT BUG FIX APPLIED**:
- UM5 only has CA8 (not CA4+CA8 like old EN version had)
- This fixes the duplicate CA4 mapping bug

---

## Section 2: safety_gate

**Insert After**: `"progress_milestones"` section
**Insert Before**: `"scenario_states"` section

```json
  "safety_gate": {
    "enabled": true,
    "tracking_mode": "silent",
    "interrupt_scenario": false,
    "critical_failures": [
      {
        "id": "SF1",
        "type": "omission",
        "description": "Glykémia nikdy nekontrolovaná u diabetického pacienta s kŕčmi",
        "detection_criteria": {
          "condition": "scenario_end AND glucose_checked == false",
          "patient_state_required": "seizure_patient_diabetic_history"
        },
        "patient_outcome": "Hypoglykemické kŕče pokračujú neliečené. Pacient vyvinie trvalé neurologické poškodenie z dlhodobej neuroglykopenézie. Jednoduchá, reverzibilná príčina zmeškáná - pacient trpí poškodením mozgu z preventabilnej hypoglykémie.",
        "aar_teaching_point": "Kontrola glykémie v krvi je POVINNÁ u VŠETKÝCH pacientov s kŕčmi, najmä u tých s anamnézou diabetu. Hypoglykémia je najľahšie reverzibilná príčina kŕčov. Kontrola trvá 15 sekúnd a opravu s IV glukózou 2 minúty. Ak nekontrolujete, prídete o jedinú vec, ktorú môžete okamžite vyliečiť. Tento pacient mal kŕče z nízkej hladiny cukru v krvi - podajte glukózu a kŕče ihneď ustanú. Bez kontroly liečite naslepo a prehliadate reverzibilnú príčinu."
      },
      {
        "id": "SF2",
        "type": "commission",
        "description": "Benzodiazepín podaný BEZ predchádzajúcej kontroly glykémie",
        "detection_criteria": {
          "condition": "benzodiazepine_given == true AND glucose_checked == false"
        },
        "patient_outcome": "Benzodiazepín môže dočasne potlačiť kŕče, ale neliečí podkladovú hypoglykémiu. Kŕče sa môžu vrátiť, keď benzodiazepín prestane pôsobiť. Pacient je teraz sedovaný PLUS hypoglykemický - dvakrát ohrozený.",
        "aar_teaching_point": "Benzodiazepín potláča SYMPTÓM (kŕč), ale neliečí PRÍČINU (nízky cukor). Vždy najprv skontrolujte glykémiu pri kŕčoch. Ak je nízka, podajte glukózu ako primárnu liečbu. Benzodiazepín je záložný, nie prvá línia pri hypoglykemických kŕčoch. Liečte príčinu, nie len symptóm."
      },
      {
        "id": "SF3",
        "type": "omission",
        "description": "Glukóza nikdy nepodaná napriek dokumentovanej hypoglykémii",
        "detection_criteria": {
          "condition": "scenario_end AND glucose_low == true AND glucose_given == false"
        },
        "patient_outcome": "Kŕče pokračujú alebo sa opakujú, pretože príčina (hypoglykémia) ostáva neliečená. Mozog je zbavený glukózy po celú dobu trvania scenára, čo vedie k kumulatívnemu neurologickému poškodeniu. Pacient môže vyvinúť trvalé kognitívne poškodenie.",
        "aar_teaching_point": "Keď diagnostikujete hypoglykémiu (glukóza <3.5), podanie IV glukózy je URGENTNÉ. Nie je to 'jedna z vecí, ktoré treba urobiť' - je to TÁ vec, ktorú treba urobiť. Každá minúta oneskorenia je minúta preventabilného poškodenia mozgu. Hypoglykemické kŕče sa IHNEĎ zastavia po podaní glukózy - je to najbližšie k 'zázračnému lieku', aké máme v medicíne urgentných stavov."
      },
      {
        "id": "SF4",
        "type": "commission",
        "description": "Pokus vložiť orálnu vzduchovku alebo predmet do úst počas aktívnych kŕčov",
        "detection_criteria": {
          "condition": "oral_airway_during_seizure == true"
        },
        "patient_outcome": "Čeľuste sú stisnuté s nadľudskou silou. Pokus o vloženie čohokoľvek do úst vedie k zlomeniu zubov, poškodeniu mäkkých tkanív a potenciálnemu aspirovaniu. Žiadny benefit, len škoda.",
        "aar_teaching_point": "NIKDY nič nevkladajte do úst pacienta počas aktívnych kŕčov. Čeľuste sú zovreté neuveriteľnou silou - zlomíte zuby, nie pomôžete. Chráňte dýchacie cesty umiestnením na bok, odsatím sekrétov a aplikáciou kyslíka. Počkajte, kým kŕče ustanú, potom zvážte dýchacie cesty, ak je to potrebné. Poškodenie zubov nemá žiadnu terapeutickú hodnotu."
      }
    ]
  },
```

**Translation Quality Notes**:
- Medical terminology reviewed for Slovak paramedic education context
- Teaching points maintain urgency and directness of English version
- Uses informal "you" form (standard in Slovak medical education)
- Preserves critical emphasis (CAPITALS, urgency markers)

---

## Section 3: scenario_states

**Insert After**: `"safety_gate"` section
**Insert Before**: `"critical_actions_checklist"` section

```json
  "scenario_states": {
    "initial": {
      "duration_minutes": 5,
      "auto_deteriorate": true,
      "deterioration_trigger": "time_based",
      "deterioration_target": "early_deteriorating"
    },
    "early_deteriorating": {
      "duration_minutes": 4,
      "auto_deteriorate": true,
      "deterioration_trigger": "time_based",
      "deterioration_target": "deteriorating"
    },
    "deteriorating": {
      "duration_minutes": 4,
      "auto_deteriorate": true,
      "deterioration_trigger": "time_based",
      "deterioration_target": "critical"
    },
    "critical": {
      "duration_minutes": null,
      "auto_deteriorate": false,
      "requires_intervention": true
    },
    "improving": {
      "duration_minutes": 8,
      "auto_improve": true,
      "improvement_trigger": "glucose_corrected",
      "improvement_target": "stable"
    },
    "stable": {
      "duration_minutes": null,
      "auto_deteriorate": false,
      "maintain_state": true
    }
  },
```

**Translation Notes**:
- State names kept in English (internal logic references)
- No text content to translate (pure configuration)
- Timing values identical to EN version
- This section requires NO translation work

---

## Section 4: Importance Vocabulary Fixes

**Find and Replace in entire file**:

```json
// BEFORE → AFTER

"importance": "kritický_adjuvans"
→ "importance": "podporné"

"importance": "podmienečne_dôležité"
→ "importance": "dôležité"

// All other importance values are already standard
```

---

## Complete Implementation Instructions

### Step 1: Backup Original
```bash
cp scenarios/sk/status_epilepticus_v3_0_sk.json scenarios/sk/status_epilepticus_v3_0_sk.json.backup
```

### Step 2: Find Insert Location
Open `status_epilepticus_v3_0_sk.json` and locate line with:
```json
  "critical_actions_checklist": [
```

### Step 3: Insert Sections
**Insert BEFORE the `critical_actions_checklist` line**, in this order:
1. progress_milestones section (from above)
2. safety_gate section (from above)
3. scenario_states section (from above)

### Step 4: Fix Importance Vocabulary
Run find-replace for non-standard terms (see Section 4)

### Step 5: Validate JSON
```bash
cd scenarios/sk
python -m json.tool status_epilepticus_v3_0_sk.json > /dev/null && echo "✓ Valid JSON" || echo "✗ Invalid JSON"
```

### Step 6: Test Loading
```bash
cd server
node -e "const {loadScenario} = require('./utils/languageLoader.js'); const s = loadScenario('status_epilepticus_v3_0_sk', 'sk'); console.log('✓ Loaded:', s.metadata.title);"
```

---

## Expected Results After Upgrade

**Before Upgrade**:
- File size: 699 lines
- Missing 3 major sections
- No milestone tracking for SK users
- No safety gate validation
- Inconsistent importance terms

**After Upgrade**:
- File size: ~866 lines (matches EN)
- Full V3.0 Enhanced feature parity
- Milestone tracking works
- Safety gate triggers correctly
- Standardized vocabulary
- Full AAR feedback for SK students

---

## Verification Checklist

After implementing all changes:

- [ ] JSON validates correctly
- [ ] File loads without errors in backend
- [ ] progress_milestones section present with 6 milestones
- [ ] safety_gate section present with 4 critical failures
- [ ] scenario_states section present with 6 states
- [ ] All Slovak translations are grammatically correct
- [ ] Medical terminology is appropriate for SK paramedics
- [ ] Importance vocabulary uses only standard 4 terms
- [ ] Milestone mappings include bug fix (UM5 has only CA8)
- [ ] Teaching points maintain urgency and clarity

---

## Apply Same Process to Other 5 SK Scenarios

Once Status Epilepticus upgrade is validated, repeat the same process for:

1. **anafylaxia_v3_0_sk.json** - 206 lines to add
2. **astma_v3_0_sk.json** - 181 lines to add
3. **hemoragicky_sok_v3_0_sk.json** - 205 lines to add
4. **opioidove_predavkovanie_v3_0_sk.json** - 188 lines to add
5. **tbi_v3_0_sk.json** - 258 lines to add (includes UM2 bug fix)

Each scenario will have:
- Same 3 sections to add (progress_milestones, safety_gate, scenario_states)
- Same structure, different content
- Scenario-specific milestone names and safety gates
- Same process for validation and testing

---

## Notes for Translator

**Critical Translation Priorities**:

1. **Highest Priority** - Safety Gate Teaching Points
   - These are core learning messages
   - Must be medically accurate and persuasive
   - Should maintain urgency ("NIKDY", "POVINNÉ", "URGENTNÉ")
   - Review by Slovak medical educator recommended

2. **Medium Priority** - Milestone Names/Descriptions
   - Should be concise (2-4 words)
   - Must be clear to Slovak paramedic students
   - Maintain consistency across all 6 scenarios

3. **Low Priority** - scenario_states
   - Mostly configuration, minimal text
   - State names kept in English (system references)

**Slovak Medical Terminology Resources**:
- Use standard Slovak paramedic curriculum terms
- Consult Slovak EMS protocols for consistency
- Verify with Slovak medical dictionary for accuracy
