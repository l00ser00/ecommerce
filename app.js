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

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "This is the secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false);
mongoose.connect("mongodb+srv://L00SEROO:slMhtBAjkeUES7wM@cluster1.diida4x.mongodb.net/product", {useNewUrlParser: true});


const productSchema = new mongoose.Schema({
  title: String,
  price: Number,
  details: String,
  warrenty: Number,
  photo: [String]
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  likedProducts: {
    type: [String],
    default: []
  },
  cart: {
    type: [String],
    default: []
  }
});

const checkSchema = new mongoose.Schema({
  email: String,
  name: String,
  address: String,
  phone: Number,
  product: String
});

userSchema.plugin(passportLocalMongoose);

const Product = mongoose.model("Product", productSchema);
const User = mongoose.model("User", userSchema);
const Checkout = mongoose.model("Checkout", checkSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


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
    for (var i=0; i<foundProducts.length; i++) {
      let productt= _.lowerCase(foundProducts[i].title);
      if(productt === postProducts) {
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
  res.render("createProducts");
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


app.get("/checkout", function(req, res) {
  var arrPrice= [];
  var cartArr= req.user.cart;
if(req.isAuthenticated()) {
  Promise.all(cartArr.map(cartItem => Product.findOne({ title: cartItem })))
  .then(foundProducts => {
    arrPrice = foundProducts.map(foundProduct => foundProduct.price);

    var sum = arrPrice.reduce((acc, currentValue) => acc + currentValue, 0);

    res.render("checkout", {
      e_mail: req.user.username,
      array: cartArr,
      priceArray: arrPrice,
      sum: sum
    }); // arrPrice can now be used outside of the for loop
  })
  .catch(function(err) {
    console.log(err);
  });
}
else {
  res.redirect("/login");
}
});


app.post("/checkout", function(req, res) {
  var namee= req.body.fname + req.body.lname;
  var add= req.body.add_1 + req.body.add_2 + req.body.pin;

  const newCheckout = new Checkout({
    email: req.body.e_mail,
    name: namee,
    address: add,
    phone: req.body.phone,
    //product:
  });
  newCheckout.save();

});


app.get("/register", function(req, res) {
  res.render("register");
});


app.get("/login", function(req, res) {
  res.render("login");
});


app.post("/register", function(req, res) {
  User.register({username: req.body.username }, req.body.password, function(err, user) {
    if(err) {
        console.log(err);
        res.redirect("/register");
    }
    else {
      passport.authenticate("local")(req, res, function(){
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
    if(err) {
      console.log(err);
    }
    else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
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
  if(req.isAuthenticated()) {
    var arr= [];

    var likedd= req.user.likedProducts;
    for(let i=0; i<likedd.length; i++) {
      var likeee= likedd[i];
      Product.findOne({title: likeee})
      .then(function(foundProducts) {
        // console.log(likedd);
        let newObj = new obj((foundProducts.title), (foundProducts.details), (foundProducts.photo));
        arr.push(newObj);
      })
      .catch(function(err) {
        console.log(err);
      });
    }

Promise.all(likedd.map(likeee => Product.findOne({title: likeee})))
.then(foundProducts => {
  arr = foundProducts.map(foundProduct => new obj(foundProduct.title, foundProduct.details, foundProduct.photo));
  res.render("likedProducts", {
    array: arr
  });
})
.catch(function(err) {
  console.log(err);
});
  }

  else  {
    res.redirect("/login");
  }
});


app.get("/cart", function(req, res) {
  function obj(title, price, snap) {
    this.title = title;
    this.price = price;
    this.snap = snap;
  }
  if(req.isAuthenticated()) {
    var arr= [];

    var addedItem= req.user.cart;
    for (var i = 0; i < addedItem.length; i++) {
      var cartItem= addedItem[i];
      Product.findOne({title: cartItem})
      .then(function(foundProducts) {
        let newObj = new obj(foundProducts.title, foundProducts.price, foundProducts.photo[0])
        arr.push(newObj);
      })
      .catch(function(err) {
        console.log(err);
      });
    }
    Promise.all(addedItem.map(cartItem => Product.findOne({ title: cartItem})))
    .then(foundProducts => {
      arr = foundProducts.map(foundP => new obj(foundP.title, foundP.price, foundP.photo[0]));
      res.render("cart", {
        array: arr
      });
    })
    .catch(err => {
      console.log(err);
    });
  }
  else {
    res.redirect("/login");
  }
});


app.post("/likes", function(req, res) {
  const likedItem = req.body.liked;

  if(req.isAuthenticated()) {
    const userId = req.user;
    userId.likedProducts.push(likedItem);
    userId.save();
  }
  else {
    res.redirect("/login");
  }
});


app.post("/cart", function(req, res) {
  const addedItem = req.body.cart;

  if(req.isAuthenticates()) {
    const userId = req.user;
    userId.cart.push(addedItem);
    userId.save();
  }
  else {
    res.render("/login");
  }
});


app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if(err) {
      console.log(err);
    }
    else {
  res.redirect("/products");
    }
  });
});


app.listen(3000, function() {
  console.log("Server is running at Port 3000");
});
