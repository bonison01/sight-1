// src/components/admin/invoiceview/ReasonModal.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReasonModalProps = {
  visible: boolean;
  reasonText: string;
  onChangeReason: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ReasonModal({
  visible,
  reasonText,
  onChangeReason,
  onCancel,
  onConfirm,
}: ReasonModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <Card className="w-full max-w-md border shadow-xl bg-white">
        <CardHeader>
          <CardTitle>Reason Required</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="mb-2 text-sm">
            Changing status of a fully/partially paid invoice to a lesser paid
            state requires a reason. Please provide the reason to continue.
          </div>

          <textarea
            className="border p-2 w-full mb-4 rounded"
            rows={4}
            value={reasonText}
            onChange={(e) => onChangeReason(e.target.value)}
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
