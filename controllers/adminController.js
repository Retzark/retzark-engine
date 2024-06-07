/**
 * Admin Controller
 * Handles requests related to admin functionalities.
 */

const adminService = require('../services/adminService');

/**
 * Get Admin Dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAdminDashboard = async (req, res) => {
    const dashboard = await adminService.provideAdminDashboard();
    res.json(dashboard);
};

/**
 * Generate Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateReport = async (req, res) => {
    const { startDate, endDate } = req.body;
    const report = await adminService.generateReports(startDate, endDate);
    res.json(report);
};

module.exports = { getAdminDashboard, generateReport };
