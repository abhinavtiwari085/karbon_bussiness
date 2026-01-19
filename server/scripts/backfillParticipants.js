const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Group = require("../models/Group");
const User = require("../models/User");

dotenv.config();

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is missing in .env");
  }
  await mongoose.connect(uri);

  const groups = await Group.find({});
  let updatedCount = 0;

  for (const group of groups) {
    let changed = false;
    for (const participant of group.participants) {
      if (!participant.userId && participant.username) {
        const user = await User.findOne({ username: participant.username.toLowerCase() });
        if (user) {
          participant.userId = user._id;
          participant.name = user.name;
          participant.avatarSeed = user.avatarSeed;
          participant.username = user.username;
          changed = true;
        }
      }
      if (!participant.username && participant.userId) {
        const user = await User.findById(participant.userId);
        if (user) {
          participant.username = user.username;
          participant.name = user.name;
          participant.avatarSeed = user.avatarSeed;
          changed = true;
        }
      }
    }
    if (changed) {
      await group.save();
      updatedCount += 1;
    }
  }

  console.log(`Updated groups: ${updatedCount}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
