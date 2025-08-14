const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const ordersFile = path.join(__dirname, '../data/orders.json');


const razorpay = new Razorpay({
    key_id: "rzp_test_6DRWWpthvml3sQ",
    key_secret: "XJTuFp8J6SggDIhLxi9N9BQw"
});

router.get('/', (req, res) => {
  res.render('payment', {
    razorpayKey: "rzp_test_6DRWWpthvml3sQ"
  });
});


router.post('/cod', (req, res) => {
  const { address, cartItems, userEmail } = req.body;
  const orders = JSON.parse(fs.readFileSync(ordersFile));

  const newOrder = {
    id: 'order_' + Date.now(),
    userEmail,
    items: cartItems,
    address,
    paymentMethod: 'COD',
    paymentStatus: 'Pending',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

  res.json({ success: true, message: 'Order placed via COD', orderId: newOrder.id });
});


router.post('/upi/order', async (req, res) => {
  const { amount } = req.body;

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, 
      currency: 'INR',
      payment_capture: 1
    });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.post('/upi/verify', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cartItems, userEmail, address } = req.body;

  const bodyData = razorpay_order_id + '|' + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', "XJTuFp8J6SggDIhLxi9N9BQw")
    .update(bodyData)
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    const orders = JSON.parse(fs.readFileSync(ordersFile));

    const newOrder = {
      id: razorpay_order_id,
      userEmail,
      items: cartItems,
      address,
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

    res.json({ success: true, message: 'Payment verified & order placed' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid signature' });
  }
});
module.exports = router;
