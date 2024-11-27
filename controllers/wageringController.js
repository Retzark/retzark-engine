/**
 * Wagering Controller
 * Handles requests related to wagering.
 */

const wageringService = require('../services/wageringService');
const matchService = require("../services/matchService");

/**
 * Check
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const Check = async (req, res) => {
    const { player, matchId } = req.body;
    const result = await wageringService.Check(player, matchId);
    res.json(result);
};

/**
 * Bet
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const Bet = async (req, res) => {
    const { player, matchId, wagerAmount, signature } = req.body;
    const result = await wageringService.Bet(player, matchId, wagerAmount, signature);
    res.json(result);
};

/**
 * Call
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const Call = async (req, res) => {
    const { matchId, player, signature, betId } = req.body;
    const result = await wageringService.Call(matchId, player, signature, betId );
    res.json(result);
};

/**
 * Raise
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const Raise = async (req, res) => {
    const { matchId, player, signature, betId, raiseAmount } = req.body;
    const result = await wageringService.Raise(matchId, player, signature, betId, raiseAmount);
    res.json(result);
};

/**
 * Fold
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const Fold = async (req, res) => {
    const { matchId, playerId } = req.body;
    const result = await wageringService.Fold(matchId, playerId);
    res.json(result);
};

/**
 * Get Compliance Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getComplianceReport = async (req, res) => {
    const { startDate, endDate } = req.query;
    const report = await wageringService.generateComplianceReport(startDate, endDate);
    res.json(report);
};

/**
 * Get Match Wager Details
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const getMatchWagerDetails = async (req, res) => {
    const matchId = req.params.matchId;
    const matchDetails = await wageringService.getMatchWagerDetails(matchId);
    res.json(matchDetails.wager);
};

module.exports = { Check, Bet, Call, Raise, Fold, getComplianceReport, getMatchWagerDetails };
