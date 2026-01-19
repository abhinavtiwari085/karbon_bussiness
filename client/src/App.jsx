import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import GroupDetail from "./pages/GroupDetail.jsx";
import { getToken, clearToken } from "./utils/auth.js";

const App = () => {
  const [token, setToken] = useState(getToken());

  const handleLogout = () => {
    clearToken();
    setToken(null);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">Split Mint</Link>
        <nav>
          {token ? (
            <button className="ghost" onClick={handleLogout}>Logout</button>
          ) : (
            <div className="nav-links">
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </div>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login onAuth={setToken} />} />
          <Route path="/register" element={<Register onAuth={setToken} />} />
          <Route path="/groups/:groupId" element={token ? <GroupDetail /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
