const Group = require("../models/Group");

const createGroup = (data) => Group.create(data);
const findById = (id) => Group.findById(id);
const findByOwner = (owner) => Group.find({ owner });
const findByParticipantUser = (userId, username) =>
  Group.find({
    $or: [
      { "participants.userId": userId },
      ...(username ? [{ "participants.username": username }] : [])
    ]
  });
const deleteById = (id) => Group.findByIdAndDelete(id);

module.exports = { createGroup, findById, findByOwner, findByParticipantUser, deleteById };
