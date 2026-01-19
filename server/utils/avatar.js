const buildSeed = (input) => {
  const base = input || "splitmint";
  return `${base}-${Date.now().toString(36)}-${Math.floor(Math.random() * 9999)}`;
};

module.exports = { buildSeed };
