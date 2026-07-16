import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { useAppContext } from '../context/AppContext';

const VoiceInput = ({ language, onTranscriptionComplete, onTranscriptionStart, compact }) => {
    const { token } = useAppContext();
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [liveTranscript, setLiveTranscript] = useState('');
    const liveTranscriptRef = useRef('');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const recognitionRef = useRef(null);
    
    // Web Audio API refs
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const canvasRef = useRef(null);
    
    // Silence detection refs
    const silenceStartRef = useRef(null);
    const isPausedRef = useRef(false);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        return () => {
            cleanupRecordingResources();
        };
    }, []);

    useEffect(() => {
        if (isRecording && !isPaused) {
            const timer = setTimeout(() => {
                drawWaveform();
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isRecording, isPaused]);

    const cleanupRecordingResources = () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
            if (audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(e => console.error(e));
            }
            audioContextRef.current = null;
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    };

    const getLangCode = (lang) => {
        const codes = {
            'Hindi': 'hi-IN', 'English': 'en-IN', 'Bengali': 'bn-IN', 
            'Telugu': 'te-IN', 'Marathi': 'mr-IN', 'Tamil': 'ta-IN', 'Gujarati': 'gu-IN'
        };
        return codes[lang] || 'en-IN';
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContextClass();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            sourceNodeRef.current = source;

            // Setup MediaRecorder
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                if (audioBlob.size > 0 && !isPausedRef.current) {
                    await uploadAudio(audioBlob);
                }
            };

            // Setup Web Speech API for LIVE TRANSCRIPT
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = getLangCode(language);
                
                recognition.onresult = (event) => {
                    let interim = '';
                    
                    setLiveTranscript(prev => {
                        let newText = prev;
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                newText = newText.replace(/\|.*$/, '').trim() + ' ' + event.results[i][0].transcript + ' ';
                            } else {
                                interim += event.results[i][0].transcript;
                            }
                        }
                        
                        if (interim) {
                            newText = newText.replace(/\|.*$/, '').trim() + ' | ' + interim;
                        }
                        
                        liveTranscriptRef.current = newText;
                        return newText;
                    });
                };
                
                recognitionRef.current = recognition;
                recognition.start();
            }

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setIsPaused(false);
            setRecordingTime(0);
            setLiveTranscript('');
            liveTranscriptRef.current = '';
            
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 120) { // Auto stop after 2 minutes
                        stopRecording();
                        return 120;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (error) {
            console.error("Microphone access error:", error);
            alert("Microphone access denied or not found.");
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            if (recognitionRef.current) recognitionRef.current.stop();
            setIsPaused(true);
            isPausedRef.current = true;
            clearInterval(timerIntervalRef.current);
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            if (recognitionRef.current) recognitionRef.current.start();
            setIsPaused(false);
            isPausedRef.current = false;
            timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
            isPausedRef.current = false; // Ensures it uploads in onstop
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setIsPaused(false);
        cleanupRecordingResources();
    };

    const cancelRecording = () => {
        isPausedRef.current = true; // Signals onstop to NOT upload
        audioChunksRef.current = [];
        setLiveTranscript('');
        liveTranscriptRef.current = '';
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        setIsPaused(false);
        cleanupRecordingResources();
    };

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

            analyserRef.current.getByteFrequencyData(dataArray);
            analyserRef.current.getByteTimeDomainData(timeDataArray);

            if (isPausedRef.current) {
                ctx.beginPath();
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                const barWidth = (width / (bufferLength * 0.6));
                let x = 0;
                for (let i = 0; i < bufferLength * 0.6; i++) {
                    const percent = dataArray[i] / 255;
                    const barHeight = Math.max(4, percent * (height * 0.85));
                    const gradient = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
                    gradient.addColorStop(0, '#f87171');
                    gradient.addColorStop(0.5, '#3b82f6');
                    gradient.addColorStop(1, '#6366f1');
                    ctx.fillStyle = gradient;

                    const y = height / 2 - barHeight / 2;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(x, y, barWidth - 2.5, barHeight, 3);
                    else ctx.rect(x, y, barWidth - 2.5, barHeight);
                    ctx.fill();
                    x += barWidth;
                }
            }
        };
        render();
    };

    const uploadAudio = async (audioBlob) => {
        setIsUploading(true);
        if (onTranscriptionStart) onTranscriptionStart();

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', language);

        try {
            const { data } = await api.post('/voice/transcribe', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data'
                }
            });
            // We got the accurate transcript from Whisper
            if (onTranscriptionComplete) {
                onTranscriptionComplete(data.transcript);
            }
        } catch (error) {
            console.error("Transcription upload failed:", error);
            // Fallback to live transcript if API fails
            const currentLiveTranscript = liveTranscriptRef.current;
            if (currentLiveTranscript && onTranscriptionComplete) {
                onTranscriptionComplete(currentLiveTranscript.replace(/\|.*$/, '').trim());
            } else {
                alert("Transcription failed. Please try again.");
            }
        } finally {
            setIsUploading(false);
            setLiveTranscript('');
            liveTranscriptRef.current = '';
        }
    };

    const formatTime = (timeInSecs) => {
        const mins = Math.floor(timeInSecs / 60).toString().padStart(2, '0');
        const secs = (timeInSecs % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const handleMicClick = () => {
        if (isUploading) return;
        if (!isRecording) startRecording();
        else if (isPaused) resumeRecording();
        else stopRecording();
    };

    return (
        <div className={`bg-white rounded-3xl border border-slate-150 shadow-xl shadow-slate-100 flex flex-col items-center w-full max-w-xl mx-auto transition-all duration-350 hover:shadow-2xl ${compact ? 'p-3.5' : 'p-6'}`}>
            <div className={compact ? 'mb-1.5 scale-90' : 'mb-4'}>
                {isUploading ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm animate-pulse">
                        Transcribing Audio...
                    </span>
                ) : isRecording ? (
                    isPaused ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 border border-amber-150 text-amber-700 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                            Recording Paused
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 border border-red-150 text-red-600 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm animate-pulse">
                            Listening ({formatTime(recordingTime)} / 02:00)
                        </span>
                    )
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 border border-blue-150 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                        Voice Assistant Ready
                    </span>
                )}
            </div>
            
            {isRecording && (
                <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl w-full">
                    <div className="w-full h-[50px] bg-slate-900/60 rounded-xl px-3 py-1.5 flex items-center justify-center border border-slate-800/80">
                        <canvas ref={canvasRef} width={320} height={40} className="w-full h-[40px] rounded-lg" />
                    </div>
                </div>
            )}

            {isRecording && liveTranscript && (
                <div className="mt-4 p-4 w-full bg-slate-50 border border-slate-200 rounded-xl text-center shadow-inner">
                    <p className="text-slate-700 italic text-sm">"{liveTranscript.replace(/\|/, '')}"</p>
                </div>
            )}

            <div className={`flex items-center justify-center w-full ${compact ? 'gap-4 my-1.5' : 'gap-8 my-4'}`}>
                {isRecording ? (
                    isPaused ? (
                        <button type="button" onClick={resumeRecording} className="rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-md w-12 h-12 hover:scale-105 transition-all">
                            ▶️
                        </button>
                    ) : (
                        <button type="button" onClick={pauseRecording} className="rounded-full bg-amber-50 text-amber-600 border border-amber-250 flex items-center justify-center shadow-md w-12 h-12 hover:scale-105 transition-all">
                            ⏸️
                        </button>
                    )
                ) : <div className="w-12 h-12" />}

                <div className={`relative flex items-center justify-center shrink-0 ${compact ? 'w-16 h-16' : 'w-28 h-28'}`}>
                    <button
                        onClick={handleMicClick}
                        disabled={isUploading}
                        className={`z-10 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-xl border cursor-pointer w-24 h-24 ${
                            isUploading ? 'bg-indigo-500 scale-95 opacity-90' : isRecording ? isPaused ? 'bg-slate-500' : 'bg-red-500 animate-pulse' : 'bg-blue-600'
                        }`}
                    >
                        🎤
                    </button>
                </div>

                {isRecording ? (
                    <button type="button" onClick={cancelRecording} className="rounded-full bg-red-50 text-red-650 border border-red-150 flex items-center justify-center shadow-md w-12 h-12 hover:scale-105 transition-all">
                        ❌
                    </button>
                ) : <div className="w-12 h-12" />}
            </div>

            <div className="text-center px-4 max-w-sm mt-2">
                <p className="text-slate-700 font-semibold select-none text-sm">
                    {isUploading ? "Transcribing using Whisper..." : isRecording ? (isPaused ? "Paused" : "Tap microphone to finish") : "Tap to speak your legal issue"}
                </p>
            </div>
        </div>
    );
};

export default VoiceInput;
