
// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var methodOverride = require("method-override");
var path = require("path"); 
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Require request and cheerio. This makes the scraping possible
var request = require("request");
var cheerio = require("cheerio");

mongoose.Promise = Promise;

var app = express();

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/nytscraper");
var db = mongoose.connection;

db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

db.once("open", function() {
  console.log("Mongoose connection successful.");
});

//set up for handlebars
app.use(express.static(process.cwd() + "/public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride("_method"));
var exphbs = require("express-handlebars");
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(logger("dev"));

//routes

app.get("/", function (req, res) {
    res.render("index");
});

// Scrape data from one site and place it into the mongodb db
app.get("/scrape", function(req, res) {
  // Make a request for the news section of ycombinator
  request("https://www.nytimes.com/", function(error, response, html) {
    // Load the html body from request into cheerio
    var $ = cheerio.load(html);

    $(".story-heading").each(function(i, element) {
     var result = {};
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

       var entry = new Article(result);

      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          //console.log(doc);
        }
      });
    });
  });
  // Tell the browser that we finished scraping the text
  res.redirect("/articles");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      // res.json(doc);
      res.render("articles", doc);
      console.log(doc)
    }
  });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Article.findOne({ "_id": req.params.id })
  // ..and populate all of the notes associated with it
  .populate("note")
  // now, execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});




// Listen on port 3000
app.listen(3000, function() {
  console.log("App running on port 3000!");
});
