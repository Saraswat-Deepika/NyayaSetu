import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { getDocumentAnalytics } from '../services/api';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
    FileText, Calendar, Clock, Globe, Scale, Mic, 
    MessageSquare, ArrowUpRight, Loader2, Sparkles
} from 'lucide-react';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const Dashboard = () => {
    const { user } = useAppContext();
    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const data = await getDocumentAnalytics();
                setAnalytics(data);
            } catch (error) {
                console.error("Failed to load dashboard analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 min-h-screen bg-slate-50/50">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                        Welcome back, {user?.name}! <span className="animate-bounce">👋</span>
                    </h1>
                    <p className="text-blue-100 text-sm sm:text-base md:text-lg mt-1 font-medium">Your AI-Powered Legal Aid Assistant dashboard and analysis workspace.</p>
                </div>
                <div className="flex gap-3 shrink-0 w-full md:w-auto">
                    <Link to="/dashboard/documents" className="w-full md:w-auto justify-center px-5 py-2.5 bg-white text-blue-600 font-bold rounded-xl shadow-md hover:bg-blue-50 transition-all text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Upload Document
                    </Link>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="text-blue-500 w-5 h-5" />
                    Quick Assistance Hub
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link to="/dashboard/voice" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 hover:shadow-md hover:border-blue-200/60 transition-all group relative overflow-hidden">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                            <Mic className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Voice Legal Query</h3>
                        <p className="text-sm text-slate-500">Record a statement in Hindi or English, and receive transcribed details and legal solutions.</p>
                        <ArrowUpRight className="absolute right-4 top-4 w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </Link>

                    <Link to="/dashboard/documents" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 hover:shadow-md hover:border-emerald-200/60 transition-all group relative overflow-hidden">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                            <FileText className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Upload & Summarize</h3>
                        <p className="text-sm text-slate-500">Extract legal arguments, detect structural agreement risks, view vertical event timelines, and chat (RAG).</p>
                        <ArrowUpRight className="absolute right-4 top-4 w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </Link>

                    <Link to="/dashboard/legal-help" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 hover:shadow-md hover:border-purple-200/60 transition-all group relative overflow-hidden">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                            <Scale className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">AI Legal Counsel</h3>
                        <p className="text-sm text-slate-500">Ask questions, read constitutional rights, and fetch legal draft templates matching your requirements.</p>
                        <ArrowUpRight className="absolute right-4 top-4 w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
                    </Link>
                </div>
            </div>

            {/* Analytics Workspace */}
            {isLoading ? (
                <div className="bg-white rounded-3xl p-16 border border-slate-200/50 shadow-sm flex flex-col items-center justify-center text-blue-500">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p className="font-semibold animate-pulse">Loading dashboard metrics...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Analytics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Docs */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Uploads</span>
                                <span className="text-2xl font-black text-slate-800">{analytics?.totalDocs || 0}</span>
                            </div>
                        </div>

                        {/* Docs Today */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Processed Today</span>
                                <span className="text-2xl font-black text-slate-800">{analytics?.docsToday || 0}</span>
                            </div>
                        </div>

                        {/* Avg Processing Time */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Avg Process Time</span>
                                <span className="text-2xl font-black text-slate-800">{analytics?.avgProcessingTime || 0}s</span>
                            </div>
                        </div>

                        {/* Active Languages */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shadow-inner">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Languages Used</span>
                                <span className="text-2xl font-black text-slate-800">{analytics?.languagesData?.length || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart visualizations */}
                    {analytics?.totalDocs > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Bar Chart: Document Types */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm space-y-4">
                                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Document Classifications</h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.docTypesData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                            <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} />
                                            <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                                            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }} />
                                            <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} barSize={35} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Pie Chart: Language usage distribution */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm space-y-4">
                                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Language Usage Distribution</h3>
                                <div className="h-[300px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.languagesData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={65}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {analytics.languagesData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-16 border border-slate-200/50 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                            <FileText className="w-16 h-16 text-slate-200" />
                            <h3 className="text-xl font-bold text-slate-700">No Analytics Data Available</h3>
                            <p className="text-slate-500 max-w-sm">Upload and analyze legal contracts or case files to view interactive dashboard statistics and charts.</p>
                            <Link to="/dashboard/documents" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/15">
                                Analyze First Document
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
