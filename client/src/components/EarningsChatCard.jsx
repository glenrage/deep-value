import { useState } from 'react';
import { Card, TextInput, Button, Spinner, Alert } from 'flowbite-react';
import {
  HiPaperAirplane,
  HiOutlineExclamationCircle,
  HiChatAlt2,
  HiQuestionMarkCircle,
  HiInformationCircle,
} from 'react-icons/hi';
import { fetchRagEarningsResponse } from '../utils/queries';

const EarningsChatCard = ({ ticker }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAskQuestion = async () => {
    if (!query.trim() || !ticker) {
      setError('Please enter a question.'); // No need to mention ticker if it's already part of the card context
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null); // Clear previous response

    try {
      const data = await fetchRagEarningsResponse(ticker, query.trim());
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
    if (event.key === 'Enter' && !loading && query.trim()) {
      event.preventDefault(); // Prevent default form submission if in a form
      handleAskQuestion();
    }
  };

  return (
    <Card className="h-100 flex flex-col bg-slate-800/60 border border-slate-700 shadow-xl rounded-xl transition-all duration-300 hover:shadow-sky-500/20 hover:border-sky-600/70">
      <div className="flex items-center p-4 border-b border-slate-700">
        <HiChatAlt2 className="w-6 h-6 mr-2 text-sky-400 flex-shrink-0" />
        <h5 className="text-lg font-semibold text-sky-300">
          Ask about {ticker ? `${ticker}'s` : "Selected Ticker's"} latest
          earnings report
        </h5>
      </div>

      <div className="p-4 flex-grow flex flex-col min-h-0">
        {' '}
        <div className="flex items-center gap-2 mb-2">
          <TextInput
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., What was revenue growth?"
            required
            className="flex-grow [&_input]:bg-slate-700 [&_input]:border-slate-600 [&_input]:text-gray-100 [&_input]:placeholder-slate-500 [&_input]:rounded-lg focus:[&_input]:border-sky-500 focus:[&_input]:ring-sky-500"
            disabled={loading || !ticker}
            aria-label="Ask a question about earnings"
          />
          <Button
            onClick={handleAskQuestion}
            disabled={loading || !query.trim() || !ticker}
            isProcessing={loading}
            processingSpinner={<Spinner size="sm" color="currentColor" />}
            gradientDuoTone="purpleToBlue"
            size="md"
            className="transition-all duration-200 ease-in-out hover:scale-105 focus:ring-2 focus:ring-sky-500/70 disabled:opacity-60 disabled:saturate-50"
            pill
          >
            <HiPaperAirplane
              className={`h-5 w-5 ${loading ? 'hidden' : 'inline'}`}
            />
            <span
              className={`ml-2 ${
                loading ? 'hidden sm:inline' : 'hidden sm:inline'
              }`}
            >
              Ask
            </span>
          </Button>
        </div>
        {error && (
          <Alert
            color="failure"
            icon={HiOutlineExclamationCircle}
            className="mb-3 bg-red-900/30 border-red-700 text-red-200 [&_svg]:text-red-300" // Custom dark theme for failure alert
            rounded
          >
            <span className="font-medium">Error!</span> {error}
          </Alert>
        )}
        <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50 rounded-md bg-slate-800/30 p-3 min-h-[100px]">
          {loading &&
            !response && ( // Show spinner only when loading and no previous response
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Spinner size="lg" color="info" />
                <p className="mt-2 text-sm">
                  Fetching insights from earnings...
                </p>
              </div>
            )}
          {response && (
            <div className="animate-fadeIn">
              <p className="font-semibold text-sky-400 mb-1.5 text-sm">
                Answer:
              </p>
              <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {response}
              </p>
            </div>
          )}
          {!loading && !response && !error && ticker && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <HiQuestionMarkCircle className="w-10 h-10 mb-2" />
              <p className="text-sm text-center">
                Ask a specific question about the {ticker} earnings call
                transcript above.
              </p>
            </div>
          )}
          {!loading && !response && !error && !ticker && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <HiInformationCircle className="w-10 h-10 mb-2" />
              <p className="text-sm text-center">
                Select a ticker and click "Get Analysis" first.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export { EarningsChatCard };
