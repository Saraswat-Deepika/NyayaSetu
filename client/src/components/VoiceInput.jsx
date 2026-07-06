import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const VoiceInput = ({ caseId, sessionId, history, language, onUploadSuccess, onUploadStart, onUploadError, compact }) => {
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

    // Watch isRecording and start animation frame when canvas renders
    useEffect(() => {
        if (isRecording && !isPaused) {
            const timer = setTimeout(() => {
                drawWaveform();
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isRecording, isPaused]);

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
                        stopRecording();
                        return;
                    }
                } else {
                    silenceStartRef.current = null;
                }
            }

            // Draw Waveform Visualization
            if (isPausedRef.current) {
                // Drawing static flat lines when paused
                ctx.beginPath();
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.strokeStyle = '#cbd5e1'; // Light gray stroke
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                // Drawing active frequency bar waves (centered Siri style)
                const barWidth = (width / (bufferLength * 0.6));
                let x = 0;

                for (let i = 0; i < bufferLength * 0.6; i++) {
                    const percent = dataArray[i] / 255;
                    // Scale bars higher for visual impact
                    const barHeight = Math.max(4, percent * (height * 0.85));

                    // Multi-color modern gradient (Red -> Pink -> Indigo)
                    const gradient = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
                    gradient.addColorStop(0, '#f87171'); // red-400
                    gradient.addColorStop(0.5, '#ec4899'); // pink-500
                    gradient.addColorStop(1, '#6366f1'); // indigo-500

                    ctx.fillStyle = gradient;

                    // Rounded vertical bars
                    const barRadius = 3;
                    const y = height / 2 - barHeight / 2;
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(x, y, barWidth - 2.5, barHeight, barRadius);
                    } else {
                        ctx.rect(x, y, barWidth - 2.5, barHeight);
                    }
                    ctx.fill();

                    x += barWidth;
                }
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
            if (onUploadSuccess) onUploadSuccess(data.transcription, data.legalResponse, data.selectedStrategy, data.case?._id, data.sessionId, data.laws, data.emergency);
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

    // Main mic circle click logic
    const handleMicClick = () => {
        if (isUploading) return;
        if (!isRecording) {
            startRecording();
        } else if (isPaused) {
            resumeRecording();
        } else {
            stopRecording();
        }
    };

    return (
        <div className={`bg-white rounded-3xl border border-slate-150 shadow-xl shadow-slate-100 flex flex-col items-center w-full max-w-xl mx-auto transition-all duration-350 hover:shadow-2xl ${compact ? 'p-3.5' : 'p-6'}`}>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes ripple {
                    0% { transform: scale(0.95); opacity: 0.6; }
                    50% { transform: scale(1.25); opacity: 0.35; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                @keyframes activePulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.2); }
                    50% { transform: scale(1.04); box-shadow: 0 0 25px 12px rgba(59, 130, 246, 0.15), 0 0 35px 22px rgba(99, 102, 241, 0.08); }
                }
                @keyframes recordingPulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5), 0 0 0 0 rgba(244, 63, 94, 0.25); }
                    50% { transform: scale(1.04); box-shadow: 0 0 25px 12px rgba(239, 68, 68, 0.18), 0 0 35px 22px rgba(244, 63, 94, 0.1); }
                }
                @keyframes eqBreathing {
                    0%, 100% { transform: scaleY(0.25); }
                    50% { transform: scaleY(0.7); }
                }
                @keyframes eqActive {
                    0%, 100% { transform: scaleY(0.4); }
                    50% { transform: scaleY(1); }
                }
                .animate-ripple-1 { animation: ripple 2.2s infinite ease-out; }
                .animate-ripple-2 { animation: ripple 2.2s infinite ease-out; animation-delay: 1.1s; }
                .animate-active-pulse { animation: activePulse 2s infinite ease-in-out; }
                .animate-recording-pulse { animation: recordingPulse 1.6s infinite ease-in-out; }
                .eq-bar-resting {
                    animation: eqBreathing 2s infinite ease-in-out;
                    transform-origin: center;
                }
                .eq-bar-uploading {
                    animation: eqActive 1s infinite ease-in-out;
                    transform-origin: center;
                }
            `}} />

            {/* Top State Badge */}
            <div className={compact ? 'mb-1.5 scale-90' : 'mb-4'}>
                {isUploading ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm animate-pulse">
                        <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Thinking & Analyzing...
                    </span>
                ) : isRecording ? (
                    isPaused ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 border border-amber-150 text-amber-700 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Recording Paused
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 border border-red-150 text-red-600 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm animate-pulse">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                            </span>
                            Listening
                        </span>
                    )
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 border border-blue-150 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        Voice Assistant Ready
                    </span>
                )}
            </div>

            {/* Circular Microphone & Controls Row */}
            <div className={`flex items-center justify-center w-full ${compact ? 'gap-4 my-1.5' : 'gap-8 my-4'}`}>
                
                {/* Left control (Pause/Play) */}
                {isRecording ? (
                    isPaused ? (
                        <button
                            type="button"
                            onClick={resumeRecording}
                            className={`rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90 hover:scale-105 ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}
                            title="Resume Recording"
                        >
                            <svg className={`fill-current ${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'}`} viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={pauseRecording}
                            className={`rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-250 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90 hover:scale-105 ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}
                            title="Pause Recording"
                        >
                            <svg className={`fill-current ${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'}`} viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                        </button>
                    )
                ) : (
                    <div className={compact ? 'w-8 h-8' : 'w-12 h-12'} />
                )}

                {/* Center Hero Mic Button */}
                <div className={`relative flex items-center justify-center shrink-0 ${compact ? 'w-16 h-16' : 'w-28 h-28'}`}>
                    {/* Ripple effects when active/listening */}
                    {isRecording && !isPaused && (
                        <>
                            <div className="absolute inset-0 rounded-full bg-red-400 opacity-0 animate-ripple-1 pointer-events-none" />
                            <div className="absolute inset-0 rounded-full bg-red-400 opacity-0 animate-ripple-2 pointer-events-none" />
                        </>
                    )}
                    {(!isRecording && !isUploading) && (
                        <div className="absolute inset-0 rounded-full bg-blue-400 opacity-10 animate-ripple-1 pointer-events-none" />
                    )}

                    {/* Microphone Circle */}
                    <button
                        onClick={handleMicClick}
                        disabled={isUploading}
                        className={`z-10 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-xl border cursor-pointer voice-input-mic-btn ${compact ? 'w-14 h-14' : 'w-24 h-24'} ${
                            isUploading
                                ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 border-indigo-400 shadow-indigo-200/50 scale-95 opacity-90'
                                : isRecording
                                    ? isPaused
                                        ? 'bg-slate-500 border-slate-400 shadow-slate-200/50 hover:bg-slate-600'
                                        : 'bg-gradient-to-tr from-red-500 to-rose-600 border-red-400 shadow-red-250/50 animate-recording-pulse hover:scale-[1.03]'
                                    : 'bg-gradient-to-tr from-blue-600 to-indigo-600 border-blue-500 shadow-indigo-200/50 animate-active-pulse hover:scale-[1.03]'
                        }`}
                    >
                        {isUploading ? (
                            <svg className={`animate-spin text-white ${compact ? 'w-6 h-6' : 'w-9 h-9'}`} fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg className={`fill-none ${compact ? 'w-6 h-6' : 'w-10 h-10'}`} stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Right control (Cancel Recording) */}
                {isRecording ? (
                    <button
                        type="button"
                        onClick={cancelRecording}
                        className={`rounded-full bg-red-50 hover:bg-red-100 text-red-650 border border-red-150 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90 hover:scale-105 ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}
                        title="Cancel & Discard Recording"
                    >
                        <svg className={`fill-none ${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'}`} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                ) : (
                    <div className={compact ? 'w-8 h-8' : 'w-12 h-12'} />
                )}
            </div>

            {/* Instruction / Status Subtitle */}
            <div className={`text-center px-4 max-w-sm ${compact ? 'mt-0.5' : 'mt-2'}`}>
                <p className={`text-slate-700 font-semibold select-none leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
                    {isUploading ? (
                        "Translating & retrieving Indian laws..."
                    ) : isRecording ? (
                        isPaused ? (
                            "Recording paused. Tap microphone to resume."
                        ) : (
                            "Listening... Tap microphone again to submit."
                        )
                    ) : (
                        "Tap microphone to ask a legal query"
                    )}
                </p>
                <p className={`text-slate-450 mt-0.5 tracking-wide select-none ${compact ? 'text-[9.5px]' : 'text-[11px]'}`}>
                    {!isRecording && !isUploading && "Speak in Hindi, English, Bengali, Tamil, etc."}
                    {isRecording && !isPaused && "Or click the left button to pause, right to discard."}
                    {isRecording && isPaused && "Or click Stop & Submit to submit what was recorded."}
                </p>
            </div>

            {/* Timer Display */}
            {isRecording && (
                <div className={`bg-slate-50 border border-slate-200 rounded-full font-mono font-bold text-slate-600 shadow-inner flex items-center gap-1 select-none animate-in zoom-in-95 duration-200 ${compact ? 'mt-1 text-[10px] px-2 py-0.5' : 'mt-3.5 text-xs px-3 py-1'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-red-500 animate-ping'}`} />
                    <span>{formatTime(recordingTime)}</span>
                </div>
            )}

            {/* Waveform / Visualizer Equalizer Area */}
            <div className={`w-full flex items-center justify-center ${compact ? 'mt-2.5 min-h-[24px]' : 'mt-5 min-h-[48px]'}`}>
                {isRecording ? (
                    <div className={`w-full shadow-inner bg-slate-50/50 rounded-2xl border border-slate-100 animate-in fade-in duration-300 ${compact ? 'p-1' : 'p-2'}`}>
                        <canvas
                            ref={canvasRef}
                            width={500}
                            height={compact ? 30 : 60}
                            className={`w-full ${compact ? 'h-6' : 'h-12'} bg-transparent rounded-lg`}
                        />
                    </div>
                ) : (
                    /* Elegant CSS animated breathing waves for idle or uploading */
                    <div className={`flex items-end justify-center gap-1 w-full max-w-xs mx-auto text-slate-300/60 select-none ${compact ? 'h-5 scale-75 origin-center' : 'h-10'}`}>
                        {[
                            { h: 'h-3', d: '0.1s' },
                            { h: 'h-6', d: '0.3s' },
                            { h: 'h-4', d: '0.5s' },
                            { h: 'h-8', d: '0.2s' },
                            { h: 'h-10', d: '0.4s' },
                            { h: 'h-5', d: '0.6s' },
                            { h: 'h-9', d: '0.1s' },
                            { h: 'h-6', d: '0.3s' },
                            { h: 'h-8', d: '0.5s' },
                            { h: 'h-4', d: '0.2s' },
                            { h: 'h-7', d: '0.4s' },
                            { h: 'h-3', d: '0.1s' }
                        ].map((bar, idx) => (
                            <div
                                key={idx}
                                style={{ animationDelay: bar.d }}
                                className={`rounded-full transition-colors duration-300 ${bar.h} ${compact ? 'w-1' : 'w-1.5'} ${
                                    isUploading 
                                        ? 'bg-indigo-400 eq-bar-uploading shadow-sm shadow-indigo-100' 
                                        : 'bg-slate-300/80 eq-bar-resting'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceInput;
