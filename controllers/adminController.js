const Admin = require('../models/Admin');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================
// 1. ADMIN AUTHENTICATION
// ============================================

// Admin Login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is disabled. Please contact support.'
      });
    }

    // ✅ Compare password (uses bcrypt.compare from model)
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Admin Profile
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    
    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.updateAdminProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const admin = await Admin.findById(req.admin._id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (name) admin.name = name;
    if (email) admin.email = email;
    
   
    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Change Admin Password
exports.changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    const admin = await Admin.findById(req.admin._id).select('+password');

    const isPasswordValid = await admin.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change admin password error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.adminLogout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 2. CREATE ADMIN (Super Admin only)
// ============================================

exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // ✅ HASH PASSWORD
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: role || 'admin',
      isActive: true
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 3. DASHBOARD
// ============================================

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments()
    ]);

    const orders = await Order.find();
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    const recentUsers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);

    const orderStatusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalProducts,
          totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100
        },
        recentOrders,
        recentUsers,
        orderStatusBreakdown
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 4. PRODUCT MANAGEMENT
// ============================================

// Get all products with pagination and search (FULLY FIXED)
exports.getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';

    const filter = {};
    
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: escapedSearch, $options: 'i' };
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }

    console.log(' Search term:', search);
    console.log(' Filter:', filter);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single product
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      originalPrice,
      category,
      categoryName,
      image,
      stock,
      brand,
      isFeatured
    } = req.body;

    // Validate required fields
    if (!title || !price || !category || !categoryName || !image) {
      return res.status(400).json({
        success: false,
        message: 'Title, price, category, category name and image are required'
      });
    }

    // Validate price
    if (parseFloat(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    // Validate originalPrice > price
    if (originalPrice && parseFloat(originalPrice) <= parseFloat(price)) {
      return res.status(400).json({
        success: false,
        message: 'Original price must be greater than price'
      });
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Selected category does not exist'
      });
    }

    const product = new Product({
      title: title.trim(),
      description: description || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      category: category,
      categoryName: categoryName.trim(),
      image: image.trim(),
      stock: stock ? parseInt(stock) : 0,
      brand: brand || '',
      isFeatured: isFeatured || false
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      productData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: product
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Bulk delete products
exports.bulkDeleteProducts = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product IDs'
      });
    }

    const result = await Product.deleteMany({ _id: { $in: productIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} products deleted successfully`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Bulk delete products error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// ============================================
// 5. ORDER MANAGEMENT
// ============================================

// Get all orders with pagination and filters
exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search || '';

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      filter['shippingAddress.fullName'] = { $regex: search, $options: 'i' };
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email'),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('user', 'name email phone')
      .populate('items.product', 'title price image');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed: pending, confirmed, shipped, delivered, cancelled'
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Bulk update order status
exports.bulkUpdateOrderStatus = async (req, res) => {
  try {
    const { orderIds, status } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order IDs'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { status }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} orders updated successfully`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk update orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 6. USER MANAGEMENT
// ============================================

// Get all users with pagination
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user details with orders
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const orders = await Order.find({ user: id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        user,
        orders
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await Order.deleteMany({ user: id });
    await user.deleteOne();

    res.json({
      success: true,
      message: 'User and their orders deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ============================================
// 6. CATEGORY MANAGEMENT (NEW)
// ============================================

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const category = new Category({
      name: name.trim(),
      description: description || '',
      isActive: true
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 6. ANALYTICS & REPORTING
// ============================================

// Get sales report (revenue, orders, items sold)
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    end.setHours(23, 59, 59, 999);

    let groupFormat = '%Y-%m-%d';
    if (groupBy === 'month') {
      groupFormat = '%Y-%m';
    } else if (groupBy === 'week') {
      groupFormat = '%Y-W%V';
    }

    const report = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          orderDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$orderDate' } },
          revenue: { $sum: '$totalAmount' },
          ordersCount: { $sum: 1 },
          itemsCount: { $sum: '$totalItems' }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: { $round: ['$revenue', 2] },
          ordersCount: 1,
          itemsCount: 1,
          averageOrderValue: { $round: [{ $divide: ['$revenue', '$ordersCount'] }, 2] }
        }
      },
      { $sort: { date: 1 } }
    ]);

    const summary = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          orderDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          totalItems: { $sum: '$totalItems' }
        }
      }
    ]);

    const summaryData = summary[0] || { totalRevenue: 0, totalOrders: 0, totalItems: 0 };

    res.json({
      success: true,
      data: {
        groupBy,
        period: { start, end },
        summary: {
          totalRevenue: Math.round(summaryData.totalRevenue * 100) / 100,
          totalOrders: summaryData.totalOrders,
          totalItems: summaryData.totalItems,
          averageOrderValue: summaryData.totalOrders > 0 ? Math.round((summaryData.totalRevenue / summaryData.totalOrders) * 100) / 100 : 0
        },
        report
      }
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get sales by product category
exports.getSalesByCategory = async (req, res) => {
  try {
    const sales = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$productInfo.categoryName', 'Uncategorized'] },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          quantitySold: { $sum: '$items.quantity' },
          orderCount: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          revenue: { $round: ['$revenue', 2] },
          quantitySold: 1,
          ordersCount: { $size: '$orderCount' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    console.error('Get sales by category error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get top selling products
exports.getTopProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const topProducts = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          title: { $first: '$items.title' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: '$_id',
          title: 1,
          totalQuantitySold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          image: '$productInfo.image',
          price: '$productInfo.price',
          categoryName: '$productInfo.categoryName'
        }
      }
    ]);

    res.json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get low stock products
exports.getLowStockProducts = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { stock: { $lte: threshold } };

    const [products, total] = await Promise.all([
      Product.find(query)
        .select('title stock price categoryName image brand')
        .sort({ stock: 1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        products,
        threshold,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export sales report to CSV
exports.exportSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      orderDate: { $gte: start, $lte: end }
    })
    .sort({ orderDate: -1 })
    .populate('user', 'name email');

    let csvContent = 'Order ID,Date,Customer Name,Customer Email,Total Items,Total Amount,Payment Method,Status\n';

    orders.forEach(order => {
      const dateStr = order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : '';
      const userName = order.user?.name ? `"${order.user.name.replace(/"/g, '""')}"` : '"Guest"';
      const userEmail = order.user?.email || 'N/A';
      const payment = order.paymentMethod || 'cod';
      const status = order.status || 'pending';
      
      csvContent += `${order.orderId || order._id},${dateStr},${userName},${userEmail},${order.totalItems || 0},${order.totalAmount || 0},${payment},${status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export sales report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Add this import at the top
const { sendOrderStatusEmail } = require('../utils/email');

// ============================================
// UPDATE ORDER STATUS & SEND EMAIL
// ============================================

exports.updateOrderStatusAndSendEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, sendEmail } = req.body;

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    let emailSent = false;
    let emailError = null;

    // Send email if requested
    if (sendEmail && order.user?.email) {
      try {
        const customerName = order.user.name || 'Customer';
        await sendOrderStatusEmail(order, order.user.email, customerName);
        emailSent = true;
      } catch (error) {
        emailError = error.message;
        console.error('Email sending failed:', error);
      }
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order,
        emailSent,
        emailError,
      },
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Send status email only (without updating status)
exports.sendOrderStatusEmailOnly = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.user?.email) {
      return res.status(400).json({
        success: false,
        message: 'Customer email not found'
      });
    }

    const customerName = order.user.name || 'Customer';
    const emailSent = await sendOrderStatusEmail(order, order.user.email, customerName);

    res.json({
      success: true,
      message: emailSent ? 'Email sent successfully' : 'Failed to send email',
      emailSent,
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};