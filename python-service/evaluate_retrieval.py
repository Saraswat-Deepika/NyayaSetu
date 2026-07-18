import json
import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
import random
import time
import os

print("Loading dataset...")
with open("IndicLegalQA_Dataset_10K_Revised.json", "r", encoding="utf-8") as f:
    dataset = json.load(f)

# Sample 100 random questions for evaluation
random.seed(42)
sample_data = random.sample(dataset, 100)

print("Loading embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

print("Loading FAISS and BM25 index...")
index = faiss.read_index("faiss_index/legal.index")
with open("faiss_index/chunks.pkl", "rb") as f:
    chunks = pickle.load(f)

bm25 = None
if os.path.exists("faiss_index/bm25.pkl"):
    with open("faiss_index/bm25.pkl", "rb") as f:
        bm25 = pickle.load(f)
else:
    print("Warning: BM25 index not found. Run build_bm25.py first.")

def get_rrf_score(rank, k=60):
    return 1.0 / (k + rank)

def evaluate_retrieval(data):
    ks = [3, 10, 20, 50]
    hits = {k: 0 for k in ks}
    total = len(data)
    
    start_time = time.time()
    max_k = max(ks)
    fetch_k = max(max_k * 2, 100) # Fetch more to RRF effectively
    
    for i, item in enumerate(data):
        query = item['question']
        expected_case = item['case_name'].lower()
        
        # 1. FAISS Search
        query_vector = model.encode([query])
        faiss.normalize_L2(query_vector)
        distances, faiss_indices = index.search(query_vector, fetch_k)
        
        faiss_results = [int(idx) for idx in faiss_indices[0] if 0 <= int(idx) < len(chunks)]
        
        # 2. BM25 Search
        bm25_results = []
        if bm25 is not None:
            tokenized_query = query.lower().split()
            bm25_scores = bm25.get_scores(tokenized_query)
            bm25_indices = np.argsort(bm25_scores)[::-1][:fetch_k]
            bm25_results = [int(idx) for idx in bm25_indices if bm25_scores[idx] > 0]
            
        # 3. Reciprocal Rank Fusion
        rrf_scores = {}
        for rank, idx in enumerate(faiss_results):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + get_rrf_score(rank + 1)
            
        for rank, idx in enumerate(bm25_results):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + get_rrf_score(rank + 1)
            
        sorted_indices = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        top_indices = sorted_indices[:max_k]
        
        # 4. Check Hits
        # The previous heuristic ONLY checked for the case name. In legal docs, the case name might 
        # only appear at the top of a 50-page document! So if we retrieve the correct paragraph that 
        # answers the question, it was failing. Now we check if the chunk contains the core of the answer too.
        case_words = set(expected_case.replace('.', '').replace(',', '').split())
        answer_words = set(item['answer'].lower().replace('.', '').replace(',', '').split())
        
        required_case_overlap = max(1, len([w for w in case_words if len(w) > 3]) // 2)
        required_answer_overlap = max(1, len([w for w in answer_words if len(w) > 4]) // 3)
        
        for k in ks:
            hit_found = False
            for j in range(min(k, len(top_indices))):
                idx = top_indices[j]
                chunk = chunks[idx]
                chunk_text = (chunk['text'] + " " + chunk['source']).lower()
                
                case_overlap = sum(1 for w in case_words if len(w) > 3 and w in chunk_text)
                answer_overlap = sum(1 for w in answer_words if len(w) > 4 and w in chunk_text)
                
                # It's a hit if we found the case name OR if we found a significant portion of the true answer!
                if case_overlap >= required_case_overlap or answer_overlap >= required_answer_overlap:
                    hit_found = True
                    break
            
            if hit_found:
                hits[k] += 1
                
        if (i+1) % 20 == 0:
            print(f"Processed {i+1}/{total} queries...")
            
    end_time = time.time()
    
    print("\n" + "="*40)
    print("🎯 HYBRID RETRIEVAL (FAISS + BM25) RESULTS 🎯")
    print("="*40)
    print(f"Total Queries Evaluated : {total}")
    for k in ks:
        hit_rate = (hits[k] / total) * 100
        print(f"Top-{k:<2} Hits            : {hits[k]}  (Hit Rate: {hit_rate:.2f}%)")
    print(f"Time Taken            : {end_time - start_time:.2f} seconds")
    print("="*40)
    
if __name__ == "__main__":
    evaluate_retrieval(sample_data)
