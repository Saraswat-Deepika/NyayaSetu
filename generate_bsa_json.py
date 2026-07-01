import urllib.request
import json
import os

def fetch_bsa_data():
    # Using the GSMS-B dataset which contains BNS, BNSS, and BSA
    base_url = "https://datasets-server.huggingface.co/rows?dataset=GSMS-B%2Findian-legal-sections-bns-bnss-bsa-2023&config=default&split=train&offset={}&length=100"
    offset = 0
    all_rows = []
    
    print("Fetching data from HuggingFace...")
    while True:
        url = base_url.format(offset)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                rows = data.get('rows', [])
                if not rows:
                    break
                all_rows.extend(rows)
                offset += 100
        except Exception as e:
            # If we hit an error (like out of bounds), we can stop
            break

    # Look for BSA or Sakshya in the act name
    bsa_rows = [r['row'] for r in all_rows if "BSA" in str(r['row'].get('act', '')) or "Sakshya" in str(r['row'].get('act', '')) or "Bharatiya Sakshya" in str(r['row'].get('act', ''))]
    
    if not bsa_rows:
        print("No BSA data found in the dataset.")
        return

    output = {
        "act": "Bharatiya Sakshya Adhiniyam, 2023",
        "mongo_collection": "bsa_sections",
        "chapters": []
    }
    
    chapters_dict = {}
    
    for row in bsa_rows:
        chapter_name_full = str(row.get("chapter", ""))
        
        # e.g. "CHAPTER I PRELIMINARY" -> number: "I", title: "PRELIMINARY"
        chap_no_str = chapter_name_full
        chap_title = chapter_name_full
        if chapter_name_full.startswith("CHAPTER"):
            parts = chapter_name_full.split(" ", 2)
            if len(parts) >= 3:
                chap_no_str = parts[1]
                chap_title = parts[2]
            elif len(parts) == 2:
                chap_no_str = parts[1]
                chap_title = ""
                
        section_no = str(row.get("section_number", ""))
        section_title = str(row.get("section_title", "")).strip()
        
        # Convert section_no to integer if possible, for clean JSON
        try:
            sec_num = int(section_no)
        except:
            sec_num = section_no

        if chap_no_str not in chapters_dict:
            chapters_dict[chap_no_str] = {
                "chapter_no": chap_no_str,
                "chapter_title": chap_title,
                "sections": []
            }
            
        chapters_dict[chap_no_str]["sections"].append({
            "section_no": sec_num,
            "title": section_title,
            "content": str(row.get("section_desc", "")) # optionally adding description if present
        })

    for chap_no in chapters_dict:
        output["chapters"].append(chapters_dict[chap_no])

    abs_path = os.path.join(os.getcwd(), "BSA_Full_MongoDB.json")
    with open(abs_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully wrote {len(bsa_rows)} sections to {abs_path}")

if __name__ == "__main__":
    fetch_bsa_data()
