import React, { useState, useRef, useEffect } from 'react';
import { uploadDocument, chatWithDocument, translateDocument } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
    Scale, FileText, Calendar, ShieldAlert, Award,
    Play, Pause, Square, Download, Send, Globe,
    ChevronRight, MessageSquare, Check, Loader2,
    ArrowLeftRight, User, AlertTriangle, Cpu, ListCollapse,
    Phone, ExternalLink, BookOpen, Clock, ArrowRight, Info, HelpCircle, CheckCircle
} from 'lucide-react';

const getCitizenSummary = (result) => {
    if (!result) return null;
    const raw = result.rawSummary || {};
    
    // If citizenSummary is already returned by the backend, return it!
    if (raw.citizenSummary) {
        return raw.citizenSummary;
    }
    
    // Otherwise, generate fallback data from other fields
    const fallback = {};
    
    // What this document is about
    fallback.whatThisDocumentIsAbout = raw.simpleLanguageSummary || 
        raw.aiSummary?.documentOverview || 
        "This legal document pertains to a case filed under Indian law. It details the rights, obligations, and legal procedures for the parties involved.";
        
    // Who is involved
    if (raw.structuredData?.petitioner && raw.structuredData?.respondent) {
        fallback.whoIsInvolved = `Petitioner (Filing party): ${raw.structuredData.petitioner}\nRespondent (Defending party): ${raw.structuredData.respondent}`;
    } else if (raw.structuredData?.partiesInvolved && raw.structuredData.partiesInvolved.length > 0) {
        fallback.whoIsInvolved = raw.structuredData.partiesInvolved.join(', ');
    } else {
        fallback.whoIsInvolved = raw.aiSummary?.partiesInvolved || "The parties listed in the document.";
    }
    
    // Key facts and decisions
    if (raw.aiSummary?.keyTakeaways && raw.aiSummary.keyTakeaways.length > 0) {
        fallback.keyFactsAndDecisions = raw.aiSummary.keyTakeaways.slice(0, 6);
    } else if (raw.aiSummary?.factsOfCase) {
        fallback.keyFactsAndDecisions = raw.aiSummary.factsOfCase
            .split(/[.!?]/)
            .map(s => s.trim())
            .filter(s => s.length > 15)
            .slice(0, 6);
    } else {
        fallback.keyFactsAndDecisions = [
            "A legal action or agreement has been initiated between the parties.",
            "Relevant sections of Indian law are cited in the document.",
            "Terms, conditions, and procedures are detailed in the text."
        ];
    }
    
    // What this means for you
    fallback.whatThisMeansForYou = raw.simpleLanguageSummary 
        ? raw.simpleLanguageSummary.split(/[.!?]/).slice(0, 2).join('.') + '.' 
        : "You should review the roles, obligations, and critical timelines specified in this document to protect your rights.";
        
    // What you should do next
    fallback.whatYouShouldDoNext = [
        "Read all details carefully to understand your role and obligations.",
        "Take note of all deadlines, payment dates, or hearing dates mentioned.",
        "Keep a printed copy and digital backup of this document in a safe place.",
        "Consult your local District Legal Services Authority or a lawyer if you need representation."
    ];
    
    // Important dates and deadlines
    if (raw.timeline && raw.timeline.length > 0) {
        fallback.importantDatesAndDeadlines = raw.timeline.map(t => `${t.date}: ${t.event}`);
    } else if (raw.structuredData?.filingDate) {
        fallback.importantDatesAndDeadlines = [`Filing Date: ${raw.structuredData.filingDate}`];
    } else {
        fallback.importantDatesAndDeadlines = ["No specific upcoming deadlines detected. Check dates carefully."];
    }
    
    // Legal terms explained
    if (raw.structuredData?.legalKeywords && raw.structuredData.legalKeywords.length > 0) {
        const glossaryDict = {
            'FIR': 'First Information Report (the initial complaint filed with the police)',
            'CrPC': 'Code of Criminal Procedure (the rules for how criminal cases are handled)',
            'IPC': 'Indian Penal Code (the law listing crimes and their punishments)',
            'CPC': 'Code of Civil Procedure (rules for civil cases like property disputes)',
            'Petitioner': 'The person who files a petition/case in court',
            'Respondent': 'The person who is being sued or accused',
            'Adjournment': 'Postponing a court hearing to a future date',
            'Jurisdiction': 'The court\'s authority to hear and decide a case',
            'Affidavit': 'A written statement confirmed by oath, to be used as evidence in court',
            'Injunction': 'A court order that forces a party to do or stop doing something'
        };
        fallback.legalTermsExplained = raw.structuredData.legalKeywords.slice(0, 5).map(keyword => {
            const clean = keyword.trim();
            const matched = Object.keys(glossaryDict).find(k => clean.toLowerCase().includes(k.toLowerCase()));
            return {
                term: clean,
                definition: matched ? glossaryDict[matched] : "Legal term mentioned in the document context."
            };
        });
    } else {
        fallback.legalTermsExplained = [
            { term: "Petitioner", definition: "The person who starts a legal case in court." },
            { term: "Respondent", definition: "The person responding to or defending against the case." }
        ];
    }
    
    // Risks to be aware of
    if (raw.riskAnalysis && raw.riskAnalysis.length > 0) {
        fallback.risksToBeAwareOf = raw.riskAnalysis.slice(0, 3).map(r => `${r.issue}: ${r.description}`);
    } else {
        fallback.risksToBeAwareOf = [
            "Be aware of hidden clauses or terms that could lead to financial or legal penalties.",
            "Verify all signatures and stamp duties are complete and valid."
        ];
    }
    
    return fallback;
};

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

        // Compile text to speak based on citizen summary
        let textToSpeak = "";
        const citizenData = getCitizenSummary(result);
        if (citizenData) {
            textToSpeak = `What this document is about: ${citizenData.whatThisDocumentIsAbout}. What this means for you: ${citizenData.whatThisMeansForYou}. What you should do next: ${citizenData.whatYouShouldDoNext.join('. ')}.`;
        } else {
            textToSpeak = "No summary content available.";
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 min-h-screen text-slate-800 bg-slate-50/50">
            {/* Header section with legal theme styling */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/60 pb-6 gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Scale className="text-blue-600 w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
                        AI Legal Document Studio
                    </h2>
                    <p className="text-slate-500 mt-2 text-sm sm:text-base md:text-lg">
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
                        className={`bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-12 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[380px] border-dashed border-2 cursor-pointer transition-all ${file ? 'border-blue-400 bg-blue-50/10' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80'
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
                                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-blue-50 text-blue-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 shadow-inner">
                                    <Scale className="w-8 h-8 sm:w-12 sm:h-12" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 text-center">Upload Legal Documents</h3>
                                <p className="text-slate-500 mb-6 sm:mb-8 text-center text-sm sm:text-base max-w-md">
                                    Drag & drop your legal PDF briefs, agreements, or document images. Supported formats: PDF, JPG, PNG.
                                </p>
                                <button className="px-6 sm:px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-sm sm:text-base">
                                    Browse Files
                                </button>
                            </>
                        ) : (
                            <div className="text-center w-full max-w-md">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto shadow-inner">
                                    <Check className="w-8 h-8 sm:w-10 sm:h-10" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1 truncate px-4">{file.name}</h3>
                                <p className="text-slate-500 mb-6 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                                <div className="mb-6 sm:mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200/40 flex flex-col items-center gap-3">
                                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-blue-500" /> Choose Analysis Language:
                                    </span>
                                    <select
                                        className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium shadow-sm text-sm"
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

                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full">
                                    <button
                                        className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm"
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed text-sm"
                                        onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="animate-spin w-4 h-4 text-white" />
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
                <div className="space-y-6 sm:space-y-8">
                    {/* Active Document Info Banner */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-3xl p-6 border border-blue-100/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600 border border-blue-100">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Document</span>
                                <h4 className="text-lg font-bold text-slate-800 mt-0.5">{file?.name}</h4>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl shadow-sm border border-slate-200/60">
                                <Globe className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-semibold text-slate-650">Language:</span>
                                <select
                                    className="text-xs border-0 p-0 focus:ring-0 focus:outline-none font-bold text-slate-800 bg-transparent cursor-pointer"
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

                    {/* Smart Legal Information Cards (Horizontal Grid) */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/50 shadow-sm space-y-6">
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Cpu className="text-blue-500 w-5 h-5 shrink-0" />
                            Smart Legal Info Extraction
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                            <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-2xl flex flex-col justify-between min-h-[80px]">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Type</span>
                                <span className="font-extrabold text-slate-800 mt-2 text-sm sm:text-base truncate block">{result.rawSummary?.structuredData?.documentType || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-2xl flex flex-col justify-between min-h-[80px]">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Filing Date</span>
                                <span className="font-extrabold text-slate-800 mt-2 text-sm sm:text-base truncate block">{result.rawSummary?.structuredData?.filingDate || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-2xl flex flex-col justify-between min-h-[80px]">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Case Number</span>
                                <span className="font-extrabold text-slate-800 mt-2 text-sm sm:text-base truncate block">{result.rawSummary?.structuredData?.caseNumber || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-2xl flex flex-col justify-between min-h-[80px]">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Judge Name</span>
                                <span className="font-extrabold text-slate-800 mt-2 text-sm sm:text-base truncate block">{result.rawSummary?.structuredData?.judgeName || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-2xl flex flex-col justify-between min-h-[80px]">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Parties</span>
                                <span className="font-extrabold text-slate-800 mt-2 text-sm sm:text-base truncate block">{(result.rawSummary?.structuredData?.partiesInvolved || []).join(', ') || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Split Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                        {/* Left Column: Summary, Simplified Toggle, Audio Controls */}
                        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                            <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200/50 shadow-sm flex flex-col min-h-[350px] sm:min-h-[450px] lg:min-h-[500px]">
                                {/* Toolbar / Audio synthesis controls */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
                                    <h3 className="text-lg font-extrabold text-slate-850 flex items-center gap-2">
                                        <Scale className="text-blue-600 w-5 h-5 shrink-0" />
                                        Citizen-Friendly Summary
                                    </h3>
                                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/50">
                                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 px-2 uppercase tracking-wide">Audio Summary</span>
                                        <div className="flex items-center gap-2">
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
                                </div>

                                {/* Text Body Area */}
                                <div className="flex-1 overflow-y-auto">
                                    <AnimatePresence mode="wait">
                                        {translating ? (
                                            <div className="h-64 flex flex-col items-center justify-center text-blue-500">
                                                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                                <p className="font-semibold animate-pulse">Translating summary content...</p>
                                            </div>
                                        ) : (() => {
                                            const citizenData = getCitizenSummary(result);
                                            return (
                                                <motion.div
                                                    key="citizen-summary"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="space-y-8 pr-2 text-slate-800"
                                                >
                                                    {/* 1. What this means for you (highlighted box at the top) */}
                                                    {citizenData?.whatThisMeansForYou && (
                                                        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl shadow-sm">
                                                            <h4 className="text-base font-extrabold text-blue-900 flex items-center gap-2 mb-2">
                                                                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                                                                What this means for you
                                                            </h4>
                                                            <p className="text-sm text-slate-700 leading-relaxed font-semibold">
                                                                {citizenData.whatThisMeansForYou}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* 2. What this document is about */}
                                                    {citizenData?.whatThisDocumentIsAbout && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                                                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                                                What this document is about
                                                            </h4>
                                                            <p className="text-sm text-slate-600 leading-relaxed pl-7">
                                                                {citizenData.whatThisDocumentIsAbout}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* 3. Who is involved */}
                                                    {citizenData?.whoIsInvolved && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                                                <User className="w-5 h-5 text-purple-500 shrink-0" />
                                                                Who is involved
                                                            </h4>
                                                            <div className="text-sm text-slate-600 leading-relaxed pl-7 whitespace-pre-line">
                                                                {citizenData.whoIsInvolved}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 4. Key facts and decisions */}
                                                    {citizenData?.keyFactsAndDecisions && citizenData.keyFactsAndDecisions.length > 0 && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                                                Key facts and decisions
                                                            </h4>
                                                            <ul className="list-disc pl-12 space-y-2 text-sm text-slate-600">
                                                                {citizenData.keyFactsAndDecisions.map((fact, idx) => (
                                                                    <li key={idx}>{fact}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* 5. What you should do next */}
                                                    {citizenData?.whatYouShouldDoNext && citizenData.whatYouShouldDoNext.length > 0 && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                                                <ArrowRight className="w-5 h-5 text-blue-500 shrink-0" />
                                                                What you should do next
                                                            </h4>
                                                            <ol className="list-decimal pl-12 space-y-2 text-sm text-slate-600">
                                                                {citizenData.whatYouShouldDoNext.map((step, idx) => (
                                                                    <li key={idx} className="pl-1">{step}</li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                    )}

                                                    {/* 6. Important dates and deadlines */}
                                                    {citizenData?.importantDatesAndDeadlines && citizenData.importantDatesAndDeadlines.length > 0 && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                                                <Clock className="w-5 h-5 text-rose-500 shrink-0" />
                                                                Important dates and deadlines
                                                            </h4>
                                                            <div className="pl-7 space-y-2">
                                                                {citizenData.importantDatesAndDeadlines.map((dateStr, idx) => (
                                                                    <div key={idx} className="p-3 bg-rose-50 border border-rose-100 text-rose-900 rounded-xl text-sm font-semibold flex items-start gap-2.5">
                                                                        <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                                                                        <span>{dateStr}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 8. Risks to be aware of */}
                                                    {citizenData?.risksToBeAwareOf && citizenData.risksToBeAwareOf.length > 0 && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                                                Risks to be aware of
                                                            </h4>
                                                            <div className="pl-7 space-y-2">
                                                                {citizenData.risksToBeAwareOf.map((risk, idx) => (
                                                                    <div key={idx} className="p-3.5 bg-amber-50/70 border border-amber-100/80 text-amber-950 rounded-xl text-sm leading-relaxed flex items-start gap-2.5">
                                                                        <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                                                                        <span>{risk}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })()}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                        {/* Right Column: Sidebar */}
                        <div className="space-y-6 sm:space-y-8">
                            {/* Download Center */}
                            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/50 shadow-sm space-y-4">
                                <h4 className="font-extrabold text-slate-805 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm sm:text-base">
                                    <Download className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> Download Center
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={downloadExtractedText}
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-xs sm:text-sm font-semibold"
                                    >
                                        <span className="flex items-center gap-2 text-slate-700"><FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" /> Extracted Raw Text</span>
                                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                                    </button>
                                    <button
                                        onClick={() => generatePDF('Summary & Case Details')}
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-xs sm:text-sm font-semibold"
                                    >
                                        <span className="flex items-center gap-2 text-slate-700"><Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-500 shrink-0" /> Case Analysis PDF</span>
                                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                                    </button>
                                    <button
                                        onClick={() => generatePDF('Risk Analysis Report')}
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-xs sm:text-sm font-semibold"
                                    >
                                        <span className="flex items-center gap-2 text-slate-700"><ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" /> Legal Risk Report PDF</span>
                                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                                    </button>
                                    <button
                                        onClick={() => generatePDF('Timeline of Events')}
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-xs sm:text-sm font-semibold"
                                    >
                                        <span className="flex items-center gap-2 text-slate-700"><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" /> Document Timeline PDF</span>
                                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                                    </button>
                                </div>
                            </div>

                            {/* Important Dates Sidebar Card */}
                            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/50 shadow-sm space-y-4">
                                <h4 className="font-extrabold text-slate-805 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm sm:text-base">
                                    <Clock className="text-rose-500 w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> Important Dates
                                </h4>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {(() => {
                                        const citizenData = getCitizenSummary(result);
                                        return citizenData?.importantDatesAndDeadlines && citizenData.importantDatesAndDeadlines.length > 0 ? (
                                            citizenData.importantDatesAndDeadlines.map((dateStr, index) => (
                                                <div key={index} className="p-3 bg-rose-50/70 border border-rose-100 text-rose-955 rounded-xl space-y-1">
                                                    <div className="flex items-center gap-2 text-rose-600 font-extrabold text-xs">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                                        Deadline / Key Date
                                                    </div>
                                                    <p className="text-xs font-semibold leading-relaxed text-rose-900">{dateStr}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-450 text-center py-4">No critical dates or deadlines found.</p>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Legal Terms Glossary Sidebar Card */}
                            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/50 shadow-sm space-y-4">
                                <h4 className="font-extrabold text-slate-805 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm sm:text-base">
                                    <BookOpen className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> Legal Terms Glossary
                                </h4>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {(() => {
                                        const citizenData = getCitizenSummary(result);
                                        return citizenData?.legalTermsExplained && citizenData.legalTermsExplained.length > 0 ? (
                                            citizenData.legalTermsExplained.slice(0, 5).map((termObj, index) => (
                                                <div key={index} className="p-3 bg-slate-50 border border-slate-200/40 rounded-xl space-y-1">
                                                    <span className="font-bold text-xs text-slate-800 block">{termObj.term}</span>
                                                    <p className="text-[11px] leading-relaxed text-slate-500">{termObj.definition}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-450 text-center py-4">No legal terms defined for this document.</p>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Get Help Sidebar Section */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/60 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                                <h4 className="font-extrabold text-slate-850 flex items-center gap-2 border-b border-blue-100/50 pb-3 text-sm sm:text-base">
                                    <HelpCircle className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> Need Legal Help?
                                </h4>
                                <p className="text-slate-500 text-xs leading-relaxed">
                                    Free legal aid services are available for eligible citizens in India under NALSA regulations.
                                </p>
                                <div className="space-y-3">
                                    {/* Helpline */}
                                    <div className="flex items-center gap-3 p-3 bg-white border border-blue-100 rounded-xl shadow-sm">
                                        <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block uppercase">National Helpline</span>
                                            <a href="tel:15100" className="text-sm font-black text-slate-800 hover:text-blue-600 transition-colors">15100</a>
                                        </div>
                                    </div>

                                    {/* NALSA website */}
                                    <a
                                        href="https://nalsa.gov.in"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 bg-white border border-slate-200/50 hover:border-blue-300 rounded-xl shadow-sm transition-all text-xs font-semibold group"
                                    >
                                        <span className="flex items-center gap-2 text-slate-700">
                                            <Globe className="w-4 h-4 text-indigo-500 shrink-0" />
                                            NALSA Website
                                        </span>
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                    </a>

                                    {/* Find nearest DLSA link */}
                                    <a
                                        href="https://nalsa.gov.in/services/legal-aid/district-legal-services-authority"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 bg-white border border-slate-200/50 hover:border-blue-300 rounded-xl shadow-sm transition-all text-xs font-semibold group"
                                    >
                                        <span className="flex items-center gap-2 text-slate-700">
                                            <Scale className="w-4 h-4 text-violet-500 shrink-0" />
                                            Find Nearest DLSA Office
                                        </span>
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chat with Uploaded Document (RAG) */}
                    <div className="bg-white rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-200/50 shadow-sm space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-805 flex items-center gap-2">
                                <MessageSquare className="text-blue-600 w-5 h-5 shrink-0" />
                                Chat with Document (RAG)
                            </h3>
                            <p className="text-slate-400 text-[11px] sm:text-xs mt-0.5">
                                Ask context-specific questions about this document. The AI will only answer based on the uploaded file text.
                            </p>
                        </div>

                        {/* Conversational Screen */}
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-3 sm:p-4 h-[220px] sm:h-[260px] overflow-y-auto flex flex-col gap-3">
                            {chatHistory.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-3">
                                    <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-slate-200 shrink-0" />
                                    <h5 className="font-bold text-slate-500 text-sm sm:text-base">Start a Conversation</h5>
                                    <p className="text-xs max-w-sm">Use the input box or click one of the quick questions below to ask specific details about the document.</p>
                                </div>
                            )}

                            {chatHistory.map((msg, i) => {
                                const isUser = msg.role === 'user';
                                return (
                                    <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed ${isUser
                                                ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-500/10'
                                                : 'bg-white border border-slate-200/60 text-slate-800 rounded-bl-none shadow-sm'
                                            }`}>
                                            <p>{msg.content}</p>

                                            {/* Citations omitted for citizen simplicity */}
                                        </div>
                                    </div>
                                );
                            })}

                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200/60 rounded-2xl rounded-bl-none p-3 sm:p-4 text-xs sm:text-sm flex items-center gap-2.5 text-blue-500 shadow-sm">
                                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                        <span>AI is searching vector database...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef}></div>
                        </div>

                        {/* Quick Question Chips */}
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => handleChipClick("What is the penalty amount?")} className="px-3 py-1.5 bg-slate-50 border border-slate-200/50 hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition-colors text-xs font-semibold rounded-lg shadow-sm">
                                What is the penalty amount?
                            </button>
                            <button onClick={() => handleChipClick("Who filed the case?")} className="px-3 py-1.5 bg-slate-50 border border-slate-200/50 hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition-colors text-xs font-semibold rounded-lg shadow-sm">
                                Who filed the case?
                            </button>
                            <button onClick={() => handleChipClick("What is the final judgment?")} className="px-3 py-1.5 bg-slate-50 border border-slate-200/50 hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition-colors text-xs font-semibold rounded-lg shadow-sm">
                                What is the final judgment?
                            </button>
                            <button onClick={() => handleChipClick("Which IPC sections are mentioned?")} className="px-3 py-1.5 bg-slate-50 border border-slate-200/50 hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition-colors text-xs font-semibold rounded-lg shadow-sm">
                                Which IPC sections are mentioned?
                            </button>
                        </div>

                        {/* Input Box */}
                        <form onSubmit={handleChatSubmit} className="flex gap-3">
                            <input
                                type="text"
                                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400 text-xs sm:text-sm shadow-sm"
                                placeholder="Type your query regarding the document..."
                                value={chatQuery}
                                onChange={(e) => setChatQuery(e.target.value)}
                                disabled={isChatLoading}
                            />
                            <button
                                type="submit"
                                className="px-5 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center disabled:opacity-50 shrink-0"
                                disabled={isChatLoading}
                            >
                                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </form>
                    </div>

                    {/* Reset Button */}
                    <div className="flex justify-end pt-4 w-full">
                        <button
                            className="w-full sm:w-auto px-6 py-3 border border-slate-200 hover:bg-slate-100 text-slate-605 hover:text-slate-900 rounded-xl transition-all font-bold text-sm"
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
