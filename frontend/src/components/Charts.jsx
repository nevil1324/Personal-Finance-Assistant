import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const DEFAULT_COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

export default function Charts({ categories, refreshCounter }) {
  const [byCat, setByCat] = useState([]);
  const [byDate, setByDate] = useState([]);
  const [txType, setTxType] = useState("expense");
  const [range, setRange] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(false);
  const [lastParams, setLastParams] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (range.start) params.start = range.start;
      if (range.end) params.end = range.end;
      if (txType) params.tx_type = txType;

      // record params for UI debug
      setLastParams(params);
      console.log("[Charts] calling with params=", params);

      const [cRes, dRes] = await Promise.all([
        api.get("/aggregate/category", { params }).catch((e) => {
          console.error("agg/category err", e);
          return { data: [] };
        }),
        api.get("/aggregate/date", { params }).catch((e) => {
          console.error("agg/date err", e);
          return { data: [] };
        }),
      ]);

      console.log("[Charts] /aggregate/category =>", cRes.data);
      console.log("[Charts] /aggregate/date     =>", dRes.data);

      setByCat(cRes.data || []);

      // sort by date to ensure line chart ordering (and coerce date to ISO for sorting)
      const rawDates = (dRes.data || []).slice();
      rawDates.sort((a, b) => {
        const da = new Date(a.date).getTime() || 0;
        const db = new Date(b.date).getTime() || 0;
        return da - db;
      });
      setByDate(rawDates);
    } catch (e) {
      console.error("[Charts] load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txType, range.start, range.end, refreshCounter]);

  const labels = byCat.map((b) => b.category || "unknown");
  const data = byCat.map((b) => b.total || 0);
  const colors = labels.map(
    (_, i) => DEFAULT_COLORS[i % DEFAULT_COLORS.length]
  );

  const pieData = {
    labels,
    datasets: [{ data, backgroundColor: colors, hoverOffset: 8 }],
  };
  const lineData = {
    labels: byDate.map((x) => x.date),
    datasets: [
      {
        label: txType === "expense" ? "Expenses" : "Income",
        data: byDate.map((x) => x.total),
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        backgroundColor: "rgba(79,70,229,0.12)",
        borderColor: "#4f46e5",
      },
    ],
  };

  // Force remount of Line when txType or range changes (prevents stale chart instance)
  const lineKey = `${txType}::${range.start || "ns"}::${range.end || "ne"}::${
    byDate.length
  }`;

  const overallTotal = byDate.reduce((s, x) => s + (Number(x.total) || 0), 0)

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="small">Type</label>
          <select
            className="input"
            value={txType}
            onChange={(e) => setTxType(e.target.value)}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
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
          <button className="btn secondary" onClick={() => load()}>
            Apply
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h4 style={{ marginTop: 0 }}>
          {txType === "expense" ? "Spending by Category" : "Income by Category"}
        </h4>
        {loading ? (
          <div className="small">Loading...</div>
        ) : byCat.length > 0 ? (
          <div style={{ maxWidth: 700 }}>
            <Pie
              data={pieData}
              options={{
                plugins: {
                  legend: {
                    position: "right",
                    labels: { usePointStyle: true },
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const label = context.label || "";
                        const val = context.parsed || 0;
                        return label + ": " + val;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
            No category data yet. Add some transactions or upload receipts.
          </div>
        )}
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h4 style={{ marginTop: 0 }}>
            {txType === "expense" ? "Expense over time" : "Income over time"}
          </h4>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {txType === "expense" ? "Total expense: " : "Total income: "}
            <span
              style={{ color: txType === "expense" ? "#ef4444" : "#10b981" }}
            >
              {overallTotal}
            </span>
          </div>
        </div>

        {byDate.length > 0 ? (
          <div style={{ maxWidth: 900 }}>
            <Line
              key={lineKey}
              data={lineData}
              options={{
                plugins: {
                  legend: { display: false },
                  tooltip: { mode: "index", intersect: false },
                },
                scales: { x: { display: true }, y: { display: true } },
              }}
            />

          </div>
        ) : (
          <div className="small">No time-series data yet.</div>
        )}
      </div>
    </div>
  );
}
