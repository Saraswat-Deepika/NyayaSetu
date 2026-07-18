import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, User, Mail, Phone, MapPin, IndianRupee, Languages, CheckCircle, Upload, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

// We will use native fetch or a custom api wrapper that supports FormData
// Currently api.js exports registerLawyer which uses axios.post
import api from '../services/api';

const RegisterLawyer = () => {
    const navigate = useNavigate();
    const { login } = useAppContext();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        // Step 1
        name: '', email: '', password: '', phone: '', gender: 'Male', dob: '',
        address: '', city: '', state: '', pincode: '', languages: [],
        // Step 2
        barCouncilNumber: '', barCouncilState: '', experienceYears: '',
        lawFirm: '', courtLevels: [], specialization: [], about: '',
        // Step 4
        consultationFee: '', onlineConsultation: false, offlineConsultation: false,
        emergencyConsultation: false, availableTimeSlots: []
    });

    const [files, setFiles] = useState({
        barCouncilCert: null,
        idProof: null,
        advocateId: null,
        profileImage: null
    });

    // Inputs for arrays
    const [langInput, setLangInput] = useState('');
    const [specInput, setSpecInput] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles.length > 0) {
            setFiles({ ...files, [name]: selectedFiles[0] });
        }
    };

    const handleArrayAdd = (field, input, setInput) => {
        if (input.trim() && !formData[field].includes(input.trim())) {
            setFormData({ ...formData, [field]: [...formData[field], input.trim()] });
            setInput('');
        }
    };

    const handleArrayRemove = (field, item) => {
        setFormData({ ...formData, [field]: formData[field].filter(i => i !== item) });
    };

    const handleCourtLevelToggle = (level) => {
        const current = formData.courtLevels;
        if (current.includes(level)) {
            setFormData({ ...formData, courtLevels: current.filter(l => l !== level) });
        } else {
            setFormData({ ...formData, courtLevels: [...current, level] });
        }
    };

    const nextStep = () => {
        setError('');
        if (step === 1 && (!formData.name || !formData.email || !formData.password || !formData.phone)) {
            return setError('Please fill all required personal details.');
        }
        if (step === 2 && (!formData.barCouncilNumber || formData.specialization.length === 0)) {
            return setError('Please provide Bar Council Number and at least one Specialization.');
        }
        if (step === 3 && (!files.barCouncilCert || !files.idProof || !files.advocateId)) {
            return setError('Please upload all required verification documents.');
        }
        if (step === 4 && !formData.consultationFee) {
            return setError('Please provide your consultation fee.');
        }
        setStep(s => s + 1);
    };

    const prevStep = () => setStep(s => s - 1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const data = new FormData();
            // Append scalar fields
            Object.keys(formData).forEach(key => {
                if (Array.isArray(formData[key])) {
                    data.append(key, JSON.stringify(formData[key]));
                } else {
                    data.append(key, formData[key]);
                }
            });
            // Append files
            if (files.barCouncilCert) data.append('barCouncilCert', files.barCouncilCert);
            if (files.idProof) data.append('idProof', files.idProof);
            if (files.advocateId) data.append('advocateId', files.advocateId);
            if (files.profileImage) data.append('profileImage', files.profileImage);

            const response = await api.post('/auth/register-lawyer', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            login(response.data.token, response.data);
            setSuccess('Registration successful! Redirecting to dashboard...');
            setTimeout(() => navigate('/dashboard'), 1500);

        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicators = () => (
        <div className="flex justify-between items-center mb-8">
            {['Personal', 'Professional', 'Documents', 'Consultation', 'Review'].map((label, idx) => (
                <div key={label} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        step > idx + 1 ? 'bg-green-500 text-white' : step === idx + 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                        {step > idx + 1 ? '✓' : idx + 1}
                    </div>
                    <span className="text-xs mt-2 text-slate-600 hidden sm:block">{label}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-4xl mx-auto mb-4">
                <button 
                    type="button"
                    onClick={() => navigate('/dashboard')} 
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>
            </div>
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-slate-800">Lawyer Registration</h2>
                    <p className="text-slate-500 mt-2">Join our platform to offer legal services.</p>
                </div>
                
                {renderStepIndicators()}

                {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>}
                {success && <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl">{success}</div>}

                <form onSubmit={step === 5 ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
                    {/* STEP 1: Personal Information */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold border-b pb-2">Step 1: Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-semibold mb-1">Full Name *</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded-lg" required /></div>
                                <div><label className="block text-sm font-semibold mb-1">Email *</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded-lg" required /></div>
                                <div><label className="block text-sm font-semibold mb-1">Password *</label><input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full p-2 border rounded-lg" required /></div>
                                <div><label className="block text-sm font-semibold mb-1">Mobile Number *</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border rounded-lg" required /></div>
                                <div><label className="block text-sm font-semibold mb-1">Gender</label><select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded-lg"><option>Male</option><option>Female</option><option>Other</option></select></div>
                                <div><label className="block text-sm font-semibold mb-1">Date of Birth</label><input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full p-2 border rounded-lg" /></div>
                                <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">Office Address</label><input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-semibold mb-1">City</label><input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full p-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-semibold mb-1">State</label><input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full p-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-semibold mb-1">Pincode</label><input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="w-full p-2 border rounded-lg" /></div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Languages Spoken</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleArrayAdd('languages', langInput, setLangInput))} className="flex-1 p-2 border rounded-lg" placeholder="e.g. English, Hindi" />
                                        <button type="button" onClick={() => handleArrayAdd('languages', langInput, setLangInput)} className="px-4 py-2 bg-slate-200 rounded-lg">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.languages.map(l => <span key={l} className="px-2 py-1 bg-blue-50 text-blue-700 rounded">{l} <button type="button" onClick={()=>handleArrayRemove('languages', l)}>&times;</button></span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Professional Information */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold border-b pb-2">Step 2: Professional Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-semibold mb-1">Bar Council Number *</label><input type="text" name="barCouncilNumber" value={formData.barCouncilNumber} onChange={handleChange} className="w-full p-2 border rounded-lg" required /></div>
                                <div><label className="block text-sm font-semibold mb-1">Bar Council State</label><input type="text" name="barCouncilState" value={formData.barCouncilState} onChange={handleChange} className="w-full p-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-semibold mb-1">Years of Experience</label><input type="number" name="experienceYears" value={formData.experienceYears} onChange={handleChange} className="w-full p-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-semibold mb-1">Law Firm Name (Optional)</label><input type="text" name="lawFirm" value={formData.lawFirm} onChange={handleChange} className="w-full p-2 border rounded-lg" /></div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold mb-1">Court Levels</label>
                                    <div className="flex gap-4">
                                        {['District Court', 'High Court', 'Supreme Court'].map(c => (
                                            <label key={c} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={formData.courtLevels.includes(c)} onChange={() => handleCourtLevelToggle(c)} className="w-4 h-4" /> {c}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold mb-1">Practice Areas *</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={specInput} onChange={e => setSpecInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleArrayAdd('specialization', specInput, setSpecInput))} className="flex-1 p-2 border rounded-lg" placeholder="e.g. Criminal Law" />
                                        <button type="button" onClick={() => handleArrayAdd('specialization', specInput, setSpecInput)} className="px-4 py-2 bg-slate-200 rounded-lg">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.specialization.map(s => <span key={s} className="px-2 py-1 bg-blue-50 text-blue-700 rounded">{s} <button type="button" onClick={()=>handleArrayRemove('specialization', s)}>&times;</button></span>)}
                                    </div>
                                </div>
                                <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">About</label><textarea name="about" value={formData.about} onChange={handleChange} className="w-full p-2 border rounded-lg" rows="3"></textarea></div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Documents */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold border-b pb-2">Step 3: Verification Documents</h3>
                            <p className="text-sm text-slate-500">Allowed formats: PDF, JPG, PNG.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 border rounded-xl border-dashed">
                                    <label className="block font-semibold mb-2">Bar Council Certificate *</label>
                                    <input type="file" name="barCouncilCert" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="w-full text-sm" />
                                </div>
                                <div className="p-4 border rounded-xl border-dashed">
                                    <label className="block font-semibold mb-2">Government ID Proof *</label>
                                    <input type="file" name="idProof" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="w-full text-sm" />
                                </div>
                                <div className="p-4 border rounded-xl border-dashed">
                                    <label className="block font-semibold mb-2">Advocate Identity Card *</label>
                                    <input type="file" name="advocateId" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="w-full text-sm" />
                                </div>
                                <div className="p-4 border rounded-xl border-dashed">
                                    <label className="block font-semibold mb-2">Profile Photo (Optional)</label>
                                    <input type="file" name="profileImage" accept=".jpg,.jpeg,.png" onChange={handleFileChange} className="w-full text-sm" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Consultation */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold border-b pb-2">Step 4: Availability & Consultation</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-semibold mb-1">Consultation Fee (₹) *</label><input type="number" name="consultationFee" value={formData.consultationFee} onChange={handleChange} className="w-full p-2 border rounded-lg" required /></div>
                                
                                <div className="space-y-3 md:col-span-2">
                                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer">
                                        <input type="checkbox" name="onlineConsultation" checked={formData.onlineConsultation} onChange={handleChange} className="w-5 h-5" />
                                        <span className="font-semibold">Online Consultation Available</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer">
                                        <input type="checkbox" name="offlineConsultation" checked={formData.offlineConsultation} onChange={handleChange} className="w-5 h-5" />
                                        <span className="font-semibold">Offline Consultation Available</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer text-red-700 bg-red-50">
                                        <input type="checkbox" name="emergencyConsultation" checked={formData.emergencyConsultation} onChange={handleChange} className="w-5 h-5" />
                                        <span className="font-semibold">Emergency Consultation Available</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: Summary */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold border-b pb-2">Step 5: Review & Submit</h3>
                            <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                                <div><strong className="block text-slate-500 text-sm">Full Name</strong><p className="font-medium">{formData.name}</p></div>
                                <div><strong className="block text-slate-500 text-sm">Email</strong><p className="font-medium">{formData.email}</p></div>
                                <div><strong className="block text-slate-500 text-sm">Specialization</strong><p className="font-medium">{formData.specialization.join(', ') || 'None'}</p></div>
                                <div><strong className="block text-slate-500 text-sm">Consultation Fee</strong><p className="font-medium">₹{formData.consultationFee}</p></div>
                                <div className="pt-4 border-t border-slate-200">
                                    <p className="text-sm text-slate-600">By submitting this application, you agree to our terms. Your profile will be reviewed by an administrator before it becomes visible to clients.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 border-t border-slate-100">
                        {step > 1 ? (
                            <button type="button" onClick={prevStep} className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:bg-slate-200">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                        ) : <div></div>}

                        {step < 5 ? (
                            <button type="button" onClick={nextStep} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700">
                                Next <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button type="submit" disabled={loading} className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-green-700 disabled:opacity-70">
                                {loading ? 'Submitting...' : 'Submit Application'} <CheckCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterLawyer;
