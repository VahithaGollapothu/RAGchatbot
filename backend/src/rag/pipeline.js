const { classifyQuery } = require('./router');
const { rewriteQuery } = require('./queryRewriter');
const { retrieve } = require('./retriever');
const { gradeDocuments } = require('./relevanceGrader');
const { compressContext } = require('./contextCompressor');
const { generateAnswer } = require('./answerGenerator');
const { checkHallucination } = require('./hallucinationChecker');
const { gradeAnswer } = require('./answerGrader');
const groqService = require('../services/groqService');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Run the full 10-step Adaptive RAG pipeline
 * @param {string} rawQuery 
 * @param {string} sessionId 
 * @param {Array<{role, content}>} history 
 */
async function runRAGPipeline(rawQuery, sessionId, history = []) {
  const startTime = Date.now();
  let pipelineSteps = [];
  
  // Step 1 & 2: Query Analysis & Query Routing
  const route = await classifyQuery(rawQuery);
  pipelineSteps.push({ step: '1-2: Classification', result: route });

  // Route A: Greeting Queries
  if (route === 'greeting') {
    const response = await handleGreeting(rawQuery, history);
    return {
      route,
      answer: response,
      citations: [],
      steps: pipelineSteps,
      responseTimeMs: Date.now() - startTime,
    };
  }

  // Route D: Out-of-Scope Queries
  if (route === 'out_of_scope') {
    const response = "Sorry, I can only assist with college-related queries (admissions, fee structures, scholarships, exams, library, hostel, transport, placements, attendance, student support, etc.). Please ask a college-related question.";
    return {
      route,
      answer: response,
      citations: [],
      steps: pipelineSteps,
      responseTimeMs: Date.now() - startTime,
    };
  }

  // Route B: General Knowledge Queries
  if (route === 'general') {
    const response = await handleGeneralKnowledge(rawQuery, history);
    return {
      route,
      answer: response,
      citations: [],
      steps: pipelineSteps,
      responseTimeMs: Date.now() - startTime,
    };
  }

  // Route C: College Queries (Full RAG Pipeline)
  logger.info(`Starting RAG pipeline for: "${rawQuery}"`);
  
  // Step 3: Query Rewriting
  let searchTerms = await rewriteQuery(rawQuery, history);
  pipelineSteps.push({ step: '3: Query Rewrite', result: searchTerms });

  // Step 4: Retrieval
  let retrievedChunks = await retrieve(searchTerms, config.rag.topK);
  pipelineSteps.push({ step: '4: Retrieval', count: retrievedChunks.length });

  // Step 5: Document Relevance Grading
  let relevantChunks = await gradeDocuments(searchTerms, retrievedChunks);
  pipelineSteps.push({ step: '5: Relevance Grading', count: relevantChunks.length });

  // Step 6: Adaptive Retrieval Retry
  let retryCount = 0;
  while (relevantChunks.length === 0 && retryCount < config.rag.maxRetryAttempts) {
    retryCount++;
    logger.warn(`No relevant chunks found. Initiating adaptive retry #${retryCount}...`);
    
    // Rewrite with alternate phrasing
    searchTerms = await rewriteQuery(`Alternative search terms for: ${rawQuery} (previous try yielded no results)`, history);
    pipelineSteps.push({ step: `6: Retry #${retryCount} Rewrite`, result: searchTerms });

    const newChunks = await retrieve(searchTerms, config.rag.topK + 2); // fetch slightly more chunks
    relevantChunks = await gradeDocuments(searchTerms, newChunks);
    pipelineSteps.push({ step: `6: Retry #${retryCount} Retrieval & Grading`, count: relevantChunks.length });
  }

  // Step 7: Context Compression
  const compressedChunks = compressContext(relevantChunks);
  pipelineSteps.push({ step: '7: Context Compression', count: compressedChunks.length });

  if (compressedChunks.length === 0) {
    logger.warn('No grounded chunks found after retries. Returning fallback message.');
    return {
      route,
      answer: "Sorry, I could not find sufficient information in the college knowledge base.",
      citations: [],
      steps: pipelineSteps,
      responseTimeMs: Date.now() - startTime,
    };
  }

  // Step 8: Answer Generation (with retry loop if needed)
  let finalAnswer = '';
  let generationSuccess = false;
  let genAttempts = 0;

  while (!generationSuccess && genAttempts < 2) {
    genAttempts++;
    finalAnswer = await generateAnswer(rawQuery, compressedChunks, history);
    pipelineSteps.push({ step: `8: Answer Generation (Attempt ${genAttempts})` });

    // Step 9: Hallucination Detection
    const groundingStatus = await checkHallucination(finalAnswer, compressedChunks);
    pipelineSteps.push({ step: `9: Hallucination Check (Attempt ${genAttempts})`, result: groundingStatus });

    if (groundingStatus === 'Hallucinated') {
      logger.warn('Answer failed grounding/hallucination check. Retrying generation...');
      continue;
    }

    // Step 10: Answer Quality Grading
    const qualityGrade = await gradeAnswer(rawQuery, finalAnswer);
    pipelineSteps.push({ step: `10: Quality Grading (Attempt ${genAttempts})`, result: qualityGrade });

    if (qualityGrade === 'Low') {
      logger.warn('Answer received Low quality grade. Retrying generation...');
      continue;
    }

    generationSuccess = true;
  }

  // Final validation fallback
  if (!generationSuccess) {
    logger.warn('Failed to generate acceptable grounded response after retries. Triggering fallback.');
    return {
      route,
      answer: "Sorry, I could not find sufficient information in the college knowledge base.",
      citations: [],
      steps: pipelineSteps,
      responseTimeMs: Date.now() - startTime,
    };
  }

  // Formulate citations list to return to frontend
  const citations = compressedChunks.map(c => ({
    docName: c.metadata.doc_name,
    source: c.metadata.source,
    category: c.metadata.category,
    chunkId: c.metadata.chunk_id,
    snippet: c.text.substring(0, 150) + '...',
  }));

  return {
    route,
    answer: finalAnswer,
    citations,
    steps: pipelineSteps,
    responseTimeMs: Date.now() - startTime,
  };
}

/**
 * Route A Greeting Handler
 */
async function handleGreeting(query, history) {
  const prompt = `You are a friendly College Helpdesk Assistant. Respond warmly to the user's greeting: "${query}".
Keep your response brief (1-2 sentences). Mention that you can help them with college admissions, course details, fees, placements, scholarships, hostell, library, or support services.`;

  try {
    const historyMsgs = history.slice(-3); // only use recent history for greetings
    return await groqService.getChatCompletion([
      ...historyMsgs,
      { role: 'user', content: prompt }
    ], { temperature: 0.7 });
  } catch (error) {
    return "Hello! Welcome to Greenfield College support. How can I help you today?";
  }
}

/**
 * Route B General Knowledge Handler
 */
async function handleGeneralKnowledge(query, history) {
  const prompt = `You are an AI assistant. Answer this general knowledge question directly, factually, and concisely.
If appropriate, gently remind the user at the end that you are designed for college-specific questions.
Question: "${query}"`;

  try {
    return await groqService.getChatCompletion([
      ...history,
      { role: 'user', content: prompt }
    ], { temperature: 0.3 });
  } catch (error) {
    return "I apologize, but I am having trouble connecting to my knowledge processor right now.";
  }
}

module.exports = { runRAGPipeline };
