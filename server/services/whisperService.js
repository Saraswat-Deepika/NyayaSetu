const axios = require('axios');
const FormData = require('form-data');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const transcribeAudio = async (filePath, language) => {
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

  const openAIKey = process.env.OPENAI_API_KEY;
  const isOpenAIConfigured = openAIKey && openAIKey !== 'your_openai_api_key_here' && openAIKey.trim() !== '';

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

  // Fallback/Primary Gemini AI transcription
  try {
    console.log('📡 Transcribing audio using Gemini AI:', filePath, 'Language target:', language);
    const audioData = fs.readFileSync(filePath);
    const base64Audio = audioData.toString('base64');

    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeMap = {
      'webm': 'audio/webm',
      'mp3': 'audio/mp3',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4'
    };
    const mimeType = mimeMap[ext] || 'audio/webm';

    const promptText = language 
      ? `Please transcribe this audio accurately in ${language}. Return only the transcribed text, nothing else.`
      : 'Please transcribe this audio accurately. Return only the transcribed text, nothing else.';

    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Audio
      }
    };

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let lastError;
    let transcript;

    for (const modelName of modelsToTry) {
      try {
        console.log(`📡 Attempting transcription with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([audioPart, { text: promptText }]);
        transcript = result.response.text();
        if (transcript) {
          console.log(`✅ Transcription Succeeded using ${modelName}`);
          break;
        }
      } catch (err) {
        console.warn(`⚠️ Transcription failed with ${modelName}:`, err.message);
        lastError = err;
      }
    }

    if (!transcript) {
      throw lastError || new Error("All transcription models failed");
    }

    console.log('✅ Gemini Transcript Received:', transcript);
    return transcript;
  } catch (err) {
    console.error('❌ Gemini Transcription Error:', err.message);
    throw new Error(`Gemini transcription failed: ${err.message}`);
  }
};

module.exports = { transcribeAudio };
