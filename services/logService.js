/**
 * Log Service
 * Handles logging of match events and system health monitoring.
 */

const Log = require('../models/Log');

const logMatchEvents = async (matchId, event) => {
    const log = await Log.findOne({ matchId });
    if (log) {
        log.events.push(event);
        await log.save();
    } else {
        await Log.create({ matchId, events: [event] });
    }
    return { success: true };
};

const monitorSystemHealth = async () => {
    // Implementation of monitoring system health
    return { status: 'Healthy' };
};

module.exports = { logMatchEvents, monitorSystemHealth };
