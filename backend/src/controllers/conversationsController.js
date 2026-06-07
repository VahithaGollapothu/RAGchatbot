const sessionService = require('../services/sessionService');

function getConversations(req, res) {
  const list = sessionService.listSessions();
  return res.status(200).json({
    success: true,
    data: list,
  });
}

function getConversationById(req, res) {
  const { id } = req.params;
  const session = sessionService.getOrCreateSession(id);
  return res.status(200).json({
    success: true,
    data: {
      id: session.id,
      history: session.history,
    },
  });
}

function deleteConversation(req, res) {
  const { id } = req.params;
  const deleted = sessionService.deleteSession(id);
  if (deleted) {
    return res.status(200).json({ success: true, message: 'Session deleted' });
  }
  return res.status(404).json({ success: false, error: { message: 'Session not found' } });
}

module.exports = {
  getConversations,
  getConversationById,
  deleteConversation,
};
