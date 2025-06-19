import { useState } from 'react';
import { Button, TextInput, Card, Spinner } from 'flowbite-react';
import { HiOutlineSearch, HiOutlineSparkles } from 'react-icons/hi';
import { fetchFullStockAnalysis } from '../utils/queries';
import {
  AnalysisCard,
  DCFAnalysisCard,
  ComprehensiveAnalysisCard,
  SentimentAnalysisCard,
} from './AnalysisCards';
import { StockTicker } from './StockTicker';
import { EarningsChatCard } from './EarningsChatCard';
import AgentChatWindow from './AgentChatWindow';

const StockAnalysis = () => {
  const [ticker, setTicker] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [currentTicker, setCurrentTicker] = useState(null);

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
        setCurrentTicker(null);
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
      setCurrentTicker(null);
    };

    fetchFullStockAnalysis(upperCaseTicker, onMessage, onError);
  };

  const handleTickerInputChange = (event) => {
    setTicker(event.target.value);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-screen-xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 py-2">
            Deep Value AI
          </h1>
          <p className="text-slate-400 text-lg mt-1">
            Your AI-Powered Stock Analysis Co-Pilot
          </p>
        </header>

        <Card className="bg-slate-800/50 border-slate-700 shadow-2xl mb-4 p-2 rounded-xl">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
            <div className="w-full md:w-auto md:flex-grow">
              <label
                htmlFor="ticker-input"
                className="block text-sm font-medium text-sky-300 mb-1"
              >
                Stock Ticker
              </label>
              <TextInput
                id="ticker-input"
                type="text"
                value={ticker}
                onChange={handleTickerInputChange}
                onKeyDown={handleTickerKeyDown}
                placeholder="e.g., NVDA, AAPL"
                className="w-full [&_input]:bg-slate-700 [&_input]:border-slate-600 [&_input]:text-gray-100 [&_input]:placeholder-slate-500 [&_input]:rounded-lg focus:[&_input]:border-sky-500 focus:[&_input]:ring-sky-500 transition-all duration-300"
                required
              />
            </div>
            <Button
              onClick={handleFetchAnalysis}
              disabled={fetching || !ticker.trim()}
              isProcessing={fetching}
              gradientDuoTone="purpleToBlue"
              size="md"
              className="w-full md:w-auto transition-all duration-300 ease-in-out hover:scale-105 focus:ring-4 focus:ring-sky-500/50 disabled:opacity-50 disabled:saturate-50"
            >
              <HiOutlineSparkles className="mr-2 h-5 w-5" />
              {fetching ? 'Analyzing...' : 'Get AI Analysis'}
            </Button>
            {currentTicker && (
              <div className="w-full md:w-auto md:ml-4 mt-4 md:mt-0 transform transition-all duration-500 ease-out">
                <StockTicker
                  activeTicker={currentTicker}
                  displayTicker={currentTicker || ticker.toUpperCase()}
                />
              </div>
            )}
          </div>
        </Card>

        {error && (
          <Card className="bg-red-700/20 border-red-600 text-red-200 p-4 rounded-lg mt-6 w-full text-center shadow-lg">
            <div className="flex items-center justify-center">
              <HiOutlineSearch className="h-6 w-6 mr-2" />
              <span>Error: {error}</span>
            </div>
          </Card>
        )}

        {fetching && !currentTicker && (
          <div className="flex justify-center items-center h-64">
            <Spinner
              size="xl"
              color="info"
              aria-label="Loading analysis data"
            />
            <p className="ml-4 text-sky-300 text-lg">
              Initializing Analysis...
            </p>
          </div>
        )}

        {currentTicker && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
            <DCFAnalysisCard
              title="DCF Analysis (Intrinsic Value)"
              data={analysisData.dcfAnalysis.data}
              loading={analysisData.dcfAnalysis.loading}
            />
            <AnalysisCard
              title="AI Explanation of Key Metrics"
              data={analysisData.aiExplanation.data}
              loading={analysisData.aiExplanation.loading}
            />

            <SentimentAnalysisCard
              title="News & Analyst Sentiment"
              data={analysisData.sentimentOverview.data}
              loading={analysisData.sentimentOverview.loading}
            />
            <AnalysisCard
              title="Technical Analysis Insights"
              data={analysisData.technicalAnalysis.data}
              loading={analysisData.technicalAnalysis.loading}
            />
            <AnalysisCard
              title="Insider Trading Sentiment"
              data={analysisData.insiderSentiment.data}
              loading={analysisData.insiderSentiment.loading}
            />
            <AnalysisCard
              title="Options Chain AI Analysis"
              data={analysisData.optionsChainAnalysis.data}
              loading={analysisData.optionsChainAnalysis.loading}
            />
            <ComprehensiveAnalysisCard
              title="Comprehensive AI Analysis"
              data={analysisData.comprehensiveRecommendation.data}
              loading={analysisData.comprehensiveRecommendation.loading}
            />

            <div className="md:col-span-1 xl:col-span-1">
              <EarningsChatCard
                ticker={currentTicker}
                key={`earnings-${currentTicker}`}
              />
            </div>
            <div className="md:col-span-1 xl:col-span-1">
              <AgentChatWindow />
            </div>
          </div>
        )}

        {!currentTicker && !fetching && !error && (
          <div className="text-center text-slate-500 mt-20">
            <HiOutlineSearch className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <p className="text-xl">
              Enter a stock ticker above to begin your AI-powered analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockAnalysis;
