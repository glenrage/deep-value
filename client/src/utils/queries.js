// Import axios for API requests
import axios from 'axios';

// Base URL of the backend
const BASE_URL = 'https://deep-value.onrender.com';

// Fetch full stock analysis using Server-Sent Events (SSE)
export const fetchFullStockAnalysis = (ticker, onMessage, onError) => {
  const eventSource = new EventSource(
    `${BASE_URL}/api/sentiment/explain?ticker=${ticker}`
  );

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  eventSource.onerror = (error) => {
    eventSource.close();
    onError(error);
  };

  return () => {
    eventSource.close();
  };
};

// Search articles by sentiment
export const searchArticlesBySentiment = async (ticker, sentiment) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/search-sentiment`, {
      params: {
        ticker,
        sentiment,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching articles by sentiment:', error);
    throw error;
  }
};

// Perform a semantic search for similar articles
export const searchSemanticArticles = async (query) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/search-semantic`, {
      params: {
        query,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching similar articles:', error);
    throw error;
  }
};
