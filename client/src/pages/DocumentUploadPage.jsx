import React, { useState, useRef, useEffect } from 'react';
import { uploadDocument, chatWithDocument, translateDocument } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { 
    Scale, FileText, Calendar, ShieldAlert, Award, 
    Play, Pause, Square, Download, Send, Globe, 
    ChevronRight, MessageSquare, Check, Loader2, 
    ArrowLeftRight, User, AlertTriangle, Cpu, ListCollapse
} from 'lucide-react';

const DocumentUploadPage = () => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [language, setLanguage] = useState('English');
    const [translating, setTranslating] = useState(false);
    
    // Toggle for Original Legal language vs Simple Language Explanation
    const [isSimpleMode, setIsSimpleMode] = useState(false);
    
    // Audio Player State (Text to Speech)
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const synthRef = useRef(window.speechSynthesis);
    const utteranceRef = useRef(null);

    // Chat State (RAG)
    const [chatQuery, setChatQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    const fileInputRef = useRef(null);

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isChatLoading]);

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null); // Clear previous results
            setChatHistory([]); // Reset chat
            setIsSimpleMode(false);
            if (synthRef.current) synthRef.current.cancel();
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
            setResult(null);
            setChatHistory([]);
            setIsSimpleMode(false);
            if (synthRef.current) synthRef.current.cancel();
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append('document', file);
        formData.append('language', language);

        try {
            const data = await uploadDocument(formData);
            setResult(data);
        } catch (error) {
            console.error("Document upload failed:", error);
            const errorMsg = error.response?.data?.error || `Failed to process document: ${error.message}`;
            alert(`Error: ${errorMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle dynamically translating the summary
    const handleTranslate = async (targetLang) => {
        if (!result || !result.documentId) return;
        setLanguage(targetLang);
        setTranslating(true);
        if (synthRef.current) synthRef.current.cancel();
        setIsSpeaking(false);
        setIsPaused(false);

        try {
            const data = await translateDocument(result.documentId, targetLang);
            // Update the result with translated summary and raw data
            setResult(prev => ({
                ...prev,
                summary: data.summary,
                rawSummary: data.rawSummary
            }));
        } catch (err) {
            console.error("Translation failed:", err);
            alert("Failed to translate the document summary. Please try again.");
        } finally {
            setTranslating(false);
        }
    };

    // Text to Speech
    const handleSpeak = () => {
        if (!synthRef.current || !result) return;

        // If speaking and paused, resume
        if (isSpeaking && isPaused) {
            synthRef.current.resume();
            setIsPaused(false);
            return;
        }

        // If currently speaking and not paused, pause
        if (isSpeaking && !isPaused) {
            synthRef.current.pause();
            setIsPaused(true);
            return;
        }

        // Cancel any active speech
        synthRef.current.cancel();

        // Compile text to speak based on mode (Legal summary vs Simple language)
        let textToSpeak = "";
        const raw = result.rawSummary || {};

        if (isSimpleMode) {
            textToSpeak = raw.simpleLanguageSummary || "No simplified explanation available.";
        } else {
            const ai = raw.aiSummary || {};
            textToSpeak = `Document Overview: ${ai.documentOverview || ''}. Facts: ${ai.factsOfCase || ''}. Decision: ${ai.decisionOutcome || ''}.`;
        }

        if (!textToSpeak) return;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Map target language to standard TTS locales
        const langMap = {
            'Hindi': 'hi-IN',
            'English': 'en-US',
            'Bengali': 'bn-IN',
            'Tamil': 'ta-IN',
            'Telugu': 'te-IN',
            'Marathi': 'mr-IN',
            'Gujarati': 'gu-IN',
            'Punjabi': 'pa-IN',
            'Urdu': 'ur-PK'
        };
        utterance.lang = langMap[language] || 'en-US';

        utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
        };

        utterance.onerror = (e) => {
            console.error("Speech error:", e);
            setIsSpeaking(false);
            setIsPaused(false);
        };

        utteranceRef.current = utterance;
        setIsSpeaking(true);
        setIsPaused(false);
        synthRef.current.speak(utterance);
    };

    const handleStopSpeech = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
        setIsSpeaking(false);
        setIsPaused(false);
    };

    // RAG Chat Submission
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatQuery.trim() || !result || !result.documentId || isChatLoading) return;

        const userMsg = chatQuery.trim();
        setChatQuery('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsChatLoading(true);

        try {
            const answerRes = await chatWithDocument(result.documentId, userMsg, chatHistory);
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: answerRes.answer,
                citations: answerRes.citations
            }]);
        } catch (err) {
            console.error("Chat failure:", err);
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: "Sorry, I had trouble processing your question about this document." 
            }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    // Click quick question chips
    const handleChipClick = (question) => {
        setChatQuery(question);
    };

    // PDF / File Download Center
    const downloadExtractedText = () => {
        if (!result || !result.extractedText) return;
        const element = document.createElement("a");
        const fileContent = result.extractedText;
        const textFile = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        element.href = URL.createObjectURL(textFile);
        element.download = `${result.rawSummary?.structuredData?.documentType || 'Document'}_extracted_text.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const generatePDF = (reportType) => {
        if (!result || !result.rawSummary) return;
        const doc = new jsPDF();
        let y = 15;
        const raw = result.rawSummary;

        // Cover page style header
        doc.setFillColor(37, 99, 235); // solid blue
        doc.rect(0, 0, 210, 4, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text("NyayaSetu AI Legal Platform", 15, y + 5);
        y += 12;

        doc.setFontSize(11);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated Report: ${reportType} (${language})`, 15, y);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, y);
        y += 10;

        doc.setDrawColor(226, 232, 240);
        doc.line(15, y, 195, y);
        y += 12;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);

        if (reportType === 'Summary & Case Details') {
            // Document Classification
            doc.setFontSize(15);
            doc.text("1. Document Classification", 15, y);
            y += 8;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const meta = raw.structuredData || {};
            const metaFields = [
                `Document Type: ${meta.documentType || 'N/A'}`,
                `Case Number: ${meta.caseNumber || 'N/A'}`,
                `Court: ${meta.courtName || 'N/A'}`,
                `Judge: ${meta.judgeName || 'N/A'}`,
                `Filing Date: ${meta.filingDate || 'N/A'}`,
                `Petitioner: ${meta.petitioner || 'N/A'}`,
                `Respondent: ${meta.respondent || 'N/A'}`,
                `Parties Involved: ${(meta.partiesInvolved || []).join(', ') || 'N/A'}`,
                `Relevant Laws: ${(meta.relevantSections || []).join(', ') || 'N/A'}`
            ];

            metaFields.forEach(field => {
                doc.text(`• ${field}`, 20, y);
                y += 6;
            });
            y += 8;

            // Overview & Facts
            doc.setFont("helvetica", "bold");
            doc.setFontSize(15);
            doc.text("2. Case Analysis Overview", 15, y);
            y += 8;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const ai = raw.aiSummary || {};
            const sections = [
                { title: "Document Overview:", text: ai.documentOverview },
                { title: "Facts of the Case:", text: ai.factsOfCase },
                { title: "Key Legal Issues:", text: ai.legalIssues },
                { title: "Final Decision/Outcome:", text: ai.decisionOutcome }
            ];

            sections.forEach(sec => {
                doc.setFont("helvetica", "bold");
                doc.text(sec.title, 15, y);
                y += 6;
                doc.setFont("helvetica", "normal");
                const splitText = doc.splitTextToSize(sec.text || "N/A", 180);
                doc.text(splitText, 15, y);
                y += splitText.length * 5 + 6;
            });

        } else if (reportType === 'Risk Analysis Report') {
            doc.setFontSize(16);
            doc.text("Contract & Legal Risk Analysis", 15, y);
            y += 10;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            
            if (raw.riskAnalysis && raw.riskAnalysis.length > 0) {
                raw.riskAnalysis.forEach((risk, i) => {
                    doc.setFont("helvetica", "bold");
                    doc.text(`${i + 1}. [${risk.severity}] ${risk.issue}`, 15, y);
                    y += 6;
                    doc.setFont("helvetica", "normal");
                    const splitDesc = doc.splitTextToSize(risk.description || "", 180);
                    doc.text(splitDesc, 20, y);
                    y += splitDesc.length * 5 + 8;
                });
            } else {
                doc.text("No specific legal risks detected.", 15, y);
            }

        } else if (reportType === 'Timeline of Events') {
            doc.setFontSize(16);
            doc.text("Document Chronology & Event Timeline", 15, y);
            y += 10;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");

            if (raw.timeline && raw.timeline.length > 0) {
                raw.timeline.forEach((event) => {
                    doc.setFont("helvetica", "bold");
                    doc.text(`• ${event.date || 'N/A'}:`, 15, y);
                    doc.setFont("helvetica", "normal");
                    doc.text(event.event || "", 45, y);
                    y += 7;
                });
            } else {
                doc.text("No chronological dates or events detected in the document.", 15, y);
            }
        }

        doc.save(`NyayaSetu_${reportType.replace(/ /g, '_')}_${Date.now()}.pdf`);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen text-slate-800 bg-slate-50/50">
            {/* Header section with legal theme styling */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/60 pb-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Scale className="text-blue-600 w-9 h-9" />
                        AI Legal Document Studio
                    </h2>
                    <p className="text-slate-500 mt-2 text-lg">
                        Analyze legal briefs, contracts, court orders, or agreements using advanced OCR, simple language summarization, and RAG chat.
                    </p>
                </div>
            </div>

            {/* Upload Area */}
            {!result && (
                <div className="max-w-3xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-white rounded-3xl shadow-xl border border-slate-100 p-12 flex flex-col items-center justify-center min-h-[380px] border-dashed border-2 cursor-pointer transition-all ${
                            file ? 'border-blue-400 bg-blue-50/10' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80'
                        }`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => !file && fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept=".pdf,image/*"
                        />

                        {!file ? (
                            <>
                                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                                    <Scale className="w-12 h-12" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload Legal Documents</h3>
                                <p className="text-slate-500 mb-8 text-center max-w-md">
                                    Drag & drop your legal PDF briefs, agreements, or document images. Supported formats: PDF, JPG, PNG.
                                </p>
                                <button className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                    Browse Files
                                </button>
                            </>
                        ) : (
                            <div className="text-center w-full max-w-md">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-inner">
                                    <Check className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-1 truncate px-4">{file.name}</h3>
                                <p className="text-slate-500 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                
                                <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200/40 flex flex-col items-center gap-3">
                                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-blue-500" /> Choose Analysis Language:
                                    </span>
                                    <select 
                                        className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium shadow-sm"
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="English">English</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Bengali">Bengali</option>
                                        <option value="Telugu">Telugu</option>
                                        <option value="Marathi">Marathi</option>
                                        <option value="Tamil">Tamil</option>
                                        <option value="Urdu">Urdu</option>
                                        <option value="Gujarati">Gujarati</option>
                                        <option value="Kannada">Kannada</option>
                                        <option value="Malayalam">Malayalam</option>
                                        <option value="Punjabi">Punjabi</option>
                                    </select>
                                </div>

                                <div className="flex gap-4 justify-center">
                                    <button 
                                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/10 flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                                        onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="animate-spin w-5 h-5 text-white" />
                                                Analyzing PDF...
                                            </>
                                        ) : 'Process Document'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Analysis Workspace Dashboard */}
            {result && (
                <div className="space-y-8">
                    {/* Top Stats: Confidence Metrics & Dynamic Language selector */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Summary Header info card */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Document</span>
                                <h4 className="text-xl font-black text-slate-800 truncate mt-1">{file?.name}</h4>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-500" />
                                    <select 
                                        className="text-sm border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                        value={language}
                                        onChange={(e) => handleTranslate(e.target.value)}
                                        disabled={translating}
                                    >
                                        <option value="English">English</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Bengali">Bengali</option>
                                        <option value="Telugu">Telugu</option>
                                        <option value="Marathi">Marathi</option>
                                        <option value="Tamil">Tamil</option>
                                        <option value="Urdu">Urdu</option>
                                        <option value="Gujarati">Gujarati</option>
                                        <option value="Kannada">Kannada</option>
                                        <option value="Malayalam">Malayalam</option>
                                        <option value="Punjabi">Punjabi</option>
                                    </select>
                                </div>
                                {translating && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                            </div>
                        </div>

                        {/* OCR confidence */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm flex items-center gap-6">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                                    <circle cx="32" cy="32" r="28" stroke="#3B82F6" strokeWidth="6" fill="transparent" 
                                            strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * (result.rawSummary?.confidenceScores?.ocrAccuracy || 95)) / 100} />
                                </svg>
                                <span className="absolute text-sm font-extrabold text-slate-800">{result.rawSummary?.confidenceScores?.ocrAccuracy || 95}%</span>
                            </div>
                            <div>
                                <h5 className="font-extrabold text-slate-800">OCR Accuracy</h5>
                                <p className="text-xs text-slate-400 mt-1">Text extraction reliability score from PDF parser.</p>
                            </div>
                        </div>

                        {/* Summary confidence */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm flex items-center gap-6">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                                    <circle cx="32" cy="32" r="28" stroke="#8B5CF6" strokeWidth="6" fill="transparent" 
                                            strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * (result.rawSummary?.confidenceScores?.summaryConfidence || 92)) / 100} />
                                </svg>
                                <span className="absolute text-sm font-extrabold text-slate-800">{result.rawSummary?.confidenceScores?.summaryConfidence || 92}%</span>
                            </div>
                            <div>
                                <h5 className="font-extrabold text-slate-800">AI Comprehension</h5>
                                <p className="text-xs text-slate-400 mt-1">LLM confidence score regarding document summarization.</p>
                            </div>
                        </div>

                        {/* Entity confidence */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm flex items-center gap-6">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                                    <circle cx="32" cy="32" r="28" stroke="#10B981" strokeWidth="6" fill="transparent" 
                                            strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * (result.rawSummary?.confidenceScores?.entityExtractionConfidence || 90)) / 100} />
                                </svg>
                                <span className="absolute text-sm font-extrabold text-slate-800">{result.rawSummary?.confidenceScores?.entityExtractionConfidence || 90}%</span>
                            </div>
                            <div>
                                <h5 className="font-extrabold text-slate-800">Entity Precision</h5>
                                <p className="text-xs text-slate-400 mt-1">Accuracy score for court details, sections, and dates.</p>
                            </div>
                        </div>
                    </div>

                    {/* Smart Legal Information Cards (Horizontal Grid) */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-200/50 shadow-sm space-y-6">
                        <h3 className="text-lg font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Cpu className="text-blue-500 w-5 h-5" />
                            Smart Legal Info Extraction
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-2xl flex flex-col justify-between">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-blue-500" /> Type</span>
                                <span className="font-extrabold text-slate-800 mt-2 truncate block">{result.rawSummary?.structuredData?.documentType || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-2xl flex flex-col justify-between">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-500" /> Filing Date</span>
                                <span className="font-extrabold text-slate-800 mt-2 truncate block">{result.rawSummary?.structuredData?.filingDate || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-2xl flex flex-col justify-between">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-blue-500" /> Case Number</span>
                                <span className="font-extrabold text-slate-800 mt-2 truncate block">{result.rawSummary?.structuredData?.caseNumber || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-2xl flex flex-col justify-between">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-blue-500" /> Judge Name</span>
                                <span className="font-extrabold text-slate-800 mt-2 truncate block">{result.rawSummary?.structuredData?.judgeName || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-2xl flex flex-col justify-between">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-blue-500" /> Parties</span>
                                <span className="font-extrabold text-slate-800 mt-2 truncate block">{(result.rawSummary?.structuredData?.partiesInvolved || []).join(', ') || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Split Main Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Left Column: Summary, Simplified Toggle, Audio Controls */}
                        <div className="xl:col-span-2 space-y-8">
                            <div className="bg-white rounded-3xl p-8 border border-slate-200/50 shadow-sm flex flex-col min-h-[500px]">
                                {/* Toolbar */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            className={`px-4 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 ${
                                                !isSimpleMode ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                            onClick={() => setIsSimpleMode(false)}
                                        >
                                            <FileText className="w-4 h-4" /> Legal Summary
                                        </button>
                                        <button 
                                            className={`px-4 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 ${
                                                isSimpleMode ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10' : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                            onClick={() => setIsSimpleMode(true)}
                                        >
                                            <ArrowLeftRight className="w-4 h-4" /> Simple Language
                                        </button>
                                    </div>

                                    {/* Audio synthesis controls */}
                                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/50">
                                        <span className="text-xs font-bold text-slate-400 px-2 uppercase tracking-wide">Audio Summary</span>
                                        <button 
                                            onClick={handleSpeak}
                                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200/80 shadow-sm text-slate-700 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                            title={isSpeaking && !isPaused ? "Pause" : "Play/Resume"}
                                        >
                                            {isSpeaking && !isPaused ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </button>
                                        <button 
                                            onClick={handleStopSpeech}
                                            disabled={!isSpeaking}
                                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200/80 shadow-sm text-slate-700 hover:text-rose-600 disabled:opacity-50 transition-colors"
                                            title="Stop"
                                        >
                                            <Square className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Text Body Area */}
                                <div className="flex-1 overflow-y-auto">
                                    <AnimatePresence mode="wait">
                                        {translating ? (
                                            <div className="h-64 flex flex-col items-center justify-center text-blue-500">
                                                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                                <p className="font-semibold animate-pulse">Translating summary content...</p>
                                            </div>
                                        ) : !isSimpleMode ? (
                                            <motion.div 
                                                key="legal-summary"
                                                initial={{ opacity: 0, x: -10 }} 
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                className="prose prose-blue max-w-none text-slate-700 text-sm leading-relaxed"
                                            >
                                                {result.summary ? (
                                                    <ReactMarkdown>{result.summary}</ReactMarkdown>
                                                ) : (
                                                    "No summary content available."
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div 
                                                key="simple-summary"
                                                initial={{ opacity: 0, x: 10 }} 
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                className="space-y-6"
                                            >
                                                <div className="p-5 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-2xl">
                                                    <h4 className="text-base font-extrabold text-emerald-800 flex items-center gap-2 mb-2">
                                                        <ArrowLeftRight className="w-4 h-4" />
                                                        Plain Language Explanation
                                                    </h4>
                                                    <p className="text-sm leading-relaxed">
                                                        {result.rawSummary?.simpleLanguageSummary || "No plain language explanation has been generated."}
                                                    </p>
                                                </div>

                                                <div className="bg-slate-50 border border-slate-200/40 p-5 rounded-2xl">
                                                    <h5 className="font-bold text-slate-700 mb-2">Key Takeaways Simplified:</h5>
                                                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                                                        {(result.rawSummary?.aiSummary?.keyTakeaways || []).map((t, i) => (
                                                            <li key={i}>{t}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Risk Panel, Timeline, Downloads */}
                        <div className="space-y-8">
                            {/* Download Center */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm space-y-4">
                                <h4 className="font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                                    <Download className="text-blue-500 w-5 h-5" /> Download Center
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    <button 
                                        onClick={downloadExtractedText}
                                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-sm font-semibold"
                                    >
                                        <span className="flex items-center gap-2.5 text-slate-700"><FileText className="w-4 h-4 text-blue-500" /> Extracted Raw Text</span>
                                        <Download className="w-4 h-4 text-slate-400" />
                                    </button>
                                    <button 
                                        onClick={() => generatePDF('Summary & Case Details')}
                                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-sm font-semibold"
                                    >
                                        <span className="flex items-center gap-2.5 text-slate-700"><Award className="w-4 h-4 text-violet-500" /> Case Analysis PDF</span>
                                        <Download className="w-4 h-4 text-slate-400" />
                                    </button>
                                    <button 
                                        onClick={() => generatePDF('Risk Analysis Report')}
                                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-sm font-semibold"
                                    >
                                        <span className="flex items-center gap-2.5 text-slate-700"><ShieldAlert className="w-4 h-4 text-rose-500" /> Legal Risk Report PDF</span>
                                        <Download className="w-4 h-4 text-slate-400" />
                                    </button>
                                    <button 
                                        onClick={() => generatePDF('Timeline of Events')}
                                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-sm font-semibold"
                                    >
                                        <span className="flex items-center gap-2.5 text-slate-700"><Calendar className="w-4 h-4 text-amber-500" /> Document Timeline PDF</span>
                                        <Download className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Risk Analysis Panel */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm space-y-4">
                                <h4 className="font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                                    <ShieldAlert className="text-blue-500 w-5 h-5" /> Legal Risk Detection
                                </h4>
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                    {result.rawSummary?.riskAnalysis && result.rawSummary.riskAnalysis.length > 0 ? (
                                        result.rawSummary.riskAnalysis.map((risk, index) => {
                                            const sevColors = {
                                                'Red': 'bg-rose-50 border-rose-100 text-rose-900',
                                                'Yellow': 'bg-amber-50 border-amber-100 text-amber-900',
                                                'Green': 'bg-emerald-50 border-emerald-100 text-emerald-900'
                                            };
                                            const badgeColors = {
                                                'Red': 'bg-rose-500',
                                                'Yellow': 'bg-amber-500',
                                                'Green': 'bg-emerald-500'
                                            };
                                            const colorClass = sevColors[risk.severity] || 'bg-slate-50 border-slate-200/50 text-slate-800';
                                            return (
                                                <div key={index} className={`p-4 rounded-2xl border ${colorClass} space-y-1`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-extrabold text-sm flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${badgeColors[risk.severity] || 'bg-slate-400'}`}></div>
                                                            {risk.issue}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-bold tracking-widest bg-white px-2 py-0.5 rounded-md shadow-sm border border-slate-200/20">{risk.severity}</span>
                                                    </div>
                                                    <p className="text-xs leading-relaxed opacity-90">{risk.description}</p>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-slate-400 text-center py-6">No critical legal risks detected.</p>
                                    )}
                                </div>
                            </div>

                            {/* Timeline Generator */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm space-y-4">
                                <h4 className="font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                                    <Calendar className="text-blue-500 w-5 h-5" /> Visual Timeline
                                </h4>
                                <div className="space-y-6 max-h-[300px] overflow-y-auto pl-2 pr-1">
                                    {result.rawSummary?.timeline && result.rawSummary.timeline.length > 0 ? (
                                        result.rawSummary.timeline.map((event, index) => (
                                            <div key={index} className="flex gap-4 relative">
                                                {/* Left line spacer */}
                                                {index !== result.rawSummary.timeline.length - 1 && (
                                                    <span className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-slate-200"></span>
                                                )}
                                                <div className="w-5 h-5 bg-blue-100 border border-blue-200 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 z-10">
                                                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                                                </div>
                                                <div className="-mt-0.5 space-y-1">
                                                    <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase">{event.date}</span>
                                                    <p className="text-xs font-semibold text-slate-600">{event.event}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-400 text-center py-6">No dates extracted for a timeline.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chat with Uploaded Document (RAG) */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-200/50 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                <MessageSquare className="text-blue-600 w-6 h-6" />
                                Chat with Document (RAG)
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">
                                Ask context-specific questions about this document. The AI will only answer based on the uploaded file text and display quotes/citations.
                            </p>
                        </div>

                        {/* Conversational Screen */}
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 h-[400px] overflow-y-auto flex flex-col gap-4">
                            {chatHistory.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-3">
                                    <MessageSquare className="w-12 h-12 text-slate-200" />
                                    <h5 className="font-bold text-slate-500">Start a Conversation</h5>
                                    <p className="text-xs max-w-sm">Use the input box or click one of the quick questions below to ask specific details about the document.</p>
                                </div>
                            )}

                            {chatHistory.map((msg, i) => {
                                const isUser = msg.role === 'user';
                                return (
                                    <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                                            isUser 
                                                ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-500/10' 
                                                : 'bg-white border border-slate-200/60 text-slate-800 rounded-bl-none shadow-sm'
                                        }`}>
                                            <p>{msg.content}</p>
                                            
                                            {/* Expandable Citations */}
                                            {!isUser && msg.citations && msg.citations.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Citations & Sources:</span>
                                                    {msg.citations.map((c, idx) => (
                                                        <div key={idx} className="p-2 bg-slate-50 border border-slate-200/60 rounded-lg text-slate-500 text-[11px] font-mono mt-1 whitespace-pre-wrap leading-normal">
                                                            {c.text}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200/60 rounded-2xl rounded-bl-none p-4 text-sm flex items-center gap-2.5 text-blue-500 shadow-sm">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>AI is searching vector database...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef}></div>
                        </div>

                        {/* Quick Question Chips */}
                        <div className="flex flex-wrap gap-2.5">
                            <button onClick={() => handleChipClick("What is the penalty amount?")} className="px-3.5 py-2 bg-slate-50 border border-slate-200/50 hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition-colors text-xs font-semibold rounded-lg shadow-sm">
                                What is the penalty amount?
                            </button>
                            <button onClick={() => handleChipClick("Who filed the case?")} className="px-3.5 py-2 bg-slate-50 border border-slate-200/50 hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition-colors text-xs font-semibold rounded-lg shadow-sm">
                                Who filed the case?
                            </button>
                            <button onClick={() => handleChipClick("What is the final judgment?")} className="px-3.5 py-2 bg-slate-50 border border-slate-200/50 hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition-colors text-xs font-semibold rounded-lg shadow-sm">
                                What is the final judgment?
                            </button>
                            <button onClick={() => handleChipClick("Which IPC sections are mentioned?")} className="px-3.5 py-2 bg-slate-50 border border-slate-200/50 hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition-colors text-xs font-semibold rounded-lg shadow-sm">
                                Which IPC sections are mentioned?
                            </button>
                        </div>

                        {/* Input Box */}
                        <form onSubmit={handleChatSubmit} className="flex gap-3">
                            <input 
                                type="text"
                                className="flex-1 px-4 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400 text-sm shadow-sm"
                                placeholder="Type your query regarding the document..."
                                value={chatQuery}
                                onChange={(e) => setChatQuery(e.target.value)}
                                disabled={isChatLoading}
                            />
                            <button 
                                type="submit" 
                                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center disabled:opacity-50"
                                disabled={isChatLoading}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>

                    {/* Reset Button */}
                    <div className="flex justify-end pt-4">
                        <button 
                            className="px-6 py-3 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all font-bold"
                            onClick={() => {
                                setFile(null);
                                setResult(null);
                                setChatHistory([]);
                                if (synthRef.current) synthRef.current.cancel();
                            }}
                        >
                            Reset & Upload New Document
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentUploadPage;
