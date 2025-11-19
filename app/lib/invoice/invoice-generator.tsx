// app/lib/invoice/invoice-generator.tsx
'use client';

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { InvoiceData, CompanyInfo } from '../types/invoice';
import { InvoicePDF } from '@/app/components/invoice/InvoicePDF';

/**
 * Get company information from environment variables
 */
export function getCompanyInfo(): CompanyInfo {
  return {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Dekop Furniture',
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'вул. Прикладна, 123',
    city: process.env.NEXT_PUBLIC_COMPANY_CITY || 'Київ',
    postalCode: process.env.NEXT_PUBLIC_COMPANY_POSTAL_CODE || '01001',
    phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '+380 XX XXX XXXX',
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'info@dekop.com.ua',
    website: process.env.NEXT_PUBLIC_COMPANY_WEBSITE || 'https://dekop.com.ua',
    taxId: process.env.NEXT_PUBLIC_COMPANY_TAX_ID,
    vatNumber: process.env.NEXT_PUBLIC_COMPANY_VAT_NUMBER,
    bankAccount: process.env.NEXT_PUBLIC_COMPANY_BANK_ACCOUNT,
    bankName: process.env.NEXT_PUBLIC_COMPANY_BANK_NAME,
  };
}

/**
 * Generate invoice PDF as a Blob
 * @param invoiceData Invoice data to generate PDF from
 * @returns Promise that resolves to a Blob containing the PDF
 */
export async function generateInvoicePDF(
  invoiceData: InvoiceData
): Promise<Blob> {
  try {
    // Generate PDF blob
    const blob = await pdf(<InvoicePDF data={invoiceData} />).toBlob();

    return blob;
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw new Error('Failed to generate invoice PDF');
  }
}

/**
 * Download invoice PDF file
 * @param invoiceData Invoice data to generate PDF from
 * @param filename Optional custom filename
 */
export async function downloadInvoicePDF(
  invoiceData: InvoiceData,
  filename?: string
): Promise<void> {
  try {
    const blob = await generateInvoicePDF(invoiceData);

    // Generate filename
    const defaultFilename = `invoice-${invoiceData.invoiceNumber}-${invoiceData.orderNumber}.pdf`;
    const downloadFilename = filename || defaultFilename;

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    throw error;
  }
}

/**
 * Open invoice PDF in a new window/tab
 * @param invoiceData Invoice data to generate PDF from
 */
export async function previewInvoicePDF(invoiceData: InvoiceData): Promise<void> {
  try {
    const blob = await generateInvoicePDF(invoiceData);

    // Create blob URL and open in new window
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // Clean up after a delay to allow the window to open
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error previewing invoice PDF:', error);
    throw error;
  }
}

/**
 * Print invoice PDF
 * @param invoiceData Invoice data to generate PDF from
 */
export async function printInvoicePDF(invoiceData: InvoiceData): Promise<void> {
  try {
    const blob = await generateInvoicePDF(invoiceData);

    // Create blob URL
    const url = URL.createObjectURL(blob);

    // Create iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    // Wait for iframe to load, then print
    iframe.onload = () => {
      iframe.contentWindow?.print();

      // Clean up after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 100);
    };
  } catch (error) {
    console.error('Error printing invoice PDF:', error);
    throw error;
  }
}

/**
 * Get invoice data as base64 string (useful for email attachments)
 * @param invoiceData Invoice data to generate PDF from
 * @returns Promise that resolves to base64 string
 */
export async function getInvoicePDFBase64(
  invoiceData: InvoiceData
): Promise<string> {
  try {
    const blob = await generateInvoicePDF(invoiceData);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix
        const base64String = base64.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting invoice PDF to base64:', error);
    throw error;
  }
}

/**
 * Calculate invoice file size in KB
 * @param invoiceData Invoice data to generate PDF from
 * @returns Promise that resolves to file size in KB
 */
export async function getInvoicePDFSize(
  invoiceData: InvoiceData
): Promise<number> {
  try {
    const blob = await generateInvoicePDF(invoiceData);
    return blob.size / 1024; // Convert bytes to KB
  } catch (error) {
    console.error('Error calculating invoice PDF size:', error);
    throw error;
  }
}
