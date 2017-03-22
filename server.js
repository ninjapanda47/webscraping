
// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var methodOverride = require("method-override");
var path = require("path"); 
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
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

app.get("/scrape", function(req, res) {
  request("https://www.nytimes.com/", function(error, response, html) {
    var $ = cheerio.load(html);

    $(".story-heading").each(function(i, element) {
     var result = {};
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");
      result.saved = false;

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

  res.redirect("/articles");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  var query = Article.find({saved: false}).limit(10); 
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
app.put("/articles/:id", function(req, res) {
  Article.findByIdAndUpdate({_id : req.params.id}, {$set: { saved: req.body.saved }},function
  (error, doc) {
    if (error) {
      console.log(error);
    }
    else {
      res.redirect("/articles")
      // Article.remove({saved: false}, function (err) {
      //   if (err) return handleError(err);
      // });
    }
  });
});

// This will get the saved articles
app.get("/saved", function(req, res) {
  // Grab every doc in the Articles array
  var query = Article.find({saved: true}); 
  query.exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    else {
      res.render("saved", {Article: doc, Note: doc});
    }
  });
});

// save articles to database and remove everything else
app.put("/saved/:id", function(req, res) {
  Article.findByIdAndUpdate({_id : req.params.id}, {$set: { saved: req.body.saved }},function
  (error, doc) {
    if (error) {
      console.log(error);
    }
    else {
      res.redirect("/saved");
    }
  });
});

// // Create a new note or replace an existing note
app.post("/saved/:id", function(req, res) {
  var newNote = new Note(req.body);
  newNote.save(function(error, doc) {
    if (error) {
      console.log(error);
    }
    else {
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
      .populate("Note")
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          res.redirect("/saved");
        }
      });
    }
  });
});



// Listen on port 3000
app.listen(3000, function() {
  console.log("App running on port 3000!");
});
