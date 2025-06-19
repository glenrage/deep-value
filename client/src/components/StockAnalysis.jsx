import { useState } from 'react';
import { Button, TextInput } from 'flowbite-react';
import { fetchFullStockAnalysis } from '../utils/queries';
import {
  AnalysisCard,
  DCFAnalysisCard,
  ComprehensiveAnalysisCard,
  SentimentAnalysisCard,
} from './AnalysisCards';
import { StockTicker } from './StockTicker';
import { EarningsChatCard } from './EarningsChatCard';
import { AgentChatWindow } from './AgentChatWindow';

const StockAnalysis = () => {
  const [ticker, setTicker] = useState(''); // Stores the raw input from the text field
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [currentTicker, setCurrentTicker] = useState(null); // This will be our "active" ticker for analysis and stream

  const [analysisData, setAnalysisData] = useState({
    dcfAnalysis: { data: null, loading: false },
    aiExplanation: { data: null, loading: false },
    sentimentOverview: { data: null, loading: false },
    technicalAnalysis: { data: null, loading: false },
    insiderSentiment: { data: null, loading: false },
    optionsChainAnalysis: { data: null, loading: false },
    comprehensiveRecommendation: { data: null, loading: false },
  });

  const handleFetchAnalysis = () => {
    if (!ticker.trim()) {
      setError('Please enter a stock ticker.');
      return;
    }
    const upperCaseTicker = ticker.trim().toUpperCase();

    setFetching(true);
    setError(null);
    setCurrentTicker(upperCaseTicker);

    setAnalysisData({
      dcfAnalysis: { data: null, loading: true },
      aiExplanation: { data: null, loading: true },
      sentimentOverview: { data: null, loading: true },
      technicalAnalysis: { data: null, loading: true },
      insiderSentiment: { data: null, loading: true },
      optionsChainAnalysis: { data: null, loading: true },
      comprehensiveRecommendation: { data: null, loading: true },
    });

    const onMessage = (data) => {
      if (data.type === 'complete') {
        setFetching(false);
      } else if (data.type === 'error') {
        setFetching(false);
        setError(data.message || 'An unknown error occurred during analysis.');
        setCurrentTicker(null); // Reset currentTicker if analysis fails
      } else if (data.type && analysisData.hasOwnProperty(data.type)) {
        setAnalysisData((prevData) => ({
          ...prevData,
          [data.type]: { data: data.data, loading: false },
        }));
      } else {
        console.warn('Received unknown data type from SSE:', data);
      }
    };

    const onError = (sseError) => {
      console.error('SSE Connection Error:', sseError);
      setFetching(false);
      setError('Failed to connect to analysis service. Please try again.');
      setCurrentTicker(null); // Reset currentTicker on SSE connection error
    };

    fetchFullStockAnalysis(upperCaseTicker, onMessage, onError);
  };

  const handleTickerInputChange = (event) => {
    setTicker(event.target.value); // Update 'ticker' state (what user is typing)
    // If user clears input, also clear currentTicker to stop the stream
    if (event.target.value.trim() === '') {
      setCurrentTicker(null);
    }
  };

  const handleTickerKeyDown = (event) => {
    if (event.key === 'Enter' && !fetching && ticker.trim()) {
      handleFetchAnalysis();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-100">
      <h2 className="text-2xl font-bold mb-3 text-center text-blue-800">
        Stock Analysis Dashboard
      </h2>
      <div className="flex flex-col items-center space-y-2 mb-4">
        <TextInput
          type="text"
          value={ticker} // This is the input field's value
          onChange={handleTickerInputChange}
          onKeyDown={handleTickerKeyDown}
          placeholder="Enter stock ticker (e.g., NVDA)"
          className="w-full max-w-lg border-gray-300 rounded-lg p-2 focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-300 focus:ring-opacity-50 transition duration-300"
        />
        <Button
          onClick={handleFetchAnalysis}
          disabled={fetching || !ticker.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-1 py-1 rounded-md transition duration-300 shadow-md"
        >
          {fetching ? 'Fetching Analysis...' : 'Get Analysis'}
        </Button>
      </div>

      <div className="mb-1 flex justify-center">
        <StockTicker
          activeTicker={currentTicker}
          displayTicker={currentTicker || ticker.toUpperCase()} // Display current (analyzed) ticker, or typed ticker, or placeholder
        />
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mt-4 w-full text-center">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DCFAnalysisCard
          title="DCF Analysis (Intrinsic Value of Stock)"
          data={analysisData.dcfAnalysis.data}
          loading={analysisData.dcfAnalysis.loading}
        />
        <AnalysisCard
          title="AI Explanation of key metrics"
          data={analysisData.aiExplanation.data}
          loading={analysisData.aiExplanation.loading}
        />
        <SentimentAnalysisCard
          title="News & Analyst Sentiment Analysis"
          data={analysisData.sentimentOverview.data}
          loading={analysisData.sentimentOverview.loading}
        />
        <AnalysisCard
          title="Technical Analysis"
          data={analysisData.technicalAnalysis.data}
          loading={analysisData.technicalAnalysis.loading}
        />
        <AnalysisCard
          title="Insider Trades Sentiment"
          data={analysisData.insiderSentiment.data}
          loading={analysisData.insiderSentiment.loading}
        />
        <AnalysisCard
          title="Options Chain Analysis"
          data={analysisData.optionsChainAnalysis.data}
          loading={analysisData.optionsChainAnalysis.loading}
        />
        <ComprehensiveAnalysisCard
          title="Comprehensive Analysis"
          data={analysisData.comprehensiveRecommendation.data}
          loading={analysisData.comprehensiveRecommendation.loading}
        />

        {currentTicker && (
          <EarningsChatCard
            ticker={currentTicker}
            key={`earnings-${currentTicker}`}
          />
        )}

        <div className="md:col-span-1 lg:col-span-1">
          {/* <h3 className="text-xl font-semibold mb-2 text-center text-gray-700">
            Quick Snapshot Agent
          </h3> */}
          <AgentChatWindow />
        </div>

        {!currentTicker && !fetching && !error && (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-10 md:col-span-2 lg:col-span-3">
            Enter a stock ticker above and click "Get Analysis" to get started.
          </p>
        )}
      </div>
    </div>
  );
};

export default StockAnalysis;
