import pickle
import os
from rank_bm25 import BM25Okapi

print("🚀 Starting BM25 indexing...")

chunks_path = os.path.join(os.getcwd(), 'faiss_index', 'chunks.pkl')
bm25_path = os.path.join(os.getcwd(), 'faiss_index', 'bm25.pkl')

if not os.path.exists(chunks_path):
    print("❌ Error: chunks.pkl not found! Make sure you have run rag_indexer.py first.")
    exit(1)

print("Loading chunks...")
with open(chunks_path, "rb") as f:
    chunks = pickle.load(f)

print(f"Tokenizing {len(chunks)} chunks for BM25...")
# Very basic tokenizer: lowercasing and splitting by space.
# We also include the source so case names in the source match well.
tokenized_corpus = [(chunk['text'] + " " + chunk['source']).lower().split() for chunk in chunks]

print("Building BM25 index...")
bm25 = BM25Okapi(tokenized_corpus)

print("Saving BM25 index...")
with open(bm25_path, "wb") as f:
    pickle.dump(bm25, f)

print("✅ BM25 index built and saved successfully to faiss_index/bm25.pkl!")
