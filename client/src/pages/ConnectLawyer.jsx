import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LawyerCard from '../components/LawyerCard';
import { Search, Filter, Loader2, Star } from 'lucide-react';

const ConnectLawyer = () => {
    const [lawyers, setLawyers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Search params
    const [search, setSearch] = useState('');
    const [city, setCity] = useState('');
    
    // Filter params
    const [specialization, setSpecialization] = useState('');
    const [minExp, setMinExp] = useState('');
    const [maxFee, setMaxFee] = useState('');
    const [language, setLanguage] = useState('');
    const [minRating, setMinRating] = useState('');

    const fetchLawyers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`http://localhost:5000/api/lawyers`, {
                params: { search, city, specialization, minExp, maxFee, language, minRating }
            });
            setLawyers(res.data.data || []);
        } catch (error) {
            console.error("Error fetching lawyers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLawyers();
        // eslint-disable-next-line
    }, [specialization, minExp, maxFee, language, minRating]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchLawyers();
    };

    const resetFilters = () => {
        setSearch('');
        setCity('');
        setSpecialization('');
        setMinExp('');
        setMaxFee('');
        setLanguage('');
        setMinRating('');
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Connect with Expert Lawyers</h1>
                    <p className="text-slate-500 mt-1">Find and book verified legal professionals for your specific needs.</p>
                </div>
            </div>

            {/* Top Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                <form onSubmit={handleSearchSubmit} className="flex-1 relative flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search by name or keyword..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <input 
                        type="text"
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-1/3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hidden md:block"
                    />
                    <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                        Search
                    </button>
                </form>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Filters Sidebar */}
                <aside className="w-full lg:w-64 shrink-0 space-y-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Filter className="w-4 h-4" /> Filters
                        </h3>
                        <button onClick={resetFilters} className="text-xs text-blue-600 font-semibold hover:underline">Reset</button>
                    </div>

                    <div className="space-y-4">
                        {/* Practice Area */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1 block">Practice Area</label>
                            <select 
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            >
                                <option value="">All</option>
                                <option value="Property Law">Property Law</option>
                                <option value="Criminal Law">Criminal Law</option>
                                <option value="Family Law">Family Law</option>
                                <option value="Corporate Law">Corporate Law</option>
                                <option value="Consumer Rights">Consumer Rights</option>
                            </select>
                        </div>

                        {/* Experience */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1 block">Min Experience (Years)</label>
                            <input 
                                type="number"
                                min="0"
                                value={minExp}
                                onChange={(e) => setMinExp(e.target.value)}
                                placeholder="e.g. 5"
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Max Fee */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1 block">Max Consultation Fee (₹)</label>
                            <input 
                                type="number"
                                step="500"
                                min="0"
                                value={maxFee}
                                onChange={(e) => setMaxFee(e.target.value)}
                                placeholder="e.g. 2000"
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Language */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1 block">Language</label>
                            <select 
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Any</option>
                                <option value="English">English</option>
                                <option value="Hindi">Hindi</option>
                                <option value="Marathi">Marathi</option>
                                <option value="Gujarati">Gujarati</option>
                            </select>
                        </div>

                        {/* Rating */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1 block">Minimum Rating</label>
                            <div className="flex gap-2">
                                {[4, 3, 2].map(rating => (
                                    <button 
                                        key={rating}
                                        onClick={() => setMinRating(rating.toString())}
                                        className={`flex-1 flex items-center justify-center gap-1 py-2 border rounded-lg text-sm transition-colors ${
                                            minRating === rating.toString() ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <Star className={`w-3 h-3 ${minRating === rating.toString() ? 'fill-blue-700' : 'fill-slate-400'}`} /> {rating}+
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                            <p className="text-slate-500 font-medium">Finding best legal matches...</p>
                        </div>
                    ) : lawyers.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
                            <div className="text-6xl mb-4">👩‍⚖️</div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">No lawyers found</h2>
                            <p className="text-slate-500">Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {lawyers.map(lawyer => (
                                <LawyerCard key={lawyer._id} lawyer={lawyer} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConnectLawyer;
