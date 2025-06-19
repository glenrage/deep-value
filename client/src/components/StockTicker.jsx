import React, { useState, useEffect, useRef } from 'react';

const getWsBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.REACT_APP_BACKEND_PORT || 4000;
    return `ws://localhost:${port}`;
  } else {
    const host = process.env.REACT_APP_WS_HOST || 'deep-value.onrender.com';
    return `wss://${host}`;
  }
};
const WS_BASE_URL = getWsBaseUrl();

const StockTicker = ({ activeTicker, displayTicker }) => {
  const [price, setPrice] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [marketStatus, setMarketStatus] = useState('Checking...');
  const [connectionStatus, setConnectionStatus] = useState('Idle');
  const [isConnected, setIsConnected] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    // Only attempt to connect if activeTicker is a valid, non-empty string
    if (
      !activeTicker ||
      typeof activeTicker !== 'string' ||
      activeTicker.trim() === ''
    ) {
      setConnectionStatus(
        activeTicker === null
          ? 'Awaiting analysis...'
          : 'No active ticker for stream.'
      );
      // Cleanup any existing WebSocket connection if activeTicker becomes invalid/null
      if (wsRef.current) {
        console.log(
          `[WS ${
            displayTicker || 'Ticker'
          }] Active ticker is now null/invalid. Closing WebSocket.`
        );
        wsRef.current.onclose = null; // Prevent reconnect attempts during manual close
        wsRef.current.close(1000, 'Active ticker removed or invalid');
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setPrice(null); // Clear price data
      setTimestamp(null);
      return; // Exit effect early
    }

    // If here, activeTicker is valid, proceed with connection logic
    const connectWebSocket = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Avoid reconnecting if already connected or connecting for the same activeTicker
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) &&
        wsRef.current.subscribedTicker === activeTicker.toUpperCase()
      ) {
        console.log(
          `[WS ${activeTicker}] Already connected/connecting for this ticker.`
        );
        return;
      }

      // If there's an existing ws connection (possibly for a different ticker), close it first.
      if (wsRef.current) {
        console.log(
          `[WS ${wsRef.current.subscribedTicker}] Closing previous WebSocket before connecting to ${activeTicker}.`
        );
        wsRef.current.onclose = null; // Prevent its onclose from triggering a reconnect for the old ticker
        wsRef.current.close(1000, `Switching ticker to ${activeTicker}`);
        wsRef.current = null;
      }

      console.log(
        `[WS ${activeTicker}] Attempting to connect to ${WS_BASE_URL}`
      );
      setPrice(null); // Reset price on new connection attempt
      setTimestamp(null);
      setConnectionStatus(`Connecting to ${activeTicker}...`);

      const socket = new WebSocket(WS_BASE_URL);
      wsRef.current = socket;
      wsRef.current.subscribedTicker = null; // Initialize what this socket instance is for

      socket.onopen = () => {
        console.log(`[WS ${activeTicker}] Connected to WebSocket server.`);
        setIsConnected(true); // Keep your isConnected state if other UI depends on it
        setConnectionStatus(`Connected. Subscribing to ${activeTicker}...`);
        socket.send(
          JSON.stringify({
            type: 'subscribe',
            ticker: activeTicker.toUpperCase(),
          })
        );
        if (wsRef.current)
          wsRef.current.subscribedTicker = activeTicker.toUpperCase(); // Mark as subscribed
      };

      socket.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          // Only update if the message is for the currently active ticker
          if (
            parsedData.type === 'trade_update' &&
            parsedData.ticker === activeTicker.toUpperCase()
          ) {
            if (parsedData.price !== undefined && parsedData.timestamp) {
              setPrice(parsedData.price);
              setTimestamp(new Date(parsedData.timestamp).toLocaleTimeString());
              // setMarketStatus('Open'); // Market status should ideally come from a different source or be more robust
            } else {
              console.error(
                `[WS ${activeTicker}] Invalid trade_update data:`,
                parsedData
              );
            }
          } else if (
            parsedData.type === 'status' &&
            parsedData.ticker === activeTicker.toUpperCase()
          ) {
            // console.log(`[WS ${activeTicker}] Status from server: ${parsedData.message}`);
            setConnectionStatus(parsedData.message);
          } else if (parsedData.type === 'error') {
            console.error(
              `[WS ${activeTicker}] Error from server: ${parsedData.message}`
            );
            setConnectionStatus(`Server error: ${parsedData.message}`);
          }
        } catch (err) {
          console.error(
            `[WS ${activeTicker}] Failed to parse message:`,
            event.data,
            err
          );
        }
      };

      socket.onerror = (err) => {
        console.error(
          `[WS ${activeTicker}] WebSocket error:`,
          err.message || 'Unknown WebSocket error'
        );
        // Don't set isConnected to false here directly, onclose will handle it.
        // ws.close() is often implicitly called or will be handled by onclose.
        setConnectionStatus(`Connection error for ${activeTicker}.`);
      };

      socket.onclose = (event) => {
        console.log(
          `[WS ${activeTicker}] WebSocket disconnected. Clean: ${event.wasClean}, Code: ${event.code}`
        );
        setIsConnected(false);
        // Only attempt to reconnect if this socket instance (wsRef.current) was the one that closed
        // and the closure was not intentional (e.g., component unmount, ticker change).
        if (wsRef.current === socket && !event.wasClean) {
          setConnectionStatus(
            `Disconnected. Reconnecting ${activeTicker} in 5s...`
          );
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        } else if (wsRef.current === socket && event.wasClean) {
          setConnectionStatus(`Disconnected from ${activeTicker}.`);
        }
        // If wsRef.current is null or different, it means cleanup/new connection handled it.
      };
    };

    connectWebSocket();

    // Market status check (this is independent of the WebSocket connection itself)
    const checkMarketStatus = () => {
      const now = new Date();
      const day = now.getDay();
      // Using ET for market hours more reliably
      const localTime = new Date();
      const etTime = new Date(
        localTime.toLocaleString('en-US', { timeZone: 'America/New_York' })
      );
      const hourET = etTime.getHours();
      const minuteET = etTime.getMinutes();
      const marketOpenHourET = 9;
      const marketOpenMinuteET = 30;
      const marketCloseHourET = 16;
      const isWeekday = day >= 1 && day <= 5; // Monday to Friday
      const isMarketHours =
        isWeekday &&
        (hourET > marketOpenHourET ||
          (hourET === marketOpenHourET && minuteET >= marketOpenMinuteET)) &&
        hourET < marketCloseHourET;
      setMarketStatus(isMarketHours ? 'Open' : 'Closed');
    };
    checkMarketStatus();
    const marketStatusIntervalId = setInterval(checkMarketStatus, 60000);

    // Cleanup function: This is critical
    return () => {
      console.log(
        `[WS ${activeTicker || displayTicker}] Cleaning up WebSocket effect.`
      );
      clearInterval(marketStatusIntervalId);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        console.log(
          `[WS ${
            activeTicker || displayTicker
          }] Closing WebSocket connection during cleanup.`
        );
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null; // Crucial: prevent onclose from triggering reconnect after cleanup
        wsRef.current.close(
          1000,
          'Component unmounting or activeTicker changed'
        );
        wsRef.current = null;
      }
      setIsConnected(false); // Reset connection status on cleanup
      // setConnectionStatus('Idle'); // Or a suitable status
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTicker]); // Effect depends ONLY on activeTicker

  // Determine what to display based on activeTicker and connection state
  const showPrice = price !== null && marketStatus === 'Open' && activeTicker;
  let statusMessage = 'Enter ticker & click "Get Analysis".';
  if (activeTicker) {
    statusMessage = connectionStatus;
  }
  if (marketStatus === 'Closed' && activeTicker) {
    statusMessage = `Market is closed. ${connectionStatus}`;
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white shadow-lg rounded-lg border border-gray-300 min-w-[250px] max-w-[250px]">
      <h2
        className="text-2xl font-bold text-gray-800 mb-1 truncate"
        title={displayTicker || '---'}
      >
        {displayTicker || '---'}
      </h2>
      <p
        className={`text-sm ${
          marketStatus === 'Open' ? 'text-green-500' : 'text-red-500'
        } mb-1`}
      >
        Market: {marketStatus}
      </p>
      <p
        className="text-xs text-gray-500 mb-2 truncate w-full text-center"
        title={statusMessage}
      >
        {statusMessage}
      </p>
      {showPrice ? (
        <div className="text-center">
          <p className="text-green-500 text-4xl font-semibold mb-2">
            ${price?.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">Last: {timestamp}</p>
        </div>
      ) : (
        <p className="text-gray-500 text-sm h-[40px] flex items-center justify-center text-center">
          {activeTicker && marketStatus === 'Open' && isConnected
            ? 'Loading price...'
            : activeTicker &&
              marketStatus === 'Open' &&
              !isConnected &&
              connectionStatus.toLowerCase().includes('reconnecting')
            ? 'Reconnecting...'
            : activeTicker && marketStatus === 'Closed'
            ? 'Market Closed'
            : !activeTicker
            ? 'No active ticker.'
            : 'Awaiting data...'}
        </p>
      )}
    </div>
  );
};

export { StockTicker };
