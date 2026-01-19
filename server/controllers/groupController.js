const {
  createGroup,
  findById,
  findByOwner,
  findByParticipantUser,
  deleteById
} = require("../repository/groupRepo");
const { findByUsername, findById: findUserById } = require("../repository/userRepo");
const { deleteByGroup, deleteByParticipantInGroup, findByGroup } = require("../repository/expenseRepo");
const { buildSeed } = require("../utils/avatar");
const { buildParticipantMap, calculateBalances, buildSettlements } = require("../services/balanceService");

const isGroupMember = (group, userId) => {
  if (group.owner.toString() === userId.toString()) return true;
  return group.participants.some((p) => p.userId.toString() === userId.toString());
};

const escapeCsv = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/\"/g, "\"\"")}"`;
  }
  return str;
};

const listGroups = async (req, res) => {
  const owned = await findByOwner(req.user._id);
  const member = await findByParticipantUser(req.user._id, req.user.username);
  const map = new Map();
  [...owned, ...member].forEach((group) => {
    map.set(group._id.toString(), group);
  });
  return res.json(Array.from(map.values()));
};

const getGroup = async (req, res) => {
  const group = await findById(req.params.groupId);
  if (!group || !isGroupMember(group, req.user._id)) {
    return res.status(404).json({ message: "Group not found" });
  }
  const ownerUser = await findUserById(group.owner);
  const data = group.toObject();
  data.ownerInfo = ownerUser
    ? {
        id: ownerUser._id,
        name: ownerUser.name,
        avatarSeed: ownerUser.avatarSeed,
        avatarColor: ownerUser.avatarColor
      }
    : null;
  return res.json(data);
};

const createNewGroup = async (req, res) => {
  const { name, participants } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Group name is required" });
  }
  const requested = participants || [];
  if (requested.length > 3) {
    return res.status(400).json({ message: "Max 3 participants allowed" });
  }
  const safeParticipants = [];

  for (const p of requested) {
    if (!p.username) {
      return res.status(400).json({ message: "Participant username is required" });
    }
    const user = await findByUsername(p.username.toLowerCase());
    if (!user) {
      return res.status(404).json({ message: "No such user is present" });
    }
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Owner is already in the group" });
    }
    const alreadyAdded = safeParticipants.some(
      (entry) => entry.userId.toString() === user._id.toString()
    );
    if (alreadyAdded) {
      return res.status(400).json({ message: "Duplicate participant" });
    }
    safeParticipants.push({
      userId: user._id,
      name: user.name,
      username: user.username,
      color: p.color || "#ef4444",
      avatarSeed: user.avatarSeed || buildSeed(user.name)
    });
  }

  const group = await createGroup({
    name,
    avatarSeed: buildSeed(name),
    owner: req.user._id,
    participants: safeParticipants
  });

  return res.status(201).json(group);
};

const updateGroup = async (req, res) => {
  const { name } = req.body;
  const group = await findById(req.params.groupId);
  if (!group || group.owner.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: "Group not found" });
  }
  if (name) {
    group.name = name;
  }
  await group.save();
  return res.json(group);
};

const removeGroup = async (req, res) => {
  const group = await findById(req.params.groupId);
  if (!group || group.owner.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: "Group not found" });
  }
  await deleteByGroup(group._id);
  await deleteById(group._id);
  return res.json({ message: "Group deleted" });
};

const getGroupSummary = async (req, res) => {
  const group = await findById(req.params.groupId);
  if (!group || !isGroupMember(group, req.user._id)) {
    return res.status(404).json({ message: "Group not found" });
  }
  const expenses = await findByGroup(group._id);
  const ownerUser = await findUserById(group.owner);
  const participants = buildParticipantMap({ group, owner: ownerUser });
  const balances = calculateBalances({ participants, expenses });
  const settlements = buildSettlements(balances);

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  let currentId = "owner";
  if (group.owner.toString() !== req.user._id.toString()) {
    const match = group.participants.find((p) => p.userId.toString() === req.user._id.toString());
    currentId = match ? match._id.toString() : "owner";
  }
  const youOwe = balances[currentId] ? balances[currentId].owed : 0;
  const youPaid = balances[currentId] ? balances[currentId].paid : 0;

  return res.json({
    totalSpent,
    youOwe,
    youPaid,
    balances,
    settlements
  });
};

const leaveGroup = async (req, res) => {
  const group = await findById(req.params.groupId);
  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }
  if (group.owner.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: "Owner cannot leave the group" });
  }
  const participant = group.participants.find(
    (p) => p.userId.toString() === req.user._id.toString()
  );
  if (!participant) {
    return res.status(400).json({ message: "You are not part of this group" });
  }

  await deleteByParticipantInGroup(group._id, participant._id.toString());

  participant.deleteOne();
  await group.save();
  return res.json({ message: "Left group" });
};

const exportGroupCsv = async (req, res) => {
  const group = await findById(req.params.groupId);
  if (!group || !isGroupMember(group, req.user._id)) {
    return res.status(404).json({ message: "Group not found" });
  }

  const expenses = await findByGroup(group._id);
  const ownerUser = await findUserById(group.owner);
  const participants = buildParticipantMap({ group, owner: ownerUser });
  const balances = calculateBalances({ participants, expenses });

  const nameMap = participants.reduce((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  const lines = [];
  lines.push(`Group,${escapeCsv(group.name)}`);
  lines.push(`AvatarSeed,${escapeCsv(group.avatarSeed)}`);
  lines.push("");
  lines.push("Expenses");
  lines.push("Date,Category,Notes,Amount,Paid By,Split Mode,Split Detail");

  expenses.forEach((exp) => {
    const splitDetail = exp.splits
      .map((split) => `${nameMap[split.participantId] || split.participantId}:${split.amount}`)
      .join("; ");
    lines.push(
      [
        escapeCsv(new Date(exp.date).toLocaleDateString()),
        escapeCsv(exp.category),
        escapeCsv(exp.notes || ""),
        escapeCsv(exp.amount),
        escapeCsv(nameMap[exp.payerId] || exp.payerId),
        escapeCsv(exp.splitMode),
        escapeCsv(splitDetail)
      ].join(",")
    );
  });

  lines.push("");
  lines.push("Balances");
  lines.push("Name,Paid,Owed,Net");
  Object.values(balances).forEach((entry) => {
    lines.push(
      [escapeCsv(entry.name), escapeCsv(entry.paid), escapeCsv(entry.owed), escapeCsv(entry.net)].join(",")
    );
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=\"group-${group._id}.csv\"`);
  return res.send(lines.join("\n"));
};

module.exports = {
  listGroups,
  getGroup,
  createNewGroup,
  updateGroup,
  removeGroup,
  getGroupSummary,
  exportGroupCsv,
  leaveGroup
};
