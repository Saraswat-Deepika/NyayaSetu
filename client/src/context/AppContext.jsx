import React, { createContext, useState, useEffect, useContext } from 'react';

export const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [preferredLanguage, setPreferredLanguage] = useState('English');

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
        
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [token, user]);

    const login = (userData, jwtToken) => {
        setUser(userData);
        setToken(jwtToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
    };

    const setLanguage = (lang) => {
        setPreferredLanguage(lang);
    };

    return (
        <AppContext.Provider value={{ user, token, preferredLanguage, login, logout, setLanguage }}>
            {children}
        </AppContext.Provider>
    );
};
