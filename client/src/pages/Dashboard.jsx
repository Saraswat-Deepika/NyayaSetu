import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { getDocumentAnalytics, getHistory, deleteHistory } from '../services/api';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
    FileText, Calendar, Clock, Globe, Scale, Mic, 
    ArrowUpRight, Loader2, Sparkles,
    Trash2, Play, Download, History, Plus
} from 'lucide-react';
import './Dashboard.css';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const Dashboard = () => {
    const { user } = useAppContext();
    const [analytics, setAnalytics] = useState(null);
    const [recentDocs, setRecentDocs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const data = await getDocumentAnalytics();
                setAnalytics(data);
                
                // Fetch user's recent documents
                const historyData = await getHistory({ limit: 5, sortBy: 'Recent' });
                setRecentDocs(historyData.documents || []);
            } catch (error) {
                console.error("Failed to load dashboard analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    return (
        <div className="dashboard-container p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            {/* Welcome Banner */}
            <div className="welcome-banner rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in-up">
                <div className="relative z-10">
                    <h1 className="heading-font text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                        Welcome back, {user?.name}! <span className="animate-bounce inline-block">👋</span>
                    </h1>
                    <p className="text-blue-100 text-base sm:text-lg mt-2 font-medium max-w-xl">
                        Your AI-Powered Legal Aid Assistant dashboard and analysis workspace.
                    </p>
                </div>
                <div className="flex gap-3 shrink-0 w-full md:w-auto relative z-10">
                    <Link to="/dashboard/documents" className="w-full md:w-auto justify-center px-6 py-3 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:bg-blue-50 hover:scale-105 transition-all text-sm flex items-center gap-2">
                        <Plus className="w-5 h-5" /> New Upload
                    </Link>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="space-y-5 animate-fade-in-up delay-100">
                <h2 className="heading-font text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="text-blue-500 w-6 h-6" />
                    Quick Assistance Hub
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link to="/dashboard/voice" className="action-card voice p-6 rounded-2xl group relative overflow-hidden">
                        <div className="icon-box w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                            <Mic className="w-7 h-7" />
                        </div>
                        <h3 className="heading-font text-xl font-bold text-slate-800 mb-2">Voice Legal Query</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">Record a statement in Hindi or English, and receive transcribed details and legal solutions.</p>
                        <ArrowUpRight className="absolute right-5 top-5 w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </Link>

                    <Link to="/dashboard/documents" className="action-card document p-6 rounded-2xl group relative overflow-hidden">
                        <div className="icon-box w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                            <FileText className="w-7 h-7" />
                        </div>
                        <h3 className="heading-font text-xl font-bold text-slate-800 mb-2">Upload & Summarize</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">Extract legal arguments, detect structural agreement risks, view vertical event timelines, and chat (RAG).</p>
                        <ArrowUpRight className="absolute right-5 top-5 w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </Link>

                    <Link to="/dashboard/legal-help" className="action-card legal p-6 rounded-2xl group relative overflow-hidden">
                        <div className="icon-box w-14 h-14 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                            <Scale className="w-7 h-7" />
                        </div>
                        <h3 className="heading-font text-xl font-bold text-slate-800 mb-2">AI Legal Counsel</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">Ask questions, read constitutional rights, and fetch legal draft templates matching your requirements.</p>
                        <ArrowUpRight className="absolute right-5 top-5 w-6 h-6 text-slate-300 group-hover:text-purple-500 transition-colors" />
                    </Link>
                </div>
            </div>

            {/* Analytics Workspace */}
            {isLoading ? (
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-16 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-blue-500 animate-fade-in-up delay-200">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p className="font-semibold text-lg animate-pulse">Loading dashboard metrics...</p>
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in-up delay-200">
                    {/* Analytics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Docs */}
                        <div className="action-card p-6 rounded-2xl flex items-center gap-5">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                                <FileText className="w-7 h-7" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Uploads</span>
                                <span className="text-3xl font-black text-slate-800">{analytics?.totalDocs || 0}</span>
                            </div>
                        </div>

                        {/* Docs Today */}
                        <div className="action-card p-6 rounded-2xl flex items-center gap-5">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                                <Calendar className="w-7 h-7" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Processed Today</span>
                                <span className="text-3xl font-black text-slate-800">{analytics?.docsToday || 0}</span>
                            </div>
                        </div>

                        {/* Avg Processing Time */}
                        <div className="action-card p-6 rounded-2xl flex items-center gap-5">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                                <Clock className="w-7 h-7" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Avg Process Time</span>
                                <span className="text-3xl font-black text-slate-800">{analytics?.avgProcessingTime || 0}s</span>
                            </div>
                        </div>

                        {/* Active Languages */}
                        <div className="action-card p-6 rounded-2xl flex items-center gap-5">
                            <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                                <Globe className="w-7 h-7" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Languages Used</span>
                                <span className="text-3xl font-black text-slate-800">{analytics?.languagesData?.length || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart visualizations */}
                    {analytics?.totalDocs > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up delay-300">
                            {/* Bar Chart: Document Types */}
                            <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                                <h3 className="heading-font text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">Document Classifications</h3>
                                <div className="h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.docTypesData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                            <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Pie Chart: Language usage distribution */}
                            <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                                <h3 className="heading-font text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">Language Usage Distribution</h3>
                                <div className="h-[320px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.languagesData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {analytics.languagesData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                            <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-16 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-5 animate-fade-in-up delay-300">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-2 shadow-inner">
                                <FileText className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="heading-font text-2xl font-bold text-slate-700">No Analytics Data Available</h3>
                            <p className="text-slate-500 max-w-md text-lg">Upload and analyze legal contracts or case files to view interactive dashboard statistics and charts.</p>
                            <Link to="/dashboard/documents" className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:scale-105 inline-flex items-center gap-2">
                                <Plus className="w-5 h-5" /> Analyze First Document
                            </Link>
                        </div>
                    )}

                    {/* Recent Documents Section */}
                    {recentDocs.length > 0 && (
                        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6 animate-fade-in-up delay-400">
                            <h3 className="heading-font text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <History className="w-5 h-5" />
                                </div>
                                Recent Documents
                            </h3>
                            <div className="divide-y divide-slate-100">
                                {recentDocs.map((doc) => (
                                    <div key={doc._id} className="doc-row py-5 px-4 -mx-4 flex flex-col sm:flex-row sm:items-center justify-between gap-5 group">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm group-hover:scale-110 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-1 min-w-0 pt-0.5">
                                                <h4 className="text-base font-bold text-slate-800 truncate max-w-md sm:max-w-xl group-hover:text-blue-700 transition-colors">{doc.documentName || doc.originalName}</h4>
                                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 font-medium">
                                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> {new Date(doc.uploadDate).toLocaleDateString()}</span>
                                                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> Opened: {new Date(doc.lastOpened).toLocaleDateString()}</span>
                                                    {doc.documentType && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">{doc.documentType}</span>
                                                    )}
                                                    {doc.fileSize && (
                                                        <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                                            <Link 
                                                to={`/dashboard/documents/${doc._id}`}
                                                className="px-4 py-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold rounded-xl transition-all text-sm flex items-center gap-2 shadow-sm"
                                            >
                                                <Play className="w-4 h-4 fill-current" /> Open
                                            </Link>
                                            <button 
                                                onClick={() => {
                                                    const element = document.createElement("a");
                                                    const fileContent = doc.extractedText || "No text extracted.";
                                                    const textBlob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
                                                    element.href = URL.createObjectURL(textBlob);
                                                    element.download = `${doc.documentName || 'Document'}_extracted_text.txt`;
                                                    document.body.appendChild(element);
                                                    element.click();
                                                    document.body.removeChild(element);
                                                }}
                                                className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl transition-colors bg-white shadow-sm"
                                                title="Download Extracted Text"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if (window.confirm("Delete this document? This action cannot be undone.")) {
                                                        try {
                                                            await deleteHistory(doc._id);
                                                            setRecentDocs(prev => prev.filter(d => d._id !== doc._id));
                                                            // Reload analytics count
                                                            const freshData = await getDocumentAnalytics();
                                                            setAnalytics(freshData);
                                                        } catch (err) {
                                                            console.error("Failed to delete document from history:", err);
                                                            alert("Failed to delete document.");
                                                        }
                                                    }
                                                }}
                                                className="p-2.5 border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-colors bg-white shadow-sm"
                                                title="Delete from History"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
