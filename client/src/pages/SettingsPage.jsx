import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const SettingsPage = () => {
    const { user } = useAppContext();
    const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'English');

    const handleSave = () => {
        alert("Settings saved successfully! (API integration pending)");
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Settings</h2>
                <p className="text-slate-500 mt-2 text-sm sm:text-base md:text-lg">
                    Manage your account and preferences.
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
                
                {/* Profile Section */}
                <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Profile Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none"
                                value={user?.name || ''}
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                            <input 
                                type="email" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none"
                                value={user?.email || ''}
                                readOnly
                            />
                        </div>
                    </div>
                </div>

                {/* Preferences Section */}
                <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Preferences</h3>
                    <div className="max-w-md">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Language</label>
                        <select 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm text-slate-700 text-sm"
                            value={preferredLanguage}
                            onChange={(e) => setPreferredLanguage(e.target.value)}
                        >
                            <option value="English">English</option>
                            <option value="Hindi">हिंदी (Hindi)</option>
                        </select>
                        <p className="text-xs sm:text-sm text-slate-500 mt-2">
                            This setting determines the language used for AI responses and interface where available.
                        </p>
                    </div>
                </div>

                <div className="pt-4 sm:pt-6">
                    <button 
                        onClick={handleSave}
                        className="w-full sm:w-auto flex items-center justify-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-200 active:scale-95 text-sm"
                    >
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SettingsPage;
