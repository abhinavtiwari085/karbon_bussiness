const { distributeRemainder, roundTwo } = require("../utils/rounding");

const buildEqualSplits = ({ participantIds, amount }) => {
  const base = amount / participantIds.length;
  const splitAmounts = distributeRemainder(
    participantIds.map(() => base),
    amount
  );
  return participantIds.map((id, idx) => ({ participantId: id, amount: splitAmounts[idx] }));
};

const buildCustomSplits = ({ participantIds, amounts, amount }) => {
  if (!amounts || amounts.length !== participantIds.length) {
    throw new Error("Custom amounts must match participants length");
  }
  const rounded = distributeRemainder(amounts, amount);
  return participantIds.map((id, idx) => ({ participantId: id, amount: rounded[idx] }));
};

const buildPercentageSplits = ({ participantIds, percentages, amount }) => {
  if (!percentages || percentages.length !== participantIds.length) {
    throw new Error("Percentages must match participants length");
  }
  const raw = percentages.map((p) => (amount * p) / 100);
  const rounded = distributeRemainder(raw, amount);
  return participantIds.map((id, idx) => ({ participantId: id, amount: rounded[idx] }));
};

const calculateSplits = ({ splitMode, participantIds, amount, amounts, percentages }) => {
  if (!participantIds || participantIds.length === 0) {
    throw new Error("Participants are required");
  }
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  if (splitMode === "equal") {
    return buildEqualSplits({ participantIds, amount });
  }
  if (splitMode === "custom") {
    return buildCustomSplits({ participantIds, amounts, amount });
  }
  if (splitMode === "percentage") {
    return buildPercentageSplits({ participantIds, percentages, amount });
  }
  throw new Error("Invalid split mode");
};

const sumSplits = (splits) => roundTwo(splits.reduce((sum, split) => sum + split.amount, 0));

module.exports = { calculateSplits, sumSplits };
