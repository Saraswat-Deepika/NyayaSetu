from flask import Blueprint, request, jsonify
import pickle
import numpy as np
import os

rag_route = Blueprint('rag_route', __name__)

# Global variables for lazy loading
model = None
index = None
chunks = None

def init_rag():
    global model, index, chunks
    if model is None:
        try:
            import faiss
            from sentence_transformers import SentenceTransformer
            
            print("[RAG Route] Loading embedding model...")
            model = SentenceTransformer('all-MiniLM-L6-v2')
            
            print("[RAG Route] Loading FAISS index and chunks...")
            # We assume current working directory is python-service
            index_path = os.path.join(os.getcwd(), 'faiss_index', 'legal.index')
            chunks_path = os.path.join(os.getcwd(), 'faiss_index', 'chunks.pkl')
            
            if os.path.exists(index_path) and os.path.exists(chunks_path):
                index = faiss.read_index(index_path)
                with open(chunks_path, "rb") as f:
                    chunks = pickle.load(f)
                print("[RAG Route] Successfully loaded FAISS resources.")
            else:
                print(f"[RAG Route] WARNING: FAISS index not found at {index_path}.")
        except Exception as e:
            print(f"[RAG Route] Error initializing RAG: {e}")

@rag_route.route('/api/rag/search', methods=['POST'])
def search_rag():
    init_rag()
    
    if not index or not chunks or not model:
        return jsonify({"success": False, "error": "FAISS index or model not loaded."}), 500

    data = request.json
    if not data or 'query' not in data:
        return jsonify({"success": False, "error": "No query provided"}), 400

    query = data['query']
    k = data.get('k', 3) # default top 3 results

    try:
        # Convert query to embedding
        query_vector = model.encode([query])
        faiss.normalize_L2(query_vector)
        
        # Search index
        distances, indices = index.search(query_vector, k)
        
        results = []
        for i in range(k):
            idx = indices[0][i]
            # Handle out of bounds just in case (though FAISS handles it mostly)
            if idx < 0 or idx >= len(chunks):
                continue
                
            distance = float(distances[0][i])
            chunk = chunks[idx]
            results.append({
                "text": chunk['text'],
                "source": chunk['source'],
                "score": distance
            })
            
        return jsonify({
            "success": True,
            "results": results
        })
        
    except Exception as e:
        print(f"[RAG Route] Search Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
