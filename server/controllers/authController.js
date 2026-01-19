const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findByEmail, findByUsername } = require("../repository/userRepo");
const { buildSeed } = require("../utils/avatar");

const register = async (req, res) => {
  const { name, username, email, password, avatarColor } = req.body;
  if (!name || !username || !email || !password) {
    return res.status(400).json({ message: "Name, username, email, password are required" });
  }
  const existing = await findByEmail(email);
  if (existing) {
    return res.status(400).json({ message: "Email already registered" });
  }
  const existingUsername = await findByUsername(username.toLowerCase());
  if (existingUsername) {
    return res.status(400).json({ message: "Username already taken" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const avatarSeed = buildSeed(name);
  const user = await createUser({
    name,
    username: username.toLowerCase(),
    email,
    passwordHash,
    avatarSeed,
    avatarColor
  });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });

  return res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatarSeed: user.avatarSeed,
      avatarColor: user.avatarColor
    }
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const user = await findByEmail(email);
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });

  return res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatarSeed: user.avatarSeed,
      avatarColor: user.avatarColor
    }
  });
};

module.exports = { register, login };
