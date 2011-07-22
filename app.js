// constants
var HOST, PORT, URL;

// express
var express = require('express');
require('joose');
require('joosex-namespace-depended');
require('hash');

// internal modules
var Graphedia = require('./lib/Graphedia');
var Routes = require('./lib/Routes');

var app = module.exports = express.createServer();

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

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  
  HOST = 'localhost';
  PORT = 3000;
  URL = HOST + ':' + PORT;
});

app.configure('production', function(){
  //app.use(express.errorHandler());
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  
  HOST = 'graffidia.com';
  PORT = 80;
  URL = HOST + ':' + PORT;
});

// routes
var routes = new Routes(HOST, PORT, URL);
app.get('/', routes.dashboard);
app.get('/dashboard', routes.dashboard);
app.post('/login', routes.login);
app.get('/remote_login', routes.remote_login)
app.get('/logout', routes.logout);
app.post('/register', routes.register);
app.get('/bookmarklet', function(req, res) {
  res.render('bookmarklet', { url: URL });
});
app.get('/js/bookmarklet.js', routes.bmjs)

app.listen(PORT);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

// socket.io begins
var io = require('socket.io').listen(app);
io.set('log level',2)

io.sockets.on('connection', function(socket) {
  var graphedia = new Graphedia(socket);
  
  socket.on('graphedia.init', function(url, fn) {
    graphedia.init(url, fn)
  })
  socket.on('users.load', function(user_id, fn) {
    graphedia.load_user(user_id, fn);
  })
  socket.on('users.access_token', function(access_token) {
    graphedia.access_token(access_token, socket.id);
  })
  socket.on('comments.new', function(data, fn) {
    graphedia.new_comment(data.access_token, data.parent_id, data.comment, data.page_x, data.page_y, fn);
  })
  socket.on('comments.upvote', function(data, fn) {
    graphedia.upvote(data.access_token, data.parent_id, data.comment_id, fn)
  })
  
  socket.on('disconnect', function() {
    graphedia.disconnect(socket.id);
  })
})