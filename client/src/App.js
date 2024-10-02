import './App.css';
import StockAnalysis from './components/StockAnalysis';

function App() {
  return (
    <div className='App'>
      <h1>Stock Analysis</h1>
      <StockAnalysis ticker='NVDA' />
    </div>
  );
}

export default App;
