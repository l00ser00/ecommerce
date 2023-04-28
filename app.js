const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(session({
  secret: "This is the secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false);
mongoose.connect("mongodb+srv://L00SEROO:slMhtBAjkeUES7wM@cluster1.diida4x.mongodb.net/product", {
  useNewUrlParser: true
});


const productSchema = new mongoose.Schema({
  title: String,
  price: Number,
  details: String,
  warrenty: Number,
  photo: [String]
});

const itemSchema = new mongoose.Schema({
  name: String,
  quantity: Number
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  likedProducts: {
    type: [String],
    default: []
  },
  cart: {
    type: [itemSchema],
    default: []
  }
});

const checkSchema = new mongoose.Schema({
  email: String,
  name: String,
  address: String,
  phone: Number,
  product: {
    type: [itemSchema],
    default: []
  }
});

userSchema.plugin(passportLocalMongoose);

const Product = mongoose.model("Product", productSchema);
const User = mongoose.model("User", userSchema);
const Checkout = mongoose.model("Checkout", checkSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

let previousPage = "/";

app.get("/", function(req, res) {
  Product.find({})
    .then(function(foundProducts) {
      res.render("home", {
        productsArray: foundProducts
      });
    })
    .catch(function(error) {
      console.log(err);
    });
});


app.get("/products/:topic", function(req, res) {
  let postProducts = _.lowerCase(req.params.topic);
  Product.find({})
    .then(function(foundProducts) {
      for (var i = 0; i < foundProducts.length; i++) {
        let productt = _.lowerCase(foundProducts[i].title);
        if (productt === postProducts) {
          res.render("products", {
            cusTitle: foundProducts[i].title,
            cusPrice: foundProducts[i].price,
            cusDetails: foundProducts[i].details,
            cusWarrenty: foundProducts[i].warrenty,
            photoArr: foundProducts[i].photo
          });
        }
      }
    })
    .catch(function(err) {
      console.log(err);
    });
});


app.get("/createProducts", function(req, res) {
  if (req.user.email === "aniketshaw007007@gmail.com") {
    res.render("createProducts");
  } else {
    res.redirect("/");
  }
});


app.post("/createProducts", function(req, res) {
  const newProduct = new Product({
    title: req.body.productName,
    price: req.body.price,
    details: req.body.productDetails,
    warrenty: req.body.warrenty,
    photo: req.body.image_URL
  });
  newProduct.save();
  res.redirect("/products");
});


app.post("/updateCount", function(req, res) {

  function getQuantity() {
    let data = req.body.cow;
    let cart = req.user.cart;
    const userId = req.user;
    let promises = [];

    for (let i = 0; i < cart.length; i++) {
      for (let j = 0; j < data.length; j++) {
        if (data[j].heading === cart[i].name) {
          let newQuantity = Number(data[j].quanti);
          if (newQuantity !== cart[i].quantity) {
            let itemId = cart[i]._id;
            let promise = User.updateOne({
              _id: userId._id,
              "cart._id": itemId
            }, {
              $set: {
                "cart.$.quantity": newQuantity
              }
            });
            promises.push(promise);
          }
        }
      }
    }
    return Promise.all(promises).then(() => data);
  }

  async function callin() {
    await getQuantity();
    res.redirect("/checkout");
  }
  callin();
});


app.get("/checkout", function(req, res) {
  let arrPrice = [];
  if (req.isAuthenticated()) {
    function getCart() {
      let cartItem = req.user.cart;
      let promises = [];
      for (let i = 0; i < cartItem.length; i++) {
        let cartItemName = cartItem[i].name;
        let cartItemQuantity = cartItem[i].quantity;
        let promise = Product.findOne({
            title: cartItemName
          })
          .then(foundProduct => {
            let obj = {
              title: foundProduct.title,
              price: foundProduct.price,
              quantity: cartItemQuantity
            }
            arrPrice.push(obj);
          })
        promises.push(promise);
      }
      return Promise.all(promises).then(() => arrPrice);
    }

    async function callin() {
      const arrayCreated = await getCart();
      let sum = 0;
      for (let i = 0; i < arrayCreated.length; i++) {
        sum = sum + (arrayCreated[i].price * arrayCreated[i].quantity);
      }

      res.render("checkout", {
        array: arrayCreated,
        sum: sum,
        e_mail: req.user.username
      });
    }
    callin();
  } else {
    previousPage = req.originalUrl;
    res.redirect("/login");
  }
});


app.post("/checkout", function(req, res) {
  var namee = req.body.fname + req.body.lname;
  var add = req.body.add_1 + req.body.add_2 + req.body.pin;
  let userId = req.user;

  const newCheckout = new Checkout({
    email: req.body.e_mail,
    name: namee,
    address: add,
    phone: req.body.phone,
    product: req.user.cart
  });
  newCheckout.save().then(() => {
    console.log("Order Created");
    res.redirect("/order");
  });
  User.updateOne({
    _id: userId
  }, {
    $set: {
      cart: []
    }
  });
});


app.get("/order", function(req, res) {
  if (req.isAuthenticated()) {
  let userEmail = req.user.email;
  Checkout.find({email: userEmail}).then(foundOrder => {
    console.log(foundOrder);
    res.render("orderPage", {
      orders: foundOrder
    });
  })
  .catch(err => {
    console.log(err);
  });
}
else {
  previousPage = req.originalUrl;
  res.redirect("/login");
}
});


app.get("/register", function(req, res) {
  res.render("register");
});


app.get("/login", function(req, res) {
  res.render("login");
});


app.post("/register", function(req, res) {
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});


app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect(previousPage);
      })
    }
  });
});


app.get("/likes", function(req, res) {
  function obj(titlee, detaill, snap) {
    this.titlee = titlee;
    this.detaill = detaill;
    this.snap = snap;
  }
  if (req.isAuthenticated()) {
    var arr = [];

    var likedd = req.user.likedProducts;
    for (let i = 0; i < likedd.length; i++) {
      var likeee = likedd[i];
      Product.findOne({
          title: likeee
        })
        .then(function(foundProducts) {
          // console.log(likedd);
          let newObj = new obj((foundProducts.title), (foundProducts.details), (foundProducts.photo));
          arr.push(newObj);
        })
        .catch(function(err) {
          console.log(err);
        });
    }

    Promise.all(likedd.map(likeee => Product.findOne({
        title: likeee
      })))
      .then(foundProducts => {
        arr = foundProducts.map(foundProduct => new obj(foundProduct.title, foundProduct.details, foundProduct.photo));
        res.render("likedProducts", {
          array: arr
        });
      })
      .catch(function(err) {
        console.log(err);
      });
  } else {
    previousPage = req.originalUrl;
    res.redirect("/login");
  }
});


app.get("/cart", function(req, res) {
  if (req.isAuthenticated()) {
    let arr = [];

    function getCart() {
      let cartItem = req.user.cart;
      let promises = [];
      for (var i = 0; i < cartItem.length; i++) {
        let cartItemName = cartItem[i].name;
        let cartItemQuantity = cartItem[i].quantity;
        let promise = Product.findOne({
            title: cartItemName
          })
          .then(foundProduct => {
            let obj = {
              title: foundProduct.title,
              price: foundProduct.price,
              snap: foundProduct.photo[0],
              quantity: cartItemQuantity
            }
            arr.push(obj);
          })
        promises.push(promise);
      }
      return Promise.all(promises).then(() => arr);
    }

    async function callin() {
      const arrayCreated = await getCart();
      res.render("cart", {
        array: arrayCreated
      });
    }
    callin();
  } else {
    previousPage = req.originalUrl;
    res.redirect("/login");
  }
});


app.post("/likes", function(req, res) {
  const likedItem = req.body.liked;

  if (req.isAuthenticated()) {
    const userId = req.user;
    userId.likedProducts.push(likedItem);
    userId.save();
  } else {
    previousPage = req.originalUrl;
    res.redirect("/login");
  }
});


app.post("/delete", function(req, res) {
  const page = req.body.pageName;
  const title = req.body.title;
  const userId = req.user;

  if (page === "likes") {
    User.updateOne({
        _id: userId._id
      }, {
        $pull: {
          likedProducts: title
        }
      })
      .then(result => {
        res.redirect("/likes")
      })
      .catch(err => {
        console.log(err);
      })
  } else if (page === "cart") {
    let itemId =
      User.updateOne({
        _id: userId._id,
      }, {
        $pull: {
          cart: {
            name: title
          }
        }
      })
      .then(result => {
        res.redirect("/cart")
      })
      .catch(err => {
        console.log(err);
      })
  }
});


app.post("/cart", function(req, res) {
  const addedItemName = req.body.cart;
  let quantiti = Number(req.body.quantiti);

  if (req.isAuthenticated()) {
    const userId = req.user;
    let cartItem = req.user.cart;
    let count = 0;
    for (var i = 0; i < cartItem.length; i++) {
      if (cartItem[i].name === addedItemName) {
        count++;
        let newQuantity = cartItem[i].quantity + quantiti;
        let itemId = cartItem[i]._id;
        User.updateOne({
            _id: userId._id,
            "cart._id": itemId
          }, {
            $set: {
              "cart.$.quantity": newQuantity
            }
          })
          .then(result => {
            res.redirect("/cart");
          })
          .catch(err => {
            console.log(err);
          });
      }
    }
    if (count === 0) {
      let addedItem = {
        name: addedItemName,
        quantity: quantiti
      }
      userId.cart.push(addedItem);
      userId.save().then(() => {
          res.redirect(req.originalUrl);
        })
        .catch(err => {
          console.log(err);
        });
    }
  } else {
    previousPage = req.originalUrl;
    res.redirect("/login");
  }
});


app.post("/buynow", function(req, res) {
  if (req.isAuthenticated()) {
    let product = req.body.buy_now;
    const userId = req.user;
    userId.cart.push(product);
    userId.save();
    res.redirect("/checkout")
  } else {
    previousPage = req.originalUrl;
    res.redirect("/login")
  }
});


app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});


let port = process.env.PORT;
if(port == null || port == "") {
port = 3000;
}


app.listen(port, function() {
  console.log("Server is running at Port 3000");
});
