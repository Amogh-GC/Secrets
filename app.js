//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
//const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const app = express();


app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose, {usernameField: 'email'});
//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });
const User = mongoose.model('User', userSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
}, async function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ googleId: profile.id });
    if (existingUser) {
      return cb(null, existingUser);
    } else {
      // Get email from profile, with fallback
      let email = null;
      if (profile.emails && profile.emails.length > 0) {
        email = profile.emails[0].value;
      } else if (profile._json && profile._json.email) {
        email = profile._json.email;
      }
      
      // Create new user
      const newUser = new User({
        googleId: profile.id,
        email: email || `google_${profile.id}@example.com` // Fallback email
      });
      await newUser.save();
      return cb(null, newUser);
    }
  } catch (err) {
    console.log('Google OAuth error:', err);
    return cb(err, null);
  }
}));

app.get('/', (req, res) => {
  res.render('home');
});
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/secrets', passport.authenticate('google', { failureRedirect: '/login' }), function(req, res) {
  res.redirect('/secrets');
});
app.get('/login', (req, res) => {
  res.render('login');
});
app.get('/register', (req, res) => {
  res.render('register');
});
app.get('/secrets', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const foundUsers = await User.find({secret: {$ne: null}});
      res.render('secrets', {usersWithSecrets: foundUsers});
    } catch (err) {
      console.log(err);
      res.redirect('/login');
    }
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) {
      console.log(err);
    }
    res.redirect('/');
  });
});
app.get('/submit',function(req,res){
  if(req.isAuthenticated()){
    res.render('submit');
  }else{
    res.redirect('/login');
  }
});
app.post('/submit', async function(req,res){
  const submittedSecret = req.body.secret;
  const user = await User.findById(req.user._id);
  user.secret = submittedSecret;
  await user.save();
  res.redirect('/secrets');
});
app.post('/register', async (req, res) => {
  // try {
  //   const hash = await bcrypt.hash(req.body.password, saltRounds);
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: hash
  //   });
  //   await newUser.save();
  //   res.render('secrets');
  // } catch (err) {
  //   console.log(err);
  //   res.status(500).send('Error saving user');
  // }
  User.register({email: req.body.email}, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      if (err.name === 'UserExistsError') {
        console.log('User already exists with this email');
      }
      res.redirect('/register');
    } else {
      passport.authenticate('local')(req, res, function() {
        res.redirect('/secrets');
      });
    }
  });
}); 
app.post('/login', async (req, res) => {
  // const username = req.body.username;
  // const password = req.body.password;
  // const foundUser = await User.findOne({email: username});
  // if (foundUser) {
  //   bcrypt.compare(password, foundUser.password, function(err, result) {  
  //     if (result === true) {
  //       res.render('secrets');
  //     }
  //   });
  // }
  
  console.log('Login attempt with email:', req.body.email);
  
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      console.log('Authentication error:', err);
      return res.redirect('/login');
    }
    if (!user) {
      console.log('No user found or invalid credentials');
      return res.redirect('/login');
    }
    req.logIn(user, function(err) {
      if (err) {
        console.log('Login error:', err);
        return res.redirect('/login');
      }
      console.log('User logged in successfully:', user.email);
      return res.redirect('/secrets');
    });
  })(req, res);
});
// MongoDB Atlas connection
main().catch(err => console.log(err));
async function main() {
  const mongoURI = process.env.MONGODB_URI;
  await mongoose.connect(mongoURI);
}
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});