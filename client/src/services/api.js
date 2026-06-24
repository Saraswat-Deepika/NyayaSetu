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

export const askLegalQuestion = async (queryOrData, language) => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    let requestData;
    if (typeof queryOrData === 'object' && queryOrData !== null) {
        requestData = queryOrData;
    } else {
        requestData = { query: queryOrData, language };
    }

    const response = await axios.post(`${baseUrl}/legal/ask`, requestData, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (typeof queryOrData === 'object' && queryOrData !== null) {
        return response.data;
    }
    return response.data.response || response.data.answer || response.data.guidance || response.data;
};

export const uploadDocument = async (formData) => {
    const response = await api.post('/documents/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
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

export const getBanditStats = async () => {
    const response = await api.get('/bandit/stats');
    return response.data;
};

export const getBanditCategoryStats = async (category) => {
    const response = await api.get(`/bandit/category/${encodeURIComponent(category)}`);
    return response.data;
};

export const submitFeedback = async (queryId, feedback) => {
    const response = await api.post('/feedback', { queryId, feedback });
    return response.data;
};

export const getChatSessions = async () => {
    const response = await api.get('/legal/sessions');
    return response.data;
};

export const getChatSessionById = async (sessionId) => {
    const response = await api.get(`/legal/sessions/${sessionId}`);
    return response.data;
};

export const deleteChatSession = async (sessionId) => {
    const response = await api.delete(`/legal/sessions/${sessionId}`);
    return response.data;
};

export default api;
