const aiService = require('../services/aiService');

const requestAIExplanation = async (req, res) => {
  const num = 157; // Example DCF result, change this to dynamic input if needed.

  try {
    // Await the result from the async service function
    const data = await aiService.getAIExplanation(num);

    // Return the AI-generated explanation in the response
    res.json({
      explanation: data,
    });
  } catch (error) {
    // Handle any errors that occur during the request
    console.error('Error fetching AI explanation:', error);
    res.status(500).json({ error: 'Failed to get AI explanation' });
  }
};

module.exports = {
  requestAIExplanation,
};
