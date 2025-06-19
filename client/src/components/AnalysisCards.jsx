import React from 'react';
import { Card, Spinner } from 'flowbite-react';
import {
  HiInformationCircle,
  HiUserGroup,
  HiCurrencyDollar,
  HiBeaker,
  HiAcademicCap,
} from 'react-icons/hi';

const LoadingState = ({ title = 'Data' }) => (
  <div className="flex flex-col justify-center items-center h-full min-h-[150px] text-slate-400">
    <Spinner size="lg" color="info" aria-label={`Loading ${title}`} />
    <p className="ml-3 mt-2 text-sm">Loading {title.toLowerCase()}...</p>
  </div>
);

const NoDataState = ({ message = 'No data available for this analysis.' }) => (
  <div className="flex flex-col justify-center items-center h-full min-h-[150px] text-slate-500">
    <HiInformationCircle className="w-10 h-10 mb-3" />
    <p className="text-sm">{message}</p>
  </div>
);

// Base Card structure for all analysis cards
const BaseAnalysisCard = ({ title, icon, children, className = '' }) => (
  <Card
    className={`bg-slate-800/60 border border-slate-700 shadow-xl rounded-xl flex flex-col h-96 transition-all duration-300 hover:shadow-sky-500/20 hover:border-sky-600/70 ${className}`}
  >
    <div className="flex items-center text-sky-400 p-2 border-b border-slate-700">
      {icon &&
        React.cloneElement(icon, { className: 'w-6 h-6 mr-3 flex-shrink-0' })}
      <h3 className="text-lg font-semibold truncate" title={title}>
        {title}
      </h3>
    </div>
    <div className="p-2 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
      {children}
    </div>
  </Card>
);

// Generic Analysis Card (for AI Explanations, Technical, Insider, Options)
export const AnalysisCard = ({ title, data, loading, icon = <HiBeaker /> }) => (
  <BaseAnalysisCard title={title} icon={icon}>
    {loading ? (
      <LoadingState title={title} />
    ) : data ? (
      typeof data === 'string' ? (
        // Render string data, respecting newlines and basic formatting
        data.split('\n').map((line, index) => (
          <p
            key={index}
            className={`text-sm text-slate-300 mb-1 ${
              line.startsWith('- ') || line.startsWith('* ') ? 'ml-4' : ''
            } ${line.match(/^(\d+\.|[A-Z]\.)\s/) ? 'ml-2' : ''} ${
              /^\s*$/.test(line) ? 'h-2' : ''
            }`}
          >
            {line.replace(/^(- |\* )/, '')}
          </p>
        ))
      ) : (
        <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words">
          {JSON.stringify(data, null, 2)}
        </pre>
      )
    ) : (
      <NoDataState />
    )}
  </BaseAnalysisCard>
);

export const DCFAnalysisCard = ({ title, data, loading }) => (
  <BaseAnalysisCard title={title} icon={<HiCurrencyDollar />}>
    {loading ? (
      <LoadingState title={title} />
    ) : data ? (
      <div className="space-y-4 text-slate-300 text-base flex flex-col justify-center h-full items-center">
        <div className="text-center p-3 rounded-md bg-green-500/10 border border-green-500/30 w-full max-w-xs">
          <p className="text-xs text-green-300">Best Case</p>
          <p className="text-2xl font-bold text-green-400">
            ${data.bestCase?.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 w-full max-w-xs">
          <p className="text-xs text-yellow-300">Average Case</p>
          <p className="text-2xl font-bold text-yellow-400">
            ${data.averageCase?.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 rounded-md bg-red-500/10 border border-red-500/30 w-full max-w-xs">
          <p className="text-xs text-red-300">Worst Case</p>
          <p className="text-2xl font-bold text-red-400">
            ${data.worstCase?.toFixed(2)}
          </p>
        </div>
        {data.currentPrice !== undefined && (
          <p className="mt-2 pt-3 border-t border-slate-700 text-sm text-slate-400 w-full max-w-xs text-center">
            Current Price:{' '}
            <span className="font-semibold text-slate-200">
              ${data.currentPrice?.toFixed(2)}
            </span>
          </p>
        )}
      </div>
    ) : (
      <NoDataState />
    )}
  </BaseAnalysisCard>
);

export const SentimentAnalysisCard = ({ title, data, loading }) => (
  <BaseAnalysisCard title={title} icon={<HiUserGroup />}>
    {loading ? (
      <LoadingState title={title} />
    ) : data && data.overallSentiment ? (
      <div className="space-y-3 text-slate-300">
        <div className="flex items-center mb-3">
          <span className="font-semibold text-sm mr-2">Overall Sentiment:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold
            ${
              data.overallSentiment === 'positive'
                ? 'bg-green-400/80 text-green-900 shadow-md shadow-green-500/30'
                : data.overallSentiment === 'negative'
                ? 'bg-red-400/80 text-red-900 shadow-md shadow-red-500/30'
                : 'bg-yellow-400/80 text-yellow-900 shadow-md shadow-yellow-500/30'
            }`}
          >
            {data.overallSentiment.toUpperCase()}
          </span>
        </div>
        {data.sentimentBreakdown && (
          <div className="text-sm space-y-1">
            <p>
              Positive Articles:{' '}
              <span className="font-semibold text-green-400">
                {data.sentimentBreakdown.positive}
              </span>
            </p>
            <p>
              Negative Articles:{' '}
              <span className="font-semibold text-red-400">
                {data.sentimentBreakdown.negative}
              </span>
            </p>
            <p>
              Neutral Articles:{' '}
              <span className="font-semibold text-yellow-400">
                {data.sentimentBreakdown.neutral}
              </span>
            </p>
          </div>
        )}
        {data.articles && data.articles.length > 0 && (
          <>
            <h6 className="text-sm font-semibold mt-4 pt-3 mb-2 text-sky-400 border-t border-slate-700">
              Key Articles:
            </h6>
            <div className="space-y-3 max-h-48 pr-1">
              {' '}
              {data.articles.slice(0, 3).map((article, index) => (
                <div
                  key={index}
                  className="pb-2 border-b border-slate-700/50 last:border-b-0"
                >
                  <p
                    className="text-xs font-medium text-slate-200 truncate"
                    title={article.title}
                  >
                    {article.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="italic">{article.source}</span> |{' '}
                    {article.sentiment}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    ) : (
      <NoDataState />
    )}
  </BaseAnalysisCard>
);

export const ComprehensiveAnalysisCard = ({ title, data, loading }) => (
  <BaseAnalysisCard title={title} icon={<HiAcademicCap />}>
    {loading ? (
      <LoadingState title={title} />
    ) : data ? (
      typeof data === 'object' && !Array.isArray(data) && data !== null ? (
        Object.entries(data).map(([key, value]) => (
          <div key={key} className="mb-3">
            <h4 className="text-sm font-semibold text-sky-400 capitalize mb-0.5">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {String(value)}
            </p>
          </div>
        ))
      ) : typeof data === 'string' ? (
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {data}
        </p>
      ) : (
        <NoDataState />
      )
    ) : (
      <NoDataState />
    )}
  </BaseAnalysisCard>
);
