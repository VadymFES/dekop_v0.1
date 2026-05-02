// app/api/orders/[orderId]/invoice/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import type { OrderWithItems } from '@/app/lib/definitions';
import {
  orderToInvoiceData,
  type InvoiceData,
  type CompanyInfo,
} from '@/app/lib/types/invoice';

/**
 * Get company information from environment variables
 */
function getCompanyInfo(): CompanyInfo {
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
 * GET /api/orders/[orderId]/invoice
 * Fetches invoice data for a specific order
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Fetch order with items
    const result = await sql`
      SELECT
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'order_id', oi.order_id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'product_slug', oi.product_slug,
            'product_article', oi.product_article,
            'quantity', oi.quantity,
            'color', oi.color,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'product_image_url', oi.product_image_url,
            'product_category', oi.product_category,
            'created_at', oi.created_at,
            'updated_at', oi.updated_at
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ${orderId}
      GROUP BY o.id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Замовлення не знайдено' },
        { status: 404 }
      );
    }

    const orderRow = result.rows[0];
    const order: OrderWithItems = {
      ...orderRow,
      items: orderRow.items || [],
    } as OrderWithItems;

    // Get company information
    const companyInfo = getCompanyInfo();

    // Get language from query params (default to Ukrainian)
    const url = new URL(request.url);
    const language = (url.searchParams.get('lang') as 'uk' | 'en') || 'uk';

    // Transform order to invoice data
    const invoiceData: InvoiceData = orderToInvoiceData(order, companyInfo, {
      language,
    });

    return NextResponse.json({
      success: true,
      invoice: invoiceData,
    });
  } catch (error) {
    console.error('Error fetching invoice data:', error);
    return NextResponse.json(
      {
        error: 'Помилка при формуванні рахунку',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
