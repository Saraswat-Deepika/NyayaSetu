import React, { useState, useRef, useEffect } from 'react';
import { 
    askLegalQuestion, 
    submitFeedback, 
    getChatSessions, 
    getChatSessionById, 
    deleteChatSession
} from '../services/api';
import ReactMarkdown from 'react-markdown';
import VoiceInput from '../components/VoiceInput';

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
    { code: 'Malayalam', label: 'Malayalam (മലയാളं)' },
    { code: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
    { code: 'Odia', label: 'Odia (ଓଡ଼ିଆ)' }
];

const AILegalHelpPage = () => {
    // Layout & UX States
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('English');

    // Core Chat States
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hello! I am your AI Legal Assistant. How can I help you understand your Indian legal rights or draft a document today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSessionsLoading, setIsSessionsLoading] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Handle screen resize to close sidebar on mobile by default
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        handleResize(); // Set initial
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-grow textarea height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [input]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Load sessions on mount
    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setIsSessionsLoading(true);
        try {
            const data = await getChatSessions();
            setSessions(data.sessions || []);
        } catch (err) {
            console.error("Error loading chat sessions:", err);
        } finally {
            setIsSessionsLoading(false);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([
            { role: 'ai', content: 'Hello! I am your AI Legal Assistant. How can I help you understand your Indian legal rights or draft a document today?' }
        ]);
        setInput('');
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    };

    const handleSelectSession = async (sessionId) => {
        if (sessionId === currentSessionId) return;
        setIsChatLoading(true);
        try {
            const data = await getChatSessionById(sessionId);
            if (data.session) {
                setCurrentSessionId(sessionId);
                const loadedMessages = data.session.messages || [];
                if (loadedMessages.length === 0) {
                    setMessages([
                        { role: 'ai', content: 'Hello! I am your AI Legal Assistant. How can I help you understand your Indian legal rights or draft a document today?' }
                    ]);
                } else {
                    setMessages(loadedMessages);
                }
            }
        } catch (err) {
            console.error("Error fetching chat session details:", err);
            alert("Failed to load chat history.");
        } finally {
            setIsChatLoading(false);
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false); // Auto close drawer on select (mobile)
            }
        }
    };

    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this chat session?")) return;
        
        try {
            await deleteChatSession(sessionId);
            setSessions(prev => prev.filter(s => s._id !== sessionId));
            if (currentSessionId === sessionId) {
                handleNewChat();
            }
        } catch (err) {
            console.error("Failed to delete chat session:", err);
            alert("Failed to delete chat session. Please try again.");
        }
    };

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

    const handleCopy = (content, index) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedMessageIndex(index);
            setTimeout(() => setCopiedMessageIndex(null), 2000);
        }).catch(err => {
            console.error("Failed to copy message:", err);
        });
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const data = await askLegalQuestion({ 
                question: userMessage,
                history: messages.slice(1),
                sessionId: currentSessionId,
                language: selectedLanguage
            });
            
            const answer = data.answer || data.guidance || data.response;
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: answer || "I couldn't process that request.",
                queryId: data.case?._id,
                strategy: data.selectedStrategy,
                feedback: 'none'
            }]);

            if (!currentSessionId && data.sessionId) {
                setCurrentSessionId(data.sessionId);
            }
            
            // Reload list of sessions
            const sessionsData = await getChatSessions();
            setSessions(sessionsData.sessions || []);

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

    // Filter recent chats by query
    const filteredSessions = sessions.filter(session => 
        session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-4rem)] w-full">
            {/* Embedded styles for dot animations & custom details */}
            <style>{`
                @keyframes pulseDot {
                    0%, 100% { transform: scale(0.6); opacity: 0.4; }
                    50% { transform: scale(1.1); opacity: 1; }
                }
                .pulse-dot {
                    animation: pulseDot 1.4s infinite ease-in-out;
                }
                .scrollbar-thin::-webkit-scrollbar {
                    width: 5px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.25);
                    border-radius: 9999px;
                }
            `}</style>

            <div className="flex h-full w-full overflow-hidden bg-slate-50 text-slate-800 transition-colors duration-300 relative">
                
                {/* Backdrop overlay for mobile drawer */}
                {isSidebarOpen && (
                    <div 
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden transition-all duration-300"
                    />
                )}

                {/* Left Collapsible Sidebar */}
                <aside 
                    className={`fixed lg:relative inset-y-0 left-0 z-40 lg:z-10 flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 shrink-0 overflow-hidden ${
                        isSidebarOpen 
                            ? 'w-72 translate-x-0 opacity-100' 
                            : 'w-0 -translate-x-full opacity-0 pointer-events-none lg:w-0 lg:translate-x-0 lg:opacity-0'
                    }`}
                >
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                        <span className="text-xl">⚖️</span>
                        <span className="font-bold text-slate-800">NyayaSetu Chats</span>
                    </div>

                    {/* New Chat Button */}
                    <div className="p-3">
                        <button 
                            onClick={handleNewChat}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-indigo-500/20 active:scale-[0.98] cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            New Chat
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="px-3 pb-2 border-b border-slate-100">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                🔍
                            </span>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Chats List */}
                    <div className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin space-y-0.5">
                        {isSessionsLoading ? (
                            <div className="space-y-2 p-2">
                                {[1, 2, 3, 4].map(n => (
                                    <div key={n} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : filteredSessions.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-8">
                                {searchQuery ? 'No matching chats found.' : 'No conversations yet.'}
                            </p>
                        ) : (
                            filteredSessions.map((session) => (
                                <div 
                                    key={session._id}
                                    onClick={() => handleSelectSession(session._id)}
                                    className={`relative group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                                        currentSessionId === session._id 
                                            ? 'bg-blue-50/80 text-blue-700 font-semibold shadow-sm' 
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 overflow-hidden w-full pr-7">
                                        <span className="text-sm shrink-0">💬</span>
                                        <span className="truncate text-xs tracking-wide">{session.title}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeleteSession(e, session._id)}
                                        className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete Chat"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* Right Chat Area */}
                <main className="flex-1 flex flex-col h-full bg-slate-50/30 relative overflow-hidden">
                    
                    {/* Header */}
                    <div className="h-16 border-b border-slate-200 flex items-center px-4 md:px-6 justify-between bg-white shrink-0 z-10 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                            <button 
                                onClick={() => setIsSidebarOpen(prev => !prev)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                                title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    {isSidebarOpen ? (
                                        /* Double Chevron Left */
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5" />
                                    ) : (
                                        /* Hamburger Menu */
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                    )}
                                </svg>
                            </button>
                            <div className="truncate">
                                <h2 className="text-sm md:text-base font-bold text-slate-800 truncate max-w-xs md:max-w-md">
                                    {currentSessionId 
                                        ? (sessions.find(s => s._id === currentSessionId)?.title || "AI Legal Assistant")
                                        : "New Chat Session"
                                    }
                                </h2>
                                <p className="text-[10px] text-slate-400">Gemini Multi-Strategy Bandit Advisor</p>
                            </div>
                        </div>

                        {/* Top Header Actions */}
                        <div className="flex items-center gap-3">
                            {/* Language selector */}
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                                <span className="text-slate-400">🌐</span>
                                <select 
                                    value={selectedLanguage}
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer pr-1"
                                >
                                    {SUPPORTED_LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Chat Area Scroll Container */}
                    {isChatLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                            <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs text-slate-500">Loading chat history...</p>
                        </div>
                    ) : (
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 scrollbar-thin">
                            <div className="max-w-4xl mx-auto space-y-6">
                                {messages.map((msg, index) => (
                                    <div 
                                        key={index} 
                                        className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                    >
                                        {/* Avatar */}
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                            msg.role === 'user' 
                                                ? 'bg-gradient-to-tr from-blue-500 to-indigo-500 text-white' 
                                                : 'bg-indigo-50 text-indigo-600 border border-slate-100'
                                        }`}>
                                            {msg.role === 'user' ? '👤' : '⚖️'}
                                        </div>

                                        {/* Bubble Wrapper */}
                                        <div className={`flex flex-col max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            
                                            {/* Bubble Box */}
                                            <div className={`p-4 rounded-2xl shadow-sm transition-all border ${
                                                msg.role === 'user' 
                                                    ? 'bg-blue-600 text-white rounded-tr-none border-blue-500/10' 
                                                    : 'bg-white text-slate-800 rounded-tl-none border-slate-100 leading-relaxed'
                                            }`}>
                                                {msg.role === 'user' ? (
                                                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                                ) : (
                                                    <div className="markdown-content text-sm space-y-2">
                                                        <ReactMarkdown
                                                            components={{
                                                                h1: ({node, ...props}) => <h1 className="text-lg font-bold text-slate-900 my-2" {...props} />,
                                                                h2: ({node, ...props}) => <h2 className="text-base font-bold text-slate-900 my-2" {...props} />,
                                                                h3: ({node, ...props}) => <h3 className="text-sm font-bold text-slate-800 my-1" {...props} />,
                                                                p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-700" {...props} />,
                                                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1 text-slate-700" {...props} />,
                                                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-slate-700" {...props} />,
                                                                li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
                                                                a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                                                code: ({node, ...props}) => <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs text-pink-600" {...props} />,
                                                                pre: ({node, ...props}) => <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg overflow-x-auto my-2 font-mono text-xs text-slate-800" {...props} />
                                                            }}
                                                        >
                                                            {msg.content || ''}
                                                        </ReactMarkdown>
                                                        
                                                        {/* Strategy and Action Bar */}
                                                        {msg.queryId && (
                                                            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400">
                                                                {msg.strategy && (
                                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono font-medium">
                                                                        Strategy: {msg.strategy}
                                                                    </span>
                                                                )}
                                                                <div className="flex items-center gap-3 ml-auto shrink-0">
                                                                    {/* Thumbs Up */}
                                                                    <button 
                                                                        disabled={msg.feedback && msg.feedback !== 'none'}
                                                                        onClick={() => handleFeedback(index, msg.queryId, 'helpful')}
                                                                        className={`p-1 rounded-lg border transition-all cursor-pointer ${
                                                                            msg.feedback === 'helpful'
                                                                                ? 'bg-green-50 border-green-200 text-green-600'
                                                                                : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                                                                        }`}
                                                                        title="Helpful"
                                                                    >
                                                                        👍
                                                                    </button>
                                                                    {/* Thumbs Down */}
                                                                    <button 
                                                                        disabled={msg.feedback && msg.feedback !== 'none'}
                                                                        onClick={() => handleFeedback(index, msg.queryId, 'not-helpful')}
                                                                        className={`p-1 rounded-lg border transition-all cursor-pointer ${
                                                                            msg.feedback === 'not-helpful'
                                                                                ? 'bg-red-50 border-red-200 text-red-600'
                                                                                : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                                                                        }`}
                                                                        title="Not Helpful"
                                                                    >
                                                                        👎
                                                                    </button>
                                                                    {/* Copy Button */}
                                                                    <button 
                                                                        onClick={() => handleCopy(msg.content, index)}
                                                                        className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all flex items-center gap-1 cursor-pointer"
                                                                        title="Copy to clipboard"
                                                                    >
                                                                        {copiedMessageIndex === index ? '✓ Copied' : '📋 Copy'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Standard loading response indicator */}
                                {isLoading && (
                                    <div className="flex gap-4 items-start">
                                        <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-100">
                                            ⚖️
                                        </div>
                                        <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 pulse-dot" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 pulse-dot" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 pulse-dot" style={{ animationDelay: '300ms' }} />
                                            <span className="text-xs text-slate-400 ml-2 select-none">Advisor is thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                    )}

                    {/* Bottom Fixed Input Box Container */}
                    <div className="p-4 bg-transparent shrink-0">
                        <div className="max-w-4xl mx-auto">
                            {/* Text & Action Control Container */}
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-lg transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/80 p-2 pr-3 flex items-end gap-2.5">
                                
                                {/* Auto-growing Text Input */}
                                <textarea 
                                    ref={textareaRef}
                                    rows="1"
                                    className="flex-1 bg-transparent border-0 px-3 py-2 focus:outline-none resize-none text-sm text-slate-800 placeholder-slate-400 min-h-[38px] max-h-[140px] overflow-y-auto leading-relaxed"
                                    placeholder="Type your legal query here... (Enter to send)"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isLoading || isChatLoading}
                                />

                                {/* Voice Input Component */}
                                <div className="shrink-0 flex items-center mb-0.5">
                                    <VoiceInput 
                                        sessionId={currentSessionId}
                                        history={messages.slice(1)}
                                        language={selectedLanguage}
                                        onUploadStart={() => setIsLoading(true)}
                                        onUploadSuccess={(transcription, aiResponse, selectedStrategy, caseId, returnedSessionId) => {
                                            setIsLoading(false);
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
                                            
                                            // Handle setting sessionId for new chat session
                                            if (!currentSessionId && returnedSessionId) {
                                                setCurrentSessionId(returnedSessionId);
                                            }
                                            // Reload sessions list
                                            loadSessions();
                                        }}
                                        onUploadError={() => setIsLoading(false)}
                                    />
                                </div>

                                {/* Send Button */}
                                <button 
                                    onClick={handleSend}
                                    disabled={isLoading || isChatLoading || !input.trim()}
                                    className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-blue-500/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none disabled:shadow-none cursor-pointer shrink-0 mb-0.5"
                                    title="Send Message"
                                >
                                    <svg className="w-4.5 h-4.5 fill-current rotate-90" viewBox="0 0 24 24">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-[10px] text-center text-slate-400 mt-2 tracking-wide">
                                Disclaimer: NyayaSetu provides automated legal guidance. Check official resources for formal legal matters.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AILegalHelpPage;
