// import React, { useState } from "react";
// import api from "../lib/api";

// export default function AISummary() {
//   const [prompt, setPrompt] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [result, setResult] = useState(null);

//   async function submit(e) {
//     e.preventDefault();
//     setError("");
//     setLoading(true);
//     setResult(null);
//     try {
//       const res = await api.post("/llm/summary", { prompt });
//       setResult(res.data);
//     } catch (err) {
//       console.error(err);
//       const msg = err.response?.data?.detail || "Failed to get summary";
//       setError(msg);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="card" style={{ maxWidth: 920, margin: "0 auto" }}>
//       <h2>AI Summary</h2>
//       <p className="muted">
//         Ask in plain English. Example: “Give me a transaction summary from 1 Aug to 31 Aug, highlight top expense categories.”
//       </p>
//       <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
//         <textarea
//           rows={4}
//           placeholder="Type your request..."
//           value={prompt}
//           onChange={(e) => setPrompt(e.target.value)}
//         />
//         <div style={{ alignSelf: "end" }}>
//           <button className="btn" disabled={loading || !prompt}>
//             {loading ? "Summarizing…" : "Summarize"}
//           </button>
//         </div>
//       </form>

//       {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

//       {result && (
//         <div style={{ marginTop: 16 }}>
//           <details open>
//             <summary>Summary</summary>
//             <div style={{ whiteSpace: "pre-wrap", paddingTop: 8 }}>
//               {result.summary_text}
//             </div>
//           </details>
//           <details style={{ marginTop: 12 }}>
//             <summary>Metrics (raw)</summary>
//             <pre style={{ overflowX: "auto" }}>
//               {JSON.stringify(result.metrics, null, 2)}
//             </pre>
//           </details>
//         </div>
//       )}
//     </div>
//   );
// }
