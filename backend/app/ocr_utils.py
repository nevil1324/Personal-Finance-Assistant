from PIL import Image
import pytesseract
import io
import pdfplumber
from datetime import datetime
import re

# basic heuristics: try OCR & extract currency-like numbers and date

def parse_receipt(raw_bytes: bytes, filename: str):
    name = filename.lower()
    if name.endswith('.pdf'):
        with io.BytesIO(raw_bytes) as b:
            results = []
            try:
                with pdfplumber.open(b) as pdf:
                    # try read tables
                    for page in pdf.pages:
                        try:
                            tables = page.extract_tables()
                            for t in tables:
                                for row in t:
                                    # naive row detection: assume [desc, amount]
                                    if len(row) >= 2:
                                        desc = row[0] or ''
                                        amt = row[-1] or ''
                                        amt_f = extract_amount(amt)
                                        if amt_f is not None:
                                            results.append({'amount': amt_f, 'category': 'uncategorized', 'description': desc, 'date': datetime.utcnow(), 'type': 'expense'})
                        except Exception:
                            pass
            except Exception:
                pass
            if results:
                return results
    # fallback: image OCR
    try:
        img = Image.open(io.BytesIO(raw_bytes))
    except Exception:
        return []
    text = pytesseract.image_to_string(img)
    amounts = extract_amounts_from_text(text)
    out = []
    for a in amounts:
        out.append({'amount': a, 'category': 'uncategorized', 'description': 'parsed from receipt', 'date': datetime.utcnow(), 'type': 'expense'})
    return out

def extract_amount(s: str):
    s = str(s)
    m = re.search(r'\d+[\d,]*\.?\d{0,2}', s.replace(',', ''))
    if m:
        try:
            return float(m.group(0))
        except:
            return None
    return None

def extract_amounts_from_text(text: str):
    items = re.findall(r'\d+[\d,]*\.?\d{0,2}', text.replace(',', ''))
    out = []
    for it in items:
        try:
            out.append(float(it))
        except:
            pass
    # heuristics: return top 1 or top 3 largest numbers (likely totals)
    out_sorted = sorted(out, reverse=True)
    return out_sorted[:3]