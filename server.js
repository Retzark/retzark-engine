const express = require('express');
const { startStreamingFrom } = require('./services/blockchainService');
const connectDB = require('./utils/db');
const indexRoutes = require('./routes/indexRoutes');
const playerRoutes = require('./routes/playerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const rankRoutes = require('./routes/rankRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const manaRoutes = require('./routes/manaRoutes');
const wageringRoutes = require('./routes/wageringRoutes');
const adminRoutes = require('./routes/adminRoutes');
const logRoutes = require('./routes/logRoutes');
const { runProceduralTest } = require('./tests/proceduralTest');

require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/', indexRoutes);
app.use('/player', playerRoutes);
app.use('/match', matchRoutes);
app.use('/rank', rankRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/mana', manaRoutes);
app.use('/wager', wageringRoutes);
app.use('/admin', adminRoutes);
app.use('/log', logRoutes);

connectDB();
runProceduralTest();
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    startStreamingFrom(process.env.START_BLOCK);
    setInterval(async () => {
        const { matchPlayersByRank } = require('./services/matchmakingService');
        await matchPlayersByRank();
    }, 30000); // 30 seconds interval
});
