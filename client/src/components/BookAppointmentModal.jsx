import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Video, MessageSquare, Phone } from 'lucide-react';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';

const BookAppointmentModal = ({ lawyer, onClose, onSuccess }) => {
    const { token } = useAppContext();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [date, setDate] = useState(tomorrow.toISOString().split('T')[0]);
    const [timeSlot, setTimeSlot] = useState('');
    const [type, setType] = useState('Video');
    const [notes, setNotes] = useState('');

    const handleConfirm = async () => {
        try {
            setLoading(true);
            await axios.post('http://localhost:5000/api/appointments/book', {
                lawyerId: lawyer._id,
                date,
                timeSlot,
                consultationType: type,
                notes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSuccess();
        } catch (error) {
            console.error("Booking error:", error);
            alert("Failed to book appointment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800">Book Appointment</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input 
                                        type="date" 
                                        min={new Date().toISOString().split('T')[0]}
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Time Slot</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {lawyer?.availableTimeSlots?.map((slot, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => setTimeSlot(`${slot.startTime} - ${slot.endTime}`)}
                                            className={`py-2 px-4 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                                timeSlot === `${slot.startTime} - ${slot.endTime}` 
                                                    ? 'bg-blue-600 text-white border-blue-600' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                                            }`}
                                        >
                                            <Clock className="w-4 h-4" />
                                            {slot.startTime}
                                        </button>
                                    ))}
                                    {(!lawyer?.availableTimeSlots || lawyer.availableTimeSlots.length === 0) && (
                                        <p className="col-span-2 text-sm text-slate-500">No time slots specified. Select a generic slot.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Consultation Mode</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Video', 'Voice', 'Chat'].map((mode) => (
                                        <button 
                                            key={mode}
                                            onClick={() => setType(mode)}
                                            className={`py-4 px-2 rounded-xl border flex flex-col items-center gap-2 transition-colors ${
                                                type === mode 
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {mode === 'Video' && <Video className="w-6 h-6" />}
                                            {mode === 'Voice' && <Phone className="w-6 h-6" />}
                                            {mode === 'Chat' && <MessageSquare className="w-6 h-6" />}
                                            <span className="font-semibold text-sm">{mode}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Briefly describe your case (Optional)</label>
                                <textarea 
                                    rows="4" 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="I need help with a property dispute regarding..."
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                ></textarea>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <div className="flex justify-between items-center mb-2 text-sm text-slate-600">
                                    <span>Consultation Fee</span>
                                    <span>₹{lawyer.consultationFee}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-slate-600">
                                    <span>Platform Fee</span>
                                    <span>₹50</span>
                                </div>
                                <div className="h-px bg-slate-200 my-2"></div>
                                <div className="flex justify-between items-center font-bold text-slate-800">
                                    <span>Total to Pay (Later)</span>
                                    <span className="text-blue-600">₹{lawyer.consultationFee + 50}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex gap-3">
                    {step === 2 && (
                        <button 
                            onClick={() => setStep(1)}
                            className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Back
                        </button>
                    )}
                    <button 
                        disabled={step === 1 && !timeSlot}
                        onClick={() => step === 1 ? setStep(2) : handleConfirm()}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {step === 1 ? 'Continue' : 'Confirm Booking'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookAppointmentModal;
