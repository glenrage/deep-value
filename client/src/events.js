// const eventSource = new EventSource('/api/stock-analysis?ticker=AAPL');

// eventSource.onmessage = function (event) {
//   const data = JSON.parse(event.data);
//   switch (data.type) {
//     case 'stockData':
//       renderStockData(data.data);
//       break;
//     case 'dcfAnalysis':
//       renderDCFAnalysis(data.data);
//       break;
//     case 'aiExplanation':
//       renderAIExplanation(data.data);
//       break;
//     case 'sentimentAnalysis':
//       renderSentimentAnalysis(data.data);
//       break;
//     case 'technicalAnalysis':
//       renderTechnicalAnalysis(data.data);
//       break;
//     case 'insiderSentiment':
//       renderInsiderSentiment(data.data);
//       break;
//     case 'complete':
//       console.log('Analysis complete');
//       break;
//     case 'error':
//       console.error('Error:', data.message);
//       break;

//     default:
//       break;
//   }
// };
