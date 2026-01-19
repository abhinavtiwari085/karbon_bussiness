import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client.js";
import { saveAuth } from "../utils/auth.js";

const Register = ({ onAuth }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    avatarColor: "#2f6fed"
  });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/register", form);
      saveAuth(data);
      onAuth(data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="page-center">
      <div className="card auth-card">
      <h2>Create account</h2>
      <p className="muted">Join Split Mint to track shared expenses.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="form">
        <label>
          Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Username
          <input name="username" value={form.username} onChange={handleChange} required />
        </label>
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
        <label>
          Avatar color
          <input name="avatarColor" type="color" value={form.avatarColor} onChange={handleChange} />
        </label>
        <button type="submit">Register</button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Login</Link>
      </p>
      </div>
    </div>
  );
};

export default Register;
