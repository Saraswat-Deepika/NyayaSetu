import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, FileText, Scale, Globe, ArrowRight, ShieldCheck } from 'lucide-react';
import './Home.css';

const Home = () => {
    return (
        <div className="home-container bg-slate-50 min-h-screen">
            {/* Hero Section */}
            <header className="hero-bg py-20 sm:py-32 px-4 text-center text-white relative">
                <div className="glass-content max-w-4xl mx-auto flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 animate-fade-in-up">
                        <ShieldCheck className="w-5 h-5 text-blue-300" />
                        <span className="text-sm font-medium text-blue-100">AI-Powered Legal Assistance</span>
                    </div>
                    
                    <h1 className="heading-font text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight animate-fade-in-up delay-100">
                        NyayaSetu
                    </h1>
                    
                    <p className="text-xl sm:text-2xl text-blue-100 mb-4 font-medium animate-fade-in-up delay-200">
                        Empowering You with Accessible Legal Knowledge
                    </p>
                    <p className="text-lg sm:text-xl text-blue-200/80 mb-10 max-w-2xl mx-auto animate-fade-in-up delay-200">
                        कागजी कानूनी लिखा-पढ़ी को आसान बनाने वाला एआई सहायक
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full sm:w-auto animate-fade-in-up delay-300">
                        <Link 
                            to="/register" 
                            className="glow-button w-full sm:w-auto bg-blue-500 text-white font-bold py-4 px-10 rounded-full shadow-lg flex items-center justify-center gap-2 group text-lg"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link 
                            to="/login" 
                            className="glow-button-secondary w-full sm:w-auto bg-transparent border border-white/30 backdrop-blur-sm text-white font-bold py-4 px-10 rounded-full text-lg"
                        >
                            Login
                        </Link>
                    </div>
                </div>
            </header>

            {/* Features Section */}
            <main className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8 relative z-10 -mt-10">
                <div className="text-center mb-16 animate-fade-in-up delay-200">
                    <h2 className="heading-font text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Powerful Features</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto text-lg">Everything you need to navigate legal complexities with confidence.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <FeatureCard 
                        title="Voice Input" 
                        description="Speak your query in Hindi or English, and let our AI transcribe and analyze it instantly." 
                        icon={<Mic className="w-8 h-8" />}
                        delay="delay-100"
                    />
                    <FeatureCard 
                        title="Document Upload" 
                        description="Upload legal PDFs or images. Our system extracts text and provides a concise summary." 
                        icon={<FileText className="w-8 h-8" />}
                        delay="delay-200"
                    />
                    <FeatureCard 
                        title="AI Legal Help" 
                        description="Get instant guidance, know your rights, and access legal draft templates powered by AI." 
                        icon={<Scale className="w-8 h-8" />}
                        delay="delay-300"
                    />
                    <FeatureCard 
                        title="Language Support" 
                        description="Seamlessly switch between Hindi and English to ensure you understand every legal detail." 
                        icon={<Globe className="w-8 h-8" />}
                        delay="delay-300"
                    />
                </div>
            </main>
        </div>
    );
};

const FeatureCard = ({ title, description, icon, delay }) => (
    <article className={`feature-card rounded-2xl p-8 text-center animate-fade-in-up ${delay}`}>
        <div className="icon-wrapper">
            {icon}
        </div>
        <h3 className="heading-font text-xl font-bold text-slate-800 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
    </article>
);

export default Home;
