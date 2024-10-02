import React, { useEffect, useState } from 'react';
import { fetchFullStockAnalysis } from '../utils/queries'; // Import the query function

const StockAnalysis = () => {
  // Define state variables to hold the different types of data
  const [ticker, setTicker] = useState('');
  const [fetching, setFetching] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [dcfAnalysis, setDcfAnalysis] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [sentimentAnalysis, setSentimentAnalysis] = useState(null);
  const [technicalAnalysis, setTechnicalAnalysis] = useState(null);
  const [insiderSentiment, setInsiderSentiment] = useState(null);
  const [optionsChainAnalysis, setOptionsChainAnalysis] = useState(null);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState(null);

  const [error, setError] = useState(null);

  // Define a function to handle the form submission
  const handleFetchAnalysis = () => {
    setFetching(true);
    // Clear previous data and error
    setStockData(null);
    setDcfAnalysis(null);
    setAiExplanation(null);
    setSentimentAnalysis(null);
    setTechnicalAnalysis(null);
    setInsiderSentiment(null);
    setOptionsChainAnalysis(null);
    setComprehensiveAnalysis(null);
    setError(null);

    // Fetch data using SSE
    const closeEventSource = fetchFullStockAnalysis(
      ticker,
      (data) => {
        switch (data.type) {
          case 'stockData':
            setStockData(data.data);
            break;
          case 'dcfAnalysis':
            setDcfAnalysis(data.data);
            break;
          case 'aiExplanation':
            setAiExplanation(data.data);
            break;
          case 'sentimentAnalysis':
            setSentimentAnalysis(data.data);
            break;
          case 'technicalAnalysis':
            setTechnicalAnalysis(data.data);
            break;
          case 'optionsChainAnalysis':
            setOptionsChainAnalysis(data.data);
            break;
          case 'insiderSentiment':
            setInsiderSentiment(data.data);
            break;
          case 'comprehensiveAnalysis':
            setComprehensiveAnalysis(data.data);
            break;
          case 'complete':
            console.log('Analysis complete');
            setFetching(false);
            break;
          case 'error':
            setError(data.message);
            console.error('Error:', data.message);
            setFetching(false);
            break;
          default:
            break;
        }
      },
      (error) => {
        console.error('Error with SSE connection:', error);
        setError('Failed to connect to the server.');
        setFetching(false);
      }
    );

    // Clean up the EventSource when the component unmounts or the user submits a new ticker
    return () => {
      closeEventSource();
    };
  };

  const renderStockData = (data) => (
    <div className="bg-white p-4 rounded shadow mt-4 w-full break-words">
      <h3 className="text-lg font-semibold mb-2">Stock Data</h3>
      <pre className="text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );

  const renderDCFAnalysis = (data) => (
    <div className="bg-white p-4 rounded shadow mt-4 w-full break-words">
      <h3 className="text-lg font-semibold mb-2">DCF Analysis</h3>
      <pre className="text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );

  const renderAIExplanation = (data) => {
    // Split the explanation text by new lines and format subtitles
    const paragraphs = data.split('\n').map((paragraph, index) => {
      if (paragraph.startsWith('-')) {
        return (
          <h4 key={index} className="text-md font-semibold mt-2">
            {paragraph.substring(1).trim()}
          </h4>
        );
      }
      return (
        <p key={index} className="text-sm mt-1">
          {paragraph}
        </p>
      );
    });

    return (
      <div className="bg-white p-4 rounded shadow mt-4 w-full break-words">
        <h3 className="text-lg font-semibold mb-2">AI Explanation</h3>
        {paragraphs}
      </div>
    );
  };

  const renderSentimentAnalysis = (data) => (
    <div className="bg-white p-4 rounded shadow mt-4 w-full break-words">
      <h3 className="text-lg font-semibold mb-2">Sentiment Analysis</h3>
      <pre className="text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );

  const renderTechnicalAnalysis = (data) => {
    // Split the text by new lines to create a structured display
    const paragraphs = data.split('\n').map((paragraph, index) => {
      // Check if the paragraph is a subtitle or just a text line
      if (paragraph.startsWith('-')) {
        return (
          <h4 key={index} className="text-md font-semibold mt-2">
            {paragraph.substring(1).trim()}
          </h4>
        );
      }
      return (
        <p key={index} className="text-sm mt-1">
          {paragraph}
        </p>
      );
    });

    return (
      <div className="bg-white p-4 rounded shadow mt-4 w-full break-words">
        <h3 className="text-lg font-semibold mb-2">Technical Analysis</h3>
        {paragraphs}
      </div>
    );
  };

  const renderInsiderSentiment = (data) => {
    // Split the text by new lines to create a structured display
    const paragraphs = data.split('\n').map((paragraph, index) => {
      // Check if the paragraph is a subtitle or just a text line
      if (paragraph.startsWith('-')) {
        return (
          <h4 key={index} className="text-md font-semibold mt-2">
            {paragraph.substring(1).trim()}
          </h4>
        );
      }
      return (
        <p key={index} className="text-sm mt-1">
          {paragraph}
        </p>
      );
    });

    return (
      <div className="bg-white p-4 rounded shadow mt-4 w-full break-words">
        <h3 className="text-lg font-semibold mb-2">Insider Sentiment</h3>
        {paragraphs}
      </div>
    );
  };

  const renderOptionsChainAnalysis = (data) => {
    const paragraphs = data.split('\n').map((paragraph, index) => {
      if (paragraph.startsWith('-')) {
        return (
          <h4 key={index} className="text-md font-semibold mt-2">
            {paragraph.substring(1).trim()}
          </h4>
        );
      }
      return (
        <p key={index} className="text-sm mt-1">
          {paragraph}
        </p>
      );
    });

    return (
      <div className="bg-white p-4 rounded shadow mt-4 w-full break-words">
        <h3 className="text-lg font-semibold mb-2">Options Chain Analysis</h3>
        {paragraphs}
      </div>
    );
  };

  const renderComprehensiveAnalysis = (data) => {
    return (
      <div className="bg-white p-4 rounded shadow mt-4 w-full break-words whitespace-pre-wrap">
        <h3 className="text-lg font-semibold mb-2">Comprehensive Analysis</h3>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="mb-4">
            <strong className="text-md font-semibold">
              {key.replace(/([A-Z])/g, ' $1')}
            </strong>
            <p className="text-sm mt-1">{value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">Stock Analysis</h2>
      <div className="flex flex-col items-center space-y-4 mb-4">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Enter stock ticker"
          className="border border-gray-300 rounded px-4 py-2 w-full max-w-sm"
        />
        <button
          onClick={handleFetchAnalysis}
          disabled={fetching || !ticker}
          className={`px-6 py-2 rounded text-white ${
            fetching
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {fetching ? 'Fetching...' : 'Get Analysis'}
        </button>
      </div>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mt-4 w-full text-center">
          Error: {error}
        </div>
      )}
      {/* {stockData && renderStockData(stockData)} */}
      {dcfAnalysis && renderDCFAnalysis(dcfAnalysis)}
      {aiExplanation && renderAIExplanation(aiExplanation)}
      {sentimentAnalysis && renderSentimentAnalysis(sentimentAnalysis)}
      {technicalAnalysis && renderTechnicalAnalysis(technicalAnalysis)}
      {insiderSentiment && renderInsiderSentiment(insiderSentiment)}
      {optionsChainAnalysis && renderOptionsChainAnalysis(optionsChainAnalysis)}
      {comprehensiveAnalysis &&
        renderComprehensiveAnalysis(comprehensiveAnalysis)}
    </div>
  );
};

export default StockAnalysis;
