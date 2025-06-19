import { useState, useEffect, useRef } from 'react';
import { TextInput, Button, Spinner, Card } from 'flowbite-react';
import { HiOutlinePaperAirplane, HiSparkles } from 'react-icons/hi';
import { requestQuickSnapshot } from '../utils/queries';

const AgentChatWindow = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hi! How can I help you with a stock snapshot today? (e.g., 'snapshot for NVDA')",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistoryForAgent = messages
        .filter((msg) => msg.sender === 'user' || msg.sender === 'ai')
        .slice(-6)
        .map((msg) => [msg.sender === 'user' ? 'human' : 'ai', msg.text]);

      const response = await requestQuickSnapshot(input, chatHistoryForAgent);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      const aiMessage = { sender: 'ai', text: data.response };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Error fetching agent response:', error);
      const errorMessage = {
        sender: 'ai',
        text: `Sorry, I encountered an error: ${error.message}`,
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !isLoading && input.trim()) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto bg-slate-800/60 border border-slate-700 shadow-xl rounded-xl flex flex-col h-[500px] transition-all duration-300 hover:shadow-sky-500/20 hover:border-sky-600/70">
      <div className="flex items-center p-4 border-b border-slate-700">
        <HiSparkles className="h-6 w-6 text-sky-400 mr-3" />{' '}
        <h3 className="text-lg font-semibold text-sky-300">
          Quick Snapshot Agent
        </h3>
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-800/30 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] py-2 px-3.5 rounded-xl shadow-md break-words text-sm ${
                // text-sm for chat bubbles
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-br-none' // Darker user bubble
                  : 'bg-slate-600 text-slate-100 rounded-bl-none' // Slightly lighter AI bubble
              }`}
            >
              {/* Original logic for rendering text */}
              {typeof msg.text === 'string' &&
                msg.text.split('\n').map((line, i) => (
                  <div key={i} className="leading-normal">
                    {line}
                  </div>
                ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* For scrolling to bottom */}
        {isLoading && (
          <div className="flex justify-center items-center py-3">
            <Spinner aria-label="Agent is thinking" size="md" color="info" />
            <span className="ml-3 text-sm text-slate-400">
              Agent is thinking...
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center p-3 border-t border-slate-700 bg-slate-800/50 rounded-b-xl gap-2">
        <TextInput
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., snapshot for MSFT"
          className="flex-grow [&_input]:bg-slate-700 [&_input]:border-slate-600 [&_input]:text-gray-100 [&_input]:placeholder-slate-400 [&_input]:rounded-lg focus:[&_input]:border-sky-500 focus:[&_input]:ring-sky-500/70 transition-colors duration-200"
          disabled={isLoading}
          autoFocus
        />
        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
          gradientDuoTone="purpleToBlue" // Using a Flowbite gradient
          size="md" // Consistent button size
          className="transition-all duration-200 ease-in-out hover:scale-105 focus:ring-2 focus:ring-sky-500/70 disabled:opacity-60 disabled:saturate-50"
          pill // Pill shape for the button
        >
          <HiOutlinePaperAirplane
            className={`h-5 w-5 ${isLoading ? 'animate-pulse' : ''}`}
          />
        </Button>
      </div>
    </Card>
  );
};

export default AgentChatWindow;

// import React, { useState, useEffect, useRef } from 'react';
// import { TextInput, Button, Spinner, Card } from 'flowbite-react';
// import { requestQuickSnapshot } from '../utils/queries';

// const AgentChatWindow = () => {
//   const [messages, setMessages] = useState([
//     {
//       sender: 'ai',
//       text: "Hi! How can I help you with a stock snapshot today? (e.g., 'snapshot for NVDA')",
//     },
//   ]);
//   const [input, setInput] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const messagesEndRef = useRef(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(scrollToBottom, [messages]);

//   const handleSendMessage = async () => {
//     if (!input.trim()) return;

//     const userMessage = { sender: 'user', text: input };
//     setMessages((prevMessages) => [...prevMessages, userMessage]);
//     setInput('');
//     setIsLoading(true);

//     try {
//       const chatHistoryForAgent = messages
//         .filter((msg) => msg.sender === 'user' || msg.sender === 'ai') // take previous messages
//         .slice(-6) // take last 6 messages for context, adjust as needed
//         .map((msg) => [msg.sender === 'user' ? 'human' : 'ai', msg.text]);

//       const response = await requestQuickSnapshot(input, chatHistoryForAgent);

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(
//           errorData.error || `HTTP error! status: ${response.status}`
//         );
//       }

//       const data = await response.json();
//       console.log({ data });
//       const aiMessage = { sender: 'ai', text: data.response };
//       setMessages((prevMessages) => [...prevMessages, aiMessage]);
//     } catch (error) {
//       console.error('Error fetching agent response:', error);
//       const errorMessage = {
//         sender: 'ai',
//         text: `Sorry, I encountered an error: ${error.message}`,
//       };
//       setMessages((prevMessages) => [...prevMessages, errorMessage]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleKeyPress = (event) => {
//     if (event.key === 'Enter' && !isLoading) {
//       handleSendMessage();
//     }
//   };

//   return (
//     <Card className="w-full max-w-lg mx-auto mt-4">
//       <h3 className="text-xl font-semibold mb-2 text-center text-gray-700">
//         Quick Snapshot Agent
//       </h3>
//       <div className="flex flex-col h-[400px] overflow-y-auto p-4 space-y-2 border rounded-t-lg bg-gray-50">
//         {messages.map((msg, index) => (
//           <div
//             key={index}
//             className={`flex ${
//               msg.sender === 'user' ? 'justify-end' : 'justify-start'
//             }`}
//           >
//             <div
//               className={`max-w-[70%] p-2 rounded-lg text-sm ${
//                 msg.sender === 'user'
//                   ? 'bg-blue-500 text-white'
//                   : 'bg-gray-200 text-gray-800'
//               }`}
//             >
//               {msg.text.split('\n').map((line, i) => (
//                 <div key={i}>{line}</div>
//               ))}
//             </div>
//           </div>
//         ))}
//         <div ref={messagesEndRef} />
//         {isLoading && (
//           <div className="flex justify-center py-2">
//             <Spinner aria-label="Loading agent response" size="sm" />
//             <span className="ml-2 text-xs text-gray-500">
//               Agent is thinking...
//             </span>
//           </div>
//         )}
//       </div>
//       <div className="flex items-center p-2 border-t rounded-b-lg">
//         <TextInput
//           type="text"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyPress={handleKeyPress}
//           placeholder="Ask for a stock snapshot..."
//           className="flex-grow mr-2"
//           disabled={isLoading}
//         />
//         <Button
//           onClick={handleSendMessage}
//           disabled={isLoading || !input.trim()}
//         >
//           Send
//         </Button>
//       </div>
//     </Card>
//   );
// };

// export default AgentChatWindow;
