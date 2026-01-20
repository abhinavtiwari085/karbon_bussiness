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

class MaxHeap {
  constructor() {
    this.items = [];
  }

  size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    this._bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this._bubbleDown(0);
    }
    return top;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].amount >= this.items[index].amount) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  _bubbleDown(index) {
    const length = this.items.length;
    while (true) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let largest = index;

      if (left < length && this.items[left].amount > this.items[largest].amount) {
        largest = left;
      }
      if (right < length && this.items[right].amount > this.items[largest].amount) {
        largest = right;
      }
      if (largest === index) break;
      [this.items[index], this.items[largest]] = [this.items[largest], this.items[index]];
      index = largest;
    }
  }
}

const buildSettlements = (balances) => {
  const debtors = new MaxHeap();
  const creditors = new MaxHeap();

  Object.values(balances).forEach((entry) => {
    if (entry.net < 0) {
      debtors.push({ id: entry.id, amount: roundTwo(Math.abs(entry.net)) });
    } else if (entry.net > 0) {
      creditors.push({ id: entry.id, amount: roundTwo(entry.net) });
    }
  });

  const settlements = [];

  while (debtors.size() > 0 && creditors.size() > 0) {
    const debtor = debtors.pop();
    const creditor = creditors.pop();
    const pay = roundTwo(Math.min(debtor.amount, creditor.amount));

    if (pay > 0) {
      settlements.push({
        from: debtor.id,
        to: creditor.id,
        amount: pay
      });
    }

    const debtorLeft = roundTwo(debtor.amount - pay);
    const creditorLeft = roundTwo(creditor.amount - pay);

    if (debtorLeft > 0) {
      debtors.push({ id: debtor.id, amount: debtorLeft });
    }
    if (creditorLeft > 0) {
      creditors.push({ id: creditor.id, amount: creditorLeft });
    }
  }

  return settlements;
};

module.exports = { buildParticipantMap, calculateBalances, buildSettlements };
