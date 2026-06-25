import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center">
            {/* Hero Section */}
            <div className="w-full bg-blue-600 text-white py-12 sm:py-20 px-4 text-center">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4">NyayaSetu</h1>
                <p className="text-base sm:text-lg lg:text-xl mb-2">Your AI-Powered Legal Aid Assistant</p>
                <p className="text-sm sm:text-base lg:text-lg text-blue-200 mb-8">कागजी कानूनी लिखा-पढ़ी को आसान बनाने वाला एआई सहायक</p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto">
                    <Link to="/login" className="w-full sm:w-auto bg-white text-blue-600 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-blue-50 transition duration-300 text-center">Login</Link>
                    <Link to="/register" className="w-full sm:w-auto bg-transparent border-2 border-white text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition duration-300 text-center">Register</Link>
                </div>
            </div>

            {/* Features Section */}
            <div className="max-w-6xl w-full mx-auto py-10 sm:py-16 px-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8 sm:mb-12">Key Features</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                    <FeatureCard title="Voice Input" description="Speak your query in Hindi or English, and let our AI transcribe and analyze it instantly." icon="🎤" />
                    <FeatureCard title="Document Upload" description="Upload legal PDFs or images. Our system extracts text and provides a concise summary." icon="📄" />
                    <FeatureCard title="AI Legal Help" description="Get instant guidance, know your rights, and access legal draft templates powered by Gemini AI." icon="⚖️" />
                    <FeatureCard title="Language Support" description="Seamlessly switch between Hindi and English to ensure you understand every legal detail." icon="🌐" />
                </div>
            </div>
        </div>
    );
};

const FeatureCard = ({ title, description, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-md text-center hover:shadow-lg transition duration-300">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
    </div>
);

export default Home;
