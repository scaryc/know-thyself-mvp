/**
 * Milestone Tracker - V3.0 Performance Assessment System
 *
 * Purpose: Track progress milestones (UM1-UM6) during scenario execution
 *
 * Design Principles:
 * - Silent tracking - NEVER mention milestones to student during scenario
 * - Positive-only reinforcement - Used for acknowledgment in AAR, never criticism
 * - Universal milestones - Same 6 milestones across all scenarios
 * - Progressive reveal UI - Milestones appear ONLY when completed
 */

class MilestoneTracker {
  /**
   * Initialize milestone tracker with scenario blueprint
   * @param {Object} scenarioBlueprint - Full scenario blueprint containing progress_milestones section
   */
  constructor(scenarioBlueprint) {
    if (!scenarioBlueprint.progress_milestones || !scenarioBlueprint.progress_milestones.enabled) {
      this.enabled = false;
      this.milestones = {};
      this.mappings = {};
      return;
    }

    this.enabled = true;
    this.milestones = this._initializeMilestones(scenarioBlueprint.progress_milestones.milestone_definitions);
    this.mappings = scenarioBlueprint.progress_milestones.milestone_mappings;
    this.scenarioStartTime = Date.now();
  }

  /**
   * Initialize milestone data structure
   * @private
   */
  _initializeMilestones(definitions) {
    const milestones = {};

    for (const [milestoneId, definition] of Object.entries(definitions)) {
      milestones[milestoneId] = {
        id: milestoneId,
        name: definition.name,
        description: definition.description,
        completed: false,
        timestamp: null,
        timestampMinutes: null
      };
    }

    return milestones;
  }

  /**
   * Check if an action triggers any milestones and mark as completed
   * Called by ScenarioEngine after each student action
   *
   * @param {string} actionId - Critical action ID (e.g., "CA1", "CA2")
   * @returns {Object|null} - Completed milestone object if triggered, null otherwise
   */
  checkAction(actionId) {
    if (!this.enabled) return null;

    for (const [milestoneId, mapping] of Object.entries(this.mappings)) {
      if (mapping.trigger_actions.includes(actionId)) {
        const milestone = this.completeMilestone(milestoneId);
        if (milestone) {
          return milestone;
        }
      }
    }

    return null;
  }

  /**
   * Mark a milestone as completed
   * @param {string} milestoneId - Milestone ID (e.g., "UM1", "UM2")
   * @returns {Object|null} - Completed milestone object if newly completed, null if already completed
   */
  completeMilestone(milestoneId) {
    if (!this.enabled) return null;

    const milestone = this.milestones[milestoneId];

    if (!milestone) {
      console.warn(`[MilestoneTracker] Unknown milestone ID: ${milestoneId}`);
      return null;
    }

    // Don't mark as completed if already completed
    if (milestone.completed) {
      return null;
    }

    // Mark as completed with timestamp
    const now = Date.now();
    const elapsedMinutes = (now - this.scenarioStartTime) / 1000 / 60;

    milestone.completed = true;
    milestone.timestamp = now;
    milestone.timestampMinutes = parseFloat(elapsedMinutes.toFixed(2));

    console.log(`[MilestoneTracker] Milestone completed: ${milestone.id} (${milestone.name}) at ${elapsedMinutes.toFixed(2)} minutes`);

    return {
      id: milestone.id,
      name: milestone.name,
      description: milestone.description,
      timestampMinutes: milestone.timestampMinutes,
      timestampFormatted: this._formatTimestamp(milestone.timestampMinutes)
    };
  }

  /**
   * Format timestamp for UI display (MM:SS)
   * @private
   */
  _formatTimestamp(minutes) {
    const totalSeconds = Math.floor(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get all milestones with their completion status
   * Used for UI updates and AAR data
   *
   * @returns {Array} - Array of milestone objects
   */
  getAllMilestones() {
    if (!this.enabled) return [];

    return Object.values(this.milestones).map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      completed: m.completed,
      timestamp: m.timestampMinutes,
      timestampFormatted: m.completed ? this._formatTimestamp(m.timestampMinutes) : null
    }));
  }

  /**
   * Get only completed milestones (for progressive reveal UI)
   *
   * @returns {Array} - Array of completed milestone objects
   */
  getCompletedMilestones() {
    if (!this.enabled) return [];

    return Object.values(this.milestones)
      .filter(m => m.completed)
      .map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        timestamp: m.timestampMinutes,
        timestampFormatted: this._formatTimestamp(m.timestampMinutes)
      }));
  }

  /**
   * Get completion summary for AAR
   *
   * @returns {Object} - Summary statistics
   */
  getSummary() {
    if (!this.enabled) {
      return {
        enabled: false,
        totalMilestones: 0,
        completed: 0,
        completionRate: 0,
        milestones: []
      };
    }

    const allMilestones = Object.values(this.milestones);
    const completedCount = allMilestones.filter(m => m.completed).length;

    return {
      enabled: true,
      totalMilestones: allMilestones.length,
      completed: completedCount,
      completionRate: allMilestones.length > 0 ? (completedCount / allMilestones.length) : 0,
      milestones: this.getAllMilestones(),
      systematicApproach: completedCount >= 5 // At least 5 of 6 milestones suggests systematic approach
    };
  }

  /**
   * Get AAR-friendly description of completed milestones for positive reinforcement
   * Used by AAR Agent for acknowledgment
   *
   * @returns {string} - Human-readable description
   */
  getAARDescription() {
    if (!this.enabled) return null;

    const completed = this.getCompletedMilestones();

    if (completed.length === 0) {
      return null; // Don't provide negative feedback - milestones are positive-only
    }

    if (completed.length === 6) {
      return "You followed a systematic approach throughout the scenario, completing all progress milestones: scene safety, recognition, breathing support, critical treatment, assessment, and monitoring. This structure will serve you well in chaotic real-world situations.";
    }

    if (completed.length >= 4) {
      const completedNames = completed.map(m => m.name.toLowerCase()).join(", ");
      return `I noticed you followed a systematic approach through several key stages: ${completedNames}. This organized progression helps ensure nothing critical is missed.`;
    }

    // Less than 4 - acknowledge what was done without criticism
    const completedNames = completed.slice(0, 3).map(m => m.name.toLowerCase()).join(", ");
    return `You completed several important steps including ${completedNames}.`;
  }

  /**
   * Reset all milestones (for testing or scenario restart)
   */
  reset() {
    if (!this.enabled) return;

    for (const milestone of Object.values(this.milestones)) {
      milestone.completed = false;
      milestone.timestamp = null;
      milestone.timestampMinutes = null;
    }

    this.scenarioStartTime = Date.now();
  }
}

module.exports = MilestoneTracker;
