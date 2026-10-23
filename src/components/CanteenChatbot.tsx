import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Trash2, Sparkles, ChefHat } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    role: 'model',
    content: "Namaste! I'm Chef Bite, your Prasad Institute of Technology Canteen assistant. Ask me anything about our dishes, quick recommendations under your budget, or order tokens!",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

const QUICK_PROMPTS = [
  'What combos are under ₹100?',
  'What is the quickest dish right now?',
  'Tell me about the Paneer Tikka Kathi Roll',
  'Where do I collect my food?',
];

export const CanteenChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMsg: ChatMessage = {
          id: 'bot-' + Date.now(),
          role: 'model',
          content: data.reply || "I'm here to help with your food orders!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error('Chat failed');
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'model',
        content: "Sorry, I had trouble reaching the canteen chef! You can also check our AI Combos tab for budget meal ideas.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-full shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold text-xs"
          aria-label="Open Canteen Assistant"
        >
          <ChefHat className="w-5 h-5 text-amber-200" />
          <span>Ask Chef Bite</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* Slide-up Chat Window */}
      {isOpen && (
        <div className="glass-panel bg-white/95 border border-orange-200/90 rounded-3xl shadow-2xl w-[92vw] sm:w-[420px] h-[550px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-stone-200/70 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900 leading-tight">Chef Bite</h3>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">Prasad Institute of Technology</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                title="Clear conversation"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Model Switcher Bar */}
          <div className="px-4 py-2 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between text-[11px]">
            <span className="text-stone-500 font-medium">Model Engine:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedModel('gemini-3.8-flash')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  selectedModel === 'gemini-3.8-flash'
                    ? 'bg-orange-600 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                gemini-3.8-flash
              </button>
              <button
                onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  selectedModel === 'gemini-3.1-flash-lite'
                    ? 'bg-orange-600 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                3.1-flash-lite
              </button>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isUser
                        ? 'bg-stone-900 text-white'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[78%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-orange-600 text-white rounded-tr-xs shadow-xs'
                        : 'bg-stone-100 text-stone-800 rounded-tl-xs border border-stone-200/60'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        isUser ? 'text-orange-200' : 'text-stone-400'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-stone-400 text-xs py-2 pl-9">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span>Chef Bite is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Strip */}
          <div className="px-3 py-2 border-t border-stone-100 bg-stone-50/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-orange-600 hover:border-orange-200 text-[11px] transition-colors cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-stone-200/80 bg-white flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about dishes, pricing, or combos..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
