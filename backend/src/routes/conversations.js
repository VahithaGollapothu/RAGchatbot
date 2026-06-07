const express = require('express');
const { getConversations, getConversationById, deleteConversation } = require('../controllers/conversationsController');
const router = express.Router();

router.get('/', getConversations);
router.get('/:id', getConversationById);
router.delete('/:id', deleteConversation);

module.exports = router;
