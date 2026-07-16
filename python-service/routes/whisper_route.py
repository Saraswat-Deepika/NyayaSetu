from flask import Blueprint, request, jsonify
import whisper
import os
import torch

whisper_route = Blueprint('whisper_route', __name__)

# Global variable for lazy loading
model = None

def init_whisper():
    global model
    if model is None:
        print("[Whisper] Loading tiny model...")
        # Limit torch threads to reduce memory overhead on small instances
        torch.set_num_threads(1)
        model = whisper.load_model("tiny")
        print("[Whisper] Model loaded successfully.")

@whisper_route.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    # Lazy load the model on first request
    try:
        init_whisper()
    except Exception as e:
        return jsonify({"error": f"Failed to load model: {str(e)}"}), 500
        
    audio_file = request.files['audio']
    temp_path = f"temp_{audio_file.filename}"
    audio_file.save(temp_path)
    
    try:
        result = model.transcribe(temp_path, fp16=False)
        transcript = result['text']
        os.remove(temp_path)
        return jsonify({"transcript": transcript})
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500
