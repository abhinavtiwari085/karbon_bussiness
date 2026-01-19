const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    avatarSeed: { type: String, required: true },
    avatarColor: { type: String, default: "#2f6fed" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
