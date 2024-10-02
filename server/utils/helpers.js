// Formatting news data for sentiment analysis
const formatNewsDataForSentiment = (articles, ticker) => {
  return articles.map((article) => ({
    source: article.source?.name || 'Unknown',
    author: article.author || 'Unknown',
    title: article.title,
    description: article.description,
    content: article.content,
    ticker: ticker,
  }));
};

// Truncate text to a maximum length
const truncateText = (text, maxLength) => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text;
};

const getValueByLabel = (array, labels) => {
  if (typeof labels === 'string') {
    labels = [labels];
  }

  for (let label of labels) {
    const cleanedLabel = label
      .replace(/[^a-zA-Z\s]/g, '')
      .toLowerCase()
      .trim();
    const item = array.find((entry) => {
      const cleanedEntryLabel = entry.label
        .replace(/[^a-zA-Z\s]/g, '')
        .toLowerCase()
        .trim();
      return cleanedEntryLabel.includes(cleanedLabel);
    });
    if (item) {
      return parseFloat(item.value);
    }
  }

  return null;
};

const getValueByConcept = (array, concepts) => {
  if (typeof concepts === 'string') {
    concepts = [concepts];
  }

  for (let concept of concepts) {
    const item = array.find((entry) => entry.concept === concept);
    if (item) {
      return parseFloat(item.value);
    }
  }

  return null;
};

function calculateTerminalGrowthRate(data) {
  const annualReports = data.data.incomeStatement.annualReports;
  const currentRevenue = parseFloat(annualReports[0].totalRevenue);
  const previousRevenue = parseFloat(annualReports[1].totalRevenue);

  // Calculate the revenue growth rate between two most recent years
  const revenueGrowthRate =
    (currentRevenue - previousRevenue) / previousRevenue;

  // Estimate terminal growth rate as a conservative fraction of historical growth
  const terminalGrowthRate = revenueGrowthRate * 0.5; // Assume the long-term growth is half of the short-term growth
  return terminalGrowthRate;
}

const reduceEmbeddingToMatchIndex = (embedding, targetSize = 768) => {
  if (embedding.length > targetSize) {
    return embedding.slice(0, targetSize); // Truncate to match the index dimension
  } else if (embedding.length < targetSize) {
    throw new Error(
      `Embedding size (${embedding.length}) is smaller than expected dimension (${targetSize}).`
    );
  }
  return embedding; // If the size matches exactly, return as is
};

const sanitizeId = (id) => {
  // Replace non-ASCII characters with an underscore or remove them
  // eslint-disable-next-line no-control-regex
  return id.replace(/[^\u0000-\u007F]/g, '_');
};

// Helper function to process and format options data
const processOptionsData = (optionsData) => {
  const { expirationDates, strikes, options } = optionsData;

  const formattedData = options.map((optionChain) => {
    const { expirationDate, calls, puts } = optionChain;

    // Summarize the key metrics of calls and puts for the given expiration date
    const callsSummary = calls.map((call) => ({
      strike: call.strike,
      lastPrice: call.lastPrice,
      volume: call.volume,
      openInterest: call.openInterest,
      impliedVolatility: call.impliedVolatility,
      inTheMoney: call.inTheMoney,
    }));

    const putsSummary = puts.map((put) => ({
      strike: put.strike,
      lastPrice: put.lastPrice,
      volume: put.volume,
      openInterest: put.openInterest,
      impliedVolatility: put.impliedVolatility,
      inTheMoney: put.inTheMoney,
    }));

    // Aggregate the data into a simpler structure for LLM processing
    return {
      expirationDate: expirationDate.toISOString(),
      strikes,
      callsSummary,
      putsSummary,
      putCallRatio: puts.length / (calls.length || 1), // Prevent division by zero
    };
  });

  return {
    expirationDates: expirationDates.map((date) => date.toISOString()),
    formattedData,
  };
};

// Helper function to create input text for LLM from formatted options data
const generateLLMInputText = (formattedOptionsData) => {
  const { expirationDates, formattedData } = formattedOptionsData;

  // Summarize the expiration dates range
  const expirationDatesText = `Available Expiration Dates: from ${
    expirationDates[0]
  } to ${expirationDates[expirationDates.length - 1]}`;

  // Generate summaries for each expiration date in formattedData
  const summaries = formattedData.map((optionChain) => {
    const { expirationDate, callsSummary, putsSummary, putCallRatio, strikes } =
      optionChain;

    // Extract only the key calls and puts (e.g., highest volume and open interest)
    const topCalls = callsSummary
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3)
      .map(
        (call) =>
          `Strike: ${call.strike}, Last Price: ${call.lastPrice}, Volume: ${
            call.volume
          }, OI: ${call.openInterest}, IV: ${call.impliedVolatility.toFixed(
            2
          )}, In-The-Money: ${call.inTheMoney}`
      )
      .join('\n');

    const topPuts = putsSummary
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3)
      .map(
        (put) =>
          `Strike: ${put.strike}, Last Price: ${put.lastPrice}, Volume: ${
            put.volume
          }, OI: ${put.openInterest}, IV: ${put.impliedVolatility.toFixed(
            2
          )}, In-The-Money: ${put.inTheMoney}`
      )
      .join('\n');

    // Provide summary statistics instead of listing all strikes
    const avgCallIV = (
      callsSummary.reduce((acc, call) => acc + call.impliedVolatility, 0) /
      callsSummary.length
    ).toFixed(2);
    const avgPutIV = (
      putsSummary.reduce((acc, put) => acc + put.impliedVolatility, 0) /
      putsSummary.length
    ).toFixed(2);

    return `
      Expiration Date: ${expirationDate}
      Total Strikes Available: ${strikes.length}
      Put-Call Ratio: ${putCallRatio.toFixed(2)}
      Average Call IV: ${avgCallIV}
      Average Put IV: ${avgPutIV}
      
      Top 3 Calls:
      ${topCalls}

      Top 3 Puts:
      ${topPuts}
    `;
  });

  // Combine all the parts into a single LLM input text
  return `${expirationDatesText}\n\n${summaries.join('\n\n')}`;
};

module.exports = {
  calculateTerminalGrowthRate,
  formatNewsDataForSentiment,
  truncateText,
  getValueByLabel,
  getValueByConcept,
  reduceEmbeddingToMatchIndex,
  sanitizeId,
  processOptionsData,
  generateLLMInputText,
};
