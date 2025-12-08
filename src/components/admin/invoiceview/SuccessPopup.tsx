// src/components/admin/invoiceview/SuccessPopup.tsx
"use client";

import React from "react";

type SuccessPopupProps = {
  message: string | null;
};

export default function SuccessPopup({ message }: SuccessPopupProps) {
  if (!message) return null;

  return (
    <div className="success-popup">
      <div className="tick">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div>{message}</div>

      <style>{`
        .success-popup {
          position: fixed;
          right: 24px;
          top: 24px;
          z-index: 9999;
          background: #0f172a;
          color: #fff;
          border-radius: 10px;
          padding: 16px 18px;
          display: flex;
          gap: 12px;
          align-items: center;
          box-shadow: 0 10px 30px rgba(2,6,23,0.4);
          animation: fadein .3s ease;
        }

        @keyframes fadein {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .tick {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pop .28s ease;
        }

        .tick svg {
          width: 16px;
          height: 16px;
          color: white;
        }

        @keyframes pop {
          0% { transform: scale(.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
