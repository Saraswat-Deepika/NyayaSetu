const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const transcribeAudio = async (filePath, language, mimeType = 'audio/webm') => {
  if (process.env.MOCK_AI === 'true') {
    console.log('🧪 [MOCK MODE] Transcribing audio with mock data. Selected language:', language);
    const mockTranscripts = {
      'english': 'My landlord is threatening to evict me from my flat without notice.',
      'hindi': 'मेरा मकान मालिक बिना किसी नोटिस के मुझे घर से निकालने की धमकी दे रहा है।',
      'hinglish': 'Mera landlord bina notice ke mujhe ghar se nikalne ki dhamki de raha hai.',
      'bengali': 'আমার বাড়িওয়ালা নোটিশ ছাড়াই আমাকে উচ্ছেদ করার হুমকি দিচ্ছে।',
      'telugu': 'నా భూస్వామి నోటీసు లేకుండా ნన్ను ఖాళీ చేయమని బెదిరిస్తున్నాడు.',
      'marathi': 'माझा घरमालक मला नोटीस न देता घरातून काढून टाकण्याची धमकी देत आहे.',
      'tamil': 'என் வீட்டு உரிமையாளர் எனக்கு அறிவிപ്പ് இல்லாமல் என்னை வெளியேற்ற മிரட்டுகிறார்.',
      'gujarati': 'મારા મકાનમાલિક મને નોટિસ આપ્યા વિના હાંકી કાઢવાની ધમકી આપી રહ્યા છે.',
      'urdu': 'میرا مکان مالک مجھے بنا کسی نوٹس کے بے دخل کرنے کی دھمکی دے رہا ہے۔',
      'kannada': 'ನನ್ನ ಜಮೀನುದಾರನು ನನಗೆ ನೋಟಿಸ್ ನೀಡದೆ ನನ್ನನ್ನು ಹೊರಹಾಕಲು ಬೆദರಿಕೆ ಹಾಕುತ್ತಿದ್ದಾನೆ.',
      'malayalam': 'എന്റെ വീട്ടുടമസ്ഥൻ എനിക്ക് നോട്ടീസ് നൽകാതെ എന്നെ ഒഴിപ്പിക്കുമെന്ന് ഭീഷണിപ്പെടുത്തുന്നു.',
      'punjabi': 'ਮੇਰਾ ਮਕਾਨ ਮਾਲਕ ਬਿਨਾਂ ਕਿਸੇ ਨੋਟਿਸ ਦੇ ਮੈਨੂੰ ਘਰੋਂ ਕੱਢਣ ਦੀ ਧਮਕੀ ਦੇ ਰਿਹਾ ਹੈ।',
      'odia': 'ମୋର ଘရ ମାଲିକ ବିନା କୌଣସି ନୋଟିସରେ ମୋତେ ଘରୁ ବାହାର କରିବାକୁ ଧମକ ଦେଉଛନ୍ତି।'
    };
    const langKey = (language || 'english').toLowerCase();
    return mockTranscripts[langKey] || mockTranscripts['english'];
  }

  const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';
  
  try {
      console.log('📡 Transcribing audio using local Python Whisper API:', filePath);
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(filePath));
      
      const response = await axios.post(`${pythonServiceUrl}/transcribe`, formData, {
          headers: formData.getHeaders(),
          timeout: 120000 // 2 min timeout for local whisper
      });
      
      if (response.data && response.data.transcript) {
          console.log('✅ Local Python Whisper Transcript Received:', response.data.transcript);
          return response.data.transcript.trim();
      }
  } catch (err) {
      console.warn('⚠️ Local Python Whisper failed or not running. Falling back to Gemini/OpenAI...', err.message);
  }

  const openAIKey = process.env.OPENAI_API_KEY;
  const isOpenAIConfigured = openAIKey && openAIKey !== 'your_openai_api_key_here' && openAIKey.trim() !== 'dummy_key' && openAIKey.trim() !== '';

  if (isOpenAIConfigured) {
    try {
      console.log('📡 Transcribing audio using OpenAI Whisper API:', filePath, 'Language hint:', language);
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('model', 'whisper-1');
      
      if (language) {
        const isoMap = {
          'english': 'en',
          'hindi': 'hi',
          'bengali': 'bn',
          'telugu': 'te',
          'marathi': 'mr',
          'tamil': 'ta',
          'gujarati': 'gu',
          'urdu': 'ur',
          'kannada': 'kn',
          'malayalam': 'ml',
          'punjabi': 'pa',
          'odia': 'or'
        };
        const langCode = isoMap[language.toLowerCase()];
        if (langCode) {
          formData.append('language', langCode);
        }
      }

      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${openAIKey}`
        },
        timeout: 60000 // 1 minute timeout
      });

      console.log('✅ Whisper Response Received:', response.data);
      return response.data.text;
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      console.error('❌ OpenAI Whisper Transcription failed. Falling back to Gemini AI:', errMsg);
      // Fall through to Gemini AI transcription
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== 'dummy_key') {
      try {
          console.log('📡 Transcribing audio using Gemini API:', filePath, 'Language hint:', language);
          
          const stats = fs.statSync(filePath);
          if (stats.size < 100) {
              console.warn('⚠️ Audio file is too small or empty. Returning early.');
              return "No speech detected.";
          }

          // Sanitize mimeType for Gemini API (e.g. remove ;codecs=opus)
          let cleanMimeType = mimeType ? mimeType.split(';')[0] : 'audio/webm';
          const validGeminiMimes = ['audio/aac', 'audio/flac', 'audio/mp3', 'audio/m4a', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'];
          if (!validGeminiMimes.includes(cleanMimeType)) {
              cleanMimeType = 'audio/mp3'; // safe fallback
          }

          const base64Audio = fs.readFileSync(filePath).toString('base64');
          const payload = {
              contents: [{
                  parts: [
                      {
                          inlineData: {
                              mimeType: cleanMimeType,
                              data: base64Audio
                          }
                      },
                      { text: "Please transcribe this audio accurately" + (language ? ` in ${language}` : "") + ". Output only the transcription, nothing else." }
                  ]
              }]
          };
          console.log(`[whisperService] Gemini Request Payload: mimeType=${cleanMimeType}, data length=${base64Audio.length}`);
          const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, payload, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 60000
          });
          const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
              console.log('✅ Gemini Transcript Received:', text);
              return text;
          } else {
              console.warn('⚠️ Gemini Response did not contain text:', JSON.stringify(response.data));
              return "No speech detected.";
          }
      } catch (err) {
          const errMsg = err.response?.data?.error?.message || err.message;
          console.error('❌ Gemini Transcription Error:', errMsg);
          
          throw new Error(`Gemini transcription failed: ${errMsg}`);
      }
  }

  // Fallback/Primary Groq Whisper AI transcription
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || groqKey === 'dummy_key') {
      console.warn('⚠️ GROQ_API_KEY is not configured or is a dummy key. Fast-failing transcription.');
      const error = new Error("No valid transcription API key found (OpenAI/Gemini/Groq).");
      error.location = 'whisperService.js line 130 (Final fallback)';
      throw error;
  }

  try {
    console.log('📡 Transcribing audio using Groq Whisper API:', filePath, 'Language hint:', language);
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-large-v3');
    
    if (language) {
      const isoMap = {
        'english': 'en',
        'hindi': 'hi',
        'bengali': 'bn',
        'telugu': 'te',
        'marathi': 'mr',
        'tamil': 'ta',
        'gujarati': 'gu',
        'urdu': 'ur',
        'kannada': 'kn',
        'malayalam': 'ml',
        'punjabi': 'pa',
        'odia': 'or'
      };
      const langCode = isoMap[language.toLowerCase()];
      if (langCode) {
        formData.append('language', langCode);
      }
    }

    const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      timeout: 60000 // 1 minute timeout
    });

    console.log('✅ Groq Whisper Transcript Received:', response.data.text);
    return response.data.text;
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error('❌ Groq Whisper Transcription Error:', errMsg);
    throw new Error(`Groq Whisper transcription failed: ${errMsg}`);
  }
};

module.exports = { transcribeAudio };
