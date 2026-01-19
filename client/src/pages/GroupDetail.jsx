import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client.js";
import { getUser } from "../utils/auth.js";
import Avatar from "../components/Avatar.jsx";

const emptyExpense = {
  category: "food_drinks",
  notes: "",
  amount: "",
  date: "",
  payerId: "owner",
  splitMode: "equal",
  participantIds: []
};

const GroupDetail = () => {
  const { groupId } = useParams();
  const user = getUser();
  const [group, setGroup] = useState(null);
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [filters, setFilters] = useState({
    category: "",
    participantId: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: ""
  });
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [splitValues, setSplitValues] = useState({});
  const [participantForm, setParticipantForm] = useState({ username: "", color: "#ef4444" });
  const [toast, setToast] = useState(null);

  const loadGroup = async () => {
    const [groupRes, summaryRes, expensesRes] = await Promise.all([
      api.get(`/groups/${groupId}`),
      api.get(`/groups/${groupId}/summary`),
      api.get(`/groups/${groupId}/expenses`)
    ]);
    setGroup(groupRes.data);
    setSummary(summaryRes.data);
    setExpenses(expensesRes.data);
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const participants = useMemo(() => {
    if (!group) return [];
    const ownerName = group.ownerInfo?.name || user?.name || "Owner";
    const ownerSeed = group.ownerInfo?.avatarSeed || user?.avatarSeed;
    return [
      { id: "owner", name: ownerName, avatarSeed: ownerSeed },
      ...group.participants.map((p) => ({
        id: p._id,
        name: p.name,
        avatarSeed: p.avatarSeed
      }))
    ];
  }, [group, user]);

  const ownerId = group?.ownerInfo?.id || group?.owner;
  const isOwner = ownerId ? ownerId.toString() === user?.id : false;
  const currentParticipantId = isOwner
    ? "owner"
    : group?.participants?.find((p) => p.userId?.toString() === user?.id)?._id?.toString();

  const handleParticipantAdd = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/groups/${groupId}/participants`, participantForm);
      setParticipantForm({ username: "", color: "#ef4444" });
      loadGroup();
    } catch (err) {
      const message = err.response?.data?.message || "Could not add participant";
      setToast({ message, type: "error" });
    }
  };

  const handleParticipantUpdate = async (id, updates) => {
    try {
      await api.put(`/groups/${groupId}/participants/${id}`, updates);
      loadGroup();
    } catch (err) {
      const message = err.response?.data?.message || "Could not update participant";
      setToast({ message, type: "error" });
    }
  };

  const handleParticipantRemove = async (id) => {
    try {
      await api.delete(`/groups/${groupId}/participants/${id}`);
      loadGroup();
    } catch (err) {
      const message = err.response?.data?.message || "Could not remove participant";
      setToast({ message, type: "error" });
    }
  };

  const handleExpenseChange = (event) => {
    setExpenseForm({ ...expenseForm, [event.target.name]: event.target.value });
  };

  const handleExpenseParticipants = (id) => {
    const exists = expenseForm.participantIds.includes(id);
    const updated = exists
      ? expenseForm.participantIds.filter((pid) => pid !== id)
      : [...expenseForm.participantIds, id];
    setExpenseForm({ ...expenseForm, participantIds: updated });
  };

  const handleSplitValueChange = (id, value) => {
    setSplitValues({ ...splitValues, [id]: value });
  };

  const handleExpenseSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...expenseForm,
        amount: Number(expenseForm.amount),
        participantIds: expenseForm.participantIds
      };

      if (expenseForm.splitMode === "custom") {
        const amounts = expenseForm.participantIds.map((id) => Number(splitValues[id] || 0));
        const anyMissing = amounts.some((value) => value <= 0);
        if (anyMissing) {
          setToast({ message: "Fill custom amounts for all selected participants", type: "error" });
          return;
        }
        payload.amounts = amounts;
      }

      if (expenseForm.splitMode === "percentage") {
        const percentages = expenseForm.participantIds.map((id) => Number(splitValues[id] || 0));
        const anyMissing = percentages.some((value) => value <= 0);
        if (anyMissing) {
          setToast({ message: "Fill percentages for all selected participants", type: "error" });
          return;
        }
        const totalPercent = percentages.reduce((sum, value) => sum + value, 0);
        if (Math.abs(totalPercent - 100) > 0.5) {
          setToast({ message: "Percentages should add up to 100", type: "error" });
          return;
        }
        payload.percentages = percentages;
      }

      if (editingExpenseId) {
        await api.put(`/groups/${groupId}/expenses/${editingExpenseId}`, payload);
      } else {
        await api.post(`/groups/${groupId}/expenses`, payload);
      }
      setExpenseForm(emptyExpense);
      setEditingExpenseId(null);
      setSplitValues({});
      setShowEditModal(false);
      loadGroup();
    } catch (err) {
      const message = err.response?.data?.message || "Could not add expense";
      setToast({ message, type: "error" });
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense._id);
    setSplitValues({});
    setExpenseForm({
      category: expense.category || "food_drinks",
      notes: expense.notes || "",
      amount: String(expense.amount),
      date: expense.date ? expense.date.slice(0, 10) : "",
      payerId: expense.payerId,
      splitMode: expense.splitMode,
      participantIds: expense.splits.map((split) => split.participantId)
    });
    const initialSplits = {};
    if (expense.splitMode === "custom") {
      expense.splits.forEach((split) => {
        initialSplits[split.participantId] = split.amount;
      });
    }
    if (expense.splitMode === "percentage") {
      expense.splits.forEach((split) => {
        initialSplits[split.participantId] = ((split.amount / expense.amount) * 100).toFixed(2);
      });
    }
    setSplitValues(initialSplits);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingExpenseId(null);
    setExpenseForm(emptyExpense);
    setSplitValues({});
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
      loadGroup();
    } catch (err) {
      const message = err.response?.data?.message || "Could not delete expense";
      setToast({ message, type: "error" });
    }
  };

  const handleSettle = async (expenseId, participantId) => {
    try {
      await api.put(`/groups/${groupId}/expenses/${expenseId}/settle`, {
        participantId
      });
      loadGroup();
    } catch (err) {
      const message = err.response?.data?.message || "Could not update settlement";
      setToast({ message, type: "error" });
    }
  };

  const getParticipantName = (id) => {
    const match = participants.find((p) => p.id === id);
    return match ? match.name : "Participant";
  };

  const settledExpenses = expenses.filter((exp) =>
    (exp.settledBy || []).includes(currentParticipantId)
  );
  const pendingExpenses = expenses.filter(
    (exp) => !(exp.settledBy || []).includes(currentParticipantId)
  );

  const applyFilters = async () => {
    const params = { ...filters };
    const { data } = await api.get(`/groups/${groupId}/expenses`, { params });
    setExpenses(data);
  };

  const clearFilters = async () => {
    const cleared = {
      category: "",
      participantId: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: ""
    };
    setFilters(cleared);
    const { data } = await api.get(`/groups/${groupId}/expenses`);
    setExpenses(data);
  };

  if (!group) return <div className="card">Loading...</div>;

  const handleExport = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/export`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${group.name || "group"}-summary.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err.response?.data?.message || "Export failed";
      setToast({ message, type: "error" });
    }
  };

  const handleGroupUpdate = async (event) => {
    event.preventDefault();
    try {
      await api.put(`/groups/${groupId}`, { name: group.name });
      loadGroup();
    } catch (err) {
      const message = err.response?.data?.message || "Could not update group";
      setToast({ message, type: "error" });
    }
  };

  const handleGroupDelete = async () => {
    const ok = window.confirm("Delete this group and all expenses?");
    if (!ok) return;
    try {
      await api.delete(`/groups/${groupId}`);
      window.location.href = "/";
    } catch (err) {
      const message = err.response?.data?.message || "Could not delete group";
      setToast({ message, type: "error" });
    }
  };

  const handleLeaveGroup = async () => {
    const ok = window.confirm("Leave this group?");
    if (!ok) return;
    try {
      await api.delete(`/groups/${groupId}/leave`);
      window.location.href = "/";
    } catch (err) {
      const message = err.response?.data?.message || "Could not leave group";
      setToast({ message, type: "error" });
    }
  };

  return (
    <div className="group-detail">
      <section className="card">
        <div className="row-between">
          <div>
            <h2>{group.name}</h2>
            <p className="muted">{participants.length} participants including you.</p>
          </div>
          <Avatar seed={group.avatarSeed} size={52} />
        </div>
        {isOwner ? (
          <form className="form inline" onSubmit={handleGroupUpdate}>
            <input
              value={group.name}
              onChange={(event) => setGroup({ ...group, name: event.target.value })}
            />
            <button type="submit">Save group</button>
            <button type="button" className="ghost" onClick={handleGroupDelete}>
              Delete group
            </button>
          </form>
        ) : (
          <div className="row">
            <button type="button" className="ghost" onClick={handleLeaveGroup}>
              Leave group
            </button>
          </div>
        )}
      </section>

      {summary && (
        <section className="summary-grid">
          <div className="card">
            <h4>Total spent</h4>
            <p className="big">₹ {summary.totalSpent.toFixed(2)}</p>
          </div>
          <div className="card">
            <h4>You paid</h4>
            <p className="big">₹ {summary.youPaid.toFixed(2)}</p>
          </div>
          <div className="card">
            <h4>You owe</h4>
            <p className="big">₹ {summary.youOwe.toFixed(2)}</p>
          </div>
        </section>
      )}

      {toast && (
        <div className={`toast ${toast.type}`} onAnimationEnd={() => setToast(null)}>
          {toast.message}
        </div>
      )}

      <section className="card">
        <h3>Participants</h3>
        <div className="participants">
          {participants.map((p) => (
            <div className="participant" key={p.id}>
              <Avatar seed={p.avatarSeed} size={36} />
              <input
                value={p.name}
                onChange={(event) => handleParticipantUpdate(p.id, { name: event.target.value })}
                disabled={!isOwner || p.id === "owner"}
              />
              {isOwner && p.id !== "owner" && (
                <button className="ghost" onClick={() => handleParticipantRemove(p.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {isOwner && (
          <form onSubmit={handleParticipantAdd} className="form inline">
            <input
              placeholder="Username (registered user)"
              value={participantForm.username}
              onChange={(event) =>
                setParticipantForm({ ...participantForm, username: event.target.value })
              }
              required
            />
            <input
              type="color"
              value={participantForm.color}
              onChange={(event) =>
                setParticipantForm({ ...participantForm, color: event.target.value })
              }
            />
            <button type="submit">Add</button>
          </form>
        )}
      </section>

      <section className="card">
        <h3>Add expense</h3>
        <form className="form" onSubmit={handleExpenseSubmit}>
          <label>
            Category
            <select name="category" value={expenseForm.category} onChange={handleExpenseChange}>
              <option value="food_drinks">Food & Drinks</option>
              <option value="grocery">Grocery</option>
              <option value="travel">Travel</option>
              <option value="household_bills">Household Bills</option>
              <option value="shopping">Shopping</option>
              <option value="entertainment">Entertainment</option>
              <option value="others">Others</option>
            </select>
          </label>
          <label>
            Notes
            <input name="notes" value={expenseForm.notes} onChange={handleExpenseChange} />
          </label>
          <div className="grid-3">
            <label>
              Amount
              <input
                name="amount"
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={handleExpenseChange}
                required
              />
            </label>
            <label>
              Date
              <input name="date" type="date" value={expenseForm.date} onChange={handleExpenseChange} />
            </label>
            <label>
              Paid by
              <select name="payerId" value={expenseForm.payerId} onChange={handleExpenseChange}>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Split mode
            <select name="splitMode" value={expenseForm.splitMode} onChange={handleExpenseChange}>
              <option value="equal">Equal</option>
              <option value="custom">Custom amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </label>
          <div className="chip-list">
            {participants.map((p) => (
              <button
                type="button"
                key={p.id}
                className={expenseForm.participantIds.includes(p.id) ? "chip active" : "chip"}
                onClick={() => handleExpenseParticipants(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
          {expenseForm.splitMode !== "equal" && (
            <div className="grid-3">
              {expenseForm.participantIds.map((id) => {
                const label =
                  participants.find((p) => p.id === id)?.name || "Participant";
                const suffix = expenseForm.splitMode === "percentage" ? " (%)" : "";
                return (
                  <label key={id}>
                    {label}{suffix}
                    <input
                      type="number"
                      step="0.01"
                      value={splitValues[id] || ""}
                      onChange={(event) => handleSplitValueChange(id, event.target.value)}
                      required
                    />
                  </label>
                );
              })}
            </div>
          )}
          <button type="submit">Add expense</button>
        </form>
      </section>

      <section className="card">
        <div className="row-between">
          <h3>Filters</h3>
          <button type="button" className="ghost" onClick={handleExport}>
            Download CSV
          </button>
        </div>
        <div className="grid-3">
          <label>
            Category
            <select
              value={filters.category}
              onChange={(event) => setFilters({ ...filters, category: event.target.value })}
            >
              <option value="">All</option>
              <option value="food_drinks">Food & Drinks</option>
              <option value="grocery">Grocery</option>
              <option value="travel">Travel</option>
              <option value="household_bills">Household Bills</option>
              <option value="shopping">Shopping</option>
              <option value="entertainment">Entertainment</option>
              <option value="others">Others</option>
            </select>
          </label>
          <label>
            Participant
            <select
              value={filters.participantId}
              onChange={(event) => setFilters({ ...filters, participantId: event.target.value })}
            >
              <option value="">All</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start date
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
            />
          </label>
          <label>
            Min amount
            <input
              type="number"
              value={filters.minAmount || ""}
              onChange={(event) => setFilters({ ...filters, minAmount: event.target.value })}
            />
          </label>
          <label>
            Max amount
            <input
              type="number"
              value={filters.maxAmount || ""}
              onChange={(event) => setFilters({ ...filters, maxAmount: event.target.value })}
            />
          </label>
        </div>
        <div className="row wrap filters-actions">
          <button type="button" className="ghost" onClick={clearFilters}>
            Clear
          </button>
          <button type="button" onClick={applyFilters}>
            Apply filters
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Pending transactions</h3>
        <div className="list">
          {pendingExpenses.length > 0 && (
            <div className="settled-row pending-row settled-header">
              <span>Name</span>
              <span>Category</span>
              <span>Date created</span>
              <span>Amount</span>
            </div>
          )}
          {pendingExpenses.map((exp) => {
            const settleTarget = exp.splits.find(
              (split) => split.participantId === currentParticipantId
            );
            const canSettle = settleTarget && settleTarget.participantId !== "owner";
            const isSettled =
              settleTarget && (exp.settledBy || []).includes(currentParticipantId);
            const canEdit = isOwner || exp.payerId === currentParticipantId;
            return (
              <div className="settled-row pending-row" key={exp._id}>
                <span>{exp.notes || "Pending"}</span>
                <span>{exp.category?.replace(/_/g, " ")}</span>
                <span>{new Date(exp.date).toLocaleDateString()}</span>
                <span className="amount">₹ {exp.amount.toFixed(2)}</span>
                <div className="row wrap action-row">
                  {settleTarget ? (
                    <button
                      type="button"
                      className={isSettled ? "chip active" : "chip chip-danger"}
                      onClick={() => handleSettle(exp._id, currentParticipantId)}
                      disabled={isSettled || !canSettle}
                    >
                      {isSettled ? "SETTLED" : "SETTLE"}
                    </button>
                  ) : (
                    <span className="muted">-</span>
                  )}
                  {canEdit ? (
                    <>
                      <button type="button" className="ghost" onClick={() => handleEditExpense(exp)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => handleDeleteExpense(exp._id)}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h3>Settled amount</h3>
        <div className="list">
          {settledExpenses.length === 0 && <p className="muted">No settled payments yet.</p>}
          {settledExpenses.length > 0 && (
            <div className="settled-row settled-header">
              <span>Settlement</span>
              <span>Paid to</span>
              <span>Category</span>
              <span>Date created</span>
              <span>Amount</span>
            </div>
          )}
          {settledExpenses.map((exp) => {
            const split = exp.splits.find((s) => s.participantId === currentParticipantId);
            const amount = split ? split.amount : 0;
            const payerName = getParticipantName(exp.payerId);
            return (
              <div className="settled-row" key={`settled-${exp._id}`}>
                <span>{exp.notes || "Settlement"}</span>
                <span>{payerName}</span>
                <span>{exp.category?.replace(/_/g, " ")}</span>
                <span>{new Date(exp.date).toLocaleDateString()}</span>
                <span className="amount">₹ {amount.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="row-between">
              <h3>Update expense</h3>
              <button type="button" className="ghost" onClick={closeEditModal}>
                Close
              </button>
            </div>
            <form className="form" onSubmit={handleExpenseSubmit}>
              <label>
                Category
                <select name="category" value={expenseForm.category} onChange={handleExpenseChange}>
                  <option value="food_drinks">Food & Drinks</option>
                  <option value="grocery">Grocery</option>
                  <option value="travel">Travel</option>
                  <option value="household_bills">Household Bills</option>
                  <option value="shopping">Shopping</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="others">Others</option>
                </select>
              </label>
              <label>
                Notes
                <input name="notes" value={expenseForm.notes} onChange={handleExpenseChange} />
              </label>
              <div className="grid-3">
                <label>
                  Amount
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={handleExpenseChange}
                    required
                  />
                </label>
                <label>
                  Date
                  <input name="date" type="date" value={expenseForm.date} onChange={handleExpenseChange} />
                </label>
                <label>
                  Paid by
                  <select name="payerId" value={expenseForm.payerId} onChange={handleExpenseChange}>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Split mode
                <select name="splitMode" value={expenseForm.splitMode} onChange={handleExpenseChange}>
                  <option value="equal">Equal</option>
                  <option value="custom">Custom amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </label>
              <div className="chip-list">
                {participants.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={expenseForm.participantIds.includes(p.id) ? "chip active" : "chip"}
                    onClick={() => handleExpenseParticipants(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {expenseForm.splitMode !== "equal" && (
                <div className="grid-3">
                  {expenseForm.participantIds.map((id) => {
                    const label =
                      participants.find((p) => p.id === id)?.name || "Participant";
                    const suffix = expenseForm.splitMode === "percentage" ? " (%)" : "";
                    return (
                      <label key={id}>
                        {label}
                        {suffix}
                        <input
                          type="number"
                          step="0.01"
                          value={splitValues[id] || ""}
                          onChange={(event) => handleSplitValueChange(id, event.target.value)}
                          required
                        />
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="row">
                <button type="submit">Update expense</button>
                <button type="button" className="ghost" onClick={closeEditModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {summary && (
        <section className="card">
          <h3>Balances</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Paid</th>
                <th>Owed</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(summary.balances).map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span className="dot" style={{ background: entry.color || "#94a3b8" }} />
                    {entry.name}
                  </td>
                  <td>₹ {entry.paid.toFixed(2)}</td>
                  <td>₹ {entry.owed.toFixed(2)}</td>
                  <td className={entry.net >= 0 ? "positive" : "negative"}>
                    ₹ {entry.net.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4>Settlement suggestions</h4>
          <ul className="settlements">
            {summary.settlements.map((s, index) => (
              <li key={index}>
                {participants.find((p) => p.id === s.from)?.name} pays {participants.find((p) => p.id === s.to)?.name} ₹ {s.amount.toFixed(2)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default GroupDetail;
