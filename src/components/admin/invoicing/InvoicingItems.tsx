// src/components/admin/invoicing/InvoicingItems.tsx
// @ts-nocheck
"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

const InvoicingItems = ({
  items,
  products,
  variants,

  productSearch,
  filteredProducts,
  openProductDropdown,
  setProductSearch,
  setFilteredProducts,
  setOpenProductDropdown,

  addProductLine,
  addManualLine,
  updateItem,
  removeItem,

  handleProductSearch,
  handleProductSelect,
  handleVariantSelect,

  getTotalProductStock,
  getVariantStock
}) => {
  // refs to inputs to compute dropdown position
  const inputRefs = useRef({});

  // coords for portal dropdown
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const [dropdownIndex, setDropdownIndex] = useState(null);

  // when openProductDropdown changes, compute coords
  useEffect(() => {
    const idx = openProductDropdown;
    setDropdownIndex(idx);

    if (idx === null || idx === undefined) {
      setDropdownStyle(null);
      return;
    }

    const el = inputRefs.current[idx];
    if (!el) {
      setDropdownStyle(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width
    });

    // reposition on window resize/scroll
    const reposition = () => {
      const r = el.getBoundingClientRect();
      setDropdownStyle({
        top: r.bottom + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width
      });
    };

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [openProductDropdown, items.length, filteredProducts]);

  // click-outside & Escape to close dropdown (safe, doesn't interfere with other inputs)
  useEffect(() => {
    const onDocMouse = (e) => {
      if (dropdownIndex === null || dropdownIndex === undefined) return;
      const inputEl = inputRefs.current[dropdownIndex];
      const portalEl = document.getElementById("invoicing-product-portal");
      if (inputEl && (inputEl === e.target || inputEl.contains(e.target))) return;
      if (portalEl && (portalEl === e.target || portalEl.contains(e.target))) return;
      // click outside both input and portal -> close
      setOpenProductDropdown(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpenProductDropdown(null);
    };
    document.addEventListener("mousedown", onDocMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [dropdownIndex, setOpenProductDropdown]);

  // render dropdown portal
  const renderDropdownPortal = (idx) => {
    if (dropdownStyle == null || dropdownIndex !== idx) return null;

    const list = filteredProducts[idx] ?? products ?? [];
    return createPortal(
      <div
        id="invoicing-product-portal"
        style={{
          position: "absolute",
          top: dropdownStyle.top + "px",
          left: dropdownStyle.left + "px",
          width: dropdownStyle.width + "px",
          zIndex: 9999,
          background: "white",
          border: "1px solid #e5e7eb",
          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          maxHeight: "240px",
          overflow: "auto",
          borderRadius: "6px"
        }}
        // allow clicks to pass normally to children; use stopPropagation to avoid parent handlers closing prematurely
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        {list.map((p) => (
          <div
            key={p.id}
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => {
              handleProductSelect(idx, p.id);
              setOpenProductDropdown(null);
            }}
          >
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-gray-500">HSN: {p.hsn_code ?? "-"}</div>
          </div>
        ))}

        {list.length === 0 && (
          <div className="px-3 py-2 text-gray-500 text-sm">No products found</div>
        )}
      </div>,
      document.body
    );
  };

  return (
    <div className="space-y-3">

      {/* Add buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button size="sm" onClick={addProductLine}>+ Product</Button>
          <Button size="sm" variant="outline" onClick={addManualLine}>+ Manual</Button>
        </div>
        <div className="text-sm text-gray-600">Rows: {items.length}</div>
      </div>

      <div className="border rounded overflow-hidden">

        {/* Header */}
        <div className="bg-gray-50 border-b px-3 py-2 flex items-center text-sm font-medium">
          <div className="w-8">#</div>
          <div className="flex-1">Product / Desc</div>
          <div className="w-48 text-right">Unit ₹</div>
          <div className="w-28 text-right">Qty</div>
          <div className="w-28 text-right">Disc ₹</div>
          <div className="w-32 text-right">Line Total</div>
          <div className="w-12"></div>
        </div>

        {/* ROWS */}
        {/* keep this container scrollable, but dropdown portal will escape document flow */}
        <div className="max-h-[420px] overflow-auto">

          {items.map((it, idx) => {
            const productVariants = variants.filter(v => v.product_id === it.product_id);
            const stockTotal = getTotalProductStock(it.product_id);
            const variantStock = getVariantStock(it.variant_id);

            return (
              <div key={idx} className="px-3 py-3 border-b flex items-start gap-3">

                {/* Row number */}
                <div className="w-8">{idx + 1}</div>

                {/* Product / Description */}
                <div className="flex-1">

                  {it.type === "product" ? (
                    <>
                      <div className="flex gap-2">

                        {/* Product Search */}
                        <div className="relative w-1/2">
                          <input
                            ref={(el) => (inputRefs.current[idx] = el)}
                            className="border rounded p-2 text-sm w-full"
                            placeholder="Search product..."
                            value={productSearch[idx] ?? ""}
                            onChange={(e) => {
                              handleProductSearch(idx, e.target.value);
                              setOpenProductDropdown(idx);
                            }}
                            onFocus={() => {
                              setFilteredProducts(prev => ({ ...prev, [idx]: products }));
                              setOpenProductDropdown(idx);
                            }}
                          />

                          {/* dropdown now in portal */}
                          {openProductDropdown === idx && renderDropdownPortal(idx)}
                        </div>

                        {/* Variant */}
                        <select
                          className="border rounded p-2 text-sm w-1/2"
                          value={it.variant_id ?? ""}
                          disabled={!it.product_id}
                          onChange={(e) => handleVariantSelect(idx, e.target.value)}
                        >
                          <option value="">Variant</option>
                          {productVariants.map(v => {
                            const st = Number(v.stock_quantity ?? 0);
                            return (
                              <option key={v.id} value={v.id} disabled={st <= 0}>
                                {v.color} {v.size} — {st > 0 ? st : "OUT"}
                              </option>
                            );
                          })}
                        </select>

                      </div>

                      {/* Description */}
                      <input
                        className="border rounded p-2 mt-2 w-full text-sm"
                        value={it.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                      />

                      {/* Stock + HSN */}
                      <div className="mt-2 flex items-center text-xs text-gray-500 gap-3">
                        {it.product_id && (
                          <div>Stock: <span className={stockTotal > 0 ? "text-green-600" : "text-red-600"}>{stockTotal}</span></div>
                        )}
                        {it.variant_id && (
                          <div>Variant: <span className={variantStock > 0 ? "text-green-600" : "text-red-600"}>{variantStock}</span></div>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                          <div className="text-xs">HSN:</div>
                          <input
                            className="border rounded p-1 text-xs"
                            value={it.hsn_code ?? ""}
                            onChange={(e) => updateItem(idx, "hsn_code", e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <input
                      className="border rounded p-3 w-full text-sm"
                      placeholder="Manual item description"
                      value={it.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                    />
                  )}

                </div>

                {/* Unit price */}
                <div className="w-48 text-right">
                  <div className="text-xs text-gray-500">Unit</div>
                  <input
                    type="number"
                    className="border rounded p-2 text-sm text-right w-full mt-1"
                    value={it.unit_price}
                    onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                  />
                </div>

                {/* Qty */}
                <div className="w-28 text-right">
                  <div className="text-xs text-gray-500">Qty</div>
                  <input
                    type="number"
                    className="border rounded p-2 text-sm text-right w-full mt-1"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  />
                </div>

                {/* Discount */}
                <div className="w-28 text-right">
                  <div className="text-xs text-gray-500">Disc ₹</div>
                  <input
                    type="number"
                    className="border rounded p-2 text-sm text-right w-full mt-1"
                    value={it.discount_amount ?? 0}
                    onChange={(e) => updateItem(idx, "discount_amount", e.target.value)}
                  />
                </div>

                {/* Total */}
                <div className="w-32 text-right">
                  <div className="text-xs text-gray-500">Line</div>
                  <div className="text-lg font-semibold mt-1">
                    ₹{Number(it.total).toFixed(2)}
                  </div>
                </div>

                {/* Delete */}
                <div className="w-12 text-center">
                  <button className="text-red-500" onClick={() => removeItem(idx)}>✕</button>
                </div>

              </div>
            );
          })}

          {/* Empty */}
          {items.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No items yet. Add a line.
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default InvoicingItems;
