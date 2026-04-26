const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const chatService = require('../services/chat.service');

const router = express.Router();

// ── GET /api/conversations
// List all conversations for the logged-in user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const conversations = await chatService.listConversations(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Conversations fetched successfully.',
      data: conversations,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/conversations/booking/:bookingRequestId
// Get or create conversation for a specific booking
router.post('/booking/:bookingRequestId', authenticate, async (req, res, next) => {
  try {
    const conv = await chatService.getOrCreateConversationByBooking({
      bookingRequestId: req.params.bookingRequestId,
      currentUserId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      message: 'Conversation ready.',
      data: conv,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/conversations/:id/messages
// Fetch messages in a conversation (marks them as read)
router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const messages = await chatService.getMessages({
      conversationId: req.params.id,
      currentUserId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      message: 'Messages fetched successfully.',
      data: messages,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/conversations/:id/messages
// Send a message in a conversation
router.post('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const message = await chatService.sendMessage({
      conversationId: req.params.id,
      senderId: req.user.id,
      body: req.body.body,
    });
    return res.status(201).json({
      success: true,
      message: 'Message sent.',
      data: message,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
