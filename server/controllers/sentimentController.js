const { ChatOpenAI } = require('@langchain/openai');
const { OpenAIEmbeddings } = require('@langchain/openai');

const { PromptTemplate } = require('@langchain/core/prompts');
const pineconeService = require('../services/pineconeService');
const axios = require('axios');

const model = new ChatOpenAI({ model: 'gpt-3.5-turbo-0125', temperature: 0.7 });
const embeddingsModel = new OpenAIEmbeddings();

const formatNewsDataForSentiment = (articles) => {
  return articles.map((article) => ({
    source: article.source?.name || 'Unknown',
    author: article.author || 'Unknown',
    title: article.title,
    description: article.description,
    content: article.content,
  }));
};

const truncateText = (text, maxLength) => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text;
};

const requestSentimentExplanation = async (req, res) => {
  try {
    const news = await axios.get(
      `https://newsapi.org/v2/everything?q=NVDA&apiKey=${process.env.NEWSAPI_KEY}`
    );

    const formattedNews = formatNewsDataForSentiment(news.data.articles);

    const sentimentPrompt = PromptTemplate.fromTemplate(
      "Analyze the sentiment of the following text: {text}. Provide a summary of whether it's positive, negative, or neutral."
    );

    // Create chains using pipe()
    const sentimentChain = sentimentPrompt.pipe(model);

    // Process each article
    const results = await Promise.all(
      formattedNews.slice(0, 5).map(async (article) => {
        if (article.content) {
          const truncatedContent = truncateText(article.content, 500);

          // Run sentiment analysis
          const sentimentResult = await sentimentChain.invoke({
            text: truncatedContent,
          });

          const embedding = await embeddingsModel.embedQuery(truncatedContent);

          if (!Array.isArray(embedding)) {
            throw new Error('Invalid embedding format received from the model');
          }

          // Store embeddings in Pinecone
          await pineconeService.storeEmbedding(embedding, {
            title: article.title,
            source: article.source,
            author: article.author,
            sentiment: sentimentResult.content,
          });

          return {
            ...article,
            sentiment: sentimentResult.content,
          };
        }
        return article;
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('Error processing sentiment and embeddings:', error.message);
    res
      .status(500)
      .json({ error: 'Failed to process sentiment and embeddings' });
  }
};

module.exports = {
  requestSentimentExplanation,
};
