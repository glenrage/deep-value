import React, { useState } from 'react';
import { Card, Spinner, Button, TextInput } from 'flowbite-react';
import { fetchFullStockAnalysis } from '../utils/queries';
import { mockData } from '../mock';

const StockAnalysis = () => {
  const [ticker, setTicker] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const [analysisData, setAnalysisData] = useState(mockData);

  // const [analysisData, setAnalysisData] = useState({
  //   dcfAnalysis: { data: null, loading: true },
  //   aiExplanation: { data: null, loading: true },
  //   sentimentAnalysis: { data: null, loading: true },
  //   technicalAnalysis: { data: null, loading: true },
  //   insiderSentiment: { data: null, loading: true },
  //   optionsChainAnalysis: { data: null, loading: true },
  //   comprehensiveAnalysis: { data: null, loading: true },
  // });

  const handleFetchAnalysis = () => {
    setFetching(true);
    setError(null);

    // Resetting analysis data to show loading for each section
    setAnalysisData({
      dcfAnalysis: { data: null, loading: true },
      aiExplanation: { data: null, loading: true },
      sentimentAnalysis: { data: null, loading: true },
      technicalAnalysis: { data: null, loading: true },
      insiderSentiment: { data: null, loading: true },
      optionsChainAnalysis: { data: null, loading: true },
      comprehensiveAnalysis: { data: null, loading: true },
    });
  };

  const AnalysisCard = ({ title, data, loading }) => (
    <Card className="w-full mt-4 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 h-96 bg-white">
      <h4 className="text-lg font-semibold mb-1 text-blue-800">{title}</h4>
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner
            aria-label={`Loading ${title}`}
            size="xl"
            className="animate-spin"
            color="success"
          />
        </div>
      ) : (
        <div className="mt-2 h-full overflow-y-auto pr-2">
          {data ? (
            typeof data === 'string' ? (
              data.split('\n').map((line, index) => (
                <p
                  key={index}
                  className={`text-sm ${
                    line.startsWith('-') ? 'font-semibold' : ''
                  } text-gray-700`}
                >
                  {line.startsWith('-') ? line.substring(1).trim() : line}
                </p>
              ))
            ) : (
              <pre className="text-sm whitespace-pre-wrap text-gray-700">
                {JSON.stringify(data, null, 2)}
              </pre>
            )
          ) : (
            <p className="text-sm text-gray-500">No data available</p>
          )}
        </div>
      )}
    </Card>
  );

  const DCFAnalysisCard = ({ title, data, loading }) => (
    <Card className="w-full mt-4 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 h-96 bg-white">
      <h5 className="text-lg font-semibold mb-1 text-blue-800">{title}</h5>
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner
            aria-label={`Loading ${title}`}
            size="xl"
            className="animate-spin"
            color="success"
          />
        </div>
      ) : (
        <div className="mt-2 h-full overflow-y-auto pr-2 flex flex-col justify-center items-center">
          {data ? (
            <>
              <div className="flex flex-wrap items-center">
                <span className="font-semibold text-blue-700">Best Case:</span>
                <span className="ml-2 text-gray-700">
                  ${data.bestCase.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-wrap  items-center">
                <span className="font-semibold text-blue-700">
                  Average Case:
                </span>
                <span className="ml-2 text-gray-700 items-center">
                  ${data.averageCase.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-wrap ">
                <span className="font-semibold text-blue-700">Worst Case:</span>
                <span className="ml-2 text-gray-700">
                  ${data.worstCase.toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No data available</p>
          )}
        </div>
      )}
    </Card>
  );

  const SentimentAnalysisCard = ({ title, data, loading }) => (
    <Card className="w-full mt-4 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 h-96 bg-white">
      <h5 className="text-lg font-semibold mb-1 text-blue-800">{title}</h5>
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner
            aria-label={`Loading ${title}`}
            size="xl"
            className="animate-spin"
            color="success"
          />
        </div>
      ) : (
        <div className="mt-2 h-full overflow-y-auto pr-2">
          <div className="flex flex-wrap mb-1 items-center">
            <span className="font-semibold text-blue-700">
              Overall Sentiment:
            </span>
            <span className="ml-2 text-gray-700">{data.overallSentiment}</span>
          </div>

          <div className="flex flex-wrap mb-1">
            <span className="font-semibold text-blue-700">
              Positive Articles:
            </span>
            <span className="ml-2 text-gray-700">
              {data.sentimentBreakdown.positive}
            </span>
          </div>
          <div className="flex flex-wrap mb-1">
            <span className="font-semibold text-blue-700">
              Neutral Articles:
            </span>
            <span className="ml-2 text-gray-700">
              {data.sentimentBreakdown.neutral}
            </span>
          </div>
          <div className="flex flex-wrap mb-1">
            <span className="font-semibold text-blue-700">
              Negative Articles:
            </span>
            <span className="ml-2 text-gray-700">
              {data.sentimentBreakdown.negative}
            </span>
          </div>

          <h6 className="text-md font-semibold mt-4 mb-2 text-blue-700">
            Articles Summary:
          </h6>
          <div className="overflow-y-auto w-full max-h-40 pr-1">
            {data.articles.map((article, index) => (
              <div key={index} className="mb-3 border-b pb-2 border-gray-200">
                <p className="text-sm font-semibold text-gray-800">
                  {article.title}
                </p>
                <p className="text-xs text-gray-600">
                  Source: {article.source} | Author: {article.author}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {article.sentiment}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );

  const ComprehensiveAnalysisCard = ({ title, data, loading }) => (
    <Card className="w-full mt-4 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 h-96 bg-white">
      <h5 className="text-lg font-semibold mb-1 text-blue-800">{title}</h5>
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner
            aria-label={`Loading ${title}`}
            size="xl"
            className="animate-spin"
            color="success"
          />
        </div>
      ) : (
        <div className="h-full overflow-y-auto pr-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="mb-4">
              <h6 className="text-md font-semibold text-blue-700 capitalize mb-1">
                {key.replace(/([A-Z])/g, ' $1')}
              </h6>
              <p className="text-sm text-gray-700">{value}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

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
          data={analysisData.sentimentAnalysis.data}
          loading={analysisData.sentimentAnalysis.loading}
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
          data={analysisData.comprehensiveAnalysis.data}
          loading={analysisData.comprehensiveAnalysis.loading}
        />
      </div>
    </div>
  );
};

export default StockAnalysis;
