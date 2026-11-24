// server/utils/deleteGuard.js
// Blocks deleting a master record (category, brand, unit, item) while other
// records still point at it. Several of these foreign keys are ON DELETE
// CASCADE in the database, so a plain delete would silently wipe the items,
// purchases, requisitions etc. that use it.

// refs: [{ model, where, label }] - label is the plural noun, e.g. 'items'
async function findUsage(refs) {
  const used = [];
  for (const { model, where, label } of refs) {
    const count = await model.count({ where });
    if (count > 0) used.push({ label, count });
  }
  return used;
}

function usageMessage(noun, used) {
  const parts = used.map(({ label, count }) => `${count} ${count === 1 ? label.replace(/s$/, '') : label}`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  const what = used.length === 1 && used[0].label === 'items' ? 'those items' : 'those records';
  return `This ${noun} is used by ${list}. Move or delete ${what} first.`;
}

// Express helper: responds 400 and returns true when the record is in use.
async function blockIfUsed(res, noun, refs) {
  const used = await findUsage(refs);
  if (!used.length) return false;
  res.status(400).json({ message: usageMessage(noun, used), usage: used });
  return true;
}

module.exports = { findUsage, usageMessage, blockIfUsed };