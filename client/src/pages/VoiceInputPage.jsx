import React, { useState, useRef, useEffect } from 'react';
import VoiceInput from '../components/VoiceInput';
import { askLegalQuestion, submitFeedback } from '../services/api';
import ReactMarkdown from 'react-markdown';

const VoiceInputPage = () => {
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem('nyayasetu_chat_history');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (error) {
            console.error("Error loading chat history from local storage:", error);
        }
        return [
            { role: 'ai', content: 'Hello! I am NyayaSetu, your AI Legal Assistant for India. How can I help you understand your legal rights or draft a document today? You can ask a question by typing below, or speak securely by clicking the microphone!' }
        ];
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    
    const messagesEndRef = useRef(null);

    const SUPPORTED_LANGUAGES = [
        { code: 'English', label: 'English' },
        { code: 'Hindi', label: 'Hindi (हिंदी)' },
        { code: 'Hinglish', label: 'Hinglish (Hindi in English Script)' },
        { code: 'Bengali', label: 'Bengali (বাংলা)' },
        { code: 'Telugu', label: 'Telugu (తెలుగు)' },
        { code: 'Marathi', label: 'Marathi (मराठी)' },
        { code: 'Tamil', label: 'Tamil (தமிழ்)' },
        { code: 'Gujarati', label: 'Gujarati (ગુજરાતી)' },
        { code: 'Urdu', label: 'Urdu (اردو)' },
        { code: 'Kannada', label: 'Kannada (ಕನ್ನಡ)' },
        { code: 'Malayalam', label: 'Malayalam (മലയാളം)' },
        { code: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
        { code: 'Odia', label: 'Odia (ଓଡ଼ିଆ)' }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        localStorage.setItem('nyayasetu_chat_history', JSON.stringify(messages));
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
            // Send request to the backend legal assistant API, passing history and language selection
            const data = await askLegalQuestion({ 
                question: userMessage,
                history: messages.slice(1),
                language: selectedLanguage
            });
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: data.answer || data.guidance || "I couldn't process that request.",
                queryId: data.case?._id,
                strategy: data.selectedStrategy,
                feedback: 'none'
            }]);
        } catch (error) {
            console.error("Failed to get legal help:", error);
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: "Sorry, I encountered an error while connecting to the AI service. Please try again." 
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

    const clearChat = () => {
        if (window.confirm("Are you sure you want to clear the conversation history?")) {
            setMessages([
                { role: 'ai', content: 'Hello! I am NyayaSetu, your AI Legal Assistant for India. How can I help you understand your legal rights or draft a document today? You can ask a question by typing below, or speak securely by clicking the microphone!' }
            ]);
        }
    };

    return (
        <div 
            className="px-6 py-4 w-full h-[calc(100vh-5.5rem)] flex flex-col overflow-hidden relative"
        >
            <div className="mb-3 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">AI Legal Assistant</h2>
                    <p className="text-slate-500 mt-0.5 text-sm">
                        Speak or type your query securely. Get instant citizen-friendly legal guidance with complete history memory.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0 self-start md:self-auto">
                    <span className="text-slate-500 text-sm">🌐</span>
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Language:</span>
                    <select 
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="bg-transparent text-slate-700 text-sm font-semibold focus:outline-none cursor-pointer pr-2"
                    >
                        {SUPPORTED_LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden animate-fade-in">
                {/* Chat Area */}
                <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 space-y-5">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
                            }`}>
                                {msg.role === 'user' ? '👤' : '⚖️'}
                            </div>
                            <div className={`p-3.5 rounded-2xl shadow-sm border border-slate-100 max-w-[80%] ${
                                msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                                    : 'bg-white text-slate-700 rounded-tl-sm prose prose-sm max-w-none'
                            }`}>
                                {msg.role === 'user' ? (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                ) : (
                                    <div className="prose prose-slate prose-sm whitespace-pre-wrap">
                                        <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
                                        
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
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex gap-4 animate-pulse">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                ⚖️
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 text-slate-500 flex gap-2 items-center">
                                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></div>
                                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-100"></div>
                                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-200"></div>
                                <span className="text-xs text-slate-400 ml-2">NyayaSetu is processing...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Text & Voice Input Area (relative for overlay positioning) */}
                <div className="relative p-4 bg-white border-t border-slate-100 shrink-0 flex flex-col gap-2">
                    <div className="flex gap-3 items-end">
                        <VoiceInput 
                            history={messages.slice(1)} // skip the greeting message
                            language={selectedLanguage}
                            onUploadStart={() => setIsLoading(true)}
                            onUploadSuccess={(transcription, aiResponse, selectedStrategy, caseId) => {
                                setIsLoading(false);
                                console.log("Audio Uploaded");
                                console.log("Whisper Response Received", { transcription, aiResponse, selectedStrategy, caseId });
                                setMessages(prev => [
                                    ...prev, 
                                    { role: 'user', content: transcription },
                                    { 
                                        role: 'ai', 
                                        content: aiResponse,
                                        queryId: caseId,
                                        strategy: selectedStrategy,
                                        feedback: 'none'
                                    }
                                ]);
                                console.log("Transcription Displayed:", transcription);
                            }}
                            onUploadError={() => setIsLoading(false)}
                        />
                        <textarea 
                            rows="2"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Type your legal question here..."
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
                    <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                        <span>NyayaSetu Indian Legal Chatbot</span>
                        <button 
                            onClick={clearChat}
                            className="text-red-500 hover:text-red-700 hover:underline font-medium transition-colors cursor-pointer"
                        >
                            Clear Chat History
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceInputPage;
