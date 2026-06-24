import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const VoiceInput = ({ caseId, sessionId, history, language, onUploadSuccess, onUploadStart, onUploadError }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    
    // Web Audio API refs
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const canvasRef = useRef(null);
    
    // Silence detection refs
    const silenceStartRef = useRef(null);
    const isPausedRef = useRef(false); // Used in requestAnimationFrame loop to prevent stale closures

    // Keep isPausedRef updated
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    // Cleanup audio context, streams and timers on unmount
    useEffect(() => {
        return () => {
            cleanupRecordingResources();
        };
    }, []);

    const cleanupRecordingResources = () => {
        // Stop timer
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        // Cancel canvas animation
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }

        // Stop all tracks in the microphone stream
        if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        // Close Audio Context
        if (audioContextRef.current) {
            if (audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(err => console.error("Error closing AudioContext:", err));
            }
            audioContextRef.current = null;
        }

        analyserRef.current = null;
        sourceNodeRef.current = null;
        silenceStartRef.current = null;
    };

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
            
            // Set up Web Audio API for visualizer & auto-silence
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContextClass();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            sourceNodeRef.current = source;

            // Pick standard mimeType
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
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const recordedType = mediaRecorderRef.current.mimeType || mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: recordedType });
                console.log("Audio Captured", { size: audioBlob.size, type: audioBlob.type });
                audioChunksRef.current = [];
                
                // Auto upload immediately on stop (only if not cancelled)
                if (audioBlob.size > 0) {
                    await uploadAudio(audioBlob);
                }
            };

            mediaRecorderRef.current.start();
            console.log("Recording Started");
            setIsRecording(true);
            setIsPaused(false);
            setRecordingTime(0);
            silenceStartRef.current = null;

            // Start Timer Interval
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            // Start Animation Loop for Waveform
            drawWaveform();
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

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            silenceStartRef.current = null; // Reset silence timer on pause
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            silenceStartRef.current = null;
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setIsPaused(false);
        cleanupRecordingResources();
    };

    const cancelRecording = () => {
        if (window.confirm("Are you sure you want to discard the current recording?")) {
            // Empty out audioChunksRef so that onstop doesn't upload a blank recording
            audioChunksRef.current = [];
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            setIsRecording(false);
            setIsPaused(false);
            cleanupRecordingResources();
        }
    };

    // Draw audio visualizer on canvas & perform smart silence detection
    const drawWaveform = () => {
        if (!analyserRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const timeDataArray = new Uint8Array(bufferLength);

        const render = () => {
            if (!analyserRef.current || !canvasRef.current) return;

            animationFrameIdRef.current = requestAnimationFrame(render);

            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            // Get audio data
            analyserRef.current.getByteFrequencyData(dataArray);
            analyserRef.current.getByteTimeDomainData(timeDataArray);

            // Calculate Volume RMS for silence detection
            let sumSquares = 0;
            for (let i = 0; i < bufferLength; i++) {
                const deviation = timeDataArray[i] - 128;
                sumSquares += deviation * deviation;
            }
            const rms = Math.sqrt(sumSquares / bufferLength);

            // Silence Detection Logic (Only when active and NOT paused)
            if (!isPausedRef.current) {
                const SILENCE_THRESHOLD = 1.5; // Low amplitude threshold
                const SILENCE_DURATION_MS = 3000; // 3 seconds of silence

                if (rms < SILENCE_THRESHOLD) {
                    if (silenceStartRef.current === null) {
                        silenceStartRef.current = Date.now();
                    } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION_MS) {
                        console.log("🤫 Smart Silence Triggered. Auto-submitting...");
                        // Trigger stopping and submitting recording
                        stopRecording();
                        return;
                    }
                } else {
                    silenceStartRef.current = null;
                }
            }

            // Draw Neon Waveform Visualization
            if (isPausedRef.current) {
                // Drawing static flat lines when paused
                ctx.beginPath();
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                // Drawing active frequency bar waves
                const barWidth = (width / bufferLength) * 1.5;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const percent = dataArray[i] / 255;
                    const barHeight = Math.max(4, percent * (height * 0.75));

                    // Multi-color neon gradient (Cyan -> Indigo -> Pink)
                    const gradient = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
                    gradient.addColorStop(0, '#06b6d4'); // Cyan
                    gradient.addColorStop(0.5, '#6366f1'); // Indigo
                    gradient.addColorStop(1, '#ec4899'); // Pink

                    ctx.fillStyle = gradient;

                    // Neon shadow blur effect
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = '#6366f1';

                    // Centered vertical bars
                    ctx.fillRect(x, height / 2 - barHeight / 2, barWidth - 1.5, barHeight);
                    x += barWidth;
                }
                ctx.shadowBlur = 0; // Reset shadow
            }
        };

        render();
    };

    const uploadAudio = async (audioSource) => {
        if (!audioSource) return;
        setIsUploading(true);
        if (onUploadStart) onUploadStart();

        let blob = audioSource;
        let originalName = 'recording.webm';

        // Check if audioSource is a File (from file selection/drag-and-drop)
        if (audioSource instanceof File) {
            blob = audioSource;
            originalName = audioSource.name;
        }

        const mime = (blob.type || '').toLowerCase();
        let ext = 'webm';
        if (mime.includes('wav') || originalName.endsWith('.wav')) ext = 'wav';
        else if (mime.includes('ogg') || originalName.endsWith('.ogg')) ext = 'ogg';
        else if (mime.includes('mp4') || mime.includes('m4a') || originalName.endsWith('.m4a') || originalName.endsWith('.mp4')) ext = 'mp4';
        else if (mime.includes('mpeg') || mime.includes('mp3') || originalName.endsWith('.mp3')) ext = 'mp3';

        const formData = new FormData();
        formData.append('audio', blob, originalName.includes('.') ? originalName : `recording.${ext}`);
        if (caseId) formData.append('caseId', caseId);
        if (sessionId) formData.append('sessionId', sessionId);
        if (history) formData.append('history', JSON.stringify(history));
        if (language) formData.append('language', language);

        try {
            const { data } = await api.post('/voice/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log("Audio Uploaded & Processed Successfully", data);
            if (onUploadSuccess) onUploadSuccess(data.transcription, data.legalResponse, data.selectedStrategy, data.case?._id, data.sessionId);
        } catch (error) {
            console.error("Voice upload failed:", error);
            if (onUploadError) onUploadError(error);
            
            if (error.response && error.response.status === 401) {
                alert("Session expired or unauthorized. Please log out and log in again.");
            } else {
                alert("Failed to transcribe audio. Please verify your connection or file size.");
            }
        } finally {
            setIsUploading(false);
        }
    };

    // Format timer: recordingTime in seconds to MM:SS
    const formatTime = (timeInSecs) => {
        const mins = Math.floor(timeInSecs / 60).toString().padStart(2, '0');
        const secs = (timeInSecs % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
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
                            </button>
                        ) : (
                            <>
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                            <button 
                                type="button"
                                onClick={pauseRecording}
                                title="Pause Recording"
                                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border border-slate-700"
                            >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
                                </svg>
                            </button>
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
