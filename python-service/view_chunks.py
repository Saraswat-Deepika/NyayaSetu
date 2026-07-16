import pickle

# Load the chunks file
try:
    with open("faiss_index/chunks.pkl", "rb") as f:
        chunks = pickle.load(f)
        
    print(f"Total chunks saved: {len(chunks)}")
    print("-" * 50)
    
    # Print the first 3 chunks as an example
    for i, chunk in enumerate(chunks[:3]):
        print(f"Chunk {i+1} (Source: {chunk['source']}):")
        print(chunk['text'])
        print("-" * 50)
        
except Exception as e:
    print(f"Error reading chunks file: {e}")
