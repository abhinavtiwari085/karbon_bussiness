const User = require("../models/User");

const createUser = (data) => User.create(data);
const findByEmail = (email) => User.findOne({ email });
const findByUsername = (username) => User.findOne({ username });
const findById = (id) => User.findById(id);

module.exports = { createUser, findByEmail, findByUsername, findById };
