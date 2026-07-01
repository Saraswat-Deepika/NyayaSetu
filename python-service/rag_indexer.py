import faiss
import numpy as np
import json
import os
import pickle
from sentence_transformers import SentenceTransformer

print("🚀 Starting FAISS indexing...")

# Load the embedding model
print("Loading embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("✅ Model loaded")

# ─────────────────────────────────────────
# STEP 1: Load all legal documents
# ─────────────────────────────────────────

def load_documents(folder="legal_documents"):
    documents = []
    for filename in os.listdir(folder):
        if filename.endswith(".txt") or filename.endswith(".pdf"):
            filepath = os.path.join(folder, filename)
            print(f"  📄 Loading {filename}...")
            with open(filepath, "r", encoding="utf-8") as f:
                text = f.read()
            documents.append({
                "filename": filename,
                "text": text
            })
    return documents

# ─────────────────────────────────────────
# STEP 2: Split into chunks
# ─────────────────────────────────────────

def split_into_chunks(documents, chunk_size=500, overlap=50):
    chunks = []
    for doc in documents:
        text = doc["text"]
        words = text.split()
        
        i = 0
        while i < len(words):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)
            
            chunks.append({
                "text": chunk_text,
                "source": doc["filename"],
                "chunk_id": len(chunks)
            })
            
            i += chunk_size - overlap  # overlap for context
    
    return chunks

# ─────────────────────────────────────────
# STEP 3: Create FAISS index
# ─────────────────────────────────────────

def create_faiss_index(chunks):
    print(f"\n📊 Creating embeddings for {len(chunks)} chunks...")
    
    texts = [c["text"] for c in chunks]
    
    # Create embeddings in batches
    batch_size = 32
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        embeddings = model.encode(batch, show_progress_bar=False)
        all_embeddings.append(embeddings)
        print(f"  ✅ Processed {min(i + batch_size, len(texts))}/{len(texts)} chunks")
    
    all_embeddings = np.vstack(all_embeddings).astype('float32')
    
    # Create FAISS index
    dimension = all_embeddings.shape[1]  # 384 for MiniLM
    index = faiss.IndexFlatL2(dimension)
    index.add(all_embeddings)
    
    print(f"✅ FAISS index created with {index.ntotal} vectors")
    return index

# ─────────────────────────────────────────
# STEP 4: Save everything
# ─────────────────────────────────────────

def save_index(index, chunks):
    os.makedirs("faiss_index", exist_ok=True)
    
    # Save FAISS index
    faiss.write_index(index, "faiss_index/legal.index")
    
    # Save chunks metadata
    with open("faiss_index/chunks.pkl", "wb") as f:
        pickle.dump(chunks, f)
    
    # Save summary
    summary = {
        "total_chunks": len(chunks),
        "sources": list(set(c["source"] for c in chunks)),
        "dimension": 384
    }
    with open("faiss_index/summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n✅ Index saved in faiss_index/")
    print(f"📊 Total chunks indexed: {len(chunks)}")
    print(f"📁 Sources: {summary['sources']}")

# ─────────────────────────────────────────
# RUN ALL STEPS
# ─────────────────────────────────────────

print("\n📂 Loading documents...")
documents = load_documents("legal_documents")
print(f"✅ Loaded {len(documents)} documents")

print("\n✂️  Splitting into chunks...")
chunks = split_into_chunks(documents)
print(f"✅ Created {len(chunks)} chunks")

index = create_faiss_index(chunks)
save_index(index, chunks)

print("\n🎉 FAISS indexing complete!")
print("Now run: python rag_query.py to test it")