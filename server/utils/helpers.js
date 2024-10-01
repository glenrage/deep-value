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

module.exports = {
  calculateTerminalGrowthRate,
  formatNewsDataForSentiment,
  truncateText,
  getValueByLabel,
  getValueByConcept,
};
