import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/api';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        preferredLanguage: 'English'
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await registerUser(formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-white p-6 sm:p-8 rounded-2xl shadow-md">
                <div>
                    <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-blue-600">Create an account</h2>
                </div>
                {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                            <input name="name" type="text" required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                            <input name="email" type="email" required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                            <input name="password" type="password" required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Phone</label>
                            <input name="phone" type="text" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Preferred Language</label>
                            <select name="preferredLanguage" value={formData.preferredLanguage} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
                                <option value="English">English</option>
                                <option value="Hindi">Hindi</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">
                            Register
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login here</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Register;
