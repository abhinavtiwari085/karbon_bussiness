import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client.js";
import { saveAuth } from "../utils/auth.js";

const Login = ({ onAuth }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      saveAuth(data);
      onAuth(data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="page-center">
      <div className="card auth-card">
      <h2>Welcome back</h2>
      <p className="muted">Login to continue splitting bills.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        <button type="submit">Login</button>
      </form>
      <p className="muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
      </div>
    </div>
  );
};

export default Login;
