# """
# LLM summary helpers (date-free):
# - Sends the user's prompt and ALL transactions to the LLM.
# - The LLM is instructed to infer any date range or time window from the prompt.
# - No server-side date parsing or filtering.
# - Includes a compacting step to keep payload size under control.
# - Falls back to a deterministic metrics-only summary if the OpenAI SDK/key is missing.

# Requires: pip install openai
# Env var: OPENAI_API_KEY
# """

# from __future__ import annotations
# from typing import List, Dict, Any, Optional
# import os, json
# from datetime import datetime
# from decimal import Decimal

# # top of file
# import os
# from typing import Optional
# from openai import OpenAI

# # OPTIONAL: load from .env (pip install python-dotenv)
# try:
#     from dotenv import load_dotenv  # type: ignore
#     load_dotenv()
# except Exception:
#     pass

# def _make_openai_client() -> Optional[OpenAI]:
#     key = os.getenv("OPENAI_API_KEY")
#     if not key:
#         print("OPENAI_API_KEY is not set; using fallback summary")
#         return None
#     try:
#         # Explicitly pass the key (avoids odd env inheritance issues)
#         client = OpenAI(api_key=key)
#         return client
#     except Exception as e:
#         print(f"OpenAI client init failed: {e!r}")
#         return None

# _openai_client: Optional[OpenAI] = _make_openai_client()



# # -----------------------------
# # Metrics helpers (date-agnostic)
# # -----------------------------

# def compute_metrics(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
#     """Compute quick aggregates across ALL transactions (no date logic)."""
#     income = 0.0
#     expense = 0.0
#     by_category: Dict[str, float] = {}

#     for tx in transactions:
#         typ = (tx.get("type") or "").lower()
#         amt = float(tx.get("amount") or 0)
#         cat = tx.get("category") or "Uncategorized"
#         by_category[cat] = by_category.get(cat, 0.0) + (amt if typ == "income" else -amt)
#         if typ == "income":
#             income += amt
#         elif typ == "expense":
#             expense += amt

#     top_spend = sorted(
#         ((c, -v) for c, v in by_category.items() if v < 0), key=lambda x: x[1], reverse=True
#     )[:5]

#     return {
#         "counts": {
#             "total": len(transactions),
#             "income": sum(1 for t in transactions if (t.get("type") or "").lower() == "income"),
#             "expense": sum(1 for t in transactions if (t.get("type") or "").lower() == "expense"),
#         },
#         "totals": {
#             "income": round(income, 2),
#             "expense": round(expense, 2),
#             "net": round(income - expense, 2),
#         },
#         "top_expense_categories": [{"category": c, "amount": a} for c, a in top_spend],
#     }

# # -----------------------------
# # Compact rows for LLM
# # -----------------------------

# def _to_iso_str(value) -> str:
#     """Return value as a short ISO-ish string (or empty)."""
#     if value is None:
#         return ""
#     if isinstance(value, datetime):
#         return value.isoformat()
#     return str(value)

# def _to_float(value) -> float:
#     try:
#         if isinstance(value, Decimal):
#             return float(value)
#         return float(value)
#     except Exception:
#         return 0.0

# def _category_name(cat) -> str:
#     if isinstance(cat, dict):
#         return cat.get("name") or cat.get("label") or "Uncategorized"
#     if isinstance(cat, str):
#         return cat or "Uncategorized"
#     return "Uncategorized"

# def _compact_tx_list(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
#     """
#     Keep only the fields the LLM needs and keep payload size small.
#     Sort by date ascending. Truncate if extremely large.
#     """
#     def to_row(tx):
#         raw_date = tx.get("date") or tx.get("created_at") or tx.get("timestamp")
#         date_text = _to_iso_str(raw_date)
#         if date_text:
#             date_text = date_text[:25]  # keep it compact

#         return {
#             "date": date_text,                              # ISO-ish string
#             "type": (tx.get("type") or "").lower(),         # income | expense
#             "amount": _to_float(tx.get("amount")),          # number
#             "category": _category_name(tx.get("category")), # string
#             "note": tx.get("note") or "",
#         }

#     rows = [to_row(t) for t in transactions]

#     # Sort by date text (ISO sorts lexicographically fine enough here)
#     try:
#         rows.sort(key=lambda r: r["date"])
#     except Exception:
#         pass

#     # Safety cap (tune as needed)
#     MAX_ROWS = 5000
#     if len(rows) > MAX_ROWS:
#         rows = rows[-MAX_ROWS:]

#     return rows

# # -----------------------------
# # Fallback (no LLM)
# # -----------------------------

# def _fallback_summary(metrics: Dict[str, Any]) -> str:
#     t = metrics.get("totals", {})
#     cats = metrics.get("top_expense_categories", [])
#     lines = [
#         "# Transactions summary",
#         f"**Income:** {t.get('income', 0):,.2f}",
#         f"**Expenses:** {t.get('expense', 0):,.2f}",
#         f"**Net:** {t.get('net', 0):,.2f}",
#         "\n**Top expense categories:**",
#     ]
#     if cats:
#         for c in cats:
#             lines.append(f"- {c['category']}: {c['amount']:,.2f}")
#     else:
#         lines.append("- (no expense categories)")
#     return "\n".join(lines)

# # -----------------------------
# # Main entry: prompt + ALL tx → LLM
# # -----------------------------

# DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# def summarize_with_llm_on_raw(user_prompt: str, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
#     """
#     Send ALL transactions (compacted) + the user prompt to the LLM.
#     The LLM will parse any date window from the prompt and filter internally.
#     Server does not parse or pass dates.
#     """
#     rows = _compact_tx_list(transactions)

#     if not _openai_client:
#         print("OpenAI client not configured; falling back to metrics-only summary")
#         # Fallback: compute metrics over ALL rows (no date filtering)
#         metrics = compute_metrics(transactions)
#         md = _fallback_summary(metrics)
#         return {"summary_text": md, "metrics": metrics}

#     system_instructions = (
#         "You are a personal finance analyst.\n"
#         "You will receive the user's request and a JSON array of transactions.\n"
#         "First, parse any time window from the user's prompt (e.g., 'from 1 Aug to 31 Aug', 'last month', 'this week').\n"
#         "Then FILTER the transactions to that window and produce a concise Markdown summary:\n"
#         "- Totals: income, expenses, net\n"
#         "- 3–5 bullet insights (top categories, unusual spikes, large single expenses, recurring items)\n"
#         "- A short takeaway\n"
#         "If the prompt does not specify a time range clearly, infer the most reasonable one (e.g., current month) and state it.\n"
#         "Keep under 180 words. Be factual—do not invent numbers."
#     )

#     content = {
#         "user_request": user_prompt,
#         "transactions": rows,
#         "schema": {
#             "date": "ISO string",
#             "type": "'income' | 'expense'",
#             "amount": "number",
#             "category": "string",
#             "note": "string",
#         },
#     }

#     try:
#         resp = _openai_client.responses.create(
#             model=DEFAULT_MODEL,
#             instructions=system_instructions,
#             input=[{"role": "user", "content": json.dumps(content)}],
#         )
#         print("OpenAI response:", resp)

#         md = getattr(resp, "output_text", "").strip()
#         if not md:
#             metrics = compute_metrics(transactions)
#             md = _fallback_summary(metrics)
#             return {"summary_text": md, "metrics": metrics}

#         # We don’t recompute server-side, since the model owns the date window.
#         return {"summary_text": md, "metrics": None}
#     except Exception:
#         metrics = compute_metrics(transactions)
#         md = _fallback_summary(metrics)
#         return {"summary_text": md, "metrics": metrics}
