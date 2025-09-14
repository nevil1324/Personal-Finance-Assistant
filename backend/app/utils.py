import io, re
from PIL import Image
import pytesseract
import pdfplumber
from pdf2image import convert_from_bytes
from dateutil import parser as dateparser

AMOUNT_RE = re.compile(r'(?:(?:Rs\.|INR|USD|EUR)?\s?\b)([0-9]+(?:[.,][0-9]{2})?)')

async def ocr_image_bytes(file_bytes: bytes) -> str:
    try:
        im = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        text = pytesseract.image_to_string(im)
        return text
    except Exception:
        try:
            pages = convert_from_bytes(file_bytes)
            text = []
            for p in pages:
                text.append(pytesseract.image_to_string(p))
            return "\n".join(text)
        except Exception:
            try:
                with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                    texts = [p.extract_text() or "" for p in pdf.pages]
                    return "\n".join(texts)
            except Exception:
                return ""

def parse_amounts(text: str):
    amounts = []
    for m in AMOUNT_RE.finditer(text):
        s = m.group(1).replace(',', '')
        try:
            val = float(s)
            amounts.append(val)
        except: 
            continue
    # remove duplicates and sort descending (likely biggest is total)
    unique = sorted(set(amounts), reverse=True)
    return unique

def parse_dates(text: str):
    dates = []
    # try to find ISO-like and common date patterns
    for line in text.splitlines():
        try:
            dt = dateparser.parse(line, fuzzy=True, dayfirst=False)
            if dt:
                dates.append(dt)
        except Exception:
            continue
    return dates

def auto_parse_transactions(text: str):
    amounts = parse_amounts(text)
    dates = parse_dates(text)
    parsed = []
    for a in amounts:
        parsed.append({
            "type": "expense",
            "amount": a,
            "category": "receipt",
            "note": "Parsed from OCR",
            "date": dates[0].isoformat() if dates else None
        })
    return parsed
