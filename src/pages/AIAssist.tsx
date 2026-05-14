import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Brain, 
  Zap, 
  MapPin, 
  User, 
  ExternalLink, 
  Search 
} from 'lucide-react';
import axios from 'axios';
import { Detection } from '../types';
import Graph from '../components/Graph';

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
  images?: string[];
  detections?: Detection[];
  graph?: GraphData;
}

const AIAssist: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detections, setDetections] = useState<Detection[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch recent detections on component mount
  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/detections');
        const transformedData: Detection[] = response.data
          .map((item: any) => ({
            _id: item._id,
            camera_name: item.camera_name || item.camera_id || 'Unknown',
            location: item.location || '',
            detection_time: item.detection_time || '',
            detection_date: item.detection_date || '',
            model_used: item.model_used || item.model || '',
            confidence: item.confidence || 0,
            label: item.label || item.object_detected || '',
            image_url: item.image_url ? `http://localhost:5000${item.image_url}` : '',
          }))
          .sort((a: Detection, b: Detection) => {
            // Combine date and time for proper sorting
            const dateTimeA = `${a.detection_date} ${a.detection_time}`;
            const dateTimeB = `${b.detection_date} ${b.detection_time}`;
            
            // Parse to Date objects for comparison
            const dateA = new Date(dateTimeA);
            const dateB = new Date(dateTimeB);
            
            // Sort in descending order (most recent first)
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 50); // Get most recent 50 detections after sorting
        setDetections(transformedData);
      } catch (error) {
        console.error('Error fetching detections:', error);
      }
    };
    fetchDetections();
    // Refresh detections every 30 seconds
    const interval = setInterval(fetchDetections, 30000);
    return () => clearInterval(interval);
  }, []);

  const promptSuggestions = [
    'Show me recent detection patterns',
    'What are the most common threats detected?',
    'Analyze camera performance metrics',
    'Identify peak detection hours',
    'Compare detection rates by location',
    'What anomalies have been detected?',
    'Show me critical threat statistics',
    'Analyze model accuracy trends',
  ];

  const filteredSuggestions = searchQuery
    ? promptSuggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : promptSuggestions;

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
      // Prepare detection data summary for AI
      const detectionSummary = detections.slice(0, 20).map(det => ({
        camera: det.camera_name,
        label: det.label,
        confidence: det.confidence,
        time: det.detection_time,
        date: det.detection_date,
        location: det.location,
        image_url: det.image_url,
      }));

      const response = await fetch('http://localhost:5000/api/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'omit',
        body: JSON.stringify({ 
          prompt: input.trim(),
          detections: detectionSummary,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`
        );
      }

      const data = await response.json();

      if (!data.summary) {
        throw new Error('No summary in response');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.summary,
        timestamp: new Date(),
        images: data.images || [],
        detections: data.relevant_detections || [],
        graph: data.graph || undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'An error occurred while processing your request.';

      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage =
            'Could not connect to the server. Please make sure the backend server is running at http://localhost:5000.';
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

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // Auto-submit the suggestion
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
      }
    }, 100);
  };

  // Format AI response with markdown-like styling
  const formatResponse = (content: string, isUser: boolean) => {
    const lines = content.split('\n');
    const formatted: JSX.Element[] = [];
    let inList = false;
    let listItems: string[] = [];

    const closeList = () => {
      if (inList && listItems.length > 0) {
        formatted.push(
          <ul key={`list-${formatted.length}`} className={`mt-1.5 space-y-1 ml-4 text-base ${isUser ? 'text-blue-50' : 'text-slate-700'}`}>
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start">
                <span className={`mr-2 mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isUser ? 'bg-blue-300' : 'bg-indigo-500'}`}></span>
                <span className="flex-1">{formatInlineText(item.trim(), isUser)}</span>
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const formatInlineText = (text: string, isUser: boolean) => {
      // Handle bold text **text**
      const parts: (string | JSX.Element)[] = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match;
      let key = 0;

      while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={key++} className={isUser ? 'text-white font-semibold' : 'text-gray-900 font-semibold'}>
            {match[1]}
          </strong>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts.length > 0 ? <>{parts}</> : text;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('## ')) {
        closeList();
        formatted.push(
          <h3 key={index} className={`mt-3 mb-1.5 text-base font-bold border-b ${isUser ? 'text-white border-blue-400' : 'text-gray-900 border-gray-300'} pb-1`}>
            {formatInlineText(trimmed.substring(3), isUser)}
          </h3>
        );
      } else if (trimmed.startsWith('### ')) {
        closeList();
        formatted.push(
          <h4 key={index} className={`mt-2.5 mb-1 text-base font-semibold ${isUser ? 'text-white' : 'text-gray-800'}`}>
            {formatInlineText(trimmed.substring(4), isUser)}
          </h4>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // List items
        if (!inList) {
          closeList();
          inList = true;
        }
        listItems.push(trimmed.substring(2));
      } else if (trimmed === '') {
        // Empty line
        closeList();
        if (formatted.length > 0) {
          formatted.push(<br key={`br-${index}`} />);
        }
      } else {
        // Regular paragraph
        closeList();
        formatted.push(
          <p key={index} className={`mt-2 text-base leading-relaxed ${isUser ? 'text-blue-50' : 'text-slate-700'}`}>
            {formatInlineText(trimmed, isUser)}
          </p>
        );
      }
    });

    closeList();
    return formatted;
  };

  return (
    <div className="flex flex-col bg-gray-50/50 h-full">
      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-transparent relative min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-400 blur-3xl opacity-20 rounded-full"></div>
                  <div className="relative w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Sparkles className="text-white w-12 h-12" />
                  </div>
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
                  Intelligence at your fingertips
                </h2>
                <p className="text-lg text-gray-600 mb-10 leading-relaxed">
                  Analyze detection patterns, identify security anomalies, and get deep insights into your surveillance data using advanced AI.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left group cursor-pointer" onClick={() => handleSuggestionClick('Show me recent detection patterns')}>
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                      <Zap className="w-4 h-4 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1 text-sm">Pattern Analysis</h4>
                    <p className="text-[11px] text-gray-500">Identify recurring threats and trends in your data.</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left group cursor-pointer" onClick={() => handleSuggestionClick('Compare detection rates by location')}>
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-purple-100 transition-colors">
                      <MapPin className="w-4 h-4 text-purple-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1 text-sm">Location Insights</h4>
                    <p className="text-[11px] text-gray-500">See which areas require more security attention.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto w-full space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                  >
                    <div className={`flex gap-3 max-w-[90%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center shadow-md ${
                        message.role === 'user' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white text-indigo-600 border border-indigo-100'
                      }`}>
                        {message.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <div
                          className={`rounded-2xl px-5 py-3 shadow-sm relative ${
                            message.role === 'user'
                              ? 'bg-indigo-600 text-white shadow-indigo-100'
                              : 'bg-white text-slate-800 border border-slate-100'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            <div className="prose prose-indigo max-w-none">
                              {formatResponse(message.content, false)}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-base leading-relaxed font-medium">{message.content}</p>
                          )}
                          
                          {/* Display graph if available */}
                          {message.graph && (
                            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
                              <Graph graphData={message.graph} />
                            </div>
                          )}
                          
                          {/* Display images if available */}
                          {message.images && message.images.length > 0 && (
                            <div className="mt-5 overflow-x-auto pb-2 scrollbar-thin">
                              <div className="flex gap-3">
                                {message.images.map((imageUrl, imgIndex) => (
                                  <div key={imgIndex} className="relative group flex-shrink-0">
                                    <img
                                      src={imageUrl}
                                      alt={`Detection ${imgIndex + 1}`}
                                      className="w-24 h-24 object-cover rounded-xl cursor-pointer hover:ring-4 hover:ring-indigo-500/30 transition-all shadow-sm border border-gray-200"
                                      onClick={() => window.open(imageUrl, '_blank')}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center pointer-events-none">
                                      <ExternalLink className="text-white w-5 h-5" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {loading && (
              <div className="max-w-3xl mx-auto w-full flex justify-start">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-md">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div className="bg-white border border-gray-100 text-gray-900 rounded-2xl px-6 py-4 shadow-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDuration: '0.8s' }} />
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-4 md:p-6 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition duration-1000"></div>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about threats, trends, or camera data..."
                    className="flex-1 px-4 py-3 text-base text-slate-900 placeholder-slate-400 outline-none bg-transparent"
                  />
                  <div className="flex items-center gap-2 pr-3">
                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white w-9 h-9 rounded-lg transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-95"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </form>
              <p className="text-center text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
                AI can make mistakes. Verify critical alerts manually.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar with Prompt Suggestions */}
        <div className="w-72 border-l border-gray-200 bg-white flex flex-col hidden xl:flex">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">Smart Suggestions</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a prompt..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin bg-gray-50/30">
            {filteredSuggestions.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium">No suggestions found</p>
              </div>
            ) : (
              filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-4 bg-white hover:bg-indigo-50 border border-gray-100 rounded-xl transition-all shadow-sm hover:shadow-md hover:border-indigo-100 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 group-hover:scale-150 transition-transform"></div>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700 line-clamp-2 leading-relaxed">
                      {suggestion}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="p-5 bg-white border-t border-gray-100">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-4 text-white shadow-xl shadow-indigo-100">
              <h4 className="font-bold mb-1 flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-yellow-300" />
                Pro Tip
              </h4>
              <p className="text-[11px] text-indigo-100 leading-relaxed font-medium">
                Try asking for a "Weekly Summary" to see a complete analysis of all camera activity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssist;

