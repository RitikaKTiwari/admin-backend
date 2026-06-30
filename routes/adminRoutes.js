const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES
// ============================================

router.post('/login', adminController.adminLogin);

// ============================================
// PROTECTED ROUTES
// ============================================

router.use(adminAuth);

// Profile
router.get('/profile', adminController.getAdminProfile);
router.put('/profile', adminController.updateAdminProfile);
router.put('/profile/change-password', adminController.changeAdminPassword);
router.post('/logout', adminController.adminLogout);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// ============================================
// PRODUCT ROUTES
// ============================================

router.get('/products', adminController.getAllProducts);
router.get('/products/:id', adminController.getProductById);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.delete('/products/bulk', adminController.bulkDeleteProducts);

// ============================================
// ORDER ROUTES
// ============================================

router.get('/orders', adminController.getAllOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.put('/orders/bulk/status', adminController.bulkUpdateOrderStatus);

// ============================================
// USER ROUTES
// ============================================

router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// ============================================
// CATEGORY ROUTES (NEW)
// ============================================

router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// ============================================
// ANALYTICS & REPORTING ROUTES
// ============================================

router.get('/analytics/sales-report', adminController.getSalesReport);
router.get('/analytics/sales-by-category', adminController.getSalesByCategory);
router.get('/analytics/top-products', adminController.getTopProducts);
router.get('/analytics/low-stock', adminController.getLowStockProducts);
router.get('/analytics/export-sales', adminController.exportSalesReport);


// Update order status with optional email
router.put('/orders/:id/status', adminController.updateOrderStatusAndSendEmail);

// Send status email only (without updating status)
router.post('/orders/:id/send-email', adminController.sendOrderStatusEmailOnly);

module.exports = router;