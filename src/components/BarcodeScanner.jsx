import { useEffect, useRef, useState } from "react";
import { useToast } from "../context/ToastContext.jsx";

// HID barcode scanners type a code very fast then send Enter. Single-char keys
// are buffered; a 150ms pause without a key resets the buffer so normal human
// typing elsewhere on the page never gets mistaken for a scan.
export default function BarcodeScanner({ setField }) {
  const [scanning, setScanning] = useState(false);
  const [bufDisplay, setBufDisplay] = useState("");
  const bufRef = useRef("");
  const timerRef = useRef(null);
  const { notify } = useToast();

  useEffect(() => {
    if (!scanning) return;

    const handler = (e) => {
      if (e.key === "Enter") {
        // Prevent the default action so Enter doesn't also click whatever
        // element (e.g. the Activate/Cancel button) currently has focus.
        e.preventDefault();
        const code = bufRef.current.trim();
        if (code) {
          setField("sku", code);
          notify(`Scanned: ${code}`, "info");
        }
        bufRef.current = "";
        setBufDisplay("");
        setScanning(false);
        return;
      }
      if (e.key.length === 1) {
        bufRef.current += e.key;
        setBufDisplay(bufRef.current);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufRef.current = "";
          setBufDisplay("");
        }, 150);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearTimeout(timerRef.current);
    };
  }, [scanning]);

  const toggleScanning = (e) => {
    if (!scanning) {
      bufRef.current = "";
      setBufDisplay("");
      e.currentTarget.blur();
    }
    setScanning((prev) => !prev);
  };

  return (
    <div className={`scanner-panel${scanning ? " scanner-panel-active" : ""}`}>
      <div className="scanner-header">
        <span className="scanner-title">{scanning ? "Awaiting scan…" : "Barcode Scanner"}</span>
        <button type="button" className={`scanner-btn${scanning ? " scanner-btn-cancel" : ""}`} onClick={toggleScanning}>
          {scanning ? "Cancel" : "Activate"}
        </button>
      </div>
      {scanning && (
        <div className="scanner-buffer">
          {bufDisplay}
          <span className="scanner-cursor" />
        </div>
      )}
      <p className="scanner-helper">
        {scanning ? "Scan now — input captured automatically." : "Click Activate, then scan to auto-fill SKU."}
      </p>
    </div>
  );
}
