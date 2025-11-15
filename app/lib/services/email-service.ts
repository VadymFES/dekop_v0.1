// app/lib/services/email-service.ts
import mailchimp from '@mailchimp/mailchimp_transactional';
import type { OrderWithItems } from '@/app/lib/definitions';
import {
  formatUkrainianDate,
  formatUkrainianPrice,
  getDeliveryMethodName,
  getPaymentMethodName,
  getOrderStatusName,
  formatDeliveryAddress
} from '@/app/lib/order-utils';

// Initialize Mailchimp Transactional client
const mailchimpClient = mailchimp(
  process.env.MAILCHIMP_TRANSACTIONAL_API_KEY || ''
);

export interface SendOrderConfirmationParams {
  order: OrderWithItems;
  to: string;
  customerName: string;
}

/**
 * Sends order confirmation email using Mailchimp Transactional
 */
export async function sendOrderConfirmationEmail(
  params: SendOrderConfirmationParams
) {
  try {
    const { order, to, customerName } = params;

    // Build email HTML content
    const htmlContent = buildOrderConfirmationHTML(order);

    const message = {
      from_email: process.env.MAILCHIMP_FROM_EMAIL || 'orders@dekop.com',
      from_name: process.env.MAILCHIMP_FROM_NAME || 'Dekop Furniture',
      to: [
        {
          email: to,
          name: customerName,
          type: 'to' as const,
        },
      ],
      subject: `Підтвердження замовлення ${order.order_number} - Dekop`,
      html: htmlContent,
      important: true,
      track_opens: true,
      track_clicks: true,
      auto_text: true,
      inline_css: true,
      tags: ['order-confirmation'],
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
    };

    const response = await mailchimpClient.messages.send({
      message,
    });

    console.log('Order confirmation email sent:', response);

    return {
      success: true,
      messageId: response[0]?.id,
      status: response[0]?.status,
    };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
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

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #eee; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 10px; color: #666; font-size: 14px; text-align: center;">
                Якщо у Вас виникли питання, будь ласка, зв'яжіться з нами
              </p>
              <p style="margin: 0; color: #666; font-size: 14px; text-align: center;">
                <a href="mailto:${process.env.MAILCHIMP_FROM_EMAIL}" style="color: #E94444; text-decoration: none;">
                  ${process.env.MAILCHIMP_FROM_EMAIL}
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

    const message = {
      from_email: process.env.MAILCHIMP_FROM_EMAIL || 'orders@dekop.com',
      from_name: process.env.MAILCHIMP_FROM_NAME || 'Dekop Furniture',
      to: [
        {
          email: to,
          name: customerName,
          type: 'to' as const,
        },
      ],
      subject: `Оновлення статусу замовлення ${order.order_number} - Dekop`,
      html: `
        <h1>Статус замовлення змінено</h1>
        <p>Ваше замовлення ${order.order_number} має новий статус: <strong>${getOrderStatusName(newStatus)}</strong></p>
      `,
      tags: ['order-status-update'],
    };

    const response = await mailchimpClient.messages.send({
      message,
    });

    return {
      success: true,
      messageId: response[0]?.id,
      status: response[0]?.status,
    };
  } catch (error) {
    console.error('Error sending order status update email:', error);
    throw error;
  }
}
