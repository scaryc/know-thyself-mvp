/**
 * COMPONENT 4: Simplified Performance Tracker
 * 
 * Purpose: Track student actions against scenario checklist and calculate score
 * Approach: Match actions to checklist, score based on timing
 * 
 * Features:
 * - Record all student actions with timestamps
 * - Match actions to critical checklist items
 * - Calculate points (on-time = full points, late = 50%)
 * - Generate comprehensive AAR report
 */

class SimplifiedPerformanceTracker {
  constructor(scenario) {
    this.scenario = scenario;
    this.checklist = scenario.critical_actions_checklist || [];
    this.actionsCompleted = [];
    this.timeline = [];
    this.startTime = Date.now();
  }

  /**
   * Record a student action
   * @param {object} action - { type, name, details, timestamp }
   */
  recordAction(action) {
    const timestamp = action.timestamp || Date.now();
    const minutesMark = this.getElapsedMinutes(timestamp);

    // Add to timeline
    this.timeline.push({
      type: action.type,
      name: action.name,
      details: action.details || {},
      timestamp: timestamp,
      minutesMark: minutesMark
    });

    // Check if this action matches a checklist item
    const checklistMatch = this.findChecklistMatch(action.name);
    
    if (checklistMatch) {
      const onTime = minutesMark <= checklistMatch.time_target_minutes;
      
      this.actionsCompleted.push({
        checklistId: checklistMatch.id,
        action: checklistMatch.action,
        completedAt: timestamp,
        minutesMark: minutesMark,
        onTime: onTime,
        pointsEarned: this.calculatePoints(checklistMatch, onTime)
      });
    }
  }

  /**
   * Find matching checklist item
   */
  findChecklistMatch(actionName) {
    return this.checklist.find(item => {
      const itemKeywords = item.action.toLowerCase().split(' ');
      const actionLower = actionName.toLowerCase();
      
      // Match if action contains key words from checklist item
      return itemKeywords.some(keyword => actionLower.includes(keyword));
    });
  }

  /**
   * Calculate points for an action
   */
  calculatePoints(checklistItem, onTime) {
    if (onTime) {
      return checklistItem.points;
    } else {
      // Late = 50% of points
      return Math.floor(checklistItem.points * 0.5);
    }
  }

  /**
   * Calculate final score
   */
  calculateFinalScore() {
    let totalPossiblePoints = 0;
    let earnedPoints = 0;

    // Calculate points
    this.checklist.forEach(item => {
      totalPossiblePoints += item.points;
      
      const completed = this.actionsCompleted.find(
        a => a.checklistId === item.id
      );
      
      if (completed) {
        earnedPoints += completed.pointsEarned;
      }
    });

    const percentageScore = totalPossiblePoints > 0 
      ? Math.round((earnedPoints / totalPossiblePoints) * 100)
      : 0;

    return {
      overall_score: percentageScore,
      earned_points: earnedPoints,
      possible_points: totalPossiblePoints,
      performance_level: this.getPerformanceLevel(percentageScore),
      completed_actions: this.actionsCompleted,
      missed_actions: this.getMissedActions(),
      timeline: this.timeline
    };
  }

  /**
   * Get missed actions
   */
  getMissedActions() {
    return this.checklist.filter(item => 
      !this.actionsCompleted.find(a => a.checklistId === item.id)
    ).map(item => ({
      id: item.id,
      action: item.action,
      points_lost: item.points,
      importance: item.importance || 'standard'
    }));
  }

  /**
   * Get performance level description
   */
  getPerformanceLevel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Needs Improvement';
    return 'Unsatisfactory';
  }

  /**
   * Get detailed performance breakdown by category
   */
  getPerformanceBreakdown() {
    const categories = {};

    this.checklist.forEach(item => {
      const category = item.category || 'general';
      
      if (!categories[category]) {
        categories[category] = {
          total_points: 0,
          earned_points: 0,
          actions: []
        };
      }

      categories[category].total_points += item.points;
      categories[category].actions.push(item);

      const completed = this.actionsCompleted.find(
        a => a.checklistId === item.id
      );
      
      if (completed) {
        categories[category].earned_points += completed.pointsEarned;
      }
    });

    // Calculate percentage for each category
    Object.keys(categories).forEach(category => {
      const cat = categories[category];
      cat.percentage = cat.total_points > 0
        ? Math.round((cat.earned_points / cat.total_points) * 100)
        : 0;
    });

    return categories;
  }

  /**
   * Get elapsed minutes from start
   */
  getElapsedMinutes(timestamp = Date.now()) {
    return Math.floor((timestamp - this.startTime) / 60000);
  }

  /**
   * Generate comprehensive report for AAR
   */
  generateAARReport() {
    const finalScore = this.calculateFinalScore();
    const breakdown = this.getPerformanceBreakdown();

    return {
      summary: {
        overall_score: finalScore.overall_score,
        performance_level: finalScore.performance_level,
        total_actions: this.timeline.length,
        critical_actions_completed: this.actionsCompleted.length,
        critical_actions_missed: finalScore.missed_actions.length
      },
      
      score_breakdown: finalScore,
      
      category_performance: breakdown,
      
      timeline: this.timeline,
      
      strengths: this.identifyStrengths(finalScore, breakdown),
      
      areas_for_improvement: this.identifyImprovements(finalScore),
      
      critical_issues: this.identifyCriticalIssues(finalScore)
    };
  }

  /**
   * Identify student strengths
   */
  identifyStrengths(scoreData, breakdown) {
    const strengths = [];

    // Check for on-time critical actions
    const onTimeActions = this.actionsCompleted.filter(a => a.onTime);
    if (onTimeActions.length > 0) {
      strengths.push({
        area: 'Timeliness',
        description: `Completed ${onTimeActions.length} critical actions within target timeframes`
      });
    }

    // Check for high-performing categories
    Object.entries(breakdown).forEach(([category, data]) => {
      if (data.percentage >= 90) {
        strengths.push({
          area: category,
          description: `Excellent performance in ${category} (${data.percentage}%)`
        });
      }
    });

    return strengths;
  }

  /**
   * Identify areas needing improvement
   */
  identifyImprovements(scoreData) {
    const improvements = [];

    // Check missed critical actions
    scoreData.missed_actions.forEach(missed => {
      if (missed.importance === 'critical') {
        improvements.push({
          priority: 'high',
          action: missed.action,
          impact: `Missed critical action worth ${missed.points_lost} points`
        });
      }
    });

    // Check late actions
    const lateActions = this.actionsCompleted.filter(a => !a.onTime);
    if (lateActions.length > 0) {
      improvements.push({
        priority: 'moderate',
        action: 'Overall timing',
        impact: `${lateActions.length} actions completed late, reducing effectiveness`
      });
    }

    return improvements;
  }

  /**
   * Identify critical issues (safety violations, dangerous errors)
   */
  identifyCriticalIssues(scoreData) {
    // For MVP: placeholder for safety violation tracking
    // Full version would track dangerous actions
    return [];
  }
}

export default SimplifiedPerformanceTracker;