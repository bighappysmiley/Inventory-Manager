// Normalizes items from the old inventory system's JSON export.
export function normalizeLegacyItem(item) {
  const normalized = { ...item };
  if (normalized.barcode && !normalized.sku) {
    normalized.sku = normalized.barcode;
  }
  delete normalized.barcode;
  return normalized;
}

export function parseLegacyInventory(json) {
  const raw = JSON.parse(json);
  const items = Array.isArray(raw) ? raw : raw.items;
  if (!Array.isArray(items)) {
    throw new Error("Expected a JSON array of items (or an object with an \"items\" array).");
  }
  return items.map(normalizeLegacyItem);
}
