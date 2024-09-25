const axios = require('axios');

// Replace with your Hugging Face API token
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Function to perform sentiment analysis on text
const getSentimentAnalysis = async (text) => {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment',
      {
        inputs: text,
      },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    throw new Error('Sentiment analysis failed');
  }
};

module.exports = {
  getSentimentAnalysis,
};
