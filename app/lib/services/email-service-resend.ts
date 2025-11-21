// app/lib/services/email-service-resend.ts
import { Resend } from 'resend';
import type { OrderWithItems } from '@/app/lib/definitions';
import {
  formatUkrainianDate,
  formatUkrainianPrice,
  getDeliveryMethodName,
  getPaymentMethodName,
  getOrderStatusName,
  formatDeliveryAddress
} from '@/app/lib/order-utils';
import { orderToInvoiceData, type CompanyInfo } from '@/app/lib/types/invoice';
import { generateInvoicePDFBuffer } from '@/app/lib/invoice/invoice-generator-server';
import { logger } from '../logger';
import * as Sentry from '@sentry/nextjs';

// Lazy initialization of Resend client to avoid errors during build
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

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

export interface SendOrderConfirmationParams {
  order: OrderWithItems;
  to: string;
  customerName: string;
}

/**
 * Sends order confirmation email using Resend
 */
export async function sendOrderConfirmationEmail(
  params: SendOrderConfirmationParams
) {
  try {
    const { order, to, customerName } = params;

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      const errorMsg = 'RESEND_API_KEY is not configured. Cannot send emails.';
      logger.error('EMAIL SENDING FAILED: RESEND_API_KEY is not configured', undefined, {
        to,
        orderNumber: order.order_number,
        orderId: order.id,
      });
      throw new Error(errorMsg);
    }

    // Build email HTML content
    const htmlContent = buildOrderConfirmationHTML(order);

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@dekop.com.ua';
    const fromName = process.env.RESEND_FROM_NAME || 'Dekop Furniture Store';

    logger.info('Attempting to send order confirmation email via Resend', {
      from: `${fromName} <${fromEmail}>`,
      to: `${customerName} <${to}>`,
      orderNumber: order.order_number,
      orderId: order.id,
    });

    // Generate invoice PDF
    let invoicePdfBuffer: Buffer | null = null;
    try {
      logger.info('Generating invoice PDF for attachment', {
        orderNumber: order.order_number,
        orderId: order.id,
      });
      const companyInfo = getCompanyInfo();
      const invoiceData = orderToInvoiceData(order, companyInfo, {
        language: 'uk',
      });
      invoicePdfBuffer = await generateInvoicePDFBuffer(invoiceData);
      logger.info('Invoice PDF generated successfully', {
        orderNumber: order.order_number,
        orderId: order.id,
      });
      // Track PDF size metric
      Sentry.metrics.distribution('email.pdf_size', invoicePdfBuffer.length, { unit: 'byte' });
    } catch (pdfError) {
      logger.error('Failed to generate invoice PDF', pdfError instanceof Error ? pdfError : undefined, {
        orderNumber: order.order_number,
        orderId: order.id,
      });
      logger.info('Continuing to send email without invoice attachment', {
        orderNumber: order.order_number,
        orderId: order.id,
      });
    }

    const { data, error } = await Sentry.startSpan(
      {
        op: 'email.send',
        name: 'Send Order Confirmation Email',
        attributes: { to: to, orderNumber: order.order_number }
      },
      async () => {
        return await getResendClient().emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject: `Підтвердження замовлення ${order.order_number} - Dekop`,
          html: htmlContent,
          text: buildOrderConfirmationText(order),
          tags: [
            {
              name: 'category',
              value: 'order-confirmation',
            },
            {
              name: 'order_id',
              value: order.id,
            },
          ],
          // Attach invoice PDF if generation was successful
          ...(invoicePdfBuffer && {
            attachments: [
              {
                filename: `invoice-${order.order_number}.pdf`,
                content: invoicePdfBuffer,
              },
            ],
          }),
        });
      }
    );

    if (error) {
      Sentry.metrics.increment('email.failed', 1, { tags: { type: 'order_confirmation' } });
      logger.error('Resend API error', undefined, {
        errorMessage: error.message,
        orderNumber: order.order_number,
        orderId: order.id,
        to,
      });
      throw new Error(error.message || 'Failed to send email via Resend');
    }

    Sentry.metrics.increment('email.sent', 1, { tags: { type: 'order_confirmation' } });
    logger.info('Order confirmation email sent successfully via Resend', {
      messageId: data?.id,
      orderNumber: order.order_number,
      orderId: order.id,
      to,
    });

    return {
      success: true,
      messageId: data?.id,
      status: 'sent',
    };
  } catch (error) {
    Sentry.metrics.increment('email.failed', 1, { tags: { type: 'order_confirmation' } });
    logger.error(
      'Error sending order confirmation email via Resend',
      error instanceof Error ? error : undefined,
      {
        orderNumber: order.order_number,
        orderId: order.id,
        to,
        errorDetails: typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error),
      }
    );

    throw new Error(
      error instanceof Error ? error.message : 'Failed to send email'
    );
  }
}

/**
 * Builds HTML content for order confirmation email
 */
function buildOrderConfirmationHTML(order: OrderWithItems): string {
  const orderDate = formatUkrainianDate(order.created_at);
  const deliveryAddress = formatDeliveryAddress({
    city: order.delivery_city,
    street: order.delivery_street,
    building: order.delivery_building,
    apartment: order.delivery_apartment,
    postalCode: order.delivery_postal_code,
  });

  // Build items HTML
  const itemsHTML = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        ${
          item.product_image_url
            ? `<img src="${item.product_image_url}" alt="${item.product_name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />`
            : ''
        }
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        <strong>${item.product_name}</strong><br />
        ${item.product_article ? `<span style="color: #666; font-size: 14px;">Арт. №${item.product_article}</span>` : ''}
        ${item.color ? `<br /><span style="color: #666; font-size: 14px;">Колір: ${item.color}</span>` : ''}
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: center;">
        ×${item.quantity}
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">
        <strong>${formatUkrainianPrice(item.total_price)}</strong>
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Підтвердження замовлення ${order.order_number}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0 0 10px; color: #160101; font-size: 28px;">Дякуємо за Ваше замовлення!</h1>
              <p style="margin: 0; color: #666; font-size: 16px;">Ваше замовлення ${order.order_number} прийнято в обробку</p>
            </td>
          </tr>

          <!-- Order Status Badge -->
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <span style="display: inline-block; padding: 8px 20px; background-color: #4CAF50; color: white; border-radius: 20px; font-size: 14px; font-weight: 600;">
                ${getOrderStatusName(order.order_status)}
              </span>
            </td>
          </tr>

          <!-- Customer Information -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 15px; color: #160101; font-size: 18px;">Отримувач</h2>
              <p style="margin: 5px 0; color: #333; font-size: 15px;">
                <strong>${order.user_surname} ${order.user_name}</strong>
              </p>
              <p style="margin: 5px 0; color: #666; font-size: 15px;">
                Телефон: ${order.user_phone}
              </p>
              <p style="margin: 5px 0; color: #666; font-size: 15px;">
                Email: ${order.user_email}
              </p>
            </td>
          </tr>

          <!-- Order Details -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 15px; color: #160101; font-size: 18px;">Деталі замовлення</h2>
              <p style="margin: 5px 0; color: #666; font-size: 15px;">
                Номер замовлення: <strong>${order.order_number}</strong>
              </p>
              <p style="margin: 5px 0; color: #666; font-size: 15px;">
                Дата замовлення: ${orderDate}
              </p>
            </td>
          </tr>

          <!-- Delivery Information -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 15px; color: #160101; font-size: 18px;">Доставка</h2>
              <p style="margin: 5px 0; color: #666; font-size: 15px;">
                <strong>${getDeliveryMethodName(order.delivery_method)}</strong>
              </p>
              ${
                deliveryAddress
                  ? `<p style="margin: 5px 0; color: #666; font-size: 15px;">${deliveryAddress}</p>`
                  : ''
              }
              ${
                order.store_location
                  ? `<p style="margin: 5px 0; color: #666; font-size: 15px;">${order.store_location}</p>`
                  : ''
              }
            </td>
          </tr>

          <!-- Payment Information -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 15px; color: #160101; font-size: 18px;">Оплата</h2>
              <p style="margin: 5px 0; color: #666; font-size: 15px;">
                ${getPaymentMethodName(order.payment_method)}
              </p>
              ${
                order.prepayment_amount > 0
                  ? `
                <p style="margin: 10px 0 5px; color: #E94444; font-size: 16px; font-weight: 600;">
                  Сума передплати: ${formatUkrainianPrice(order.prepayment_amount)}
                </p>
                ${
                  order.payment_deadline
                    ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">
                    Заплатіть до: ${formatUkrainianDate(order.payment_deadline)}
                  </p>`
                    : ''
                }
              `
                  : ''
              }
            </td>
          </tr>

          <!-- Order Items -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 15px; color: #160101; font-size: 18px;">Товари</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                ${itemsHTML}
              </table>
            </td>
          </tr>

          <!-- Order Summary -->
          <tr>
            <td style="padding: 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 10px 0; text-align: right; color: #666; font-size: 15px;">
                    Підсумок:
                  </td>
                  <td style="padding: 10px 0 10px 20px; text-align: right; font-size: 15px;">
                    ${formatUkrainianPrice(order.subtotal)}
                  </td>
                </tr>
                ${
                  order.discount_amount > 0
                    ? `
                  <tr>
                    <td style="padding: 10px 0; text-align: right; color: #666; font-size: 15px;">
                      Знижка (${order.discount_percent}%):
                    </td>
                    <td style="padding: 10px 0 10px 20px; text-align: right; font-size: 15px; color: #4CAF50;">
                      -${formatUkrainianPrice(order.discount_amount)}
                    </td>
                  </tr>
                `
                    : ''
                }
                ${
                  order.delivery_cost > 0
                    ? `
                  <tr>
                    <td style="padding: 10px 0; text-align: right; color: #666; font-size: 15px;">
                      Доставка:
                    </td>
                    <td style="padding: 10px 0 10px 20px; text-align: right; font-size: 15px;">
                      ${formatUkrainianPrice(order.delivery_cost)}
                    </td>
                  </tr>
                `
                    : ''
                }
                <tr>
                  <td style="padding: 15px 0 0; text-align: right; color: #160101; font-size: 18px; font-weight: 700; border-top: 2px solid #eee;">
                    Загальна вартість:
                  </td>
                  <td style="padding: 15px 0 0 20px; text-align: right; font-size: 20px; font-weight: 700; color: #E94444; border-top: 2px solid #eee;">
                    ${formatUkrainianPrice(order.total_amount)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invoice Attachment Notice -->
          <tr>
            <td style="padding: 20px 40px; background-color: #E8F5E9; border-top: 1px solid #C8E6C9;">
              <p style="margin: 0; color: #2E7D32; font-size: 14px; text-align: center;">
                📎 <strong>Рахунок-фактура додано до листа</strong><br />
                <span style="font-size: 13px;">PDF файл доступний у вкладеннях до цього листа</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #eee; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 10px; color: #666; font-size: 14px; text-align: center;">
                Якщо у Вас виникли питання, будь ласка, зв'яжіться з нами
              </p>
              <p style="margin: 0; color: #666; font-size: 14px; text-align: center;">
                <a href="mailto:${process.env.RESEND_FROM_EMAIL || 'noreply@dekop.com.ua'}" style="color: #E94444; text-decoration: none;">
                  ${process.env.RESEND_FROM_EMAIL || 'noreply@dekop.com.ua'}
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Builds plain text version of order confirmation email
 */
function buildOrderConfirmationText(order: OrderWithItems): string {
  const orderDate = formatUkrainianDate(order.created_at);

  let text = `DEKOP FURNITURE STORE\n\n`;
  text += `Дякуємо за Ваше замовлення!\n\n`;
  text += `Ваше замовлення ${order.order_number} прийнято в обробку.\n\n`;
  text += `ДЕТАЛІ ЗАМОВЛЕННЯ\n`;
  text += `Номер замовлення: ${order.order_number}\n`;
  text += `Дата: ${orderDate}\n`;
  text += `Статус: ${getOrderStatusName(order.order_status)}\n\n`;

  text += `ОТРИМУВАЧ\n`;
  text += `${order.user_surname} ${order.user_name}\n`;
  text += `Телефон: ${order.user_phone}\n`;
  text += `Email: ${order.user_email}\n\n`;

  text += `ТОВАРИ\n`;
  order.items.forEach((item) => {
    text += `${item.product_name} `;
    if (item.product_article) text += `(Арт. №${item.product_article}) `;
    if (item.color) text += `- ${item.color} `;
    text += `× ${item.quantity} = ${formatUkrainianPrice(item.total_price)}\n`;
  });

  text += `\nДОСТАВКА\n`;
  text += `${getDeliveryMethodName(order.delivery_method)}\n`;

  text += `\nОПЛАТА\n`;
  text += `${getPaymentMethodName(order.payment_method)}\n`;

  text += `\nРАЗОМ\n`;
  text += `Підсумок: ${formatUkrainianPrice(order.subtotal)}\n`;
  if (order.discount_amount > 0) {
    text += `Знижка (${order.discount_percent}%): -${formatUkrainianPrice(order.discount_amount)}\n`;
  }
  if (order.delivery_cost > 0) {
    text += `Доставка: ${formatUkrainianPrice(order.delivery_cost)}\n`;
  }
  text += `Загальна вартість: ${formatUkrainianPrice(order.total_amount)}\n\n`;

  text += `📎 РАХУНОК-ФАКТУРА\n`;
  text += `Рахунок-фактура додано до листа у форматі PDF.\n`;
  text += `Файл доступний у вкладеннях до цього листа.\n\n`;

  text += `Якщо у Вас виникли питання, зв'яжіться з нами:\n`;
  text += `${process.env.RESEND_FROM_EMAIL || 'noreply@dekop.com.ua'}\n`;

  return text;
}

/**
 * Sends order status update email
 */
export async function sendOrderStatusUpdateEmail(params: {
  order: OrderWithItems;
  to: string;
  customerName: string;
  newStatus: string;
}) {
  try {
    const { order, to, customerName, newStatus } = params;

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@dekop.com.ua';
    const fromName = process.env.RESEND_FROM_NAME || 'Dekop Furniture Store';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #160101;">Статус замовлення змінено</h1>
          <p>Ваше замовлення <strong>${order.order_number}</strong> має новий статус:</p>
          <p style="font-size: 18px; color: #4CAF50;"><strong>${getOrderStatusName(newStatus)}</strong></p>
          <p>Дякуємо за покупку!</p>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await getResendClient().emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: `Оновлення статусу замовлення ${order.order_number} - Dekop`,
      html: htmlContent,
      tags: [
        {
          name: 'category',
          value: 'order-status-update',
        },
      ],
    });

    if (error) {
      throw new Error(error.message || 'Failed to send status update email');
    }

    return {
      success: true,
      messageId: data?.id,
      status: 'sent',
    };
  } catch (error) {
    logger.error(
      'Error sending order status update email',
      error instanceof Error ? error : undefined,
      {
        orderNumber: order.order_number,
        orderId: order.id,
        to,
        newStatus,
      }
    );
    throw error;
  }
}
