const { roundTwo } = require("../utils/rounding");

const buildParticipantMap = ({ group, owner }) => {
  const participants = group.participants.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    color: p.color,
    avatarSeed: p.avatarSeed
  }));

  const primary = {
    id: "owner",
    name: owner.name,
    color: owner.avatarColor || "#2f6fed",
    avatarSeed: owner.avatarSeed
  };

  return [primary, ...participants];
};

const calculateBalances = ({ participants, expenses }) => {
  const balances = participants.reduce((acc, participant) => {
    acc[participant.id] = { ...participant, net: 0, paid: 0, owed: 0 };
    return acc;
  }, {});

  expenses.forEach((expense) => {
    const payer = balances[expense.payerId];
    if (payer) {
      payer.paid = roundTwo(payer.paid + expense.amount);
      payer.net = roundTwo(payer.net + expense.amount);
    }

    expense.splits.forEach((split) => {
      const settled = (expense.settledBy || []).includes(split.participantId);
      if (settled && payer) {
        payer.net = roundTwo(payer.net - split.amount);
        return;
      }
      const entry = balances[split.participantId];
      if (!entry) return;
      entry.owed = roundTwo(entry.owed + split.amount);
      entry.net = roundTwo(entry.net - split.amount);
    });
  });

  return balances;
};

const buildSettlements = (balances) => {
  const debtors = [];
  const creditors = [];

  Object.values(balances).forEach((entry) => {
    if (entry.net < 0) {
      debtors.push({ id: entry.id, amount: roundTwo(Math.abs(entry.net)) });
    } else if (entry.net > 0) {
      creditors.push({ id: entry.id, amount: roundTwo(entry.net) });
    }
  });

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      settlements.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: roundTwo(pay)
      });
    }
    debtors[i].amount = roundTwo(debtors[i].amount - pay);
    creditors[j].amount = roundTwo(creditors[j].amount - pay);

    if (debtors[i].amount <= 0) i += 1;
    if (creditors[j].amount <= 0) j += 1;
  }

  return settlements;
};

module.exports = { buildParticipantMap, calculateBalances, buildSettlements };
