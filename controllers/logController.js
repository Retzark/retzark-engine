/**
 * Log Controller
 * Handles requests related to logging and system health monitoring.
 */

const logService = require('../services/logService');

/**
 * Log Match Event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logMatchEvent = async (req, res) => {
    const { matchId, event } = req.body;
    const result = await logService.logMatchEvents(matchId, event);
    res.json(result);
};

/**
 * Monitor Health
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const monitorHealth = async (req, res) => {
    const healthStatus = await logService.monitorSystemHealth();
    res.json(healthStatus);
};

module.exports = { logMatchEvent, monitorHealth };
