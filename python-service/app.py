from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from routes.whisper_route import whisper_route
from routes.ocr_route import ocr_route
from routes.rag_route import rag_route

load_dotenv()

app = Flask(__name__)
CORS(app)

app.register_blueprint(whisper_route)
app.register_blueprint(ocr_route)
app.register_blueprint(rag_route)

if __name__ == '__main__':
    app.run(port=8000, debug=True)
