import { useState } from "react";
import BarcodeScanner from "./BarcodeScanner.jsx";
import { useToast } from "../context/ToastContext.jsx";

const emptyForm = { sku: "", name: "", quantity: "", price: "" };

export default function AddItem({ onAdd }) {
  const [form, setForm] = useState(emptyForm);
  const { notify } = useToast();

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleChange = (e) => {
    setField(e.target.name, e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify("Item name is required", "error");
      return;
    }
    onAdd({
      id: crypto.randomUUID(),
      sku: form.sku.trim(),
      name: form.name.trim(),
      quantity: form.quantity ? Number(form.quantity) : 0,
      price: form.price ? Number(form.price) : 0,
    });
    notify(`Added ${form.name.trim()}`, "success");
    setForm(emptyForm);
  };

  return (
    <div className="add-item">
      <h2>Add Item</h2>
      <BarcodeScanner setField={setField} />
      <form onSubmit={handleSubmit}>
        <label>
          SKU
          <input name="sku" value={form.sku} onChange={handleChange} placeholder="Scan or type SKU" />
        </label>
        <label>
          Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Quantity
          <input name="quantity" type="number" min="0" value={form.quantity} onChange={handleChange} />
        </label>
        <label>
          Price
          <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} />
        </label>
        <button type="submit" className="primary-btn">
          Add Item
        </button>
      </form>
    </div>
  );
}
