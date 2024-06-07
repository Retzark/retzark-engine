const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Retzark Engine API is running!');
});

module.exports = router;
