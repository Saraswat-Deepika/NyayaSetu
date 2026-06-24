import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { loginUser } from '../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AppContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await loginUser({ email, password });
            login(data.user || data, data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md w-full max-w-md">
                <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center text-blue-600">Login to NyayaSetu</h2>
                {error && <div className="mb-4 text-red-500 text-sm text-center">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                        <input 
                            type="email" 
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                        <input 
                            type="password" 
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                    >
                        Login
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">Don't have an account? <Link to="/register" className="text-blue-600 hover:underline">Register here</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
