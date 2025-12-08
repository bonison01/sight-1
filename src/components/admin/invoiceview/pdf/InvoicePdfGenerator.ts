// @ts-nocheck
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode-generator";

// fonts
import { InterRegular } from "./fonts/InterRegular";
import { InterBold } from "./fonts/InterBold";

export async function generateInvoicePdf({ invoice, items, company, branding }) {
  if (!invoice) return;

  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Load fonts
  doc.addFileToVFS("Inter-Regular.ttf", InterRegular);
  doc.addFont("Inter-Regular.ttf", "Inter", "normal");

  doc.addFileToVFS("Inter-Bold.ttf", InterBold);
  doc.addFont("Inter-Bold.ttf", "Inter", "bold");

  doc.setFont("Inter", "normal");

  let y = margin;

  // ============================================================
  // HEADER
  // ============================================================
  doc.setFont("Inter", "bold");
  doc.setFontSize(18);
  doc.text(company?.name || "Company Name", margin, y);

  doc.setFont("Inter", "normal");
  doc.setFontSize(10);
  y += 16;

  if (company?.address) {
    const addr = doc.splitTextToSize(company.address, pageWidth - margin * 2);
    doc.text(addr, margin, y);
    y += addr.length * 12;
  }

  if (company?.phone) {
    doc.text(`Phone: ${company.phone}`, margin, y);
    y += 12;
  }

  // Right Side
  const rightX = pageWidth - margin - 220;
  const invoiceDate = (invoice.created_at || "").substring(0, 10);

  doc.setFont("Inter", "bold");
  doc.setFontSize(16);
  doc.text("Invoice", rightX, margin);

  doc.setFont("Inter", "normal");
  doc.setFontSize(11);
  doc.text(`Invoice #: ${invoice.invoice_number}`, rightX, margin + 20);
  doc.text(`Date: ${invoiceDate}`, rightX, margin + 34);

  if (invoice.reference_by) {
    doc.text(`Reference: ${invoice.reference_by}`, rightX, margin + 48);
  }

  // ============================================================
  // BILL TO
  // ============================================================
  y += 20;
  doc.setFont("Inter", "bold");
  doc.setFontSize(12);
  doc.text("Bill To:", margin, y);

  y += 14;
  doc.setFont("Inter", "normal");
  doc.text(invoice.customer_name || "-", margin, y);
  y += 12;

  if (invoice.customer_phone) {
    doc.text(`Phone: ${invoice.customer_phone}`, margin, y);
    y += 12;
  }

  if (invoice.customer_address) {
    const c = doc.splitTextToSize(invoice.customer_address, 260);
    doc.text(c, margin, y);
    y += c.length * 12;
  }

  y += 20;

  // ============================================================
  // ITEM TABLE
  // ============================================================
  const tableBody = items?.map((it, idx) => [
    String(idx + 1),
    it.description || "",
    it.hsn_code || "-",
    String(it.quantity || 0),
    formatCurrency(it.unit_price),
    it.discount_percent ? `${it.discount_percent}%` : "-",
    formatCurrency(it.discount_amount),
    formatCurrency(it.total),
  ]) ?? [];

  autoTable(doc, {
    startY: y,
    head: [
      [
        "#",
        "Description",
        "HSN",
        "Qty",
        "Unit",
        "Disc %",
        "Disc ₹",
        "Total",
      ],
    ],
    body: tableBody,
    theme: "grid",
    styles: { font: "Inter", fontSize: 10, cellPadding: 4 },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 25 },
      1: { cellWidth: 170 },
      2: { halign: "center", cellWidth: 50 },
      3: { halign: "center", cellWidth: 40 },
      4: { halign: "right", cellWidth: 55 },
      5: { halign: "center", cellWidth: 55 },
      6: { halign: "right", cellWidth: 60 },
      7: { halign: "right", cellWidth: 70 },
    },
  });

  const tableEndY = doc.lastAutoTable.finalY + 20;

  // ============================================================
  // TOTALS
  // ============================================================
  let totalsX = pageWidth - margin - 200;
  let tY = tableEndY;

  const subtotal = computeSubtotal(items);
  const discountTotal = computeTotalDiscount(items);
  const taxable = subtotal - discountTotal;

  const cgst = invoice.cgst || 0;
  const sgst = invoice.sgst || 0;
  const igst = invoice.igst || 0;

  const grandTotal =
    invoice.grand_total ?? taxable + cgst + sgst + igst;

  const totals = [
    ["Subtotal:", subtotal],
    ["Discount:", discountTotal],
    ["Taxable:", taxable],
    ...(cgst ? [["CGST:", cgst]] : []),
    ...(sgst ? [["SGST:", sgst]] : []),
    ...(igst ? [["IGST:", igst]] : []),
  ];

  doc.setFontSize(11);
  doc.setFont("Inter", "normal");

  totals.forEach(([label, val]) => {
    doc.text(label, totalsX, tY);
    doc.text(formatCurrency(val), totalsX + 120, tY, { align: "right" });
    tY += 16;
  });

  doc.setFont("Inter", "bold");
  doc.text("Grand Total:", totalsX, tY + 4);
  doc.text(formatCurrency(grandTotal), totalsX + 120, tY + 4, {
    align: "right",
  });

  tY += 40;

  // ============================================================
  // UPI QR CODE (Auto-fill Amount)
  // ============================================================
  const qrDataUrl = generateUpiQr(
    "bonison12@icici",
    "MS Bonison Enterprises",
    Number(grandTotal).toFixed(2)
  );

  doc.setFont("Inter", "bold");
  doc.setFontSize(12);
  doc.text("Scan to Pay", margin, tY);

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, "PNG", margin, tY + 10, 130, 130);
  }

  // ============================================================
  // PAYMENT DETAILS
  // ============================================================
  let payY = tY + 10;

  doc.setFont("Inter", "bold");
  doc.text("Payment Details:", margin + 180, payY);
  payY += 18;

  doc.setFont("Inter", "normal");
  doc.text(`UPI: bonison12@icici`, margin + 180, payY);
  payY += 14;

  if (branding?.bank_account_number) {
    doc.text(`A/C No: ${branding.bank_account_number}`, margin + 180, payY);
    payY += 14;
  }

  if (branding?.bank_ifsc) {
    doc.text(`IFSC: ${branding.bank_ifsc}`, margin + 180, payY);
    payY += 14;
  }

  // ============================================================
  // SIGNATURE + SEAL
  // ============================================================
  const sigY = payY + 30;

  doc.setFont("Inter", "bold");
  doc.text("Authorized Signature", margin + 180, sigY);

  if (branding?.signature_url) {
    const sig = await loadImage(branding.signature_url);
    if (sig) doc.addImage(sig, "PNG", margin + 180, sigY - 40, 120, 50);
  }

  if (branding?.seal_url) {
    const seal = await loadImage(branding.seal_url);
    if (seal) doc.addImage(seal, "PNG", margin + 320, sigY - 45, 70, 70);
  }

  // ============================================================
  // FOOTER
  // ============================================================
  doc.setFont("Inter", "italic");
  doc.setFontSize(10);
  doc.text(
    branding?.payment_instructions ??
      "Thank you for choosing our services.",
    margin,
    sigY + 80
  );

  doc.save(`${invoice.invoice_number}.pdf`);
}

// ============================================================
// HELPERS
// ============================================================
function formatCurrency(num) {
  return "₹" + Number(num || 0).toFixed(2);
}

function computeSubtotal(items) {
  return items?.reduce(
    (sum, it) =>
      sum + Number(it.unit_price || 0) * Number(it.quantity || 0),
    0
  );
}

function computeTotalDiscount(items) {
  return items?.reduce(
    (sum, it) =>
      sum + Number(it.discount_amount || 0) * Number(it.quantity || 1),
    0
  );
}

// ============================================================
// QR GENERATOR (Browser Safe)
// ============================================================
function generateUpiQr(upiId, name, amount) {
  const qr = QRCode(0, "L");

  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    name
  )}&am=${amount}&cu=INR`;

  qr.addData(upiLink);
  qr.make();

  return qr.createDataURL(6);
}

async function loadImage(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
