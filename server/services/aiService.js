const { OpenAI } = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI(OPENAI_API_KEY);

const getAIExplanation = async (dcfResult, stockData) => {
  const messageContent = `
  You are a financial expert providing insights on stock valuation. Please provide an analysis of the following data in simple terms:
  
  1. Discounted Cash Flow (DCF) Analysis:
     - Best Case Intrinsic Value: ${dcfResult.bestCase}
     - Average Case Intrinsic Value: ${dcfResult.averageCase}
     - Worst Case Intrinsic Value: ${dcfResult.worstCase}
     - Current Market Price: ${stockData.currentPrice}
  
  2. Key Financial Metrics:
     - Market Capitalization: ${stockData.marketCap}
     - Beta: ${stockData.beta}
     - Shares Outstanding: ${stockData.sharesOutstanding}
     - Forward PE: ${stockData.keyStats.defaultKeyStatistics.forwardPE}
     - P/S Ratio: ${stockData.keyStats.summaryDetail.priceToSalesTrailing12Months}
     - Quarterly Revenue Growth: ${stockData.keyStats.defaultKeyStatistics.earningsQuarterlyGrowth}
     - PEG Ratio: ${stockData.keyStats.defaultKeyStatistics.pegRatio}
  
  3. Scenario Assumptions:
     - Best Case: Growth rate was increased by 20%, discount rate was reduced by 1%, terminal growth rate was increased by 0.5%.
     - Worst Case: Growth rate was decreased by 20%, discount rate was increased by 1%, terminal growth rate was decreased by 0.5%.
  
  Please explain what these values suggest about the stock's current valuation, and if the stock appears undervalued or overvalued given the provided scenarios and market conditions.
`;

  try {
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-3.5-turbo',
    //   messages: [
    //     {
    //       role: 'system',
    //       content:
    //         'You are a financial expert providing insights on stock valuation.',
    //     },
    //     {
    //       role: 'user',
    //       content: messageContent,
    //     },
    //   ],
    // });

    const response = {
      explanation:
        'A DCF result of 157 indicates that the present value of the future cash flows of the stock or investment being analyzed is $157. This value is based on the estimated cash flows the investment is expected to generate in the future, discounted back to the present value using a discount rate. In simple terms, it suggests that the investment is currently valued at $157 based on its expected future cash flows.',
      id: 'chatcmpl-ABPtEL8wHHxXlN1KXyJIbrLHjgZyS',
      object: 'chat.completion',
      created: 1727284492,
      model: 'gpt-3.5-turbo-0125',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              "Based on the Discounted Cash Flow (DCF) Analysis provided, we can see that the intrinsic values for the stock in the Best Case, Average Case, and Worst Case scenarios are $117.76, $72.41, and $43.00 respectively. The current market price of the stock is $121.40.\n\nFrom the Key Financial Metrics, we can observe that the market capitalization is $2.98 trillion, the Beta is 1.673, the Forward PE ratio is 30.21, and the P/S ratio is 30.93. The PEG ratio is 0.81, indicating that the stock may be undervalued based on its growth prospects.\n\nThe Scenario Assumptions provide insights into the impact of changes in growth rates, discount rates, and terminal growth rates on the stock's valuation. In the Best Case scenario, with improved growth prospects and lower discount rates, the intrinsic value of the stock increases. Conversely, in the Worst Case scenario, where growth prospects deteriorate and discount rates increase, the intrinsic value decreases.\n\nGiven the current market conditions and the provided scenarios, it appears that the stock may be slightly overvalued based on the Best Case intrinsic value compared to the current market price. However, in the Average and Worst Case scenarios, the stock seems to be valued closer to its intrinsic value or even slightly undervalued.\n\nOverall, investors should consider the different scenarios and market conditions when evaluating the stock's valuation and make informed decisions based on their risk tolerance and investment objectives.",
            refusal: null,
          },
          logprobs: null,
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 35,
        completion_tokens: 81,
        total_tokens: 116,
        completion_tokens_details: {
          reasoning_tokens: 0,
        },
      },
      system_fingerprint: null,
    };

    console.dir(response, { depth: null });

    const explanation = response.choices[0].message.content;

    return explanation;
  } catch (error) {
    console.error('Error getting AI explanation:', error);
    throw new Error('Failed to get AI explanation');
  }
};

module.exports = {
  getAIExplanation,
};
