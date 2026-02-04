import puppeteer from 'puppeteer';

export type QuotationItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  details?: string;
};

export const renderQuotationPdf = async (args: {
  rfqPublicId: string;
  requestingCompanyName: string;
  vendorName: string;
  vendorContact?: { name?: string; email?: string; phone?: string };
  currency?: string;
  items: QuotationItem[];
  notes?: string;
  logoDataUrl?: string;
  status?: 'RECEIVED' | 'REVISED' | 'APPROVED' | 'REJECTED' | 'CUSTOMER_ACCEPTED';
}): Promise<Buffer> => {
  const {
    rfqPublicId,
    requestingCompanyName,
    vendorName,
    vendorContact,
    currency = 'USD',
    items,
    notes,
    logoDataUrl,
    status,
  } = args;

  const escapeHtml = (value: string | undefined | null): string => {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const formatCurrency = (value: number): string => `${currency} ${value.toFixed(2)}`;
  const safeRequestingCompany = escapeHtml(requestingCompanyName);
  const safeVendorName = escapeHtml(vendorName);
  const safeNotes = escapeHtml(notes);
  const contactLines = [vendorContact?.name, vendorContact?.email, vendorContact?.phone]
    .filter(Boolean)
    .map((line) => escapeHtml(line || ''));

  const subtotal = items.reduce((sum, item) => sum + (item.lineTotal ?? item.quantity * item.unitPrice), 0);

  const rows = items
    .map(
      (item) => `
        <tr>
          <td>
            <div>${escapeHtml(item.name)}</div>
            ${item.details ? `<div class="details">${escapeHtml(item.details)}</div>` : ''}
          </td>
          <td class="num">${item.quantity}</td>
          <td class="num">${formatCurrency(item.unitPrice)}</td>
          <td class="num">${formatCurrency(item.lineTotal ?? item.quantity * item.unitPrice)}</td>
        </tr>
      `,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #222; }
      .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
      .logo { max-height: 48px; max-width: 160px; object-fit: contain; }
      .vendor { font-size: 20px; font-weight: 600; }
      .meta { margin-bottom: 16px; }
      .meta div { margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
      th { background: #f6f6f6; text-align: left; }
      td.num { text-align: right; }
      .details { color: #555; font-size: 12px; margin-top: 4px; }
      .totals { margin-top: 12px; width: 100%; }
      .totals td { border: none; padding: 4px 0; font-size: 14px; }
      .notes { margin-top: 16px; font-size: 13px; white-space: pre-line; }
      .footer { margin-top: 32px; font-size: 11px; color: #666; text-align: right; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="vendor">Quotation for ${safeRequestingCompany}</div>
        <div style="font-size:12px;color:#555;">${safeVendorName}</div>
      </div>
      ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="logo" />` : ''}
    </div>

    <div class="meta">
      ${contactLines.map((line) => `<div>${line}</div>`).join('')}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:55%;">Item</th>
          <th style="width:10%;" class="num">Qty</th>
          <th style="width:15%;" class="num">Unit Price</th>
          <th style="width:20%;" class="num">Line Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="totals">
      <tr>
        <td style="text-align:right; font-weight:600;">Total:</td>
        <td style="width:120px; text-align:right; font-weight:600;">${formatCurrency(subtotal)}</td>
      </tr>
    </table>

    ${safeNotes ? `<div class="notes"><strong>Notes:</strong><br/>${safeNotes}</div>` : ''}

    ${status === 'APPROVED' ? '<div style="margin-top: 20px; font-size: 12px; color: #555;">Approved by TKMR</div>' : ''}
    <div class="footer">Generated for ${escapeHtml(rfqPublicId)}</div>
  </body>
</html>`;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfData = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', right: '12mm', bottom: '16mm', left: '12mm' } });
    return Buffer.isBuffer(pdfData) ? pdfData : Buffer.from(pdfData);
  } finally {
    await page.close();
    await browser.close();
  }
};
