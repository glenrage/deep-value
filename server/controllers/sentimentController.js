const sentimentService = require('../services/sentimentService');
const axios = require('axios');
const pineconeService = require('../services/pineconeService');

const formatNewsDataForSentiment = (articles) => {
  return articles.map((article) => {
    return {
      source: article.source?.name || 'Unknown',
      author: article.author || 'Unknown',
      title: article.title,
      description: article.description,
      content: article.content,
    };
  });
};

const truncateText = (text, maxLength) => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...'; // Truncate and add ellipsis
  }
  return text;
};

const requestSentimentExplanation = async (req, res) => {
  try {
    const news = await axios.get(
      `https://newsapi.org/v2/everything?q=NVDA&apiKey=${process.env.NEWSAPI_KEY}`
    );

    const formattedNews = formatNewsDataForSentiment(news.data.articles);

    const textForAnalysis = truncateText(
      formattedNews.map((article) => article.content).join('. '),
      500 // Limit the text to 500 characters (adjustable)
    );

    // Send each article to Pinecone as embeddings
    for (const article of formattedNews) {
      if (article.content) {
        // Generate embeddings for the article content
        const embedding = await pineconeService.createEmbedding(
          article.content
        );

        // Store embeddings in Pinecone along with metadata like sentiment and article details
        await pineconeService.storeEmbedding(embedding, {
          title: article.title,
          source: article.source,
          author: article.author,
          sentiment: sentimentAnalysisResult, // Attach sentiment to the metadata
        });
      }
    }

    // Await the result from the async service function
    const sentimentAnalysisResult = await sentimentService.getSentimentAnalysis(
      {
        text: textForAnalysis,
      }
    );

    res.json({ sentimentAnalysisResult });
  } catch (error) {
    // Handle any errors that occur during the request
    console.error('Error fetching AI explanation:', error.message);
    res.status(500).json({ error: 'Failed to get AI explanation' });
  }
};

module.exports = {
  requestSentimentExplanation,
};
