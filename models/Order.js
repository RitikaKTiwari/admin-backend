const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    title: String,
    quantity: Number,
    price: Number
  }],
  shippingAddress: {
    fullName: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    addressType: {
      type: String,
      enum: ['Home', 'Work', 'Other'],
      default: 'Home'
    },
    email: String
  },
  totalAmount: {
    type: Number,
    required: true
  },
  totalItems: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'card', 'upi', 'netbanking'],
    default: 'cod'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Static method to create order with auto-generated ID
orderSchema.statics.createWithId = async function(orderData) {
  // Generate order ID (e.g., ORD-2024-0001)
  const count = await this.countDocuments();
  const orderId = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  
  const order = new this({
    ...orderData,
    orderId: orderId
  });
  
  return await order.save();
};

module.exports = mongoose.model('Order', orderSchema);