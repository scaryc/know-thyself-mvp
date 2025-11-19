# Data Analysis Scripts

## Overview

Python scripts for extracting, analyzing, and visualizing student performance data from the Know Thyself platform.

## Requirements

- Python 3.8+
- Dependencies listed in `requirements.txt`

## Installation

```bash
# Navigate to scripts directory
cd scripts

# Create virtual environment (recommended)
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### 1. Extract and Analyze Data

```bash
python extract_student_data.py
```

**Inputs:**
- JSON files in `data/students/` directory

**Outputs:**
- `data/exports/student_data_analysis.xlsx` - Multi-sheet Excel workbook
- `data/exports/students_overview.csv` - Student overview data
- `data/exports/performance_metrics.csv` - Performance metrics
- `data/exports/scenario_performance.csv` - Scenario-level data
- `data/exports/critical_actions_timeline.csv` - Action timeline
- `data/exports/challenge_points_usage.csv` - Challenge points data
- `data/exports/ab_testing_report.txt` - Statistical analysis report

## Output File Descriptions

### Excel Workbook

**Sheet 1: Student Overview**
- student_id, name, email, A/B group
- Timestamps (registration, start, completion)
- Session metadata

**Sheet 2: Overall Performance**
- Performance scores and metrics
- CDP breakdown (optimal, acceptable, suboptimal, dangerous)
- Medication errors

**Sheet 3: Scenario Performance**
- Individual scenario results
- Duration, final state, final vitals

**Sheet 4: Critical Actions**
- Timeline of all student actions
- Action types, timestamps

**Sheet 5: Challenge Points**
- Challenge point usage (A/B testing key metric)

**Sheet 6: AAR Transcripts**
- Full AAR conversation history

**Sheet 7: AB Comparison**
- Statistical comparison between groups

### Statistical Report

Text file containing:
- Group comparison summary
- t-test results
- Effect size (Cohen's d)
- Statistical conclusions

## Workflow

### After Student Testing Session

1. **Wait for all students to complete**
   - All student data files should be in `data/students/` directory
   - Each file should have `sessionComplete: true`

2. **Run extraction script**
   ```bash
   cd scripts
   source venv/bin/activate  # if using virtual environment
   python extract_student_data.py
   ```

3. **Review outputs**
   - Open `data/exports/student_data_analysis.xlsx` in Excel
   - Review A/B testing report: `data/exports/ab_testing_report.txt`

4. **Import to statistical software (if needed)**

   **For SPSS:**
   ```
   File → Import Data → CSV Data Source
   Select: students_overview.csv
   ```

   **For R:**
   ```r
   students <- read.csv("data/exports/students_overview.csv")
   performance <- read.csv("data/exports/performance_metrics.csv")

   # A/B testing
   library(dplyr)
   t.test(overall_score ~ ab_group, data=performance)
   ```

   **For Python/Pandas:**
   ```python
   import pandas as pd
   students = pd.read_csv('data/exports/students_overview.csv')
   performance = pd.read_csv('data/exports/performance_metrics.csv')

   # Merge and analyze
   merged = students.merge(performance, on='student_id')
   print(merged.groupby('ab_group')['overall_score'].describe())
   ```

## Customization

Edit `extract_student_data.py` to:
- Add custom metrics
- Change statistical tests
- Modify export formats
- Add additional analyses

## Troubleshooting

### Error: No JSON files found
- Ensure student data files exist in `data/students/`
- Check file path in script (default: `../data/students`)

### Error: Missing dependencies
- Run `pip install -r requirements.txt`

### Error: Permission denied
- Close Excel files before running script
- Check write permissions in `data/exports/`

### Error: Module not found
- Activate virtual environment: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

## A/B Testing Analysis

The script performs comprehensive A/B testing analysis:

### Group A
- **Challenge Points enabled**
- Receives proactive hints and suggestions
- System provides strategic challenge points

### Group B
- **Standard feedback only**
- No challenge points system
- Traditional training approach

### Statistical Tests Performed

1. **Independent t-test**
   - Compares mean performance scores between groups
   - Tests for statistical significance (α = 0.05)

2. **Effect Size (Cohen's d)**
   - Measures practical significance
   - Interpretation:
     - < 0.2: Negligible
     - 0.2-0.5: Small
     - 0.5-0.8: Medium
     - > 0.8: Large

3. **Descriptive Statistics**
   - Mean, standard deviation, min, max for each group
   - Sample sizes
   - Completion rates

## Data Privacy

- Student data files contain identifying information
- Keep `data/students/` directory secure
- Do not commit student data to version control
- Share exports only with authorized research team

## Support

For questions or issues:
- Review troubleshooting section above
- Check script output for error messages
- Consult development plan: `docs/Session_Persistence_and_Database_DP.md`
