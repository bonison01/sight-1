// src/components/admin/InvoicingTabs.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import Invoicing from "./Invoicing";

const STORAGE_KEY = "multi_invoice_tabs_v2";

const makeId = () => "inv_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

const InvoicingTabs: React.FC = () => {
  const [tabs, setTabs] = useState([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          setTabs(parsed.tabs);
          setActiveId(parsed.activeId || parsed.tabs[0].id);
          return;
        }
      }
    } catch (err) {
      console.error("Failed to load tabs", err);
    }
    // create one initial tab
    const id = makeId();
    const initial = [{ id, label: "New Invoice" }];
    setTabs(initial);
    setActiveId(id);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: initial, activeId: id }));
  }, []);

  const persist = (nextTabs, nextActive) => {
    setTabs(nextTabs);
    setActiveId(nextActive);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: nextTabs, activeId: nextActive }));
    } catch (err) { console.error("persist failed", err); }
  };

  const addNewInvoice = () => {
    const id = makeId();
    const next = [...tabs, { id, label: "New Invoice" }];
    persist(next, id);
  };

  const removeInvoice = (id) => {
    if (tabs.length === 1) return alert("At least 1 invoice must remain open.");
    const nextTabs = tabs.filter(t => t.id !== id);
    const nextActive = nextTabs[0].id;
    try { sessionStorage.removeItem(`invoice_data_${id}`); } catch (err) {}
    persist(nextTabs, nextActive);
  };

  const updateTabLabel = (id, label) => {
    const next = tabs.map(t => (t.id === id ? { ...t, label: label?.trim() || "New Invoice" } : t));
    persist(next, activeId);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-2 items-center">
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`px-3 py-2 rounded-t cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeId === t.id ? "bg-white border border-b-0 font-semibold" : "bg-gray-200"
            }`}
          >
            <span>{t.label}</span>
            <button
              title="Close tab"
              onClick={(e) => { e.stopPropagation(); removeInvoice(t.id); }}
              className="text-red-500 text-xs"
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={addNewInvoice}
          className="ml-2 px-3 py-2 bg-green-600 text-white rounded"
        >
          + New Invoice
        </button>
      </div>

      <div className="bg-white border rounded p-4">
        {activeId && (
          <Invoicing
            invoiceSessionId={activeId}
            onCustomerNameChange={(name) => updateTabLabel(activeId, name)}
          />
        )}
      </div>
    </div>
  );
};

export default InvoicingTabs;
