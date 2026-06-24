import json

with open("IndicLegalQA_Dataset_10K_Revised.json", "r", encoding="utf-8") as f:
    data = json.load(f)

with open("legal_dataset.jsonl", "w", encoding="utf-8") as f:
    for item in data:
        row = {
            "instruction": "Answer the legal question in simple language.",
            "input": item.get("question", ""),
            "output": item.get("answer", "")
        }
        f.write(json.dumps(row, ensure_ascii=False) + "\n")

print("Done! Total records:", len(data))