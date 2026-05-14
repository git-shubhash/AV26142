import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send } from 'lucide-react';
import Graph from './Graph';

interface GraphData {
  type: 'line' | 'bar' | 'pie';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      tension?: number;
    }>;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  graph?: GraphData;
}

interface AIAssistProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIAssist: React.FC<AIAssistProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      console.log('Sending request to API...');
      const requestBody = { prompt: input.trim() };
      console.log('Request body:', requestBody);

      const response = await fetch('http://localhost:5000/api/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'omit',
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (!data.summary) {
        console.error('No summary in response:', data);
        throw new Error('No summary in response');
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.summary,
        timestamp: new Date(),
        graph: data.graph || undefined,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Detailed error:', error);
      let errorMessage = 'An error occurred while processing your request.';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Could not connect to the server. Please make sure the backend server is running at http://localhost:5000.';
        } else if (error.message.includes('No summary in response')) {
          errorMessage = 'The server response was invalid. Please try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      const errorResponse: Message = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-white/10 flex flex-col h-[80vh] relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="text-emerald-400" size={24} />
            <h2 className="text-xl font-bold text-white">AI Analytics Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
          {messages.length === 0 ? (
            <div className="text-center text-white/60 py-8">
              <Brain className="mx-auto mb-3 text-emerald-400" size={32} />
              <p>Ask me anything about your detection data and analytics.</p>
              <p className="text-sm mt-2">Example: "Show me recent detection patterns"</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800/50 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Display graph if available */}
                  {message.graph && (
                    <div className="mt-4">
                      <Graph graphData={message.graph} darkMode={true} />
                    </div>
                  )}
                  
                  <span className="text-xs opacity-60 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 text-white rounded-2xl px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAssist; 