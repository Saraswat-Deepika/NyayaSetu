import React, { useState, useEffect } from 'react';
import api from '../services/api';
import VoiceInput from '../components/VoiceInput';
import { useAppContext } from '../context/AppContext';
import { Loader2, RefreshCw, Shield, Lock, Trash2 } from 'lucide-react';
import LegalResponseRenderer from '../components/LegalResponseRenderer';

const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    if (seconds < 10) return "just now";
    return Math.floor(seconds) + " seconds ago";
};

const VoiceInputPage = () => {
    const { token } = useAppContext();
    const [language, setLanguage] = useState('English');
    const [transcript, setTranscript] = useState('');
    const [step, setStep] = useState('record'); // record | edit | process | result
    const [aiResponse, setAiResponse] = useState(null);
    const [history, setHistory] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);

    const SUPPORTED_LANGUAGES = [
        'English', 'Hindi', 'Hinglish', 'Marathi', 'Tamil', 'Telugu', 'Bengali', 'Gujarati'
    ];

    useEffect(() => {
        if (token) fetchHistory();
    }, [token]);

    const fetchHistory = async () => {
        try {
            setIsHistoryLoading(true);
            const { data } = await api.get('/voice/history');
            setHistory(data.data || []);
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleDeleteHistory = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Delete this voice query?")) return;
        try {
            await api.delete(`/voice/history/${id}`);
            setHistory(prev => prev.filter(h => h._id !== id));
        } catch (error) {
            console.error("Failed to delete history:", error);
        }
    };

    const handleTranscriptionComplete = (text) => {
        setTranscript(text);
        setStep('edit');
    };

    const processLegalQuery = async () => {
        if (!transcript.trim()) return;
        try {
            setStep('process');
            const { data } = await api.post('/voice/process', 
                { transcript, language }
            );
            setAiResponse(data.data);
            setStep('result');
            fetchHistory(); // Refresh history
        } catch (error) {
            console.error("Failed to process query:", error);
            alert("Error processing query. Please try again.");
            setStep('edit');
        }
    };

    const resetProcess = () => {
        setTranscript('');
        setAiResponse(null);
        setStep('record');
    };

    const loadHistoryItem = (item) => {
        setTranscript(item.transcript);
        setAiResponse(item.responseSummary);
        setLanguage(item.language);
        setStep('result');
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-y-auto px-6 py-8">
                
                <div className="max-w-4xl mx-auto w-full space-y-8">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800">Voice Input</h1>
                        <p className="text-slate-500 mt-1">Speak your legal issue in your preferred language and get AI assistance.</p>
                    </div>

                    {/* Dynamic Steps Container */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-10 relative overflow-hidden">
                        
                        {/* 1. Record Step */}
                        {step === 'record' && (
                            <div className="space-y-8 fade-in">
                                <div className="flex justify-center">
                                    <select 
                                        value={language} 
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        {SUPPORTED_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <VoiceInput 
                                    language={language}
                                    onTranscriptionComplete={handleTranscriptionComplete}
                                />
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full">🎤</div>
                                        <div>
                                            <h4 className="font-bold text-slate-700 text-sm">1. Speak</h4>
                                            <p className="text-xs text-slate-500 mt-1">Speak clearly in your preferred language.</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full">⚙️</div>
                                        <div>
                                            <h4 className="font-bold text-slate-700 text-sm">2. Process</h4>
                                            <p className="text-xs text-slate-500 mt-1">Our AI analyzes and translates the transcript.</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                                        <div className="p-2 bg-green-100 text-green-600 rounded-full">⚖️</div>
                                        <div>
                                            <h4 className="font-bold text-slate-700 text-sm">3. Get Answer</h4>
                                            <p className="text-xs text-slate-500 mt-1">Receive specific acts, sections and next steps.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. Edit Step */}
                        {step === 'edit' && (
                            <div className="space-y-6 fade-in">
                                <h2 className="text-xl font-bold text-slate-800">Review Transcript</h2>
                                <p className="text-slate-500 text-sm">Please verify the text below before submitting it to our legal AI. You can edit any mistakes.</p>
                                <textarea
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 leading-relaxed resize-none"
                                />
                                <div className="flex gap-4">
                                    <button onClick={resetProcess} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                        Discard
                                    </button>
                                    <button onClick={processLegalQuery} className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md">
                                        Submit for Legal Analysis
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 3. Processing Step */}
                        {step === 'process' && (
                            <div className="py-20 flex flex-col items-center justify-center fade-in">
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                                <h2 className="text-xl font-bold text-slate-800 mb-2">Analyzing Legal Query</h2>
                                <p className="text-slate-500">Cross-referencing Indian Law and finding relevant sections...</p>
                            </div>
                        )}

                        {/* 4. Result Step */}
                        {step === 'result' && aiResponse && (
                            <div className="space-y-6 fade-in">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">AI Legal Guidance</h2>
                                        <p className="text-slate-500 text-sm mt-1">Based on: "{transcript}"</p>
                                    </div>
                                    <button onClick={resetProcess} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-semibold text-sm">
                                        <RefreshCw className="w-4 h-4" /> New Query
                                    </button>
                                </div>

                                <div className="mt-8">
                                    <LegalResponseRenderer responseText={aiResponse.response} />
                                </div>

                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium pb-8">
                        <Shield className="w-4 h-4" />
                        <span>Your conversations are secure and confidential.</span>
                        <Lock className="w-3 h-3 ml-2" />
                        <span>End-to-end encrypted</span>
                    </div>
                </div>
            </div>

            {/* Right Sidebar: History & Tips */}
            <div className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-3">
                        💡 Tips for Better Results
                    </h3>
                    <ul className="space-y-3 text-xs text-amber-700/80">
                        <li className="flex items-start gap-2"><span>•</span> Speak clearly and at a moderate pace.</li>
                        <li className="flex items-start gap-2"><span>•</span> Provide all relevant details about your issue.</li>
                        <li className="flex items-start gap-2"><span>•</span> Mention specific dates, names, or places if applicable.</li>
                        <li className="flex items-start gap-2"><span>•</span> Keep background noise to a minimum.</li>
                    </ul>
                </div>

                <div className="flex-1 flex flex-col">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Loader2 className={`w-4 h-4 text-blue-500 ${isHistoryLoading ? 'animate-spin' : 'hidden'}`} />
                        Recent Voice Inputs
                    </h3>
                    
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                        {history.length === 0 && !isHistoryLoading ? (
                            <p className="text-sm text-slate-500 italic text-center py-4">No recent voice queries.</p>
                        ) : (
                            history.map(item => (
                                <div 
                                    key={item._id} 
                                    onClick={() => loadHistoryItem(item)}
                                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">🎤</div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{item.language}</span>
                                        </div>
                                        <button onClick={(e) => handleDeleteHistory(item._id, e)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-700 font-medium line-clamp-2 leading-snug">"{item.transcript}"</p>
                                    <p className="text-[10px] text-slate-400 mt-2 text-right">
                                        {timeAgo(item.createdAt)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default VoiceInputPage;
