import { useState, useEffect, useRef } from 'react';
import { Spinner, Card } from 'flowbite-react';
import {
  HiOutlineClock,
  HiOutlineStatusOnline,
  HiOutlineStatusOffline,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiExclamationCircle,
} from 'react-icons/hi';

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
  const [prevPrice, setPrevPrice] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [marketStatus, setMarketStatus] = useState('Checking...');
  const [connectionStatus, setConnectionStatus] = useState('Idle');
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (
      !activeTicker ||
      typeof activeTicker !== 'string' ||
      activeTicker.trim() === ''
    ) {
      setConnectionStatus(
        activeTicker === null ? 'Awaiting analysis...' : 'No active ticker.'
      );
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, 'Active ticker removed');
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      setPrice(null);
      setPrevPrice(null);
      setTimestamp(null);
      setIsConnected(false);
      return;
    }

    const connectWebSocket = () => {
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) &&
        wsRef.current.subscribedTicker === activeTicker.toUpperCase()
      ) {
        return;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, `Switching ticker to ${activeTicker}`);
        wsRef.current = null;
      }

      setPrice(null);
      setPrevPrice(null);
      setTimestamp(null);
      setConnectionStatus(`Connecting to ${activeTicker}...`);
      const socket = new WebSocket(WS_BASE_URL);
      wsRef.current = socket;
      wsRef.current.subscribedTicker = null;

      socket.onopen = () => {
        setIsConnected(true);
        setConnectionStatus(`Subscribing to ${activeTicker}...`);
        socket.send(
          JSON.stringify({
            type: 'subscribe',
            ticker: activeTicker.toUpperCase(),
          })
        );
        if (wsRef.current)
          wsRef.current.subscribedTicker = activeTicker.toUpperCase();
      };

      socket.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          if (
            parsedData.type === 'trade_update' &&
            parsedData.ticker === activeTicker.toUpperCase()
          ) {
            if (parsedData.price !== undefined) {
              setPrevPrice(price); // Store current price as previous
              setPrice(parsedData.price);
              setTimestamp(
                new Date(parsedData.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              );
            }
          } else if (
            parsedData.type === 'status' &&
            parsedData.ticker === activeTicker.toUpperCase()
          ) {
            setConnectionStatus(parsedData.message);
          } else if (parsedData.type === 'error') {
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
        setConnectionStatus(`Connection error.`);
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        if (wsRef.current === socket && !event.wasClean) {
          setConnectionStatus(`Reconnecting ${activeTicker}...`);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        } else if (wsRef.current === socket && event.wasClean) {
          setConnectionStatus(`Disconnected.`);
        }
      };
    };

    connectWebSocket();

    const checkMarketStatus = () => {
      const localTime = new Date();
      const etTime = new Date(
        localTime.toLocaleString('en-US', { timeZone: 'America/New_York' })
      );
      const dayET = etTime.getDay();
      const hourET = etTime.getHours();
      const minuteET = etTime.getMinutes();
      const marketOpenHourET = 9;
      const marketOpenMinuteET = 30;
      const marketCloseHourET = 16;
      const isWeekday = dayET >= 1 && dayET <= 5;
      const isMarketHours =
        isWeekday &&
        (hourET > marketOpenHourET ||
          (hourET === marketOpenHourET && minuteET >= marketOpenMinuteET)) &&
        hourET < marketCloseHourET;
      setMarketStatus(isMarketHours ? 'Market Open' : 'Market Closed');
    };
    checkMarketStatus();
    const marketStatusIntervalId = setInterval(checkMarketStatus, 60000);

    return () => {
      clearInterval(marketStatusIntervalId);
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close(1000, 'Component cleanup');
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [activeTicker, price]); // Added 'price' to deps for prevPrice update

  let priceChangeIndicator = null;
  if (price !== null && prevPrice !== null) {
    if (price > prevPrice)
      priceChangeIndicator = (
        <HiOutlineTrendingUp className="h-5 w-5 text-green-400 ml-1 animate-pulse" />
      );
    else if (price < prevPrice)
      priceChangeIndicator = (
        <HiOutlineTrendingDown className="h-5 w-5 text-red-400 ml-1 animate-pulse" />
      );
  }

  let statusIcon = <Spinner size="xs" className="mr-1" />;
  if (!activeTicker)
    statusIcon = (
      <HiExclamationCircle className="h-4 w-4 text-slate-500 mr-1" />
    );
  else if (isConnected)
    statusIcon = (
      <HiOutlineStatusOnline className="h-4 w-4 text-green-400 mr-1 animate-ping" />
    );
  else if (
    connectionStatus.toLowerCase().includes('error') ||
    connectionStatus.toLowerCase().includes('failed')
  )
    statusIcon = <HiExclamationCircle className="h-4 w-4 text-red-400 mr-1" />;
  else if (
    !isConnected &&
    connectionStatus.toLowerCase().includes('reconnecting')
  )
    statusIcon = <Spinner size="xs" className="mr-1 text-yellow-400" />;
  else if (!isConnected)
    statusIcon = (
      <HiOutlineStatusOffline className="h-4 w-4 text-slate-500 mr-1" />
    );

  return (
    <Card className="bg-slate-800/70 border-slate-700 shadow-xl rounded-lg min-w-[280px] max-w-[320px] p-4 transform hover:scale-105 transition-transform duration-300">
      <div className="flex items-center justify-between mb-2">
        <h2
          className="text-2xl font-bold text-sky-300 truncate"
          title={displayTicker || 'TICKER'}
        >
          {displayTicker || 'TICKER'}
        </h2>
        <span
          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
            marketStatus === 'Market Open'
              ? 'bg-green-500/30 text-green-300'
              : 'bg-red-500/30 text-red-300'
          }`}
        >
          {marketStatus}
        </span>
      </div>

      <div className="text-center my-3 min-h-[60px]">
        {price !== null && activeTicker ? (
          <div className="flex items-center justify-center">
            <p
              className={`text-5xl font-mono font-semibold ${
                priceChangeIndicator && price > prevPrice
                  ? 'text-green-400'
                  : priceChangeIndicator && price < prevPrice
                  ? 'text-red-400'
                  : 'text-slate-100'
              }`}
            >
              ${price?.toFixed(2)}
            </p>
            {priceChangeIndicator}
          </div>
        ) : (
          <div className="flex items-center justify-center text-slate-400 text-lg h-full">
            {activeTicker && isConnected ? (
              <Spinner size="md" />
            ) : activeTicker ? (
              'Awaiting Data...'
            ) : (
              'No Ticker'
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-700">
        <div className="flex items-center" title={connectionStatus}>
          {statusIcon}
          <span>{activeTicker ? connectionStatus : 'Idle'}</span>
        </div>
        {timestamp && activeTicker && (
          <div className="flex items-center">
            <HiOutlineClock className="h-3 w-3 mr-1" />
            <span>{timestamp}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export { StockTicker };
