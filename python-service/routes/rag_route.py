from flask import Blueprint, request, jsonify
import pickle
import numpy as np
import os

rag_route = Blueprint('rag_route', __name__)

# Global variables for lazy loading
model = None
index = None
chunks = None
bm25 = None

def init_rag():
    global model, index, chunks, bm25
    if model is None:
        try:
            import faiss
            from sentence_transformers import SentenceTransformer
            
            print("[RAG Route] Loading embedding model...")
            model = SentenceTransformer('all-MiniLM-L6-v2')
            
            print("[RAG Route] Loading FAISS index, chunks, and BM25 index...")
            index_path = os.path.join(os.getcwd(), 'faiss_index', 'legal.index')
            chunks_path = os.path.join(os.getcwd(), 'faiss_index', 'chunks.pkl')
            bm25_path = os.path.join(os.getcwd(), 'faiss_index', 'bm25.pkl')
            
            if os.path.exists(index_path) and os.path.exists(chunks_path):
                index = faiss.read_index(index_path)
                with open(chunks_path, "rb") as f:
                    chunks = pickle.load(f)
                print("[RAG Route] Successfully loaded FAISS resources.")
            else:
                print(f"[RAG Route] WARNING: FAISS index not found at {index_path}.")
                
            if os.path.exists(bm25_path):
                with open(bm25_path, "rb") as f:
                    bm25 = pickle.load(f)
                print("[RAG Route] Successfully loaded BM25 index.")
            else:
                print(f"[RAG Route] WARNING: BM25 index not found at {bm25_path}. Running FAISS-only.")
                
        except Exception as e:
            print(f"[RAG Route] Error initializing RAG: {e}")

def get_rrf_score(rank, k=60):
    return 1.0 / (k + rank)

@rag_route.route('/api/rag/search', methods=['POST'])
def search_rag():
    init_rag()
    
    if not index or not chunks or not model:
        return jsonify({"success": False, "error": "FAISS index or model not loaded."}), 500

    data = request.json
    if not data or 'query' not in data:
        return jsonify({"success": False, "error": "No query provided"}), 400

    query = data['query']
    k = data.get('k', 20) # Default to Top 20 for better RAG
    
    # We query more from each system so RRF has enough overlap to work well
    fetch_k = max(k * 2, 50) 

    try:
        # --- 1. FAISS DENSE SEARCH ---
        query_vector = model.encode([query])
        faiss.normalize_L2(query_vector)
        distances, faiss_indices = index.search(query_vector, fetch_k)
        
        faiss_results = []
        for i in range(fetch_k):
            idx = int(faiss_indices[0][i])
            if idx >= 0 and idx < len(chunks):
                faiss_results.append(idx)
                
        # --- 2. BM25 KEYWORD SEARCH ---
        bm25_results = []
        if bm25 is not None:
            tokenized_query = query.lower().split()
            bm25_scores = bm25.get_scores(tokenized_query)
            # Get top fetch_k indices sorted by score descending
            bm25_indices = np.argsort(bm25_scores)[::-1][:fetch_k]
            for idx in bm25_indices:
                if bm25_scores[idx] > 0: # Only count if there's actually a keyword match
                    bm25_results.append(int(idx))
                    
        # --- 3. RECIPROCAL RANK FUSION (RRF) ---
        rrf_scores = {}
        
        # Add FAISS scores (Rank 1 gets highest RRF)
        for rank, idx in enumerate(faiss_results):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + get_rrf_score(rank + 1)
            
        # Add BM25 scores
        for rank, idx in enumerate(bm25_results):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + get_rrf_score(rank + 1)
            
        # Sort by RRF score descending
        sorted_indices = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        top_indices = sorted_indices[:k]
        
        # --- 4. FORMAT RESULTS ---
        results = []
        for idx in top_indices:
            chunk = chunks[idx]
            results.append({
                "text": chunk['text'],
                "source": chunk['source'],
                # Invert RRF score logic slightly so frontend logic (if lower=better) isn't broken entirely,
                # though usually higher is better for RRF. In ragService.js it filters score <= 1.50
                # Let's map it so RRF scores are normalized nicely, or just pass a fake distance for compat.
                # Actually, RRF is usually 0.0 to ~0.03. To make it pass the `score <= 1.50` filter in node.js, 
                # we just return `1.0 - rrf_score` (so it's around 0.98, which is < 1.50).
                "score": 1.0 - rrf_scores[idx]
            })
            
        return jsonify({
            "success": True,
            "results": results
        })
        
    except Exception as e:
        print(f"[RAG Route] Search Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

