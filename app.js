var express = require('express'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    json = JSON.stringify;
require('joose');
require('joosex-namespace-depended');
require('hash');

var app = module.exports = express.createServer();

mongoose.connect('mongodb://localhost/graffidia');

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Comment = new Schema({
  author: ObjectId,
  body: String,
  date: { type: Date, default: Date.now },
  ups: { type: Number, default: 0 },
  page_url: String,
  page_hash: String,
  page_x: Number,
  page_y: Number
})
var User = new Schema({
  username: String,
  password: String,
  email: String,
  ups: Number
})

var Comment = mongoose.model('Comment', Comment);
var User = mongoose.model('User', User);

// configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

var HOST, PORT, URL;

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  
  HOST = 'localhost';
  PORT = 3000;
  URL = HOST + ':' + PORT;
});

app.configure('production', function(){
  //app.use(express.errorHandler());
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  
  HOST = 'g.fringelessweb.com';
  PORT = 3000;
  URL = HOST + ':' + PORT;
});

// routes
app.get('/', function(req, res) {
  // check cookies
  var username = req.cookies.username;
  var password = req.cookies.password;
  
  if(username && password) {
    // check if it exists in mongo
    User.find({ username: username, password: password }, function(err, docs) {
      if(docs) {
        // user is logged in
        res.render('dashboard', { email: docs[0].email, username: docs[0].username });
      } else {
        // user is not logged in
        res.render('landing');
      }
    })
  }
})
app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = Hash.md5(req.body.password);
  
  User.find({ username: username, password: password }, function(err, docs) {
    if(docs) {
      // user exists, log them in
      res.cookie('username', docs[0].username, { expires: new Date(Date.now() + 1000*60*60*24*30), httpOnly: true });
      res.cookie('password', docs[0].password, { expires: new Date(Date.now() + 1000*60*60*24*30), httpOnly: true });
      
      res.write(json({ success: true }));
      res.end();
    } else {
      // user doesn't exist
      res.write(json({ success: false, error: 'No user found with the given username and password.' }));
      res.end();
    }
  })
})
app.post('/register', function(req, res) {
  var email = req.body.email;
  var username = req.body.username;
  var password = Hash.md5(req.body.password);
  
  var user = new User;
  user.email = email;
  user.username = username;
  user.password = password;
  user.save(function(err) {
    if(!err) {
      res.cookie('username', username, { expires: new Date(Date.now() + 1000*60*60*24*30), httpOnly: true });
      res.cookie('password', password, { expires: new Date(Date.now() + 1000*60*60*24*30), httpOnly: true });

      res.write(json({ success: true }));
      res.end();
    } else {
      res.write(json({ success: false, error: " + err + " }));
      res.end();
    }
  })
})
app.get('/bookmarklet', function(req, res) {
  res.render('bookmarklet', { url: URL });
});
app.get('/js/bookmarklet.js', function(req, res) {
  fs.readFile(__dirname + '/js/bookmarklet.js', 'utf8', function(err, data) {
    data = data.replace(/#{url}/,"'" + URL + "'")
    res.writeHead(200, {'Content-Type':'text/javascript'});
    res.write(data, 'utf8');
    res.end();
  })
})

app.listen(PORT);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

// socket.io begins
var io = require('socket.io').listen(app);
io.set('log level',2)

io.sockets.on('connection', function(socket) {
  var graphedia = new Graphedia(socket);
  
  socket.on('init', function(url, fn) {
    graphedia.init(url, fn)
  })
  socket.on('comments.new', function(data, fn) {
    graphedia.new_comment(data, fn);
  })
})

// graffidia object
function Graphedia(socket) {
  this.page_url = null;
  this.page_hash = null;
  this.socket = socket;
}
Graphedia.prototype.init = function(url, fn) {
  var g = this;
  
  g.page_url = url;
  g.page_hash = Hash.md5(url);
  
  g.socket.join(g.page_hash);
  
  // get all comments from mongo
  Comment.find({ page_hash: g.page_hash }, function(err, docs) {
    fn(docs);
  })
}
Graphedia.prototype.new_comment = function(data, fn) {
  var g = this;
  
  // save to mongo
  var comment = new Comment;
  comment.body = data.comment;
  comment.page_url = g.page_url;
  comment.page_hash = g.page_hash;
  comment.page_x = data.x;
  comment.page_y = data.y;
  comment.save(function(err) {
    // broadcast to all users
    g.socket.broadcast.to(g.page_hash).emit('comments.new',{ x: data.x, y: data.y, comment: data.comment});
    fn({ success: true })
  })
}