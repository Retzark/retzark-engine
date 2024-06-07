# Retzark Engine

## Introduction
The Retzark Engine is a Node.js application that serves as the backend for the Retzark game. This engine is responsible for handling all game-related transactions, score calculations, matchmaking, and communications between the game and the Hive blockchain. It also manages the wagering system and the mana system for the game. The wagering system allows players to stake RET tokens on match outcomes, adding a strategic edge to gameplay. The mana system manages player mana for game actions and wagering. The Retzark Engine ensures fair play, accurate score calculations, secure transactions, and a seamless gaming experience for Retzark players.

## Features
1. **Blockchain Integration**: Interacts with the Hive blockchain to manage transactions securely and transparently.
2. **Matchmaking**: Matches players based on their rank and experience points to ensure fair competition.
3. **Game Logic**: Handles core game logic, including card selection, attack value assignment, and round simulation.
4. **Wagering System**: Allows players to stake RET tokens on match outcomes, adding a strategic edge to gameplay.
5. **Reward Distribution**: Manages the distribution of rewards after matches based on the game outcome.
6. **Rank Management**: Updates player ranks and experience points based on match outcomes.
7. **Mana System**: Manages player mana for game actions and wagering.
8. **Logging and Monitoring**: Logs all match-related events and monitors system health for reliability.
9. **Admin Dashboard**: Provides an administrative dashboard for monitoring and management.

## Setup Instructions

1. **Prerequisites**
   - **Node.js and npm**: Ensure you have Node.js (version 14 or higher) and npm installed on your system.
   - **Hive Blockchain Node**: Access to a reliable Hive blockchain node is required to read and post transactions.
   - **Database**: MongoDB (version 4.4 or higher) is recommended for storing game state, player data, and transaction logs.

2. **Installation**
   ```bash
   git clone https://github.com/retzark/retzark-engine.git
   cd retzark-engine
   npm install
   ```

3. **Configuration**
   Create a `.env` file in the root directory with the following configuration:
   ```
   HIVE_NODE=https://api.hive.blog
   DATABASE_URL=mongodb://localhost:27017/retzark
   PORT=3000
   ENCRYPTION_KEY=your_encryption_key
   ADMIN_EMAIL=admin@retzark.com
   BOT_ACCOUNT=your_bot_account
   POSTING_KEY=your_bot_posting_key
   START_BLOCK=block_number_to_start_from
   ```

4. **Running the Application**
   ```bash
   npm start
   ```

## Project Structure

```
retzark-engine/
├── config/
│   └── config.js
├── controllers/
│   ├── adminController.js
│   ├── leaderboardController.js
│   ├── logController.js
│   ├── manaController.js
│   ├── matchController.js
│   ├── matchmakingController.js
│   ├── playerController.js
│   ├── rankController.js
│   └── wageringController.js
├── models/
│   ├── Admin.js
│   ├── BetTransaction.js
│   ├── Card.js
│   ├── Log.js
│   ├── Match.js
│   ├── Player.js
│   └── Wager.js
├── routes/
│   ├── adminRoutes.js
│   ├── indexRoutes.js
│   ├── leaderboardRoutes.js
│   ├── logRoutes.js
│   ├── manaRoutes.js
│   ├── matchRoutes.js
│   ├── playerRoutes.js
│   ├── rankRoutes.js
│   └── wageringRoutes.js
├── services/
│   ├── adminService.js
│   ├── blockchainService.js
│   ├── gameLogicHelpers.js
│   ├── gameLogicService.js
│   ├── hiveService.js
│   ├── leaderboardService.js
│   ├── logService.js
│   ├── manaService.js
│   ├── matchService.js
│   ├── matchmakingService.js
│   ├── playerService.js
│   ├── rankService.js
│   ├── rankUpdateService.js
│   └── wageringService.js
├── tests/
│   └── proceduralTest.js
├── utils/
│   ├── apiUtils.js
│   ├── cryptoUtils.js
│   ├── db.js
│   ├── logger.js
│   └── transactionHandler.js
├── seedCards.js
├── server.js
└── test/
    └── test.js
```

## Database Models

1. **Admin**: Stores admin user information.
2. **BetTransaction**: Stores information about betting transactions.
3. **Card**: Stores information about game cards.
4. **Log**: Stores match event logs.
5. **Match**: Stores match details.
6. **Player**: Stores player profile information.
7. **Wager**: Stores wager details for matches.

## Key Functions

1. **Blockchain Processing**
   - `startStreamingFrom(startBlock)`: Starts processing blocks from a specific start block.
   - `processBlock(block)`: Processes each block and its transactions.

2. **Matchmaking**
   - `joinWaitingRoom(player)`: Adds a player to the waiting room.
   - `createMatchmakingTransaction(players)`: Creates a matchmaking transaction for a pair of players.
   - `matchPlayersByRank()`: Matches players with similar rankings and mana bets.

3. **Game Logic**
   - `simulateRound(cards, match)`: Simulates a round of the match.
   - `applyDamageAndUpdateHealth(attacker, target, targetPlayer, match, allCards, battleHistory)`: Applies damage to the target card and updates its health.
   - `checkWinConditions(matchId, roundNumber)`: Checks for win conditions after each round.

4. **Wagering**
   - `Bet(username, matchId, wagerAmount, signature)`: Places a bet for a match.
   - `Call(matchId, username, signature, betId)`: Calls a bet.
   - `Raise(matchId, username, signature, betId, raiseAmount)`: Raises a bet.
   - `Fold(matchId, username, signature, betId)`: Folds a bet.

5. **Player Management**
   - `getPlayerProfile(username)`: Retrieves a player's profile.
   - `updatePlayerProfile(username, updates)`: Updates a player's profile.

6. **Reward Distribution**
   - `distributeRewards(matchId, outcome)`: Distributes rewards based on the match outcome.

7. **Mana Management**
   - `getManaBalance(username)`: Retrieves a player's mana balance.
   - `updateManaWagered(matchId, player, manaAmount)`: Updates the mana wagered by a player.

8. **Logging and Monitoring**
   - `logMatchEvents(matchId, event)`: Logs match-related events.
   - `monitorSystemHealth()`: Monitors the system health.

9. **Admin Functions**
   - `provideAdminDashboard()`: Provides an administrative dashboard.
   - `generateReports(startDate, endDate)`: Generates reports for the specified date range.

## API Endpoints

### Index
- **`GET /`**: Checks if the API is running.

### Player
- **`GET /player/:username`**: Gets match status for a user.
- **`PUT /player/:username`**: Updates player profile.

### Match
- **`GET /match/:matchId`**: Gets match details by match ID.
- **`POST /match/reveal/:matchId`**: Handles card reveal requests from players.
- **`POST /match/resolve`**: Resolves a match.

### Rank
- **`GET /rank/:username`**: Gets a player's rank and XP.

### Leaderboard
- **`GET /leaderboard`**: Gets the leaderboard of top players.

### Mana
- **`GET /mana/:username`**: Gets a player's mana balance.

### Wagering
- **`POST /wager/check`**: Checks if a player is in the waiting room or in a match.
- **`POST /wager/bet`**: Places a wager.
- **`POST /wager/call`**: Calls a wager.
- **`POST /wager/raise`**: Raises a wager.
- **`POST /wager/fold`**: Folds a wager.
- **`GET /wager/:matchId`**: Gets match wager details.
- **`GET /wager/complianceReport`**: Generates compliance report.

### Admin
- **`GET /admin/dashboard`**: Provides admin dashboard.
- **`POST /admin/generate-report`**: Generates a report.

### Log
- **`POST /log/log-event`**: Logs match events.
- **`GET /log/health`**: Monitors system health.

## Contribution Guidelines

1. **Coding Standards**
   - Follow consistent coding style and naming conventions.
   - Write clean, modular, and reusable code.
   - Include comments and documentation.

2. **Error Handling and Logging**
   - Implement robust error handling mechanisms.
   - Use appropriate log levels and include relevant contextual information.

3. **Testing and Quality Assurance**
   - Develop a comprehensive test suite.
   - Implement unit tests and integration tests.
   - Perform thorough testing before deploying updates.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
**Note:** The Retzark Engine is a work in progress. Contributions and suggestions are welcome to enhance the system and provide a better gaming experience for all players.

