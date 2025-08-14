import express from 'express';
import fs from 'fs-extra';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { isLoggedIn } from '../middleware/auth.js';

const router = express.Router();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  }
});
const upload = multer({ storage });


async function readProducts() {
  return await fs.readJson(PRODUCTS_FILE).catch(() => []);
}
async function saveProducts(products) {
  await fs.writeJson(PRODUCTS_FILE, products, { spaces: 2 });
}


router.get('/', isLoggedIn, async (req, res) => {
  const products = await readProducts();
  res.render('dashboard', { user: req.session.user, products });
});


router.get('/add', isLoggedIn, (req, res) => {
  if (!req.session.user.isAdmin) {
    return res.status(403).send('Forbidden: Admins only');
  }
  
  return res.redirect('/products');
});


router.post('/add', isLoggedIn, upload.single('image'), async (req, res) => {
  if (!req.session.user.isAdmin) {
    return res.status(403).send('Forbidden: Admins only');
  }

  const title = (req.body.title || '').trim();
  const price = parseFloat(req.body.price);
  const description = (req.body.description || '').trim();
  const image = req.file ? req.file.filename : null;

  if (!title || isNaN(price) || !description) {
    return res.status(400).send('Invalid product data');
  }

  const products = await readProducts();

  products.push({
    id: uuid(),
    title,
    price,
    description,
    image,
    ownerId: req.session.user.id 
  });

  await saveProducts(products);
  res.redirect('/products');
});


router.post('/delete/:id', isLoggedIn, async (req, res) => {
  if (!req.session.user.isAdmin) {
    return res.status(403).send('Forbidden: Admins only');
  }

  const { id } = req.params;
  let products = await readProducts();
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).send('Product not found');
  }

  if (product.ownerId !== req.session.user.id) {
    return res.status(403).send('You can only delete products you have added');
  }

  products = products.filter(p => p.id !== id);
  await saveProducts(products);
  res.redirect('/products');
});


router.get('/edit/:id', isLoggedIn, async (req, res) => {
  if (!req.session.user.isAdmin) {
    return res.status(403).send('Forbidden: Admins only');
  }

  const { id } = req.params;
  const products = await readProducts();
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).send('Product not found');
  }
  if (product.ownerId !== req.session.user.id) {
    return res.status(403).send('You can only edit products you have added');
  }

  res.render('editProduct', { user: req.session.user, product });
});


router.post('/edit/:id', isLoggedIn, upload.single('image'), async (req, res) => {
  if (!req.session.user.isAdmin) {
    return res.status(403).send('Forbidden: Admins only');
  }

  const { id } = req.params;
  const title = (req.body.title || '').trim();
  const price = parseFloat(req.body.price);
  const description = (req.body.description || '').trim();

  if (!title || isNaN(price) || !description) {
    return res.status(400).send('Invalid product data');
  }

  const products = await readProducts();
  const index = products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).send('Product not found');
  }
  if (products[index].ownerId !== req.session.user.id) {
    return res.status(403).send('You can only edit products you have added');
  }

  products[index] = {
    ...products[index],
    title,
    price,
    description,
    image: req.file ? req.file.filename : products[index].image
  };

  await saveProducts(products);
  res.redirect('/products');
});


router.get('/search', isLoggedIn, async (req, res) => {
  const { q } = req.query;
  const products = await readProducts();

  if (!q) {
    return res.redirect('/products');
  }

  const query = q.toLowerCase();
  const filteredProducts = products.filter(p =>
    (p.title || '').toLowerCase().includes(query) ||
    (p.description || '').toLowerCase().includes(query)
  );

  res.render('dashboard', { user: req.session.user, products: filteredProducts });
});

export default router;
