const { findById: findGroupById } = require("../repository/groupRepo");
const {
  createExpense,
  findByGroup,
  findById,
  updateById,
  deleteById
} = require("../repository/expenseRepo");
const { calculateSplits, sumSplits } = require("../services/splitService");

const getParticipantIds = (group) => {
  const ids = group.participants.map((p) => p._id.toString());
  ids.unshift("owner");
  return ids;
};

const isGroupMember = (group, userId) => {
  if (group.owner.toString() === userId.toString()) return true;
  return group.participants.some((p) => p.userId.toString() === userId.toString());
};

const getCurrentParticipantId = (group, userId) => {
  if (group.owner.toString() === userId.toString()) return "owner";
  const match = group.participants.find((p) => p.userId.toString() === userId.toString());
  return match ? match._id.toString() : null;
};

const listExpenses = async (req, res) => {
  const group = await findGroupById(req.params.groupId);
  if (!group || !isGroupMember(group, req.user._id)) {
    return res.status(404).json({ message: "Group not found" });
  }

  const { category, participantId, startDate, endDate, minAmount, maxAmount } = req.query;
  const query = {};
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  if (minAmount || maxAmount) {
    query.amount = {};
    if (minAmount) query.amount.$gte = Number(minAmount);
    if (maxAmount) query.amount.$lte = Number(maxAmount);
  }
  if (category) {
    query.category = category;
  }
  if (participantId) {
    query.$or = [
      { payerId: participantId },
      { splits: { $elemMatch: { participantId } } }
    ];
  }

  const expenses = await findByGroup(group._id, query);
  return res.json(expenses);
};

const addExpense = async (req, res) => {
  const { amount, category, notes, date, payerId, splitMode, participantIds, amounts, percentages } =
    req.body;

  const group = await findGroupById(req.params.groupId);
  if (!group || !isGroupMember(group, req.user._id)) {
    return res.status(404).json({ message: "Group not found" });
  }

  const validIds = getParticipantIds(group);
  const ids = participantIds || [];
  if (!validIds.includes(payerId)) {
    return res.status(400).json({ message: "Invalid payer" });
  }
  const allValid = ids.every((id) => validIds.includes(id));
  if (!allValid) {
    return res.status(400).json({ message: "Invalid participants list" });
  }

  const splits = calculateSplits({
    splitMode,
    participantIds: ids,
    amount: Number(amount),
    amounts,
    percentages
  });

  const total = sumSplits(splits);
  if (total !== Number(amount)) {
    return res.status(400).json({ message: "Splits do not match total" });
  }

  if (!category) {
    return res.status(400).json({ message: "Category is required" });
  }

  const expense = await createExpense({
    group: group._id,
    payerId,
    category,
    notes: notes || "",
    amount: Number(amount),
    date: date ? new Date(date) : new Date(),
    splitMode,
    splits,
    settledBy: []
  });

  return res.status(201).json(expense);
};

const updateExpense = async (req, res) => {
  const group = await findGroupById(req.params.groupId);
  if (!group || !isGroupMember(group, req.user._id)) {
    return res.status(404).json({ message: "Group not found" });
  }
  const expense = await findById(req.params.expenseId);
  if (!expense) {
    return res.status(404).json({ message: "Expense not found" });
  }
  const currentId = getCurrentParticipantId(group, req.user._id);
  if (!currentId) {
    return res.status(403).json({ message: "Not allowed" });
  }
  if (currentId !== "owner" && expense.payerId !== currentId) {
    return res.status(403).json({ message: "Only the creator can edit this expense" });
  }

  const { amount, category, notes, date, payerId, splitMode, participantIds, amounts, percentages } =
    req.body;

  const validIds = getParticipantIds(group);
  const ids = participantIds || [];
  if (!validIds.includes(payerId)) {
    return res.status(400).json({ message: "Invalid payer" });
  }
  const allValid = ids.every((id) => validIds.includes(id));
  if (!allValid) {
    return res.status(400).json({ message: "Invalid participants list" });
  }

  const splits = calculateSplits({
    splitMode,
    participantIds: ids,
    amount: Number(amount),
    amounts,
    percentages
  });

  const total = sumSplits(splits);
  if (total !== Number(amount)) {
    return res.status(400).json({ message: "Splits do not match total" });
  }

  if (!category) {
    return res.status(400).json({ message: "Category is required" });
  }

  const updated = await updateById(req.params.expenseId, {
    amount: Number(amount),
    category,
    notes: notes || "",
    date: date ? new Date(date) : new Date(),
    payerId,
    splitMode,
    splits,
    settledBy: expense.settledBy || []
  });

  return res.json(updated);
};

const removeExpense = async (req, res) => {
  const group = await findGroupById(req.params.groupId);
  if (!group || !isGroupMember(group, req.user._id)) {
    return res.status(404).json({ message: "Group not found" });
  }
  const expense = await findById(req.params.expenseId);
  if (!expense) {
    return res.status(404).json({ message: "Expense not found" });
  }
  const currentId = getCurrentParticipantId(group, req.user._id);
  if (!currentId) {
    return res.status(403).json({ message: "Not allowed" });
  }
  if (currentId !== "owner" && expense.payerId !== currentId) {
    return res.status(403).json({ message: "Only the creator can delete this expense" });
  }
  await deleteById(req.params.expenseId);
  return res.json({ message: "Expense deleted" });
};

const settleExpense = async (req, res) => {
  const group = await findGroupById(req.params.groupId);
  if (!group || !isGroupMember(group, req.user._id)) {
    return res.status(404).json({ message: "Group not found" });
  }
  const expense = await findById(req.params.expenseId);
  if (!expense) {
    return res.status(404).json({ message: "Expense not found" });
  }
  const { participantId } = req.body;
  if (!participantId) {
    return res.status(400).json({ message: "participantId is required" });
  }
  if (participantId === expense.payerId) {
    return res.status(400).json({ message: "Payer cannot settle their own expense" });
  }
  const validParticipant = expense.splits.some((split) => split.participantId === participantId);
  if (!validParticipant) {
    return res.status(400).json({ message: "Participant not part of this expense" });
  }

  const current = new Set(expense.settledBy || []);
  current.add(participantId);
  expense.settledBy = Array.from(current);
  await expense.save();
  return res.json(expense);
};

module.exports = { listExpenses, addExpense, updateExpense, removeExpense, settleExpense };
