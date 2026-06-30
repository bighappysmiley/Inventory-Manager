import { useEffect, useState } from "react";
import AddItem from "./components/AddItem.jsx";
import InventoryList from "./components/InventoryList.jsx";
import ImportLegacy from "./components/ImportLegacy.jsx";
import { loadItems, saveItems } from "./utils/storage.js";

export default function App() {
  const [items, setItems] = useState(loadItems);
  const [view, setView] = useState("list");

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const handleAdd = (item) => {
    setItems((prev) => [...prev, item]);
    setView("list");
  };

  const handleDelete = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleImport = (imported) => {
    setItems((prev) => [...prev, ...imported]);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Inventory Manager</h1>
        <nav>
          <button className={view === "list" ? "tab tab-active" : "tab"} onClick={() => setView("list")}>
            Inventory
          </button>
          <button className={view === "add" ? "tab tab-active" : "tab"} onClick={() => setView("add")}>
            Add Item
          </button>
        </nav>
      </header>

      <main>
        {view === "list" ? (
          <>
            <div className="list-toolbar">
              <ImportLegacy onImport={handleImport} />
            </div>
            <InventoryList items={items} onDelete={handleDelete} />
          </>
        ) : (
          <AddItem onAdd={handleAdd} />
        )}
      </main>
    </div>
  );
}
