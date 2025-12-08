// src/components/admin/invoiceview/StatusReasonModal.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StatusReasonModalProps = {
  visible: boolean;
  invoice: any | null;

  reasonText: string;
  setReasonText: (v: string) => void;

  onCancel: () => void;
  onConfirm: () => void;
};

export default function StatusReasonModal({
  visible,
  invoice,

  reasonText,
  setReasonText,

  onCancel,
  onConfirm,
}: StatusReasonModalProps) {
  if (!visible || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <Card className="w-full max-w-md border shadow-xl bg-white">
        <CardHeader>
          <CardTitle>Reason required</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="mb-2 text-sm">
            Changing status of a fully/partially paid invoice to a lesser paid state
            requires a valid reason.  
            <br />
            Please provide the reason below.
          </div>

          <textarea
            className="border p-2 w-full mb-4 rounded"
            rows={4}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Enter reason..."
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>Confirm</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
