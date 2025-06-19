import { Card, Spinner } from 'flowbite-react';

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
                ${data.bestCase?.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-wrap items-center">
              <span className="font-semibold text-blue-700">Average Case:</span>
              <span className="ml-2 text-gray-700">
                ${data.averageCase?.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-wrap">
              <span className="font-semibold text-blue-700">Worst Case:</span>
              <span className="ml-2 text-gray-700">
                ${data.worstCase?.toFixed(2)}
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

const SentimentAnalysisCard = ({ title, data, loading, analysisData }) => (
  <Card className="w-full mt-4 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 h-96 bg-white">
    <h5 className="text-lg font-semibold mb-1 text-blue-800">{title}</h5>
    {!analysisData && loading ? (
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
          <>
            <div className="flex flex-wrap mb-1 items-center">
              <span className="font-semibold text-blue-700">
                Overall Sentiment:
              </span>
              <span className="ml-2 text-gray-700">
                {data.overallSentiment}
              </span>
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
          </>
        ) : (
          <p className="text-sm text-gray-500">No data available</p>
        )}
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
        {data ? (
          Object.entries(data).map(([key, value]) => (
            <div key={key} className="mb-4">
              <h6 className="text-md font-semibold text-blue-700 capitalize mb-1">
                {key.replace(/([A-Z])/g, ' $1')}
              </h6>
              <p className="text-sm text-gray-700">{value}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No data available</p>
        )}
      </div>
    )}
  </Card>
);

export {
  AnalysisCard,
  DCFAnalysisCard,
  SentimentAnalysisCard,
  ComprehensiveAnalysisCard,
};
