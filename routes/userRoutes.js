const express = require('express');
const router = express.Router();
const { registerUser, getUserById, getAllUsers } = require('../controllers/userController');

// Endpoint to register a new user
router.post('/register', registerUser);

// Endpoint to get a user by ID
router.get('/:userId', getUserById);

// Endpoint to get all users
router.get('/', getAllUsers);

module.exports = router;
