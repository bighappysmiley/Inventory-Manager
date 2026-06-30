import { useRef } from "react";
import { parseLegacyInventory } from "../utils/importLegacy.js";
import { useToast } from "../context/ToastContext.jsx";

export default function ImportLegacy({ onImport }) {
  const fileInputRef = useRef(null);
  const { notify } = useToast();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const items = parseLegacyInventory(text).map((item) => ({
        id: crypto.randomUUID(),
        sku: item.sku || "",
        name: item.name || "Unnamed item",
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
      }));
      onImport(items);
      notify(`Imported ${items.length} item${items.length === 1 ? "" : "s"}`, "success");
    } catch (err) {
      notify(`Import failed: ${err.message}`, "error");
    }
  };

  return (
    <div className="import-legacy">
      <button type="button" className="secondary-btn" onClick={() => fileInputRef.current?.click()}>
        Import Legacy JSON
      </button>
      <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFile} />
    </div>
  );
}
