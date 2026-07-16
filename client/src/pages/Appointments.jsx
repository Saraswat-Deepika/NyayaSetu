import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import AppointmentCard from '../components/AppointmentCard';
import { useAppContext } from '../context/AppContext';
import { Loader2 } from 'lucide-react';

const Appointments = () => {
    const { token, user } = useAppContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'Upcoming';
    
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    const userRole = user?.role || 'user'; // Assuming 'lawyer' or 'user'

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`http://localhost:5000/api/appointments/my-appointments`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { role: userRole, userId: user?._id || 'dummyId' } // fallback for mock
            });
            setAppointments(res.data.data || []);
        } catch (error) {
            console.error("Error fetching appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [userRole, token]);

    const handleStatusChange = async (id, status) => {
        try {
            await axios.patch(`http://localhost:5000/api/appointments/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state
            setAppointments(prev => prev.map(app => app._id === id ? { ...app, status } : app));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    const tabs = ['Upcoming', 'Pending', 'Completed', 'Cancelled'];

    const filteredAppointments = appointments.filter(app => {
        if (activeTab === 'Upcoming') return app.status === 'Accepted';
        if (activeTab === 'Pending') return app.status === 'Pending';
        if (activeTab === 'Completed') return app.status === 'Completed';
        if (activeTab === 'Cancelled') return app.status === 'Cancelled' || app.status === 'Rejected';
        return true;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Appointments</h1>
                <p className="text-slate-500 mt-1">Manage your legal consultations and schedule.</p>
            </div>

            <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 no-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setSearchParams({ tab })}
                        className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                            activeTab === tab 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
            ) : filteredAppointments.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
                    <div className="text-6xl mb-4">📅</div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">No {activeTab.toLowerCase()} appointments</h2>
                    <p className="text-slate-500">You don't have any appointments in this category right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAppointments.map(app => (
                        <AppointmentCard 
                            key={app._id} 
                            appointment={app} 
                            onStatusChange={handleStatusChange} 
                            userRole={userRole} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Appointments;
