import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import { Clock, Plus, Trash2, Loader2, Save } from 'lucide-react';

const ManageTimeSlots = () => {
    const { token, user } = useAppContext();
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Fetch current lawyer's profile and slots
        // Note: For a real app, you would have a specific endpoint to fetch the logged-in lawyer's profile
        // Here we'll mock the fetch for demonstration since we lack the specific API for "getMyLawyerProfile"
        // In a real implementation, you'd hit GET /api/lawyers/me
        setTimeout(() => {
            setSlots([
                { day: 'Monday', startTime: '10:00 AM', endTime: '02:00 PM' },
                { day: 'Wednesday', startTime: '02:00 PM', endTime: '06:00 PM' }
            ]);
            setLoading(false);
        }, 500);
    }, [token]);

    const addSlot = () => {
        setSlots([...slots, { day: 'Monday', startTime: '09:00 AM', endTime: '05:00 PM' }]);
    };

    const removeSlot = (index) => {
        setSlots(slots.filter((_, i) => i !== index));
    };

    const updateSlot = (index, field, value) => {
        const newSlots = [...slots];
        newSlots[index][field] = value;
        setSlots(newSlots);
    };

    const saveSlots = async () => {
        setSaving(true);
        try {
            // Mocking the save call. In reality:
            // await axios.patch('http://localhost:5000/api/lawyers/me/slots', { availableTimeSlots: slots }, { headers: { Authorization: `Bearer ${token}` } });
            await new Promise(r => setTimeout(r, 800));
            alert("Time slots updated successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to update time slots");
        } finally {
            setSaving(false);
        }
    };

    if (user?.role !== 'lawyer' && process.env.NODE_ENV !== 'development') {
        // Only allow lawyers, but for testing allow anyway if we want
        return <div className="p-8 text-center text-slate-500">Only verified lawyers can access this page.</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Manage Time Slots</h1>
                <p className="text-slate-500 mt-1">Set your availability for client consultations.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" /> Current Availability
                    </h2>
                    <button onClick={addSlot} className="flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors">
                        <Plus className="w-4 h-4" /> Add Slot
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : (
                    <div className="space-y-4">
                        {slots.length === 0 ? (
                            <p className="text-slate-500 italic text-center py-4">No time slots configured.</p>
                        ) : (
                            slots.map((slot, index) => (
                                <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Day</label>
                                        <select 
                                            value={slot.day} 
                                            onChange={(e) => updateSlot(index, 'day', e.target.value)}
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                                        >
                                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Start Time</label>
                                        <input 
                                            type="text" 
                                            value={slot.startTime}
                                            onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                                            placeholder="e.g. 10:00 AM"
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">End Time</label>
                                        <input 
                                            type="text" 
                                            value={slot.endTime}
                                            onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                                            placeholder="e.g. 05:00 PM"
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <button onClick={() => removeSlot(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg mt-5 transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))
                        )}

                        <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={saveSlots} 
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageTimeSlots;
