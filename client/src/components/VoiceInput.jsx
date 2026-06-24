import React, { useState, useRef } from 'react';
import api from '../services/api';

const VoiceInput = ({ caseId, onUploadSuccess }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setAudioBlob(audioBlob);
                audioChunksRef.current = [];
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                alert(
                    "Microphone access was denied.\n\n" +
                    "To fix this:\n" +
                    "1. Click the 🔒 lock icon in your browser address bar\n" +
                    "2. Set Microphone to 'Allow'\n" +
                    "3. Refresh the page and try again"
                );
            } else if (error.name === 'NotFoundError') {
                alert("No microphone found. Please connect a microphone and try again.");
            } else {
                alert("Could not access microphone: " + error.message);
            }
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const handleUpload = async () => {
        if (!audioBlob) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        if (caseId) formData.append('caseId', caseId);

        try {
            // Using the api instance directly with the correct endpoint
            const { data } = await api.post('/voice/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setAudioBlob(null);
            if (onUploadSuccess) onUploadSuccess(data.transcription);
        } catch (error) {
            console.error("Voice upload failed:", error);
            alert("Failed to transcribe audio. Please ensure Python server is running.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200">
            <h4 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                </svg>
                Voice Recording
            </h4>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center w-full">
                {!isRecording ? (
                    <button 
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-200 active:scale-95 text-sm" 
                        onClick={startRecording}
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Start Recording
                    </button>
                ) : (
                    <button 
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors shadow-sm shadow-red-200 active:scale-95 animate-pulse text-sm" 
                        onClick={stopRecording}
                    >
                        <span className="w-3 h-3 bg-white rounded-sm shrink-0"></span>
                        Stop Recording
                    </button>
                )}

                {audioBlob && (
                    <button 
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-sm shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95 text-sm" 
                        onClick={handleUpload}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <>
                                <svg className="animate-spin w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Transcribing...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                                </svg>
                                Upload & Transcribe
                            </>
                        )}
                    </button>
                )}
            </div>
            
            {isRecording && (
                <div className="flex items-center gap-2 mt-4 text-red-500 font-medium text-sm">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    Recording in progress...
                </div>
            )}
        </div>
    );
};

export default VoiceInput;
