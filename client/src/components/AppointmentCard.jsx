import React from 'react';
import { Calendar as CalendarIcon, Clock, Video, MessageSquare, Phone, User, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const AppointmentCard = ({ appointment, onStatusChange, userRole }) => {
    const isLawyer = userRole === 'lawyer';
    const displayUser = isLawyer ? appointment.userId : appointment.lawyerId?.userId;
    const lawyerDetails = appointment.lawyerId;

    const getStatusColor = (status) => {
        switch(status) {
            case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Accepted': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'Rejected':
            case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getTypeIcon = (type) => {
        switch(type) {
            case 'Video': return <Video className="w-4 h-4" />;
            case 'Voice': return <Phone className="w-4 h-4" />;
            case 'Chat': return <MessageSquare className="w-4 h-4" />;
            default: return null;
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <img 
                        src={displayUser?.profilePicture || "https://ui-avatars.com/api/?name=" + (displayUser?.name || "User")} 
                        alt={displayUser?.name} 
                        className="w-12 h-12 rounded-full border border-slate-100 object-cover"
                    />
                    <div>
                        <h3 className="font-bold text-slate-800">{displayUser?.name || "Unknown"}</h3>
                        {!isLawyer && <p className="text-xs text-blue-600 font-medium">{lawyerDetails?.specialization?.[0]}</p>}
                        {isLawyer && <p className="text-xs text-slate-500">Client</p>}
                    </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{new Date(appointment.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{appointment.timeSlot}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    {getTypeIcon(appointment.consultationType)}
                    <span className="font-medium">{appointment.consultationType} Consultation</span>
                </div>
            </div>

            {appointment.notes && (
                <div className="mb-4 text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Notes: </span>
                    <span className="italic">"{appointment.notes}"</span>
                </div>
            )}

            <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                {isLawyer && appointment.status === 'Pending' && (
                    <>
                        <button 
                            onClick={() => onStatusChange(appointment._id, 'Accepted')}
                            className="flex-1 flex justify-center items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
                        >
                            <CheckCircle className="w-4 h-4" /> Accept
                        </button>
                        <button 
                            onClick={() => onStatusChange(appointment._id, 'Rejected')}
                            className="flex-1 flex justify-center items-center gap-1 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200"
                        >
                            <XCircle className="w-4 h-4" /> Reject
                        </button>
                    </>
                )}

                {!isLawyer && appointment.status === 'Pending' && (
                    <button 
                        onClick={() => onStatusChange(appointment._id, 'Cancelled')}
                        className="flex-1 flex justify-center items-center gap-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-100"
                    >
                        Cancel
                    </button>
                )}

                {appointment.status === 'Accepted' && (
                    <Link 
                        to={`/dashboard/chat/${appointment._id}`}
                        className="flex-1 flex justify-center items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
                    >
                        <MessageSquare className="w-4 h-4" /> Open Chat
                    </Link>
                )}
                
                {isLawyer && appointment.status === 'Accepted' && (
                    <button 
                        onClick={() => onStatusChange(appointment._id, 'Completed')}
                        className="flex-1 flex justify-center items-center gap-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-100 border border-green-200"
                    >
                        <CheckCircle className="w-4 h-4" /> Mark Done
                    </button>
                )}
            </div>
        </div>
    );
};

export default AppointmentCard;
