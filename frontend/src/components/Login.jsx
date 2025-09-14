import React, { useState } from "react";
import api from "../lib/api";
export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });
      const token = res.data.access_token;
      api.setToken(token);
      localStorage.setItem("pfa_token", token);
      onLogin(token);
    } catch (e) {
      setErr("Login failed: " + (e.response?.data?.detail || e.message));
    }
  }
  return (
    <form onSubmit={submit}>
      <h3>Welcome back</h3>
      <div className="form-row">
        <input
          className="input"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="form-row">
        <input
          className="input"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit">
          Login
        </button>
        <div
          className="small"
          style={{ alignSelf: "center", color: "var(--danger)" }}
        >
          {err}
        </div>
      </div>
    </form>
  );
}
