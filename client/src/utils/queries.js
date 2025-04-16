import axios from 'axios';

let BASE_URL;

if (process.env.NODE_ENV === 'development') {
  BASE_URL = 'http://localhost:4000';
} else {
  BASE_URL = 'https://deep-value.onrender.com';
}

export const fetchFullStockAnalysis = (ticker, onMessage, onError) => {
  let isComplete = false;

  const eventSource = new EventSource(
    `${BASE_URL}/api/sentiment/explain?ticker=${ticker}`,
    { withCredentials: false }
  );

  eventSource.onopen = () => {
    console.log(`[SSE] Connection opened for ${ticker}`);
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log(`[SSE] Message received for ${ticker}:`, data.type); // Log message type

      if (data.type === 'complete') {
        console.log(`[SSE] Stream completed successfully for ${ticker}.`);
        isComplete = true;
        eventSource.close();
      } else if (data.type === 'error') {
        console.warn(
          `[SSE] Stream reported an application error for ${ticker}:`,
          data.message
        );
        isComplete = true; // Also mark as complete to prevent native onerror firing redundantly
        eventSource.close();
      }

      onMessage(data);
    } catch (e) {
      console.error(
        '[SSE] Failed to parse message data:',
        e,
        'Raw data:',
        event.data
      );
      isComplete = true; // Treat parsing error as fatal for this stream
      eventSource.close();
      onError('Failed to parse stream data.');
    }
  };

  eventSource.onerror = (error) => {
    console.error(
      `[SSE] Native EventSource error occurred for ${ticker}:`,
      error
    );

    if (!isComplete) {
      onError(
        `Connection error or stream interrupted unexpectedly for ${ticker}.`
      );
    } else {
      console.log(
        `[SSE] Native error occurred after stream completion for ${ticker}, ignoring for UI error state.`
      );
    }
    eventSource.close();
  };

  // Return a cleanup function to be called on component unmount
  return () => {
    if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
      console.log(
        `[SSE] Cleaning up: Closing EventSource connection for ${ticker}.`
      );
      eventSource.close();
    }
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
