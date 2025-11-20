// app/components/invoice/InvoicePDF.tsx
'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';
import { InvoiceData } from '@/app/lib/types/invoice';

// Register fonts for Ukrainian (Cyrillic) support
// Using default fonts that support Cyrillic
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 'bold',
    },
  ],
});

// Define styles for the PDF document
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#F45145',
    paddingBottom: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#160101',
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.4,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F45145',
    marginBottom: 5,
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 11,
    color: '#160101',
    textAlign: 'right',
    marginBottom: 3,
  },
  invoiceDate: {
    fontSize: 9,
    color: '#666',
    textAlign: 'right',
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#160101',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoColumn: {
    flex: 1,
    paddingRight: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 9,
    color: '#666',
    width: 100,
  },
  infoValue: {
    fontSize: 9,
    color: '#160101',
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
    borderBottom: 1,
    borderBottomColor: '#DDD',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#EEE',
    fontSize: 9,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  col1: {
    width: '5%',
  },
  col2: {
    width: '40%',
  },
  col3: {
    width: '15%',
    textAlign: 'center',
  },
  col4: {
    width: '20%',
    textAlign: 'right',
  },
  col5: {
    width: '20%',
    textAlign: 'right',
  },
  summary: {
    marginTop: 20,
    marginLeft: 'auto',
    width: 250,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#666',
  },
  summaryValue: {
    fontSize: 9,
    color: '#160101',
    fontWeight: 'bold',
  },
  summaryDivider: {
    borderTop: 1,
    borderTopColor: '#DDD',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F45145',
    padding: 10,
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  paymentStatus: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderLeft: 4,
    borderLeftColor: '#4CAF50',
    borderRadius: 4,
  },
  paymentStatusPending: {
    backgroundColor: '#FFF3E0',
    borderLeftColor: '#FF9800',
  },
  paymentStatusFailed: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#F44336',
  },
  paymentStatusText: {
    fontSize: 10,
    color: '#160101',
    marginBottom: 4,
  },
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#160101',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTop: 1,
    borderTopColor: '#EEE',
    paddingTop: 10,
  },
});

interface InvoicePDFProps {
  data: InvoiceData;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ data }) => {
  const lang = data.language || 'uk';

  // Localized text labels
  const labels = {
    uk: {
      invoice: 'РАХУНОК-ФАКТУРА',
      invoiceNumber: 'Номер рахунку:',
      orderNumber: 'Номер замовлення:',
      date: 'Дата виставлення:',
      dueDate: 'Термін оплати:',
      billTo: 'Покупець',
      shipTo: 'Доставка',
      from: 'Продавець',
      customerName: 'ПІБ:',
      phone: 'Телефон:',
      email: 'Email:',
      address: 'Адреса:',
      city: 'Місто:',
      postalCode: 'Індекс:',
      deliveryMethod: 'Спосіб доставки:',
      paymentMethod: 'Спосіб оплати:',
      paymentStatus: 'Статус оплати:',
      items: 'Товари та послуги',
      no: '№',
      description: 'Найменування',
      quantity: 'Кількість',
      unitPrice: 'Ціна',
      amount: 'Сума',
      subtotal: 'Сума:',
      discount: 'Знижка:',
      delivery: 'Доставка:',
      tax: 'ПДВ:',
      total: 'Всього до сплати:',
      paid: 'Сплачено:',
      remaining: 'Залишок:',
      notes: 'Примітки',
      paymentInfo: 'Інформація про оплату',
      statusPaid: 'Оплачено',
      statusPending: 'Очікується оплата',
      statusFailed: 'Оплата не пройшла',
      statusRefunded: 'Повернено',
      footerText: 'Дякуємо за покупку!',
      taxId: 'ЄДРПОУ:',
      vatNumber: 'ІПН:',
    },
    en: {
      invoice: 'INVOICE',
      invoiceNumber: 'Invoice Number:',
      orderNumber: 'Order Number:',
      date: 'Issue Date:',
      dueDate: 'Due Date:',
      billTo: 'Bill To',
      shipTo: 'Ship To',
      from: 'From',
      customerName: 'Name:',
      phone: 'Phone:',
      email: 'Email:',
      address: 'Address:',
      city: 'City:',
      postalCode: 'Postal Code:',
      deliveryMethod: 'Delivery Method:',
      paymentMethod: 'Payment Method:',
      paymentStatus: 'Payment Status:',
      items: 'Items & Services',
      no: '#',
      description: 'Description',
      quantity: 'Qty',
      unitPrice: 'Unit Price',
      amount: 'Amount',
      subtotal: 'Subtotal:',
      discount: 'Discount:',
      delivery: 'Delivery:',
      tax: 'VAT:',
      total: 'Total:',
      paid: 'Paid:',
      remaining: 'Remaining:',
      notes: 'Notes',
      paymentInfo: 'Payment Information',
      statusPaid: 'Paid',
      statusPending: 'Pending',
      statusFailed: 'Failed',
      statusRefunded: 'Refunded',
      footerText: 'Thank you for your business!',
      taxId: 'Tax ID:',
      vatNumber: 'VAT Number:',
    },
  };

  const t = labels[lang];

  // Format currency
  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${numAmount.toFixed(2)} ${data.pricing.currency}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get payment status style
  const getPaymentStatusStyle = () => {
    switch (data.payment.status) {
      case 'paid':
        return styles.paymentStatus;
      case 'pending':
        return [styles.paymentStatus, styles.paymentStatusPending];
      case 'failed':
        return [styles.paymentStatus, styles.paymentStatusFailed];
      default:
        return styles.paymentStatus;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {/* Company Information */}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{data.company.name}</Text>
              <Text style={styles.companyDetails}>
                {data.company.address}, {data.company.city}, {data.company.postalCode}
              </Text>
              <Text style={styles.companyDetails}>
                {t.phone} {data.company.phone}
              </Text>
              <Text style={styles.companyDetails}>
                {t.email} {data.company.email}
              </Text>
              {data.company.taxId && (
                <Text style={styles.companyDetails}>
                  {t.taxId} {data.company.taxId}
                </Text>
              )}
            </View>

            {/* Invoice Title & Number */}
            <View>
              <Text style={styles.invoiceTitle}>{t.invoice}</Text>
              <Text style={styles.invoiceNumber}>
                {t.invoiceNumber} {data.invoiceNumber}
              </Text>
              <Text style={styles.invoiceNumber}>
                {t.orderNumber} {data.orderNumber}
              </Text>
              <Text style={styles.invoiceDate}>
                {t.date} {formatDate(data.issueDate)}
              </Text>
              {data.dueDate && (
                <Text style={styles.invoiceDate}>
                  {t.dueDate} {formatDate(data.dueDate)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Customer & Delivery Information */}
        <View style={styles.section}>
          <View style={styles.infoGrid}>
            {/* Bill To */}
            <View style={styles.infoColumn}>
              <Text style={styles.sectionTitle}>{t.billTo}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.customerName}</Text>
                <Text style={styles.infoValue}>{data.customer.fullName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.phone}</Text>
                <Text style={styles.infoValue}>{data.customer.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.email}</Text>
                <Text style={styles.infoValue}>{data.customer.email}</Text>
              </View>
            </View>

            {/* Ship To */}
            <View style={styles.infoColumn}>
              <Text style={styles.sectionTitle}>{t.shipTo}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.deliveryMethod}</Text>
                <Text style={styles.infoValue}>{data.delivery.methodLabel}</Text>
              </View>
              {data.delivery.city && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t.city}</Text>
                  <Text style={styles.infoValue}>{data.delivery.city}</Text>
                </View>
              )}
              {data.delivery.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t.address}</Text>
                  <Text style={styles.infoValue}>{data.delivery.address}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.items}</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>{t.no}</Text>
              <Text style={styles.col2}>{t.description}</Text>
              <Text style={styles.col3}>{t.quantity}</Text>
              <Text style={styles.col4}>{t.unitPrice}</Text>
              <Text style={styles.col5}>{t.amount}</Text>
            </View>

            {/* Table Rows */}
            {data.items.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.tableRow,
                  index === data.items.length - 1 ? styles.tableRowLast : {},
                ]}
              >
                <Text style={styles.col1}>{index + 1}</Text>
                <Text style={styles.col2}>
                  {item.name}
                  {item.color && ` (${item.color})`}
                </Text>
                <Text style={styles.col3}>{item.quantity}</Text>
                <Text style={styles.col4}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={styles.col5}>{formatCurrency(item.totalPrice)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.subtotal}</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(data.pricing.subtotal)}
            </Text>
          </View>

          {data.pricing.discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {t.discount} ({data.pricing.discountPercent}%)
              </Text>
              <Text style={styles.summaryValue}>
                -{formatCurrency(data.pricing.discountAmount)}
              </Text>
            </View>
          )}

          {data.pricing.deliveryCost > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t.delivery}</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data.pricing.deliveryCost)}
              </Text>
            </View>
          )}

          {data.pricing.taxAmount && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {t.tax} ({data.pricing.taxRate}%)
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data.pricing.taxAmount)}
              </Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t.total}</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.pricing.total)}
            </Text>
          </View>
        </View>

        {/* Payment Status */}
        <View style={getPaymentStatusStyle()}>
          <Text style={styles.paymentStatusText}>
            {t.paymentStatus} {data.payment.statusLabel}
          </Text>
          <Text style={styles.paymentStatusText}>
            {t.paymentMethod} {data.payment.methodLabel}
          </Text>
          {data.payment.paidAmount && (
            <Text style={styles.paymentStatusText}>
              {t.paid} {formatCurrency(data.payment.paidAmount)}
            </Text>
          )}
          {data.pricing.remainingAmount && data.pricing.remainingAmount > 0 && (
            <Text style={styles.paymentStatusText}>
              {t.remaining} {formatCurrency(data.pricing.remainingAmount)}
            </Text>
          )}
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>{t.notes}</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{t.footerText}</Text>
          <Text>
            {data.company.website} | {data.company.email}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
