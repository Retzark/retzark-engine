const User = require('../models/User');

// Function to register a new user
const registerUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        // Create a new user
        const user = new User({ email, password });
        await user.save();

        res.status(201).send('User registered successfully');
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// Function to get a user by ID
const getUserById = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// Function to get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = {
    registerUser,
    getUserById,
    getAllUsers,
};
