// src/components/admin/InvoiceArchiveTable.tsx
import { Button } from "@/components/ui/button";

export default function InvoiceArchiveTable({
  invoices,
  onDownloadPdf,
  onOpenPayment,
  onOpenView,
  onStatusChange,
}) {
  return (
    <table className="w-full text-xs md:text-sm">
      <thead className="bg-gray-100 border-b text-left">
        <tr>
          <th className="p-2">Invoice</th>
          <th className="p-2">Customer</th>
          <th className="p-2">Total</th>
          <th className="p-2">Paid</th>
          <th className="p-2">Remaining</th>
          <th className="p-2">Status</th>
          <th className="p-2">Date</th>
          <th className="p-2">Actions</th>
        </tr>
      </thead>

      <tbody>
        {invoices.map((inv) => {
          const total = Number(inv.grand_total ?? inv.total_amount ?? 0);
          const paid = Number(inv.paid_amount ?? 0);
          const remaining = Math.max(0, total - paid);

          return (
            <tr key={inv.id} className="border-b">
              <td className="p-2">{inv.invoice_number}</td>
              <td className="p-2">{inv.customer_name}</td>
              <td className="p-2">₹{total.toFixed(2)}</td>
              <td className="p-2">₹{paid.toFixed(2)}</td>
              <td className="p-2">₹{remaining.toFixed(2)}</td>

              <td className="p-2">
                <select
                  className="border p-1 rounded text-sm"
                  value={inv.status}
                  onChange={(e) => onStatusChange(inv, e.target.value)}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </td>

              <td className="p-2">
                {inv.created_at?.substring(0, 10)}
              </td>

              <td className="p-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onDownloadPdf(inv)}>PDF</Button>
                <Button size="sm" variant="outline" onClick={() => onOpenPayment(inv)}>Pay</Button>
                <Button size="sm" onClick={() => onOpenView(inv)}>View</Button>
              </td>
            </tr>
          );
        })}

        {invoices.length === 0 && (
          <tr>
            <td className="p-4 text-center text-gray-500" colSpan={8}>
              No invoices found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
