import React from 'react';
import { MapPin, Briefcase, Languages, Star, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const LawyerCard = ({ lawyer }) => {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col">
            <div className="p-6 flex gap-4 items-start relative">
                <img 
                    src={lawyer?.userId?.profilePicture || "https://ui-avatars.com/api/?name=" + (lawyer?.userId?.name || "Lawyer")} 
                    alt="Lawyer" 
                    className="w-20 h-20 rounded-xl object-cover border border-slate-100" 
                />
                {lawyer?.isVerified && (
                    <span className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Verified
                    </span>
                )}
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{lawyer?.userId?.name || "Unknown Lawyer"}</h3>
                    <p className="text-sm text-blue-600 font-semibold mb-2 line-clamp-1">{lawyer?.specialization?.join(', ')}</p>
                    <div className="flex items-center gap-1 text-sm text-slate-500 font-medium">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-slate-700">{lawyer?.averageRating?.toFixed(1) || "New"}</span>
                        <span>({lawyer?.totalReviews || 0} reviews)</span>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-1 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{lawyer?.experienceYears} Years Experience</span>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{lawyer?.city || 'India'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-clamp-1">{lawyer?.languages?.join(', ')}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-500 text-xs">Consultation Fee</span>
                    <span className="font-bold text-slate-800 text-base">₹{lawyer?.consultationFee}</span>
                </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 grid grid-cols-2 gap-3">
                <Link to={`/dashboard/lawyer/${lawyer?._id}`} className="flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-lg transition-colors text-sm">
                    View Profile
                </Link>
                <Link to={`/dashboard/lawyer/${lawyer?._id}?book=true`} className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm font-semibold rounded-lg transition-colors text-sm">
                    Book Now
                </Link>
            </div>
        </div>
    );
};

export default LawyerCard;
