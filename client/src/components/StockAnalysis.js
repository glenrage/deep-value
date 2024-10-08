import React, { useState } from 'react';
import { Button, TextInput } from 'flowbite-react';
import { fetchFullStockAnalysis } from '../utils/queries';
import {
  AnalysisCard,
  DCFAnalysisCard,
  ComprehensiveAnalysisCard,
  SentimentAnalysisCard,
} from './AnalysisCards';
import { StockTicker } from './StockTicker';

const StockAnalysis = () => {
  const [ticker, setTicker] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const [analysisData, setAnalysisData] = useState({
    dcfAnalysis: { data: null, loading: false },
    aiExplanation: { data: null, loading: false },
    sentimentOverview: { data: null, loading: false },
    technicalAnalysis: { data: null, loading: false },
    insiderSentiment: { data: null, loading: false },
    optionsChainAnalysis: { data: null, loading: false },
    comprehensiveRecommendation: { data: null, loading: false },
  });

  console.log('analysisData', analysisData);

  const handleFetchAnalysis = () => {
    if (!ticker) return;

    setFetching(true);
    setError(null);

    // Resetting analysis data to show loading for each section
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
      console.log('Data:', data);
      if (data.type === 'complete') {
        setFetching(false);
        setError(null);
      } else if (data.type === 'error') {
        setFetching(false);
        setError(data.message);
      } else {
        setAnalysisData((prevData) => ({
          ...prevData,
          [data.type]: { data: data.data, loading: false },
        }));
      }
    };

    const onError = (error) => {
      setFetching(false);
      setError('Error fetching stock analysis data');
    };

    // Initiate fetching with the EventSource
    fetchFullStockAnalysis(ticker, onMessage, onError);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-100">
      <h2 className="text-2xl font-bold mb-3 text-center text-blue-800">
        Stock Analysis Dashboard
      </h2>
      <div className="flex flex-col items-center space-y-2 mb-4">
        <TextInput
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Enter stock ticker"
          className="w-full max-w-lg border-gray-300 rounded-lg p-2 focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-300 focus:ring-opacity-50 transition duration-300"
        />
        <Button
          onClick={handleFetchAnalysis}
          disabled={fetching || !ticker}
          className="bg-blue-600 hover:bg-blue-700 text-white px-1 py-1 rounded-md transition duration-300 shadow-md"
        >
          {fetching ? 'Fetching...' : 'Get Analysis'}
        </Button>
      </div>

      <StockTicker ticker={ticker} />

      {/* {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mt-4 w-full text-center">
          Error: {error}
        </div>
      )} */}

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
        <ComprehensiveAnalysisCard
          title="Comprehensive Analysis"
          data={analysisData.comprehensiveRecommendation.data}
          loading={analysisData.comprehensiveRecommendation.loading}
        />
        <SentimentAnalysisCard
          analysisData={analysisData}
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
      </div>
    </div>
  );
};

export default StockAnalysis;
