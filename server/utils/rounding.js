const roundTwo = (value) => Math.round(value * 100) / 100;

const distributeRemainder = (amounts, total) => {
  const rounded = amounts.map((value) => roundTwo(value));
  const roundedTotal = roundTwo(rounded.reduce((sum, value) => sum + value, 0));
  let diff = roundTwo(total - roundedTotal);
  if (Math.abs(diff) < 0.01) {
    return rounded;
  }
  const lastIndex = rounded.length - 1;
  rounded[lastIndex] = roundTwo(rounded[lastIndex] + diff);
  return rounded;
};

module.exports = { roundTwo, distributeRemainder };
