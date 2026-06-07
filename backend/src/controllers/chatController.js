const { runRAGPipeline } = require('../rag/pipeline');
const sessionService = require('../services/sessionService');
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

async function handleChat(req, res, next) {
  const { message, sessionId } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ success: false, error: { message: 'Message is required' } });
  }

  try {
    // 1. Get session history
    const session = sessionService.getOrCreateSession(sessionId);
    const history = sessionService.getGroqHistory(session.id);

    // 2. Execute full adaptive RAG pipeline
    const ragResult = await runRAGPipeline(message, session.id, history);

    // 3. Save to conversation history
    // Save user message
    sessionService.addMessage(session.id, 'user', message);
    // Save bot message + citations
    sessionService.addMessage(session.id, 'assistant', ragResult.answer, {
      citations: ragResult.citations,
      steps: ragResult.steps,
      route: ragResult.route,
    });

    // 4. Log to analytics
    analyticsService.logQuery(
      message, 
      ragResult.route, 
      !ragResult.answer.includes("Sorry, I could not find sufficient information"), 
      ragResult.responseTimeMs
    );

    // 5. Respond
    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        answer: ragResult.answer,
        citations: ragResult.citations,
        route: ragResult.route,
        steps: ragResult.steps,
        responseTimeMs: ragResult.responseTimeMs,
      },
    });
  } catch (error) {
    logger.error('Error handling chat request:', error);
    next(error);
  }
}

module.exports = { handleChat };
