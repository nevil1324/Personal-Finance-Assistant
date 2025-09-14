import io, re
from PIL import Image
import pytesseract
import pdfplumber
from pdf2image import convert_from_bytes
from dateutil import parser as dateparser
AMOUNT_RE = re.compile(r'(?:(?:Rs\.|INR|USD|EUR|Rs|₹)?\s?\b)([0-9]+(?:[.,][0-9]{2})?)')
async def ocr_image_bytes(file_bytes: bytes) -> str:
    try:
        im = Image.open(io.BytesIO(file_bytes)).convert('RGB')
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
                    texts = [p.extract_text() or '' for p in pdf.pages]
                    return "\n".join(texts)
            except Exception:
                return ''
def parse_amounts(text: str):
    amounts = []
    for m in AMOUNT_RE.finditer(text):
        s = m.group(1).replace(',', '')
        try:
            val = float(s)
            amounts.append(val)
        except:
            continue
    unique = sorted(set(amounts), reverse=True)
    return unique
def parse_dates(text: str):
    dates = []
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
        parsed.append({'type':'expense','amount':a,'category':'receipt','note':'Parsed from OCR','date': dates[0].isoformat() if dates else None})
    return parsed
def parse_pdf_table(file_bytes: bytes):
    rows = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                table = page.extract_table()
                if not table:
                    continue
                headers = table[0]
                for r in table[1:]:
                    # naive mapping: try to find amount-like column
                    row = dict(zip(headers, r))
                    # find numeric in row values
                    amount = None; date=None; desc=''
                    for v in r:
                        if not v: continue
                        # amount
                        am = re.search(r'([0-9]+[.,][0-9]{2})', v)
                        if am and amount is None:
                            amount = float(am.group(1).replace(',',''))
                        # date
                        try:
                            dt = dateparser.parse(v, fuzzy=True)
                            if date is None:
                                date = dt.isoformat()
                        except Exception:
                            pass
                        desc += (v+' ')
                    rows.append({'amount': amount, 'date': date, 'note': desc.strip()})
    except Exception:
        pass
    return rows
