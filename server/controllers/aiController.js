const aiService = require('../services/aiService');

const requestAIExplanation = async (req, res) => {
  const num = 157; // Example DCF result, change this to dynamic input if needed.

  try {
    // Await the result from the async service function
    const data = await aiService.getStockExplanation(num);

    // Return the AI-generated explanation in the response
    res.json({
      explanation: data,
    });
  } catch (error) {
    // Handle any errors that occur during the request
    console.error('Error fetching AI explanation:', error);
    res.status(500).json({ error: 'Failed to get AI explanation' });
  }
};

const requestTAExplanation = async (req, res) => {
  const mock = {
    sma: {
      current: 36.67214339120047,
      mean: 26.361695559720832,
      max: 36.67214339120047,
      min: 21.21071434020996,
    },
    ema: {
      current: 36.22337844555479,
      mean: 26.419920786152556,
      max: 36.22337844555479,
      min: 21.31971196847661,
    },
    rsi: {
      current: 64.15,
      mean: 58.25359649122808,
      max: 79.52,
      min: 22.01,
    },
    macd: {
      current: {
        MACD: 1.616354230700992,
        signal: 1.7503933784459003,
        histogram: -0.13403914774490833,
      },
      histogramMean: null,
      signalCrossovers: 6,
    },
    stochastic: {
      currentK: 57.36547172860293,
      currentD: 68.72068244964314,
    },
    obv: {
      current: 1268029432,
      trend: 'Uptrend',
    },
  };

  try {
    // Await the result from the async service function
    const data = await aiService.getTAExplanation(mock, 'PLTR');

    // Return the AI-generated explanation in the response
    res.json({
      explanation: data,
    });
  } catch (error) {
    // Handle any errors that occur during the request
    console.error('Error fetching AI explanation:', error);
    res.status(500).json({ error: 'Failed to get AI explanation' });
  }
};

module.exports = {
  requestAIExplanation,
  requestTAExplanation,
};
