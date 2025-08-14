
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../data/users.json');


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'pushkarsheoran277@gmail.com', 
    pass: 'tqrd eyoq tsqz qqqh',    
  },
});


router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.redirect('/products');
});


router.get('/register', (req, res) => {
  res.render('register');
});


router.post('/register', async (req, res) => {
  const { username, email, password, isAdmin } = req.body;
  const users = await fs.readJson(USERS_FILE).catch(() => []);

  if (users.find((u) => u.email === email)) {
    return res.send('User already exists');
  }

  const newUser = {
    id: Date.now(),
    username,
    email,
    password,
    isAdmin: isAdmin || false,
    isVerified: false,
  };

  users.push(newUser);
  await fs.writeJson(USERS_FILE, users, { spaces: 2 });

  
  const verifyLink = `http://localhost:3000/verify-email?email=${encodeURIComponent(email)}`;

  
  await transporter.sendMail({
    to: email,
    subject: 'Verify Your Email',
    html: `<p>Click <a href="${verifyLink}">here</a> to verify your email.</p>`,
  });

  res.send('Registration successful! Please check your email to verify your account.');
});


router.get('/verify-email', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).send('Invalid verification link.');

  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const userIndex = users.findIndex((u) => u.email === email);

  if (userIndex === -1) return res.status(404).send('User not found.');

  users[userIndex].isVerified = true;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  res.redirect('/login?verified=true');
});


router.get('/login', (req, res) => {
  res.render('login');
});


router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const users = await fs.readJson(USERS_FILE).catch(() => []);

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) return res.send('Invalid credentials');
  if (!user.isVerified) {
    return res.status(403).send('Please verify your email before logging in.');
  }

  req.session.user = user;
  res.redirect('/products');
});


router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

export default router;
