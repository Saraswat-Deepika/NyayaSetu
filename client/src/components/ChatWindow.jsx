import React, { useState, useRef, useEffect } from 'react';
import { askLegalQuestion } from '../services/api';

const ChatWindow = ({ language = 'english' }) => {
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hello! How can I help you with your legal queries today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const answer = await askLegalQuestion(userMessage, language);
            
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: answer || "I couldn't process that request." 
            }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: "Sorry, I encountered an error. Please try again later.",
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col bg-white rounded-xl shadow-md border border-slate-200 h-[500px] w-full max-w-md mx-auto overflow-hidden">
            <div className="bg-blue-600 text-white p-4">
                <h3 className="font-semibold text-lg">AI Legal Assistant</h3>
                <p className="text-blue-100 text-sm">Ask any legal question</p>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-3 ${
                            msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-tr-sm' 
                                : msg.isError 
                                    ? 'bg-red-50 text-red-600 border border-red-100 rounded-tl-sm'
                                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm shadow-sm'
                        }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-1.5 items-center">
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '75ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-100">
                <div className="flex gap-2">
                    <textarea 
                        rows="1"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />
                    <button 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
