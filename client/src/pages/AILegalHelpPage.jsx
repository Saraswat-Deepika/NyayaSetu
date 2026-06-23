import React, { useState, useRef, useEffect } from 'react';
import { askLegalQuestion, submitFeedback } from '../services/api';
import ReactMarkdown from 'react-markdown';

const AILegalHelpPage = () => {
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hello! I am your AI Legal Assistant. How can I help you understand your legal rights or draft a document today?' }
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

    const handleFeedback = async (msgIndex, queryId, feedbackType) => {
        try {
            await submitFeedback(queryId, feedbackType);
            setMessages(prev => prev.map((msg, idx) => 
                idx === msgIndex ? { ...msg, feedback: feedbackType } : msg
            ));
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            alert("Failed to submit feedback. Please try again.");
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const data = await askLegalQuestion({ 
                question: userMessage,
                history: messages.slice(1)
            });
            const answer = data.answer || data.guidance || data.response;
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: answer || "I couldn't process that request.",
                queryId: data.case?._id,
                strategy: data.selectedStrategy,
                feedback: 'none'
            }]);
        } catch (error) {
            console.error("Failed to get legal help:", error);
            const errorMessage = error.response?.data?.error || "Sorry, I encountered an error while connecting to the AI service. Please try again.";
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: errorMessage 
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
        <div className="p-8 max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">AI Legal Help</h2>
                <p className="text-slate-500 mt-2 text-lg">
                    Get instant guidance, know your rights, and access legal draft templates powered by Gemini AI.
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
                {/* Chat Area */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-6">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
                            }`}>
                                {msg.role === 'user' ? '👤' : '⚖️'}
                            </div>
                            <div className={`p-4 rounded-2xl shadow-sm border border-slate-100 max-w-[80%] ${
                                msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                                    : 'bg-white text-slate-700 rounded-tl-sm prose prose-sm'
                            }`}>
                                {msg.role === 'user' ? (
                                    <p>{msg.content}</p>
                                ) : (
                                    <>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        
                                        {msg.queryId && (
                                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <span>Was this helpful?</span>
                                                    <button 
                                                        disabled={msg.feedback && msg.feedback !== 'none'}
                                                        onClick={() => handleFeedback(index, msg.queryId, 'helpful')}
                                                        className={`p-1 rounded-lg border transition-all ${
                                                            msg.feedback === 'helpful'
                                                                ? 'bg-green-50 border-green-200 text-green-600'
                                                                : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                                                        }`}
                                                        title="Helpful"
                                                    >
                                                        👍
                                                    </button>
                                                    <button 
                                                        disabled={msg.feedback && msg.feedback !== 'none'}
                                                        onClick={() => handleFeedback(index, msg.queryId, 'not-helpful')}
                                                        className={`p-1 rounded-lg border transition-all ${
                                                            msg.feedback === 'not-helpful'
                                                                ? 'bg-red-50 border-red-200 text-red-600'
                                                                : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                                                        }`}
                                                        title="Not Helpful"
                                                    >
                                                        👎
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                ⚖️
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 text-slate-500 flex gap-2 items-center">
                                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"></div>
                                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce delay-100"></div>
                                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce delay-200"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex gap-4 items-end">
                        <textarea 
                            rows="2"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Type your legal question here... (Press Enter to send)"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        ></textarea>
                        <button 
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm h-[50px] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AILegalHelpPage;
