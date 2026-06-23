import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, AppContext } from './context/AppContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected Pages
import Dashboard from './pages/Dashboard';
import VoiceInputPage from './pages/VoiceInputPage';
import DocumentUploadPage from './pages/DocumentUploadPage';
import AILegalHelpPage from './pages/AILegalHelpPage';
import SettingsPage from './pages/SettingsPage';

const ProtectedRoute = ({ children }) => {
    const { token } = useContext(AppContext);
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Dashboard Routes with Layout */}
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <DashboardLayout />
                </ProtectedRoute>
            }>
                <Route index element={<Dashboard />} />
                <Route path="voice" element={<VoiceInputPage />} />
                <Route path="documents" element={<DocumentUploadPage />} />
                <Route path="legal-help" element={<AILegalHelpPage />} />
                <Route path="settings" element={<SettingsPage />} />
                {/* Fallback for unmatched dashboard sub-routes */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
            {/* Global fallback for completely invalid URLs */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

function App() {
    return (
        <AppProvider>
            <Router>
                <AppRoutes />
            </Router>
        </AppProvider>
    );
}

export default App;

