var express = require('express'),
    fs = require('fs'),
    mongoose = require('mongoose');
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

var user = new User;
user.username = "mponizil";
user.save(function(err) {
  console.log('saved')
})

// configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
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
  res.render('webpage');
})
app.get('/webpage', function(req, res) {
  res.render('webpage');
});
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