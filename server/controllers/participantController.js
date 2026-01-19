const { findById } = require("../repository/groupRepo");
const { findByUsername } = require("../repository/userRepo");
const { deleteByParticipantInGroup } = require("../repository/expenseRepo");
const { buildSeed } = require("../utils/avatar");

const addParticipant = async (req, res) => {
  const { username, color } = req.body;
  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }
  const group = await findById(req.params.groupId);
  if (!group || group.owner.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: "Group not found" });
  }
  if (group.participants.length >= 3) {
    return res.status(400).json({ message: "Max 3 participants allowed" });
  }

  const user = await findByUsername(username.toLowerCase());
  if (!user) {
    return res.status(404).json({ message: "No such user is present" });
  }
  if (user._id.toString() === group.owner.toString()) {
    return res.status(400).json({ message: "Owner is already in the group" });
  }
  const alreadyAdded = group.participants.some(
    (p) => p.userId.toString() === user._id.toString()
  );
  if (alreadyAdded) {
    return res.status(400).json({ message: "User already added to this group" });
  }

  group.participants.push({
    userId: user._id,
    name: user.name,
    username: user.username,
    color: color || "#ef4444",
    avatarSeed: user.avatarSeed || buildSeed(user.name)
  });
  await group.save();
  return res.status(201).json(group);
};

const updateParticipant = async (req, res) => {
  const { name, color } = req.body;
  const group = await findById(req.params.groupId);
  if (!group || group.owner.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: "Group not found" });
  }
  const participant = group.participants.id(req.params.participantId);
  if (!participant) {
    return res.status(404).json({ message: "Participant not found" });
  }
  if (name) participant.name = name;
  if (color) participant.color = color;
  await group.save();
  return res.json(group);
};

const removeParticipant = async (req, res) => {
  const group = await findById(req.params.groupId);
  if (!group || group.owner.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: "Group not found" });
  }
  const participantId = req.params.participantId;
  const participant = group.participants.id(participantId);
  if (!participant) {
    return res.status(404).json({ message: "Participant not found" });
  }

  await deleteByParticipantInGroup(group._id, participantId);
  participant.deleteOne();
  await group.save();
  return res.json(group);
};

module.exports = { addParticipant, updateParticipant, removeParticipant };
