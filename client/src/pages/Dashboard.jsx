import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { getUser } from "../utils/auth.js";
import Avatar from "../components/Avatar.jsx";

const Dashboard = () => {
  const user = getUser();
  const [groups, setGroups] = useState([]);
  const [view, setView] = useState("all");
  const [form, setForm] = useState({
    name: "",
    participants: ["", "", ""]
  });
  const [error, setError] = useState("");

  const loadGroups = async () => {
    const { data } = await api.get("/groups");
    setGroups(data);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const ownedGroups = groups.filter((group) => group.owner?.toString() === user?.id);
  const memberGroups = groups.filter((group) =>
    group.participants?.some((p) => p.userId?.toString() === user?.id)
  );
  const visibleGroups =
    view === "owner" ? ownedGroups : view === "member" ? memberGroups : groups;

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleParticipantChange = (index, value) => {
    const copy = [...form.participants];
    copy[index] = value;
    setForm({ ...form, participants: copy });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const participants = form.participants
        .filter((username) => username.trim())
        .map((username) => ({ username }));
      await api.post("/groups", { name: form.name, participants });
      setForm({ name: "", participants: ["", "", ""] });
      loadGroups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    }
  };

  return (
    <div className="dashboard">
      <section className="welcome">
        <div>
          <h1>Hi {user?.name || "there"}!</h1>
          <p className="muted">Split Mint keeps your shared expenses tidy.</p>
        </div>
        <Avatar seed={user?.avatarSeed} size={56} />
      </section>

      <section className="card">
        <h3>Create a group</h3>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleCreate} className="form">
          <label>
            Group name
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <div className="grid-3">
            {form.participants.map((value, index) => (
              <label key={index}>
                Username {index + 1}
                <input
                  value={value}
                  onChange={(event) => handleParticipantChange(index, event.target.value)}
                />
              </label>
            ))}
          </div>
          <button type="submit">Create group</button>
        </form>
      </section>

      <section>
        <div className="row-between">
          <h3>Groups</h3>
          <select value={view} onChange={(event) => setView(event.target.value)}>
            <option value="all">All groups</option>
            <option value="owner">Groups owned by me</option>
            <option value="member">Groups I joined</option>
          </select>
        </div>
        <div className="grid stack">
          {visibleGroups.map((group) => (
            <Link to={`/groups/${group._id}`} className="group-card" key={group._id}>
              <Avatar seed={group.avatarSeed} size={24} />
              <div>
                <h4>{group.name}</h4>
                <p className="muted">{group.participants.length + 1} people</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
