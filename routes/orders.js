import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { isLoggedIn } from '../middleware/auth.js';

const router = express.Router();

const ORDERS_FILE = './data/orders.json';
const PRODUCTS_FILE = './data/products.json';
const USERS_FILE = './data/users.json'; // Added for fetching email

// View Orders
router.get('/', isLoggedIn, async (req, res) => {
  const orders = await fs.readJson(ORDERS_FILE).catch(() => []);
  const products = await fs.readJson(PRODUCTS_FILE).catch(() => []);
  const users = await fs.readJson(USERS_FILE).catch(() => []); // Load users
  const user = req.session.user;

  let userOrders = [];

  if (user.isAdmin) {
    // Show only orders for products the admin added
    const adminProductIds = products
      .filter(p => p.ownerId === user.id)
      .map(p => p.id);

    userOrders = orders
      .filter(o => adminProductIds.includes(o.productId))
      .map(o => {
        const orderUser = users.find(u => u.id === o.userId);
        return {
          ...o,
          email: orderUser ? orderUser.email : 'Unknown'
        };
      });

  } else {
    // Show only orders placed by the logged-in user
    userOrders = orders
      .filter(o => o.userId === user.id)
      .map(o => ({ ...o, email: user.email }));
  }

  res.render('orders', { user, orders: userOrders });
});

// Create Order
router.post('/create', isLoggedIn, async (req, res) => {
  const { productId } = req.body;
  const orders = await fs.readJson(ORDERS_FILE).catch(() => []);

  orders.push({
    id: Date.now().toString(),
    productId,
    userId: req.session.user.id,
    status: 'Pending'
  });

  await fs.writeJson(ORDERS_FILE, orders, { spaces: 2 });
  res.redirect('/orders');
});

// Update Order Status
router.post('/update', isLoggedIn, async (req, res) => {
  const { orderId, status } = req.body;
  const orders = await fs.readJson(ORDERS_FILE).catch(() => []);
  const products = await fs.readJson(PRODUCTS_FILE).catch(() => []);

  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) {
    return res.status(404).send('Order not found');
  }

  const order = orders[orderIndex];
  const product = products.find(p => p.id === order.productId);

  // Only the admin who owns the product can update
  if (!product || product.ownerId !== req.session.user.id) {
    return res.status(403).send('Not authorized to update this order');
  }

  orders[orderIndex].status = status;
  await fs.writeJson(ORDERS_FILE, orders, { spaces: 2 });

  res.redirect('/orders');
});

export default router;
