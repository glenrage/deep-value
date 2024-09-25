const { OpenAI } = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI(OPENAI_API_KEY);

const getAIExplanation = async (dcfResult) => {
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
    //       content: `Explain the following DCF result in simple terms: ${dcfResult}`,
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
              'A DCF result of 157 indicates that the present value of the future cash flows of the stock or investment being analyzed is $157. This value is based on the estimated cash flows the investment is expected to generate in the future, discounted back to the present value using a discount rate. In simple terms, it suggests that the investment is currently valued at $157 based on its expected future cash flows.',
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
