import React, { useState } from "react";
import api from "../lib/api";

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  function validate() {
    const errs = [];
    if (!email || !email.includes("@")) errs.push("Enter a valid email.");
    if (!password) errs.push("Password cannot be empty.");
    else if (!PASSWORD_REGEX.test(password))
      errs.push(
        "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, 1 digit and 1 special character."
      );
    if (password !== confirmPassword) errs.push("Passwords do not match.");
    setErrors(errs);
    return errs.length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { email, password });
      setSuccess(res?.data?.message || "Account created — please log in.");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setErrors([]);
    } catch (err) {
      console.error("register err", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Registration failed.";
      setErrors([msg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3>Create account</h3>
      <form onSubmit={handleSubmit}>
        <label className="small">Email</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="small">Password</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="tiny" style={{ marginTop: 6 }}>
          Password must be at least 8 chars and include: 1 uppercase, 1
          lowercase, 1 digit and 1 special char.
        </div>

        <label className="small">Confirm password</label>
        <input
          className="input"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {errors.length > 0 && (
          <div style={{ color: "#b91c1c", marginTop: 8 }}>
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}
        {success && (
          <div style={{ color: "#065f46", marginTop: 8 }}>{success}</div>
        )}

        <div style={{ marginTop: 12 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
