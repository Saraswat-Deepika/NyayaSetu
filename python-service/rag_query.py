import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer

print("Loading embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

print("Loading FAISS index and chunks...")
index = faiss.read_index("faiss_index/legal.index")
with open("faiss_index/chunks.pkl", "rb") as f:
    chunks = pickle.load(f)

def search(query, k=3):
    print(f"\n🔍 Searching for: '{query}'")
    
    # 1. Convert query to embedding
    query_vector = model.encode([query])
    faiss.normalize_L2(query_vector)
    
    # 2. Search FAISS index
    distances, indices = index.search(query_vector, k)
    
    # 3. Print results
    print("\n--- 📄 TOP RESULTS ---\n")
    for i in range(k):
        idx = indices[0][i]
        distance = distances[0][i]
        chunk = chunks[idx]
        
        print(f"Result {i+1} (Source: {chunk['source']}) | Match Score: {distance:.4f}")
        print("-" * 40)
        print(chunk['text'])
        print("-" * 40 + "\n")

if __name__ == "__main__":
    while True:
        user_query = input("\nEnter your legal question (or type 'exit' to stop): ")
        if user_query.lower() in ['exit', 'quit']:
            break
        search(user_query)
