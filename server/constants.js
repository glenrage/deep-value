const model =
  process.env.NODE_ENV === 'development'
    ? 'gpt-3.5-turbo'
    : process.env.AI_MODEL;

module.exports = {
  model,
};
