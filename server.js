
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
  var query = Article.find({}).limit(10); 
  query.exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    else {
      // res.json(doc);
      res.render("articles", {Article: doc});
    }
  });
});

// save articles to database and remove everything else
app.get("/articles/:id", function(req, res) {
  Article.findOneAndUpdate({ "_id": req.params.id })
  .exec(function(error, doc) {
    if (error) {
      console.log(error);
    }
    else {
      Articles.save = req.body.saved;
      Articles.remove({saved: false}, function (err) {
        if (err) return handleError(err);
      });
    }
  });
});

// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  var newNote = new Note(req.body);
  // And save the new note the db
  newNote.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's note
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});



// Listen on port 3000
app.listen(3000, function() {
  console.log("App running on port 3000!");
});
