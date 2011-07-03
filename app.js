var express = require('express'),
    fs = require('fs');
require('joose');
require('joosex-namespace-depended');
require('hash');

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
app.get('/', Routes.dashboard)
app.get('/dashboard', Routes.dashboard)
app.post('/login', Routes.login)
app.get('/logout', Routes.logout);
app.post('/register', Routes.register)
app.get('/bookmarklet', function(req, res) {
  res.render('bookmarklet', { url: URL });
});
app.get('/js/bookmarklet.js', Routes.bmjs)

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