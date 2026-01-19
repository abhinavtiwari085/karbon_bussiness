const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, lowercase: true, trim: true },
    color: { type: String, default: "#ef4444" },
    avatarSeed: { type: String, required: true }
  },
  { _id: true }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    avatarSeed: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    participants: [participantSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", groupSchema);
