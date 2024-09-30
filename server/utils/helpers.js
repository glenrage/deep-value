// Formatting news data for sentiment analysis
const formatNewsDataForSentiment = (articles) => {
  return articles.map((article) => ({
    source: article.source?.name || 'Unknown',
    author: article.author || 'Unknown',
    title: article.title,
    description: article.description,
    content: article.content,
  }));
};

// Truncate text to a maximum length
const truncateText = (text, maxLength) => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text;
};

module.exports = {
  formatNewsDataForSentiment,
  truncateText,
};
