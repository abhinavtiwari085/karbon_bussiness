const express = require("express");
const {
  listGroups,
  getGroup,
  createNewGroup,
  updateGroup,
  removeGroup,
  getGroupSummary,
  exportGroupCsv,
  leaveGroup
} = require("../controllers/groupController");
const { addParticipant, updateParticipant, removeParticipant } = require("../controllers/participantController");
const {
  listExpenses,
  addExpense,
  updateExpense,
  removeExpense,
  settleExpense
} = require("../controllers/expenseController");

const router = express.Router();

router.get("/", listGroups);
router.post("/", createNewGroup);
router.get("/:groupId", getGroup);
router.put("/:groupId", updateGroup);
router.delete("/:groupId", removeGroup);
router.get("/:groupId/summary", getGroupSummary);
router.get("/:groupId/export", exportGroupCsv);
router.delete("/:groupId/leave", leaveGroup);

router.post("/:groupId/participants", addParticipant);
router.put("/:groupId/participants/:participantId", updateParticipant);
router.delete("/:groupId/participants/:participantId", removeParticipant);

router.get("/:groupId/expenses", listExpenses);
router.post("/:groupId/expenses", addExpense);
router.put("/:groupId/expenses/:expenseId", updateExpense);
router.delete("/:groupId/expenses/:expenseId", removeExpense);
router.put("/:groupId/expenses/:expenseId/settle", settleExpense);

module.exports = router;
