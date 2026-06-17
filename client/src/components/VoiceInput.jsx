import React, { useState, useRef } from 'react';
import api from '../services/api';

const VoiceInput = ({ caseId, history, language, onUploadSuccess, onUploadStart, onUploadError }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert(
                    "Microphone access is not supported in this browser context.\n\n" +
                    "This usually happens if the site is not loaded over a secure origin (HTTPS) or localhost.\n" +
                    "Please ensure you are accessing the app via http://localhost:5173/ or https."
                );
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            let mimeType = '';
            const options = {};
            if (MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
                options.mimeType = 'audio/webm';
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                mimeType = 'audio/ogg';
                options.mimeType = 'audio/ogg';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
                options.mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/wav')) {
                mimeType = 'audio/wav';
                options.mimeType = 'audio/wav';
            }

            mediaRecorderRef.current = new MediaRecorder(stream, options);
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const recordedType = mediaRecorderRef.current.mimeType || mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: recordedType });
                console.log("Audio Captured", { size: audioBlob.size, type: audioBlob.type });
                audioChunksRef.current = [];
                
                // Trigger auto upload immediately on stop
                await uploadAudio(audioBlob);
            };

            mediaRecorderRef.current.start();
            console.log("Recording Started");
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
        if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const uploadAudio = async (blob) => {
        if (!blob) return;
        setIsUploading(true);
        if (onUploadStart) onUploadStart();
        
        const mime = blob.type.toLowerCase();
        let ext = 'webm';
        if (mime.includes('wav')) ext = 'wav';
        else if (mime.includes('ogg')) ext = 'ogg';
        else if (mime.includes('mp4') || mime.includes('m4a')) ext = 'mp4';
        else if (mime.includes('mpeg') || mime.includes('mp3')) ext = 'mp3';

        const formData = new FormData();
        formData.append('audio', blob, `recording.${ext}`);
        if (caseId) formData.append('caseId', caseId);
        if (history) formData.append('history', JSON.stringify(history));
        if (language) formData.append('language', language);

        try {
            const { data } = await api.post('/voice/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log("Audio Uploaded & Processed Successfully", data);
            if (onUploadSuccess) onUploadSuccess(data.transcription, data.legalResponse);
        } catch (error) {
            console.error("Voice upload failed:", error);
            if (onUploadError) onUploadError(error);
            
            if (error.response && error.response.status === 401) {
                alert("Session expired or unauthorized. Please log out and log in again to record and get legal guidance.");
            } else {
                alert("Failed to transcribe audio. Please ensure the backend server is running and configured correctly.");
            }
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="relative shrink-0">
            {isRecording ? (
                <button 
                    type="button"
                    title="Stop Recording"
                    className="w-[50px] h-[50px] flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-sm active:scale-95 animate-pulse" 
                    onClick={stopRecording}
                >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                    </svg>
                </button>
            ) : isUploading ? (
                <button 
                    type="button"
                    disabled
                    title="Transcribing..."
                    className="w-[50px] h-[50px] flex items-center justify-center bg-emerald-500 text-white rounded-xl shadow-sm cursor-not-allowed opacity-80" 
                >
                    <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </button>
            ) : (
                <button 
                    type="button"
                    title="Start Voice Recording"
                    className="w-[50px] h-[50px] flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl transition-all active:scale-95" 
                    onClick={startRecording}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                    </svg>
                </button>
            )}

            {isRecording && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md whitespace-nowrap animate-bounce z-10">
                    Recording... Click to Stop
                </div>
            )}
        </div>
    );
};

export default VoiceInput;
