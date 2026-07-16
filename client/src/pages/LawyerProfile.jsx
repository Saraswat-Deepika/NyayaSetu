import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Star, MapPin, Briefcase, Languages, ShieldCheck, ArrowLeft, Loader2, GraduationCap } from 'lucide-react';
import BookAppointmentModal from '../components/BookAppointmentModal';
import { useAppContext } from '../context/AppContext';

const LawyerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAppContext();
    const [searchParams] = useSearchParams();
    const [lawyer, setLawyer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(searchParams.get('book') === 'true');

    useEffect(() => {
        const fetchLawyer = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/lawyers/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLawyer(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchLawyer();
    }, [id, token]);

    if (loading) return (
        <div className="flex items-center justify-center h-full py-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
    );

    if (!lawyer) return <div className="p-8 text-center text-red-500 font-bold">Lawyer not found</div>;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to search</span>
            </button>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm mb-6">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                <div className="px-6 md:px-10 pb-8 relative">
                    <img 
                        src={lawyer?.userId?.profilePicture || "https://ui-avatars.com/api/?name=" + (lawyer?.userId?.name || "Lawyer") + "&size=200"} 
                        alt="Profile" 
                        className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg absolute -top-16 object-cover bg-white"
                    />
                    
                    <div className="mt-20 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-extrabold text-slate-800">{lawyer?.userId?.name}</h1>
                                {lawyer.isVerified && <ShieldCheck className="w-6 h-6 text-green-500" />}
                            </div>
                            <p className="text-lg text-blue-600 font-medium">{lawyer.specialization?.join(', ')}</p>
                        </div>
                        
                        <div className="flex gap-3 w-full md:w-auto">
                            <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20">
                                Book Appointment
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/50 p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-2 space-y-8">
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">About</h2>
                            <p className="text-slate-600 leading-relaxed">{lawyer.about || "No description provided."}</p>
                        </section>
                        
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Practice Areas</h2>
                            <div className="flex flex-wrap gap-2">
                                {lawyer.specialization?.map(spec => (
                                    <span key={spec} className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                                        {spec}
                                    </span>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Education</h2>
                            <div className="space-y-4">
                                {lawyer.education?.length > 0 ? lawyer.education.map((edu, idx) => (
                                    <div key={idx} className="flex gap-3 items-start">
                                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><GraduationCap className="w-5 h-5"/></div>
                                        <div>
                                            <p className="font-bold text-slate-800">{edu.degree}</p>
                                            <p className="text-sm text-slate-600">{edu.institution} ({edu.year})</p>
                                        </div>
                                    </div>
                                )) : <p className="text-slate-500 italic">Education details not provided.</p>}
                            </div>
                        </section>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Quick Info</h3>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Briefcase className="w-5 h-5 text-blue-500" />
                                <span>{lawyer.experienceYears} Years Experience</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <MapPin className="w-5 h-5 text-blue-500" />
                                <span>{lawyer.city}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Languages className="w-5 h-5 text-blue-500" />
                                <span>{lawyer.languages?.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Star className="w-5 h-5 text-amber-400" />
                                <span>{lawyer.averageRating.toFixed(1)} ({lawyer.totalReviews} reviews)</span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Availability</h3>
                            {lawyer.availableTimeSlots?.map((slot, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-slate-700">{slot.day}</span>
                                    <span className="text-slate-500">{slot.startTime} - {slot.endTime}</span>
                                </div>
                            )) || <p className="text-slate-500 text-sm">Not specified</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Client Reviews ({lawyer.totalReviews})</h2>
                {lawyer.totalReviews === 0 ? (
                    <p className="text-slate-500 italic">No reviews yet for this lawyer.</p>
                ) : (
                    <div className="space-y-6">
                        {/* Mocking a review display for now. Backend could fetch these. */}
                        <div className="border-b border-slate-100 pb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex text-amber-400"><Star className="w-4 h-4 fill-amber-400"/><Star className="w-4 h-4 fill-amber-400"/><Star className="w-4 h-4 fill-amber-400"/><Star className="w-4 h-4 fill-amber-400"/><Star className="w-4 h-4 fill-amber-400"/></div>
                                <span className="font-bold text-slate-800">Excellent consultation</span>
                            </div>
                            <p className="text-slate-600 text-sm mb-2">"Very professional and resolved my queries regarding my property dispute effectively."</p>
                            <span className="text-xs text-slate-400">- Anonymous User</span>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <BookAppointmentModal 
                    lawyer={lawyer} 
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        navigate('/dashboard/appointments?tab=Pending');
                    }}
                />
            )}
        </div>
    );
};

export default LawyerProfile;
