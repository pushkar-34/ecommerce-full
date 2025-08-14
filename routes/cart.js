import express from 'express';
import fs from 'fs-extra';
import { isLoggedIn } from '../middleware/auth.js';

const router = express.Router();

const CART_FILE = './data/cart.json';
const PRODUCTS_FILE = './data/products.json';

async function readCart() {
  return await fs.readJson(CART_FILE).catch(() => []);
}

async function saveCart(cart) {
  await fs.writeJson(CART_FILE, cart, { spaces: 2 });
}

async function readProducts() {
  return await fs.readJson(PRODUCTS_FILE).catch(() => []);
}


router.post('/add', isLoggedIn, async (req, res) => {
  const { productId } = req.body;
  const cart = await readCart();

  const existing = cart.find(item => item.userId === req.session.user.id && item.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: Date.now().toString(),
      userId: req.session.user.id,
      productId,
      quantity: 1,
    });
  }
  await saveCart(cart);
  res.redirect('/cart');
});


router.get('/', isLoggedIn, async (req, res) => {
  const cart = await readCart();
  const products = await readProducts();

  const userCartItems = cart.filter(item => item.userId === req.session.user.id);

  const detailedCart = userCartItems.map(item => {
    const product = products.find(p => p.id === item.productId);
    return {
      ...item,
      product,
    };
  }).filter(item => item.product); // filter missing products

  res.render('cart', { user: req.session.user, cart: detailedCart });
});


router.post('/remove/:id', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  let cart = await readCart();

  cart = cart.filter(item => !(item.id === id && item.userId === req.session.user.id));
  await saveCart(cart);
  res.redirect('/cart');
});

router.get('/payment', (req, res) => {
    const userCart = getUserCart(req.session.userId); 
    let totalAmount = 0;

    userCart.forEach(item => {
        totalAmount += item.product.price * item.quantity;
    });

    res.render('payment', { 
        user: req.session.user, 
        totalAmount 
    });
});


router.post('/update-quantity/:id', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  let cart = await readCart();

  cart = cart.map(item => {
    if (item.id === id && item.userId === req.session.user.id) {
      return { ...item, quantity: parseInt(quantity) };
    }
    return item;
  });

  await saveCart(cart);
  res.sendStatus(200);
});


export default router;
