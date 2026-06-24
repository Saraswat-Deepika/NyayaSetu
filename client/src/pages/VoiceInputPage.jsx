import React, { useState } from 'react';
import VoiceInput from '../components/VoiceInput';

const VoiceInputPage = () => {
    const [transcription, setTranscription] = useState('');

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Voice Input</h2>
                <p className="text-slate-500 mt-2 text-sm sm:text-base md:text-lg">
                    Speak your query securely. Our Whisper AI will transcribe and process it in real-time.
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 lg:p-8">
                <VoiceInput onUploadSuccess={(text) => setTranscription(text)} />
                
                {transcription && (
                    <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Transcription Result</h4>
                        </div>
                        <div className="relative">
                            <span className="absolute top-0 left-0 text-3xl sm:text-4xl text-slate-300 font-serif leading-none -mt-2 -ml-1">"</span>
                            <p className="text-slate-700 text-sm sm:text-base md:text-lg leading-relaxed italic relative z-10 px-4 sm:px-6">
                                {transcription}
                            </p>
                            <span className="absolute bottom-0 right-0 text-3xl sm:text-4xl text-slate-300 font-serif leading-none -mb-4 -mr-1">"</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceInputPage;
