"""
Student Data Extraction and Analysis Script
Extracts data from JSON files and exports to research-ready formats
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class StudentDataExtractor:

    def __init__(self, data_dir='../data/students'):
        self.data_dir = Path(data_dir)
        self.students_data = []

    def load_all_students(self):
        """Load all student JSON files"""
        print("📂 Loading student data files...")

        json_files = list(self.data_dir.glob('*.json'))
        print(f"   Found {len(json_files)} student files")

        for file_path in json_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.students_data.append(data)
            except Exception as e:
                print(f"   ⚠️  Error loading {file_path.name}: {e}")

        print(f"✅ Loaded {len(self.students_data)} student records\n")
        return self.students_data

    def extract_student_overview(self):
        """Extract student overview data"""
        print("📊 Extracting student overview...")

        records = []
        for student in self.students_data:
            record = {
                'student_id': student.get('studentId'),
                'student_name': student.get('studentName'),
                'student_email': student.get('studentEmail'),
                'ab_group': student.get('group'),
                'registered_at': student.get('timestamps', {}).get('registered'),
                'session_started': student.get('timestamps', {}).get('sessionStarted'),
                'session_completed': student.get('timestamps', {}).get('sessionCompleted'),
                'total_duration': student.get('timestamps', {}).get('totalElapsed'),
                'scenarios_completed': student.get('metadata', {}).get('scenariosCompleted', 0),
                'total_messages': student.get('metadata', {}).get('totalMessages', 0),
                'challenge_points_enabled': student.get('metadata', {}).get('challengePointsEnabled', False),
                'session_complete': student.get('metadata', {}).get('sessionComplete', False)
            }
            records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} student overview records\n")
        return df

    def extract_overall_performance(self):
        """Extract overall performance metrics"""
        print("📊 Extracting overall performance...")

        records = []
        for student in self.students_data:
            perf = student.get('performance', {})
            breakdown = perf.get('breakdown', {})

            record = {
                'student_id': student.get('studentId'),
                'overall_score': perf.get('overallScore', 0),
                'performance_level': perf.get('interpretation', ''),
                'optimal_decisions': breakdown.get('optimal', 0),
                'acceptable_decisions': breakdown.get('acceptable', 0),
                'suboptimal_decisions': breakdown.get('suboptimal', 0),
                'dangerous_decisions': breakdown.get('dangerous', 0),
                'total_cdps': perf.get('totalCDPs', 0),
                'medication_errors': len(student.get('metadata', {}).get('medicationErrors', [])),
                'critical_actions_count': len(student.get('criticalActions', []))
            }
            records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} performance records\n")
        return df

    def extract_scenario_performance(self):
        """Extract scenario-level performance data"""
        print("📊 Extracting scenario-level performance...")

        records = []
        for student in self.students_data:
            student_id = student.get('studentId')
            scenarios = student.get('scenarios', [])

            for idx, scenario in enumerate(scenarios):
                record = {
                    'student_id': student_id,
                    'scenario_number': idx + 1,
                    'scenario_id': scenario.get('scenarioId'),
                    'scenario_title': scenario.get('scenarioTitle'),
                    'duration': scenario.get('duration'),
                    'final_state': scenario.get('finalState'),
                    'final_hr': scenario.get('finalVitals', {}).get('heartRate'),
                    'final_rr': scenario.get('finalVitals', {}).get('respiratoryRate'),
                    'final_spo2': scenario.get('finalVitals', {}).get('spO2')
                }
                records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} scenario performance records\n")
        return df

    def extract_critical_actions_timeline(self):
        """Extract critical actions timeline"""
        print("📊 Extracting critical actions timeline...")

        records = []
        for student in self.students_data:
            student_id = student.get('studentId')
            actions = student.get('criticalActions', [])

            for action in actions:
                record = {
                    'student_id': student_id,
                    'action_type': action.get('action'),
                    'action_name': action.get('name', ''),
                    'timestamp': action.get('timestamp'),
                    'details': str(action.get('details', {}))
                }
                records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} critical action records\n")
        return df

    def extract_challenge_points_usage(self):
        """Extract challenge points usage (A/B testing key metric)"""
        print("📊 Extracting challenge points usage...")

        records = []
        for student in self.students_data:
            student_id = student.get('studentId')
            group = student.get('group')
            challenge_points = student.get('challengePoints', [])

            for idx, cp in enumerate(challenge_points):
                record = {
                    'student_id': student_id,
                    'ab_group': group,
                    'challenge_number': idx + 1,
                    'challenge_text': cp.get('text', ''),
                    'timestamp': cp.get('timestamp'),
                    'context': cp.get('context', '')
                }
                records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} challenge point records\n")
        return df

    def extract_aar_transcripts(self):
        """Extract AAR conversation transcripts"""
        print("📊 Extracting AAR transcripts...")

        records = []
        for student in self.students_data:
            student_id = student.get('studentId')
            aar = student.get('aarTranscript', [])

            for idx, message in enumerate(aar):
                record = {
                    'student_id': student_id,
                    'message_number': idx + 1,
                    'role': message.get('role'),
                    'content': message.get('content', ''),
                    'timestamp': message.get('timestamp')
                }
                records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} AAR messages\n")
        return df


class DataAnalyzer:

    def __init__(self, students_df, performance_df, scenarios_df):
        self.students_df = students_df
        self.performance_df = performance_df
        self.scenarios_df = scenarios_df

    def ab_group_comparison(self):
        """Compare Group A vs Group B performance"""
        print("📊 Performing A/B group comparison...")

        # Merge student and performance data
        merged = self.students_df.merge(
            self.performance_df,
            on='student_id',
            how='inner'
        )

        if len(merged) == 0:
            print("⚠️  No data to compare")
            return pd.DataFrame()

        # Group statistics
        comparison = merged.groupby('ab_group').agg({
            'student_id': 'count',
            'overall_score': ['mean', 'std', 'min', 'max'],
            'total_cdps': 'mean',
            'optimal_decisions': 'mean',
            'medication_errors': 'sum',
            'scenarios_completed': 'mean'
        }).round(2)

        comparison.columns = ['_'.join(col).strip() for col in comparison.columns.values]

        print(f"✅ A/B comparison complete\n")
        return comparison

    def calculate_statistics(self):
        """Calculate statistical tests (t-test, effect size)"""
        print("📊 Calculating statistical tests...")

        from scipy import stats

        # Merge data
        merged = self.students_df.merge(
            self.performance_df,
            on='student_id',
            how='inner'
        )

        if len(merged) < 2:
            print("⚠️  Not enough data for statistical tests")
            return {}

        # Split by group
        group_a = merged[merged['ab_group'] == 'A']['overall_score'].dropna()
        group_b = merged[merged['ab_group'] == 'B']['overall_score'].dropna()

        if len(group_a) == 0 or len(group_b) == 0:
            print("⚠️  One or both groups have no data")
            return {}

        # T-test
        t_stat, p_value = stats.ttest_ind(group_a, group_b)

        # Effect size (Cohen's d)
        mean_diff = group_a.mean() - group_b.mean()
        pooled_std = np.sqrt((group_a.std()**2 + group_b.std()**2) / 2)
        cohens_d = mean_diff / pooled_std if pooled_std > 0 else 0

        results = {
            'group_a_mean': group_a.mean(),
            'group_a_std': group_a.std(),
            'group_a_n': len(group_a),
            'group_b_mean': group_b.mean(),
            'group_b_std': group_b.std(),
            'group_b_n': len(group_b),
            't_statistic': t_stat,
            'p_value': p_value,
            'cohens_d': cohens_d,
            'significant': p_value < 0.05
        }

        print(f"✅ Statistical analysis complete")
        print(f"   t-statistic: {t_stat:.3f}")
        print(f"   p-value: {p_value:.4f}")
        print(f"   Cohen's d: {cohens_d:.3f}")
        print(f"   Significant: {'Yes' if results['significant'] else 'No'}\n")

        return results


class DataExporter:

    def __init__(self, output_dir='../data/exports'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_to_excel(self, dataframes, filename='student_data_analysis.xlsx'):
        """Export all dataframes to multi-sheet Excel workbook"""
        print(f"📝 Exporting to Excel: {filename}")

        output_path = self.output_dir / filename

        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            for sheet_name, df in dataframes.items():
                if not df.empty:
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    print(f"   ✅ Sheet '{sheet_name}': {len(df)} rows")
                else:
                    print(f"   ⚠️  Sheet '{sheet_name}': No data")

        print(f"✅ Excel file saved: {output_path}\n")
        return output_path

    def export_to_csv(self, dataframes):
        """Export each dataframe to separate CSV file"""
        print(f"📝 Exporting to CSV files...")

        for name, df in dataframes.items():
            if not df.empty:
                filename = f"{name}.csv"
                output_path = self.output_dir / filename
                df.to_csv(output_path, index=False, encoding='utf-8')
                print(f"   ✅ {filename}: {len(df)} rows")

        print(f"✅ CSV files saved to: {self.output_dir}\n")

    def export_statistical_report(self, stats, ab_comparison, filename='ab_testing_report.txt'):
        """Generate human-readable statistical report"""
        print(f"📝 Generating statistical report...")

        output_path = self.output_dir / filename

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("KNOW THYSELF PLATFORM - A/B TESTING STATISTICAL REPORT\n")
            f.write("=" * 80 + "\n\n")

            f.write("GENERATED: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + "\n\n")

            f.write("-" * 80 + "\n")
            f.write("1. GROUP COMPARISON SUMMARY\n")
            f.write("-" * 80 + "\n\n")
            if not ab_comparison.empty:
                f.write(ab_comparison.to_string())
            else:
                f.write("No data available for comparison\n")
            f.write("\n\n")

            if stats:
                f.write("-" * 80 + "\n")
                f.write("2. STATISTICAL SIGNIFICANCE TEST (Independent t-test)\n")
                f.write("-" * 80 + "\n\n")

                f.write(f"Group A (Challenge Points Enabled):\n")
                f.write(f"  N = {stats['group_a_n']}\n")
                f.write(f"  Mean Score = {stats['group_a_mean']:.2f}\n")
                f.write(f"  Std Dev = {stats['group_a_std']:.2f}\n\n")

                f.write(f"Group B (Standard Feedback):\n")
                f.write(f"  N = {stats['group_b_n']}\n")
                f.write(f"  Mean Score = {stats['group_b_mean']:.2f}\n")
                f.write(f"  Std Dev = {stats['group_b_std']:.2f}\n\n")

                f.write(f"Test Results:\n")
                f.write(f"  t-statistic = {stats['t_statistic']:.4f}\n")
                f.write(f"  p-value = {stats['p_value']:.4f}\n")
                f.write(f"  Significant at α=0.05? {'YES' if stats['significant'] else 'NO'}\n\n")

                f.write("-" * 80 + "\n")
                f.write("3. EFFECT SIZE ANALYSIS (Cohen's d)\n")
                f.write("-" * 80 + "\n\n")

                f.write(f"Cohen's d = {stats['cohens_d']:.3f}\n\n")

                effect_interpretation = ""
                d = abs(stats['cohens_d'])
                if d < 0.2:
                    effect_interpretation = "Negligible effect"
                elif d < 0.5:
                    effect_interpretation = "Small effect"
                elif d < 0.8:
                    effect_interpretation = "Medium effect"
                else:
                    effect_interpretation = "Large effect"

                f.write(f"Interpretation: {effect_interpretation}\n\n")

                f.write("-" * 80 + "\n")
                f.write("4. CONCLUSIONS\n")
                f.write("-" * 80 + "\n\n")

                mean_diff = stats['group_a_mean'] - stats['group_b_mean']

                if stats['significant']:
                    f.write(f"✅ SIGNIFICANT DIFFERENCE DETECTED\n\n")
                    f.write(f"Challenge Points (Group A) associated with a ")
                    f.write(f"{abs(mean_diff):.2f} point ")
                    f.write(f"{'improvement' if mean_diff > 0 else 'decrease'} ")
                    f.write(f"in performance (p={stats['p_value']:.4f}).\n\n")
                    f.write(f"Effect size: {effect_interpretation}\n\n")
                else:
                    f.write(f"⚠️  NO SIGNIFICANT DIFFERENCE DETECTED\n\n")
                    f.write(f"No statistically significant difference found between groups ")
                    f.write(f"(p={stats['p_value']:.4f}).\n\n")
                    f.write(f"Further research with larger sample size may be needed.\n\n")

            f.write("=" * 80 + "\n")

        print(f"✅ Statistical report saved: {output_path}\n")
        return output_path


def main():
    """Main execution function"""
    print("\n" + "=" * 80)
    print("KNOW THYSELF - STUDENT DATA EXTRACTION & ANALYSIS")
    print("=" * 80 + "\n")

    # Step 1: Extract data
    extractor = StudentDataExtractor(data_dir='../data/students')
    extractor.load_all_students()

    if len(extractor.students_data) == 0:
        print("❌ No student data found. Exiting.")
        return

    students_df = extractor.extract_student_overview()
    performance_df = extractor.extract_overall_performance()
    scenarios_df = extractor.extract_scenario_performance()
    actions_df = extractor.extract_critical_actions_timeline()
    challenge_df = extractor.extract_challenge_points_usage()
    aar_df = extractor.extract_aar_transcripts()

    # Step 2: Analyze data
    analyzer = DataAnalyzer(students_df, performance_df, scenarios_df)
    ab_comparison = analyzer.ab_group_comparison()
    statistics = analyzer.calculate_statistics()

    # Step 3: Export data
    exporter = DataExporter(output_dir='../data/exports')

    # Export to Excel (multi-sheet workbook)
    excel_data = {
        'Student Overview': students_df,
        'Overall Performance': performance_df,
        'Scenario Performance': scenarios_df,
        'Critical Actions': actions_df,
        'Challenge Points': challenge_df,
        'AAR Transcripts': aar_df,
        'AB Comparison': ab_comparison
    }
    exporter.export_to_excel(excel_data)

    # Export to CSV (separate files)
    csv_data = {
        'students_overview': students_df,
        'performance_metrics': performance_df,
        'scenario_performance': scenarios_df,
        'critical_actions_timeline': actions_df,
        'challenge_points_usage': challenge_df
    }
    exporter.export_to_csv(csv_data)

    # Export statistical report
    exporter.export_statistical_report(statistics, ab_comparison)

    print("\n" + "=" * 80)
    print("✅ DATA EXTRACTION AND ANALYSIS COMPLETE!")
    print("=" * 80 + "\n")
    print(f"📊 Total students analyzed: {len(students_df)}")
    print(f"📊 Total scenarios: {len(scenarios_df)}")
    print(f"📊 Total critical actions: {len(actions_df)}")
    print(f"\n📁 Output files saved to: data/exports/\n")


if __name__ == '__main__':
    main()
