const mongoose = require("mongoose");

const splitSchema = new mongoose.Schema(
  {
    participantId: { type: String, required: true },
    amount: { type: Number, required: true }
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    payerId: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        "food_drinks",
        "grocery",
        "travel",
        "household_bills",
        "shopping",
        "entertainment",
        "others"
      ]
    },
    notes: { type: String, default: "", trim: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    splitMode: { type: String, enum: ["equal", "custom", "percentage"], required: true },
    splits: { type: [splitSchema], required: true },
    settledBy: { type: [String], default: [] }
  },
  { timestamps: true }
);

expenseSchema.index({ group: 1, date: -1 });
expenseSchema.index({ group: 1, category: 1, date: -1 });
expenseSchema.index({ group: 1, payerId: 1, date: -1 });
expenseSchema.index({ group: 1, "splits.participantId": 1, date: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
