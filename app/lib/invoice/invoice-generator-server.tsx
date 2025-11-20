// app/lib/invoice/invoice-generator-server.tsx
// Server-side invoice PDF generation (for email attachments)

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { InvoiceData } from '../types/invoice';
import { InvoicePDF } from '@/app/components/invoice/InvoicePDF';

/**
 * Generate invoice PDF as a Buffer (for server-side use, e.g., email attachments)
 * @param invoiceData Invoice data to generate PDF from
 * @returns Promise that resolves to a Buffer containing the PDF
 */
export async function generateInvoicePDFBuffer(
  invoiceData: InvoiceData
): Promise<Buffer> {
  try {
    // Generate PDF blob using pdf().toBlob()
    const pdfDoc = pdf(<InvoicePDF data={invoiceData} />);
    const blob = await pdfDoc.toBlob();

    // Convert Blob to Buffer for Node.js
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return buffer;
  } catch (error) {
    console.error('Error generating invoice PDF buffer:', error);
    throw new Error('Failed to generate invoice PDF buffer');
  }
}

/**
 * Generate invoice PDF as base64 string (for email attachments)
 * @param invoiceData Invoice data to generate PDF from
 * @returns Promise that resolves to base64 string
 */
export async function generateInvoicePDFBase64(
  invoiceData: InvoiceData
): Promise<string> {
  try {
    const buffer = await generateInvoicePDFBuffer(invoiceData);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error converting invoice PDF to base64:', error);
    throw new Error('Failed to convert invoice PDF to base64');
  }
}
