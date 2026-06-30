const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send order status email
exports.sendOrderStatusEmail = async (order, customerEmail, customerName) => {
  try {
    const statusMap = {
      pending: {
        subject: 'Your Order is Pending',
        message: 'Your order has been received and is waiting for confirmation.',
        color: '#f59e0b',
      },
      confirmed: {
        subject: 'Your Order is Confirmed!',
        message: 'Your order has been confirmed and is being processed.',
        color: '#3b82f6',
      },
      shipped: {
        subject: 'Your Order has been Shipped!',
        message: 'Your order has been shipped and is on its way to you.',
        color: '#8b5cf6',
      },
      delivered: {
        subject: 'Your Order has been Delivered!',
        message: 'Your order has been successfully delivered.',
        color: '#22c55e',
      },
      cancelled: {
        subject: 'Your Order has been Cancelled',
        message: 'Your order has been cancelled. Please contact support for any questions.',
        color: '#ef4444',
      },
    };

    const statusInfo = statusMap[order.status] || statusMap.pending;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 9999px; font-weight: bold; background: ${statusInfo.color}; color: white; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .footer { text-align: center; padding-top: 20px; font-size: 12px; color: #6b7280; }
          .btn { display: inline-block; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Status Update</h1>
            <p>Order #${order.orderId || order._id}</p>
          </div>
          <div class="content">
            <p>Dear <strong>${customerName}</strong>,</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <span class="status-badge">${order.status.toUpperCase()}</span>
            </div>
            
            <p>${statusInfo.message}</p>
            
            <div class="order-details">
              <h3 style="margin-top: 0;">Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td><strong>Order ID:</strong></td>
                  <td>${order.orderId || order._id}</td>
                </tr>
                <tr>
                  <td><strong>Status:</strong></td>
                  <td><span style="color: ${statusInfo.color}; font-weight: bold;">${order.status.toUpperCase()}</span></td>
                </tr>
                <tr>
                  <td><strong>Total Amount:</strong></td>
                  <td>₹${order.totalAmount?.toFixed(2)}</td>
                </tr>
                <tr>
                  <td><strong>Items:</strong></td>
                  <td>${order.totalItems || order.items?.length || 0}</td>
                </tr>
                <tr>
                  <td><strong>Payment Method:</strong></td>
                  <td>${order.paymentMethod || 'COD'}</td>
                </tr>
                <tr>
                  <td><strong>Shipping Address:</strong></td>
                  <td>${order.shippingAddress?.fullName}<br>${order.shippingAddress?.address}<br>${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL}/orders/${order._id}" class="btn">View Order</a>
            </div>
            
            <p style="margin-top: 20px;">Thank you for shopping with us!</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} ${process.env.STORE_NAME || 'ShopEasy'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"${process.env.STORE_NAME || 'ShopEasy'}" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `${statusInfo.subject} - Order #${order.orderId || order._id}`,
      html,
    });

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};