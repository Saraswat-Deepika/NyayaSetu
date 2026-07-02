import json
import re
import os

files = [
    "legal_documents/2021.json",
    "legal_documents/2022.json",
    "legal_documents/2023.json",
    "legal_documents/2024.json"
]

def clean_text(text):
    # Remove standalone A B C D E F G H
    text = re.sub(r'\b[A-H]\b', ' ', text)

    # Remove page numbers appearing alone
    text = re.sub(r'\n\s*\d+\s*\n', '\n', text)

    # Remove extra spaces/newlines
    text = re.sub(r'\s+', ' ', text)

    return text.strip()

for file in files:
    print(f"Cleaning {file}...")

    with open(file, "r", encoding="utf-8") as f:
        data = json.load(f)

    for doc in data:
        doc["text"] = clean_text(doc["text"])

    output_file = file.replace(".json", "_clean.json")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

    print(f"Saved {output_file}")

print("Done!")