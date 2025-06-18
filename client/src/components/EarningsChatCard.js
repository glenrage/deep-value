import React, { useState } from 'react';
import { Card, TextInput, Button, Spinner, Alert } from 'flowbite-react';
import { HiPaperAirplane, HiOutlineExclamationCircle } from 'react-icons/hi';

const EarningsChatCard = ({ ticker }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAskQuestion = async () => {
    if (!query || !ticker) {
      setError('Please enter a question and ensure a ticker is selected.');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    // const backendUrl = process.env.API_URL;
    const backendUrl = 'https://deep-value-production.up.railway.app';
    const apiUrl = `${backendUrl}/api/sentiment/rag?ticker=${encodeURIComponent(
      ticker
    )}&query=${encodeURIComponent(query)}`;

    try {
      const res = await fetch(apiUrl);

      if (!res.ok) {
        let errorMsg = `HTTP error! status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg; // Use backend error if available
        } catch (e) {
          // Ignore if response body is not JSON or empty
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setResponse(data.response);
      setQuery('');
    } catch (err) {
      console.error('Error fetching RAG response:', err);
      setError(err.message || 'Failed to get response from the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !loading && query) {
      handleAskQuestion();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      {' '}
      <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
        Ask about {ticker}'s Latest Earnings Transcript
      </h5>
      <div className="flex items-center gap-2 mb-3">
        <TextInput
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          required
          className="flex-grow"
          disabled={loading || !ticker}
        />
        <Button
          onClick={handleAskQuestion}
          disabled={loading || !query || !ticker}
          isProcessing={loading}
          color="blue"
        >
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <HiPaperAirplane className="h-5 w-5" />
          )}
          <span className="ml-2 hidden sm:inline">
            {loading ? 'Asking...' : 'Ask'}
          </span>{' '}
        </Button>
      </div>
      {error && (
        <Alert
          color="failure"
          icon={HiOutlineExclamationCircle}
          className="mb-3"
        >
          <span className="font-medium">Error!</span> {error}
        </Alert>
      )}
      <div className="flex-grow overflow-y-auto">
        {' '}
        {response && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <p className="font-semibold text-gray-800 dark:text-white mb-2">
              Answer:
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {response}
            </p>
          </div>
        )}
        {!loading && !response && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
            Ask a question about the earnings call above.
          </p>
        )}
      </div>
    </Card>
  );
};

export { EarningsChatCard };
