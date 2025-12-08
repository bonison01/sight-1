// src/components/admin/invoiceview/ViewInvoiceModal.tsx
"use client";

import React, { useEffect } from "react";
import InvoiceInvoiceSection from "../InvoiceInvoiceSection";

type ViewInvoiceModalProps = {
  visible: boolean;
  invoice: any | null;
  items: any[];
  branding: any;
  company: any;

  onDownloadPdf: (inv: any) => void;
  onClose: () => void;
};

export default function ViewInvoiceModal({
  visible,
  invoice,
  items,
  branding,
  company,
  onDownloadPdf,
  onClose,
}: ViewInvoiceModalProps) {
  if (!visible || !invoice) return null;

  // Close modal on ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center overflow-auto"
      onClick={onClose} // ← click outside closes modal
    >
      <div
        className="invoice-view-modal bg-white shadow-lg w-full max-w-4xl mt-6 p-6 rounded relative"
        onClick={(e) => e.stopPropagation()} // ← prevent close when clicking inside
      >
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded"
        >
          Close
        </button>

        <InvoiceInvoiceSection
          invoice={invoice}
          items={items}
          branding={branding}
          company={company}
          onDownloadPdf={onDownloadPdf}
          onClose={onClose}
        />
      </div>

      {/* Styles preserved from original */}
      <style>{`
        .invoice-view-modal {
          background: #ffffff;
          width: 100%;
          min-height: 100vh;
          margin: 0;
          padding: 32px;
          box-shadow: none !important;
          overflow: auto;
        }

        .no-print { display: inline-block; }

        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .invoice-view-modal { padding: 24px; }
        }
      `}</style>
    </div>
  );
}
