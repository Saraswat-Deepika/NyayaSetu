import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Add request interceptor to attach JWT token from localStorage
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const registerUser = async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};

export const loginUser = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
};

export const askLegalQuestion = async (queryData) => {
    const response = await api.post('/legal/ask', queryData);
    return response.data;
};

export const uploadDocument = async (formData) => {
    const response = await api.post('/documents/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const chatWithDocument = async (documentId, query, history) => {
    const response = await api.post(`/documents/${documentId}/chat`, { query, history });
    return response.data;
};

export const translateDocument = async (documentId, language) => {
    const response = await api.post(`/documents/${documentId}/translate`, { language });
    return response.data;
};

export const getDocumentAnalytics = async () => {
    const response = await api.get('/documents/analytics');
    return response.data;
};

export const transcribeVoice = async (formData) => {
    const response = await api.post('/voice/transcribe', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const translateText = async (textData) => {
    const response = await api.post('/translate', textData);
    return response.data;
};

export default api;
