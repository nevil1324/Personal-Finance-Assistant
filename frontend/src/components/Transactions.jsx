import React, { useEffect, useState, useRef } from "react";
import api from "../lib/api";

// Transactions component with pagination, filters, edit & delete, and type-filtered categories
export default function Transactions({ refreshTrigger }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [txType, setTxType] = useState("all");
  const [range, setRange] = useState({ start: "", end: "" });

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // categories
  const [categories, setCategories] = useState([]);

  const loadRef = useRef(null);

  // load transactions with pagination + filters
  async function load(p = 1) {
    setLoading(true);
    try {
      const params = { page: p, page_size: pageSize };
      if (txType && txType !== "all") params.tx_type = txType;
      if (range.start) params.start = range.start;
      if (range.end) params.end = range.end;
      const res = await api.get("/transactions", { params });

      // handle paginated or raw array response
      const data = res.data || {};
      const fetchedItems = Array.isArray(data) ? data : data.items || [];
      const fetchedTotal =
        data.total || (Array.isArray(data) ? fetchedItems.length : 0);
      const fetchedPage = data.page || p;

      setItems(fetchedItems || []);
      setTotal(fetchedTotal || 0);
      setPage(fetchedPage);
    } catch (e) {
      console.error("Failed to load transactions", e);
      alert("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }
  loadRef.current = load;

  // fetch categories
  async function fetchCategories() {
    try {
      const res = await api.get("/categories");
      const cats = Array.isArray(res.data)
        ? res.data
        : res.data.items || res.data || [];
      const norm = cats
        .map((c) => {
          if (!c) return null;
          if (typeof c === "string") return { name: c, type: "" };
          return {
            name: c.name || c.label || c.value || "",
            type: c.type || "",
            icon: c.icon || "",
          };
        })
        .filter(Boolean);
      setCategories(norm);
    } catch (e) {
      console.error("fetch categories err", e);
      setCategories([]);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, txType, range.start, range.end]);

  // reload when parent demands
  useEffect(() => {
    if (loadRef.current) loadRef.current(1);
  }, [refreshTrigger]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Helper: convert incoming saved tx into display-friendly normalized object
  function normalizeSavedTx(saved) {
    if (!saved) return null;
    const normalized = { ...saved };
    // normalize id fields
    normalized.id = saved.id || saved._id || saved._id || saved.id;
    normalized._id = saved._id || saved.id || normalized.id;
    // normalize date to ISO string (YYYY-MM-DD) for consistent UI use if present
    if (saved.date) {
      try {
        const d = new Date(saved.date);
        if (!isNaN(d.getTime())) {
          // keep full ISO string in backend objects, but for inputs we'll slice
          normalized.date = d.toISOString();
        } else {
          normalized.date = "";
        }
      } catch {
        normalized.date = "";
      }
    } else {
      normalized.date = "";
    }
    return normalized;
  }

  // Check whether saved transaction passes current filters (type & date range)
  function matchesCurrentFilters(tx) {
    if (!tx) return false;
    // type
    if (txType && txType !== "all" && tx.type !== txType) return false;
    // date range (compare using YYYY-MM-DD)
    if (range.start) {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      const startDate = new Date(range.start + "T00:00:00");
      if (txDate < startDate) return false;
    }
    if (range.end) {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      // treat end as inclusive until 23:59:59
      const endDate = new Date(range.end + "T23:59:59");
      if (txDate > endDate) return false;
    }
    return true;
  }

  // Listen for global event signifying a transaction was created
  useEffect(() => {
    function onCreated(e) {
      const savedRaw = e?.detail;
      if (!savedRaw) return;

      const saved = normalizeSavedTx(savedRaw);
      if (!saved) return;

      // If saved tx doesn't match current filters, do not insert it into current list
      if (!matchesCurrentFilters(saved)) {
        // if you're not on page 1, but the saved tx would be on page 1, we still reload page1
        if (page !== 1) {
          if (loadRef.current) loadRef.current(1);
        }
        return;
      }

      // Avoid duplicates
      const exists = items.some((t) => (t._id || t.id) === (saved._id || saved.id));
      if (exists) return;

      // If user is on page 1, prepend for instant UX; otherwise reload page 1
      if (page === 1) {
        setItems((prev) => [saved, ...prev]);
        setTotal((prev) => (typeof prev === "number" ? prev + 1 : prev));
      } else {
        if (loadRef.current) loadRef.current(1);
      }
    }

    window.addEventListener("tx:created", onCreated);
    return () => window.removeEventListener("tx:created", onCreated);
    // intentionally not including items/page in deps so listener stays stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, txType, range.start, range.end]);

  // helpers
  function getIcon(catName) {
    const f = categories.find((c) => c.name === catName);
    return f && f.icon ? f.icon + " " : "";
  }

  // editing
  function startEdit(tx) {
    const id = tx._id || tx.id;
    setEditingId(id);
    setEditData({
      amount: tx.amount ?? "",
      category: tx.category ?? "",
      date: tx.date
        ? typeof tx.date === "string"
          ? tx.date.slice(0, 10)
          : new Date(tx.date).toISOString().slice(0, 10)
        : "",
      note: tx.note ?? tx.note ?? "",
      type: tx.type ?? "expense",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
  }

  async function saveEdit(id) {
    if (
      editData.amount === "" ||
      editData.amount === null ||
      editData.amount === undefined
    )
      return alert("Amount required");
    try {
      const payload = {
        amount: Number(editData.amount),
        date: editData.date || undefined,
        category: editData.category || undefined,
        note: editData.note || undefined,
        type: editData.type || undefined,
      };
      const res = await api.put(`/transactions/${id}`, payload);
      const updated = res?.data || { ...payload, id };
      setItems((prev) =>
        prev.map((t) => ((t._id || t.id) === id ? { ...t, ...updated } : t))
      );
      cancelEdit();
    } catch (e) {
      console.error("update err", e);
      alert("Failed to update transaction");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      // remove locally and adjust total
      setItems((prev) => prev.filter((t) => (t._id || t.id) !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error("delete err", e);
      alert("Failed to delete transaction");
    }
  }

  function filteredCategoriesByType(type) {
    if (!type || type === "all") return categories;
    return categories.filter(
      (c) => (c.type || "").toLowerCase() === (type || "").toLowerCase()
    );
  }

  function CategoryInput({ value, onChange, type }) {
    const opts = filteredCategoriesByType(type);
    if (opts && opts.length > 0) {
      return (
        <select
          className="input"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">-- select --</option>
          {opts.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className="input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  return (
    <div>
      {/* Filters toolbar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <label className="small">Filter</label>
        <select
          className="input"
          value={txType}
          onChange={(e) => setTxType(e.target.value)}
        >
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <label className="small">Start</label>
        <input
          className="input"
          type="date"
          value={range.start}
          onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
        />
        <label className="small">End</label>
        <input
          className="input"
          type="date"
          value={range.end}
          onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
        />

        <label className="small">Page size</label>
        <select
          className="input"
          value={pageSize}
          onChange={(e) => setPageSize(parseInt(e.target.value) || 5)}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>

        <button className="btn secondary" onClick={() => load(1)}>
          Apply
        </button>
        <div style={{ marginLeft: "auto" }}>
          <button
            className="btn pagination-btn"
            onClick={() => {
              if (page > 1) load(page - 1);
            }}
          >
            Prev
          </button>
          <span style={{ margin: "0 8px" }} className="small">
            Page {page} / {totalPages}
          </span>
          <button
            className="btn pagination-btn"
            onClick={() => {
              if (page < totalPages) load(page + 1);
            }}
          >
            Next
          </button>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Transactions</h4>
        {loading ? (
          <div className="small">Loading...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f8fafc" }}>
                <th style={{ padding: 8 }}>Date</th>
                <th style={{ padding: 8 }}>Type</th>
                <th style={{ padding: 8 }}>Category</th>
                <th style={{ padding: 8 }}>Amount</th>
                <th style={{ padding: 8 }}>Note</th>
                <th style={{ padding: 8, width: 40 }}></th>
                <th style={{ padding: 8, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const id = it._id || it.id;
                if (editingId === id) {
                  return (
                    <tr key={id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: 8 }}>
                        <input
                          className="input"
                          type="date"
                          value={editData.date}
                          onChange={(e) =>
                            setEditData((d) => ({ ...d, date: e.target.value }))
                          }
                        />
                      </td>
                      <td style={{ padding: 8 }}>
                        <select
                          className="input"
                          value={editData.type}
                          onChange={(e) =>
                            setEditData((d) => ({
                              ...d,
                              type: e.target.value,
                              category: filteredCategoriesByType(
                                e.target.value
                              ).some((c) => c.name === d.category)
                                ? d.category
                                : "",
                            }))
                          }
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </td>
                      <td style={{ padding: 8 }}>
                        <CategoryInput
                          value={editData.category}
                          onChange={(val) =>
                            setEditData((d) => ({ ...d, category: val }))
                          }
                          type={editData.type}
                        />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input
                          className="input"
                          type="number"
                          value={editData.amount}
                          onChange={(e) =>
                            setEditData((d) => ({
                              ...d,
                              amount: Number(e.target.value),
                            }))
                          }
                        />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input
                          className="input"
                          value={editData.note}
                          onChange={(e) =>
                            setEditData((d) => ({ ...d, note: e.target.value }))
                          }
                        />
                      </td>
                      <td style={{ padding: 8 }}>
                        <button
                          className="icon-btn"
                          onClick={() => saveEdit(id)}
                        >
                          💾
                        </button>{" "}
                        <button
                          className="icon-btn secondary"
                          onClick={cancelEdit}
                        >
                          ✖️
                        </button>
                      </td>
                      <td style={{ padding: 8 }}>
                        <button className="icon-btn danger" disabled>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 8 }}>
                      {it.date
                        ? typeof it.date === "string"
                          ? it.date.slice(0, 10)
                          : new Date(it.date).toLocaleString()
                        : ""}
                    </td>
                    <td style={{ padding: 8 }}>{it.type}</td>
                    <td style={{ padding: 8 }}>
                      {getIcon(it.category)} {it.category}
                    </td>
                    <td style={{ padding: 8 }}>{it.amount}</td>
                    <td style={{ padding: 8 }}>{it.note || it.note}</td>
                    <td style={{ padding: 8 }}>
                      <button
                        className="icon-btn"
                        onClick={() => startEdit(it)}
                      >
                        ✏️
                      </button>
                    </td>
                    <td style={{ padding: 8 }}>
                      <button
                        className="icon-btn danger"
                        onClick={() => handleDelete(id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
