import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import { Loader2, CheckCircle, XCircle, User, FileText, Briefcase, MapPin } from 'lucide-react';
import api from '../services/api';

const AdminLawyerApprovals = () => {
    const { token } = useAppContext();
    const [pendingLawyers, setPendingLawyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchPendingLawyers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/lawyers/admin/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingLawyers(res.data.data || []);
        } catch (error) {
            console.error("Error fetching pending lawyers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingLawyers();
        // eslint-disable-next-line
    }, []);

    const handleApprove = async (id) => {
        try {
            setActionLoading(id);
            await api.put(`/lawyers/admin/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingLawyers(prev => prev.filter(lawyer => lawyer._id !== id));
        } catch (error) {
            console.error("Error approving lawyer:", error);
            alert("Failed to approve lawyer.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Are you sure you want to reject this application?")) return;
        
        try {
            setActionLoading(id);
            await api.put(`/lawyers/admin/${id}/reject`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingLawyers(prev => prev.filter(lawyer => lawyer._id !== id));
        } catch (error) {
            console.error("Error rejecting lawyer:", error);
            alert("Failed to reject lawyer.");
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium text-lg">Loading pending applications...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Lawyer Approvals</h1>
                <p className="text-slate-500 mt-2">Review and verify pending lawyer registrations.</p>
            </div>

            {pendingLawyers.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">All Caught Up!</h2>
                    <p className="text-slate-500">There are no pending lawyer applications to review at this time.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {pendingLawyers.map((lawyer) => (
                        <div key={lawyer._id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                            <div className="p-6 md:p-8 flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-2xl">
                                            {lawyer.userId?.name?.charAt(0).toUpperCase() || 'L'}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">{lawyer.userId?.name || 'Unknown'}</h3>
                                            <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                                                <Briefcase className="w-4 h-4" /> {lawyer.experienceYears} Years Experience
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full uppercase tracking-wider">
                                        Pending
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contact Details</p>
                                        <p className="text-sm font-medium text-slate-800">{lawyer.userId?.email}</p>
                                        <p className="text-sm font-medium text-slate-800">{lawyer.userId?.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Location</p>
                                        <p className="text-sm font-medium text-slate-800 flex items-center gap-1">
                                            <MapPin className="w-4 h-4 text-slate-400" /> {lawyer.city || 'N/A'}, {lawyer.state || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Bar Council info</p>
                                        <p className="text-sm font-medium text-slate-800">{lawyer.barCouncilNumber}</p>
                                        <p className="text-sm text-slate-500">{lawyer.barCouncilState}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Specializations</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {lawyer.specialization?.map(spec => (
                                                <span key={spec} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                                    {spec}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {lawyer.documents && lawyer.documents.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Documents Uploaded</p>
                                        <div className="flex flex-wrap gap-3">
                                            {lawyer.documents.map((doc, idx) => (
                                                <a 
                                                    key={idx}
                                                    href={`http://localhost:5000${doc.url}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                                                >
                                                    <FileText className="w-4 h-4" /> {doc.title || 'Document'}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-slate-50 p-6 md:w-64 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col justify-center gap-3">
                                <button
                                    onClick={() => handleApprove(lawyer._id)}
                                    disabled={actionLoading === lawyer._id}
                                    className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {actionLoading === lawyer._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleReject(lawyer._id)}
                                    disabled={actionLoading === lawyer._id}
                                    className="w-full py-3 px-4 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {actionLoading === lawyer._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminLawyerApprovals;
