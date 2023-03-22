//jshint esversion:6
require('dotenv').config();
const express = require("express")
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const { Schema } = mongoose.Schema;
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

  app.use(session({
    secret: 'You are my best friend',
    resave: false,
    saveUninitialized: true,
  }))

  app.use(passport.initialize());
  app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser:true});

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);


module.exports = mongoose.model('User', userSchema);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/google/secrets",
  userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOne({ googleId: profile.id }).then((foundUser) => {
    if (foundUser) {
      return foundUser;
    } else {
      const newUser = new User({
        googleId: profile.id
      });
      return newUser.save();
    }
  }).then((user) => {
    return cb(null, user);
  }).catch((err) => {
    return cb(err);
  });
}
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APPID,
  clientSecret: process.env.FACEBOOK_SECRET,
  callbackURL: "http://localhost:3001/auth/facebook/secrets",
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOne({ facebookId: profile.id }).then((foundUser) => {
    if (foundUser) {
      return foundUser;
    } else {
      const newUser = new User({
        facebookId: profile.id
      });
      return newUser.save();
    }
  }).then((user) => {
    return cb(null, user);
  }).catch((err) => {
    return cb(err);
  });
}
));


app.get("/", function(req, res){
  res.render("home");
});

app.route('/auth/google')
.get(passport.authenticate('google', {
scope: ['profile']

}));

app.get('/auth/google/secrets',
passport.authenticate('google', { failureRedirect: '/login', failureMessage: true }),
function(req, res) {
  res.redirect('/secrets');
});

app.route('/auth/facebook')
.get(passport.authenticate('facebook', {
scope: ['public_profile']

}));
 
app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login', }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", async function(req, res){
  const usersWithSecrets = await User.find({"secret": {$ne: null}}).exec();
    if (usersWithSecrets) {
      res.render("secrets", {usersWithSecrets});
    }
  }
);

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  res.redirect("/");
});


app.post("/submit", async function(req, res) {
  const submittedSecret = req.body.secret;
  const foundUser = await User.findById(req.user.id);
      if (foundUser) {
        foundUser.secret = submittedSecret;
        const newSecret = await foundUser.save();

            res.redirect("/secrets");
      
          }
          });

app.post("/register", function(req, res){
 
  User.register({username: req.body.username}, req.body.password, function(err, user) {
  if (err) {
    console.log(err);
    res.redirect("/register");
  } else {
    passport.authenticate('local')(req, res, function(){
        res.redirect("/secrets");
    })
  
  };
  });
});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password 
    });

      req.login(user, function(err){
        if (err) {
          console.log();
        } else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");


          
            })
          }
        });
      });

app.listen(3001, function() {
  console.log("Server started on Port 3001.");
});