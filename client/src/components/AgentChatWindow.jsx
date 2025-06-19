import React, { useState, useEffect, useRef } from 'react';
import { TextInput, Button, Spinner, Card } from 'flowbite-react';
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
        .filter((msg) => msg.sender === 'user' || msg.sender === 'ai') // take previous messages
        .slice(-6) // take last 6 messages for context, adjust as needed
        .map((msg) => [msg.sender === 'user' ? 'human' : 'ai', msg.text]);

      const response = await requestQuickSnapshot(input, chatHistoryForAgent);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log({ data });
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
    if (event.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto mt-4">
      <div className="flex flex-col h-[400px] overflow-y-auto p-4 space-y-2 border rounded-t-lg bg-gray-50">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] p-2 rounded-lg text-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.text.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div className="flex justify-center py-2">
            <Spinner aria-label="Loading agent response" size="sm" />
            <span className="ml-2 text-xs text-gray-500">
              Agent is thinking...
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center p-2 border-t rounded-b-lg">
        <TextInput
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask for a stock snapshot..."
          className="flex-grow mr-2"
          disabled={isLoading}
        />
        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
        >
          Send
        </Button>
      </div>
    </Card>
  );
};

export { AgentChatWindow };
