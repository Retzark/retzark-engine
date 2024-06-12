const fs = require('fs');
const mongoose = require('mongoose');
const Match = require('../models/Match'); // Adjust the path as necessary
const RetReward = require('../models/RetReward'); // Adjust the path as necessary
require('dotenv').config({ path: '../.env' });

// Initial setup
let initialTotalDailyPool = 1000000;
const decayRate = 0.001; // 0.1%
const rankWeights = {
    'rookie1': 0.33,
    'rookie2': 0.66,
    'rookie3': 1,
    'adept1': 1.33,
    'adept2': 1.66,
    'adept3': 2,
    'expert1': 2.33,
    'expert2': 2.66,
    'expert3': 3,
    'master1': 3.33,
    'master2': 3.66,
    'master3': 4,
    'grandmaster1': 4.33,
    'grandmaster2': 4.66,
    'grandmaster3': 5,
    'champion1': 5.33,
    'champion2': 5.66,
    'champion3': 6,
    'legend1': 6.33,
    'legend2': 6.66,
    'legend3': 7,
    'myth1': 7.33,
    'myth2': 7.66,
    'myth3': 8,
    'transcendent': 10
};
const ranks = Object.keys(rankWeights);

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Function to get matches for the last week and calculate average matches per day
const getAverageMatchesPerDay = async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const matchesLastWeek = await Match.find({ createdAt: { $gte: oneWeekAgo } });
    const totalMatches = matchesLastWeek.length;
    return totalMatches / 7;
};

// Function to calculate tokens per win
const calculateRetPerWin = (rank, totalDailyPool, maxReward, dailyMatchesPerRank) => {
    console.log('Calculating RET per win for', rank);
    console.log('Daily matches per rank:', dailyMatchesPerRank);
    const totalWeight = Object.values(rankWeights).reduce((acc, weight) => acc + weight, 0);
    const tokensAllocatedToRank = (rankWeights[rank] / totalWeight) * totalDailyPool;
    console.log('RET allocated to', rank, ':', tokensAllocatedToRank);
    const tokensPerWin = Math.min(tokensAllocatedToRank / (100), maxReward);
    console.log('RET per win for', rank, ':', tokensPerWin);
    return tokensPerWin;
};

// Function to calculate all tokens per win
const calculateAllRetPerWin = (totalDailyPool, dailyMatchesPerRank) => {
    const results = {};
    for (const rank of ranks) {
        const maxReward = 100 * rankWeights[rank];
        results[rank] = calculateRetPerWin(rank, totalDailyPool, maxReward, dailyMatchesPerRank);
    }
    return results;
};

// Function to save results to the database
const saveResultsToDatabase = async (results) => {
    await RetReward.deleteMany({}); // Clear previous rewards
    const retReward = new RetReward({
        rewards: results
    });
    await retReward.save();
    console.log('RET rewards saved to database:', results);
};

// Main function to run calculation
const runCalculation = async () => {
    const currentDate = new Date();
    const dayNumber = Math.floor((currentDate - new Date('2023-01-01')) / (1000 * 60 * 60 * 24));
    const totalDailyPool = initialTotalDailyPool * Math.pow(1 - decayRate, dayNumber);
    const dailyMatchesPerRank = await getAverageMatchesPerDay();
    const results = calculateAllRetPerWin(totalDailyPool, dailyMatchesPerRank);
    await saveResultsToDatabase(results);
    console.log('RET rewards calculated and saved:', results);
};

// Initial run
runCalculation();
