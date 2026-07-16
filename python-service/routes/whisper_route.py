from flask import Blueprint, request, jsonify
import whisper
import os

whisper_route = Blueprint('whisper_route', __name__)
# Load tiny model to prevent Out of Memory errors on Render Free Tier
model = whisper.load_model("tiny")

@whisper_route.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    temp_path = f"temp_{audio_file.filename}"
    audio_file.save(temp_path)
    
    try:
        result = model.transcribe(temp_path)
        transcript = result['text']
        os.remove(temp_path)
        return jsonify({"transcript": transcript})
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500
