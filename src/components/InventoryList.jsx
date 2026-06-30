export default function InventoryList({ items, onDelete }) {
  if (items.length === 0) {
    return <p className="empty-state">No items yet. Add one to get started.</p>;
  }

  return (
    <table className="inventory-table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Name</th>
          <th>Quantity</th>
          <th>Price</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.sku || "—"}</td>
            <td>{item.name}</td>
            <td>{item.quantity}</td>
            <td>{item.price ? `$${Number(item.price).toFixed(2)}` : "—"}</td>
            <td>
              <button className="link-btn" onClick={() => onDelete(item.id)}>
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
