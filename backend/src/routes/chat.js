const express = require('express');
const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { optional } = require('../middleware/auth');

const router = express.Router();

function canAccess(conversation, req) {
  if (req.user && req.user.role === 'admin') return true;
  if (req.user && conversation.user && conversation.user.toString() === req.user._id.toString()) return true;
  // Guest-owned conversations have no `user` — anyone holding the (unguessable)
  // conversation id can continue it, same trust model as an email thread link.
  if (!conversation.user) return true;
  return false;
}

// Start a conversation — works for logged-in patients AND anonymous website visitors
router.post('/conversations', optional, asyncHandler(async (req, res) => {
  const { subject, category, guestName, guestEmail } = req.body;

  if (!req.user && !guestName) {
    throw new AppError('guestName is required to start a chat without an account', 400);
  }

  const conversation = new ChatConversation({
    user: req.user ? req.user._id : undefined,
    guestName: req.user ? undefined : guestName,
    guestEmail: req.user ? undefined : guestEmail,
    channel: 'website',
    subject,
    category: category || 'general'
  });

  await conversation.save();

  res.status(201).json({ success: true, conversation });
}));

// List MY conversations (logged-in patients only — admins use /api/admin/chat/conversations)
router.get('/conversations', optional, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const conversations = await ChatConversation.find({ user: req.user._id })
    .populate('assignedAgent', 'firstName lastName')
    .sort({ updatedAt: -1 })
    .lean();

  res.json({ success: true, conversations });
}));

router.post('/conversations/:conversationId/messages', optional, asyncHandler(async (req, res) => {
  const { content, messageType = 'text', guestName } = req.body;

  if (!content) {
    throw new AppError('Message content required', 400);
  }

  const conversation = await ChatConversation.findById(req.params.conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  if (!canAccess(conversation, req)) {
    throw new AppError('Unauthorized', 403);
  }

  const message = new ChatMessage({
    conversationId: req.params.conversationId,
    sender: req.user ? req.user._id : undefined,
    senderName: req.user ? undefined : (guestName || conversation.guestName || 'Visitor'),
    senderRole: req.user ? (req.user.role === 'admin' ? 'admin' : 'user') : 'guest',
    messageType,
    content
  });

  await message.save();

  conversation.messageCount += 1;
  conversation.lastMessage = { content, sender: req.user ? req.user._id : undefined, timestamp: new Date() };
  conversation.status = req.user && req.user.role === 'admin' ? 'assigned' : 'open';
  await conversation.save();

  res.status(201).json({ success: true, message });
}));

router.get('/conversations/:conversationId/messages', optional, asyncHandler(async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  const conversation = await ChatConversation.findById(req.params.conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  if (!canAccess(conversation, req)) {
    throw new AppError('Unauthorized', 403);
  }

  const messages = await ChatMessage.find({ conversationId: req.params.conversationId })
    .populate('sender', 'firstName lastName avatar role')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: 1 });

  res.json({ success: true, messages });
}));

router.patch('/conversations/:conversationId/close', optional, asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const conversation = await ChatConversation.findById(req.params.conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError('Unauthorized', 403);
  }

  conversation.status = 'closed';
  conversation.closedAt = new Date();
  conversation.resolution = { resolved: true, resolvedAt: new Date(), notes };
  await conversation.save();

  res.json({ success: true, conversation });
}));

module.exports = router;
