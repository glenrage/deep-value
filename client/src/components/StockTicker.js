import React, { useState, useEffect } from 'react';

const StockTicker = ({ ticker }) => {
  const [price, setPrice] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [marketStatus, setMarketStatus] = useState('Checking...');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      console.log('Connected to WebSocket');
      ws.send(JSON.stringify({ type: 'subscribe', ticker }));
    };

    ws.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      console.log('Received data from WebSocket:', parsedData);
      if (parsedData.type === 'trade_update') {
        setPrice(parsedData.price);
        setTimestamp(new Date(parsedData.timestamp).toLocaleTimeString());
        setMarketStatus('Open');
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket');
    };

    // Check if market is open
    const checkMarketStatus = () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const isWeekday = day > 0 && day < 6;
      const isMarketHours =
        (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16;

      if (isWeekday && isMarketHours) {
        setMarketStatus('Open');
      } else {
        setMarketStatus('Closed');
      }
    };

    checkMarketStatus();
    const statusInterval = setInterval(checkMarketStatus, 60000); // Check every minute

    return () => {
      ws.close();
      clearInterval(statusInterval);
    };
  }, [ticker]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white shadow-lg rounded-lg border border-gray-300">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{ticker}</h2>
      <p
        className={`text-sm ${
          marketStatus === 'Open' ? 'text-green-500' : 'text-red-500'
        } mb-2`}
      >
        Market Status: {marketStatus}
      </p>
      {price ? (
        <div className="text-center">
          <p className="text-green-500 text-4xl font-semibold mb-2">
            ${price.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">Last updated at: {timestamp}</p>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          {marketStatus === 'Open'
            ? 'Loading price...'
            : 'Market is currently closed'}
        </p>
      )}
    </div>
  );
};

export { StockTicker };
