import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Send, Paperclip, MoreVertical, FileText, Image as ImageIcon, X } from 'lucide-react';

const ChatWindow = () => {
    const { id: appointmentId } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAppContext();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attachment, setAttachment] = useState(null); // { type: 'image' | 'file', name: string }
    
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Fetch initial chat history
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/chat/${appointmentId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessages(res.data.data);
            } catch (error) {
                console.error("Error fetching chat history", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchHistory();
    }, [appointmentId, token]);

    // Setup Socket
    useEffect(() => {
        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);

        newSocket.emit('join_appointment', appointmentId);

        newSocket.on('receive_message', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        return () => newSocket.disconnect();
    }, [appointmentId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const isImage = file.type.startsWith('image/');
            setAttachment({
                type: isImage ? 'image' : 'file',
                name: file.name
            });
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !attachment) return;

        const messageData = {
            _id: Date.now().toString(), // temp ID until real DB ID
            appointmentId,
            senderId: user?._id || 'currentUser',
            content: newMessage,
            documentUrl: attachment ? `mock-url-${attachment.name}` : null, // Mocking file URL for UI purposes
            timestamp: new Date().toISOString()
        };

        socket.emit('send_message', messageData);
        setMessages((prev) => [...prev, messageData]);
        setNewMessage('');
        setAttachment(null);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-50 max-w-4xl mx-auto border-x border-slate-200 shadow-sm relative">
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                            C
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">Legal Consultation</h2>
                            <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
                            </p>
                        </div>
                    </div>
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex justify-center my-4">
                    <span className="bg-slate-200/60 text-slate-600 text-xs px-4 py-1.5 rounded-full font-medium">
                        Secure Chat Started. End-to-End Encrypted.
                    </span>
                </div>
                
                {loading ? (
                    <div className="text-center text-slate-400 text-sm py-4">Loading messages...</div>
                ) : (
                    messages.map((msg) => {
                        const isMine = msg.senderId === (user?._id || 'currentUser');
                        return (
                            <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                                    isMine 
                                        ? 'bg-blue-600 text-white rounded-br-sm shadow-sm' 
                                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                                }`}>
                                    {msg.documentUrl && (
                                        <div className={`flex items-center gap-2 p-2 rounded-lg mb-2 ${isMine ? 'bg-blue-700/50' : 'bg-slate-100'}`}>
                                            {msg.documentUrl.includes('image') ? <ImageIcon className="w-5 h-5"/> : <FileText className="w-5 h-5"/>}
                                            <span className="text-sm font-medium underline cursor-pointer truncate">Attached File</span>
                                        </div>
                                    )}
                                    {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                                    <span className={`text-[10px] mt-1 block text-right ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                                        {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                {attachment && (
                    <div className="mb-3 flex items-center gap-2 bg-slate-100 p-2 rounded-lg w-max">
                        {attachment.type === 'image' ? <ImageIcon className="w-4 h-4 text-blue-600"/> : <FileText className="w-4 h-4 text-blue-600"/>}
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{attachment.name}</span>
                        <button onClick={() => setAttachment(null)} className="ml-2 p-1 text-slate-400 hover:text-red-500 rounded-full">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileChange}
                    />
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current.click()}
                        className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your legal query or message..." 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-3 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    />
                    <button 
                        type="submit"
                        disabled={!newMessage.trim() && !attachment}
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 shadow-sm transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
