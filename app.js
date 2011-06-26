var express = require('express');
require('joose')
require('joosex-namespace-depended')
require('hash')

var app = module.exports = express.createServer();

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
  app.use(express.errorHandler());
  
  HOST = 'e-lite.org';
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

app.listen(PORT);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

var io = require('socket.io').listen(app);
io.set('log level',2)

var pages = [];

io.sockets.on('connection', function(socket) {
  socket.on('init', function(data) {
    console.log(data.url);
    console.log(Hash.md5(data.url))
  })
})