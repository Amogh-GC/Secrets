//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});


userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });
const User = mongoose.model('User', userSchema);
app.get('/', (req, res) => {
  res.render('home');
});
app.get('/login', (req, res) => {
  res.render('login');
});
app.get('/secrets', (req, res) => {
  res.render('secrets');
});
app.get('/register', (req, res) => {
  res.render('register');
});
app.post('/register', async (req, res) => {
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });
  try {
    await newUser.save();
    res.render('secrets');
  } catch (err) {
    console.log(err);
    res.status(500).send('Error saving user');
  }
}); 
app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const foundUser = await User.findOne({email: username});
  if (foundUser) {
    if (foundUser.password === password) {
      res.render('secrets');
    }
  }
});
// MongoDB Atlas connection
main().catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb+srv://amoghleader:rC1UdaPd7x7SmjAw@cluster0.e2zz8.mongodb.net/userDB');
}
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});