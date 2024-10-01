const technicalIndicators = require('technicalindicators');

const summarizeTechnicalIndicators = (sma, ema, rsi, macd, stochastic, obv) => {
  return {
    sma: {
      current: sma[sma.length - 1],
      mean: sma.reduce((a, b) => a + b, 0) / sma.length,
      max: Math.max(...sma),
      min: Math.min(...sma),
    },
    ema: {
      current: ema[ema.length - 1],
      mean: ema.reduce((a, b) => a + b, 0) / ema.length,
      max: Math.max(...ema),
      min: Math.min(...ema),
    },
    rsi: {
      current: rsi[rsi.length - 1],
      mean: rsi.reduce((a, b) => a + b, 0) / rsi.length,
      max: Math.max(...rsi),
      min: Math.min(...rsi),
    },
    macd: {
      current: macd[macd.length - 1],
      histogramMean: macd.reduce((a, b) => a + b.histogram, 0) / macd.length,
      signalCrossovers: macd.filter(
        (val, idx) =>
          idx > 0 &&
          ((val.MACD > val.signal &&
            macd[idx - 1].MACD <= macd[idx - 1].signal) ||
            (val.MACD < val.signal &&
              macd[idx - 1].MACD >= macd[idx - 1].signal))
      ).length,
    },
    stochastic: {
      currentK: stochastic[stochastic.length - 1].k,
      currentD: stochastic[stochastic.length - 1].d,
    },
    obv: {
      current: obv[obv.length - 1],
      trend: obv[obv.length - 1] - obv[0] > 0 ? 'Uptrend' : 'Downtrend',
    },
  };
};

const calculateTechnicalIndicators = (input) => {
  const data = input.quotes;

  // Extract adjusted close prices for technical indicator calculations
  const closePrices = data.map((d) => d.adjclose);
  const volume = data.map((d) => d.volume);

  // Calculate technical indicators
  const sma = technicalIndicators.SMA.calculate({
    values: closePrices,
    period: 14,
  });

  const ema = technicalIndicators.EMA.calculate({
    values: closePrices,
    period: 14,
  });

  const rsi = technicalIndicators.RSI.calculate({
    values: closePrices,
    period: 14,
  });

  const macd = technicalIndicators.MACD.calculate({
    values: closePrices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const stochastic = technicalIndicators.Stochastic.calculate({
    high: data.map((d) => d.high),
    low: data.map((d) => d.low),
    close: closePrices,
    period: 14,
    signalPeriod: 3,
  });

  const obv = technicalIndicators.OBV.calculate({
    close: closePrices,
    volume,
  });

  const summarizedData = summarizeTechnicalIndicators(
    sma,
    ema,
    rsi,
    macd,
    stochastic,
    obv
  );

  return summarizedData;
};

module.exports = {
  calculateTechnicalIndicators,
};
