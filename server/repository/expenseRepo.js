const Expense = require("../models/Expense");

const createExpense = (data) => Expense.create(data);
const findByGroup = (groupId, query = {}) =>
  Expense.find({ group: groupId, ...query }).sort({ date: -1 });
const findById = (id) => Expense.findById(id);
const updateById = (id, data) => Expense.findByIdAndUpdate(id, data, { new: true });
const deleteById = (id) => Expense.findByIdAndDelete(id);
const deleteByGroup = (groupId) => Expense.deleteMany({ group: groupId });
const deleteByParticipantInGroup = (groupId, participantId) =>
  Expense.deleteMany({
    group: groupId,
    $or: [
      { payerId: participantId },
      { splits: { $elemMatch: { participantId } } }
    ]
  });

module.exports = {
  createExpense,
  findByGroup,
  findById,
  updateById,
  deleteById,
  deleteByGroup,
  deleteByParticipantInGroup
};
