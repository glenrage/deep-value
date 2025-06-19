import React, { useState, useEffect, useRef } from 'react';

const WS_BASE_URL =
  process.env.REACT_APP_NODE_ENV === 'development'
    ? 'ws://localhost:4000'
    : 'wss://deep-value.onrender.com';

const StockTicker = ({ ticker, stream }) => {
  const [price, setPrice] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [marketStatus, setMarketStatus] = useState('Checking...');
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  useEffect(() => {
    if (!ticker) return;

    const connectWebSocket = () => {
      const ws = new WebSocket(WS_BASE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        ws.send(JSON.stringify({ type: 'subscribe', ticker }));
      };

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          if (parsedData.type === 'trade_update') {
            if (parsedData.price && parsedData.timestamp) {
              setPrice(parsedData.price);
              setTimestamp(new Date(parsedData.timestamp).toLocaleTimeString());
              setMarketStatus('Open');
            }
          }
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected, will retry...');
        setIsConnected(false);
        reconnectRef.current = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        ws.close(); // Force close so onclose triggers reconnect
      };
    };

    connectWebSocket();

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
    const intervalId = setInterval(checkMarketStatus, 60000);

    return () => {
      if (wsRef.current) {
        console.log('[WS] Cleaning up WebSocket');
        wsRef.current.close();
      }
      clearInterval(intervalId);
      clearTimeout(reconnectRef.current);
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
