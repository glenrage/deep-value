import React, { useState, useEffect } from 'react';

const StockTicker = ({ ticker, stream }) => {
  const [price, setPrice] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [marketStatus, setMarketStatus] = useState('Checking...');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let ws;
    let reconnectInterval;

    const connectWebSocket = () => {
      ws = new WebSocket('ws://localhost:8080');

      ws.onopen = () => {
        console.log('Connected to WebSocket');
        setIsConnected(true);
        ws.send(JSON.stringify({ type: 'subscribe', ticker }));
      };

      ws.onmessage = (event) => {
        const parsedData = JSON.parse(event.data);
        if (parsedData.type === 'trade_update') {
          if (parsedData.price && parsedData.timestamp) {
            setPrice(parsedData.price);
            setTimestamp(new Date(parsedData.timestamp).toLocaleTimeString());
            setMarketStatus('Open');
          } else {
            console.error('Invalid trade update data:', parsedData);
          }
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from WebSocket, attempting to reconnect...');
        setIsConnected(false);
        reconnectInterval = setTimeout(connectWebSocket, 5000); // Try reconnecting after 5 seconds
      };
    };

    connectWebSocket();

    // Check market status
    const checkMarketStatus = () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const isWeekday = day > 0 && day < 6;
      const isMarketHours =
        (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16;

      setMarketStatus(isWeekday && isMarketHours ? 'Open' : 'Closed');
    };

    checkMarketStatus();
    const statusInterval = setInterval(checkMarketStatus, 60000); // Check every minute

    // Cleanup: Close WebSocket and clear intervals on unmount
    return () => {
      if (ws) ws.close();
      clearInterval(reconnectInterval);
      clearInterval(statusInterval);
    };
  }, [ticker, stream]);

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
            ${price?.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">Last updated at: {timestamp}</p>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          {marketStatus === 'Open'
            ? isConnected
              ? 'Loading price...'
              : 'Reconnecting...'
            : 'Market is currently closed'}
        </p>
      )}
    </div>
  );
};

export { StockTicker };
