import json
import pymongo
from pymongo import UpdateOne, ASCENDING
import os

def main():
    # --- Configuration ---
    json_file_path = "BNSS_Full_MongoDB.json"
    mongo_uri = "mongodb://127.0.0.1:27017/"
    db_name = "nyayasetu"
    collection_name = "bnss_sections"
    # ---------------------

    if not os.path.exists(json_file_path):
        print(f"Error: Could not find {json_file_path}")
        print(f"Make sure you place your JSON file in the same directory as this script.")
        return

    try:
        # 2. Connect to MongoDB
        print("Connecting to MongoDB...")
        client = pymongo.MongoClient(mongo_uri)
        
        # 3. Create/Select database: nyayasetu
        db = client[db_name]
        
        # 4. Create/Select collection: bnss_sections
        collection = db[collection_name]

        # 1. Read JSON file
        print(f"Reading {json_file_path}...")
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Detect structure and prepare documents
        documents = []
        
        if isinstance(data, dict) and "chapters" in data:
            # Flatten the hierarchical structure (from your previous snippet)
            act_name = data.get("act", "Bharatiya Nagarik Suraksha Sanhita, 2023")
            for chapter in data.get("chapters", []):
                chapter_no = chapter.get("chapter_no")
                chapter_title = chapter.get("chapter_title")
                
                for section in chapter.get("sections", []):
                    section_no = section.get("section_no")
                    
                    # 7. Create a unique _id to avoid duplicate inserts
                    doc_id = f"bnss_sec_{section_no}"
                    
                    doc = {
                        "_id": doc_id,
                        "act": act_name,
                        "chapter_no": chapter_no,
                        "chapter_title": chapter_title,
                        "section_no": section_no,
                        "title": section.get("title")
                    }
                    documents.append(doc)
                    
        elif isinstance(data, list):
            # If your JSON is already a flat list of sections
            for item in data:
                section_no = item.get("section_no")
                if section_no is not None:
                    item["_id"] = f"bnss_sec_{section_no}"
                documents.append(item)
        else:
            print("Unrecognized JSON format. Could not parse documents.")
            return

        # 5 & 7. Insert documents and avoid duplicates using bulk upsert
        if documents:
            print(f"Found {len(documents)} documents. Inserting into the database...")
            operations = [
                UpdateOne({"_id": doc["_id"]}, {"$set": doc}, upsert=True)
                for doc in documents
            ]
            
            result = collection.bulk_write(operations)
            print(f"✅ Upsert complete:")
            print(f"   - {result.upserted_count} new documents inserted.")
            print(f"   - {result.modified_count} existing documents updated.")
            print(f"   - {len(documents) - result.upserted_count - result.modified_count} documents were already up to date (no changes).")
        else:
            print("No documents found to insert.")

        # 6. Create Indexes
        print("\nCreating indexes...")
        collection.create_index([("section_no", ASCENDING)])
        collection.create_index([("title", ASCENDING)])
        collection.create_index([("chapter_title", ASCENDING)])
        print("✅ Indexes created successfully on 'section_no', 'title', and 'chapter_title'.")

        print("\nProcess finished completely!")

    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    main()
