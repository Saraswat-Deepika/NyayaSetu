import os
import json
import fitz
from tqdm import tqdm

BASE_DIR = "../Judgements"
OUTPUT_DIR = "legal_documents"

os.makedirs(OUTPUT_DIR, exist_ok=True)

years = ["2021", "2022", "2023", "2024"]

for year in years:
    year_path = os.path.join(BASE_DIR, year)

    if not os.path.exists(year_path):
        continue

    pdf_files = []

    for root, _, files in os.walk(year_path):
        for file in files:
            if file.lower().endswith(".pdf"):
                pdf_files.append(os.path.join(root, file))

    print(f"{year}: Found {len(pdf_files)} PDFs")

    output_file = os.path.join(OUTPUT_DIR, f"{year}.json")

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("[\n")

        first = True

        for pdf_path in tqdm(pdf_files):
            try:
                doc = fitz.open(pdf_path)

                text = ""
                for page in doc:
                    text += page.get_text()

                doc.close()

                record = {
                    "file_name": os.path.basename(pdf_path),
                    "year": year,
                    "text": text.strip()
                }

                if not first:
                    f.write(",\n")

                json.dump(record, f, ensure_ascii=False)
                first = False

            except Exception as e:
                print(f"Error: {pdf_path} -> {e}")

        f.write("\n]")

    print(f"Saved {output_file}")