var fs = require('fs'),
    json = JSON.stringify,
    Comment = require('./MongoGraphedia').Comment,
    User = require('./MongoGraphedia').User;

var r = null;

function Routes(host, port, url) {
  this.HOST = host;
  this.PORT = port;
  this.URL = url;
  
  r = this;
}

Routes.prototype.dashboard = function(req, res) {
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
  } else { res.render('landing'); }
}
Routes.prototype.login = function(req, res) {
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
}
Routes.prototype.logout = function(req, res) {
  res.clearCookie('username');
  res.clearCookie('password');
  res.redirect('/');
}
Routes.prototype.register = function(req, res) {
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
}
Routes.prototype.mini_dash = function(req, res) {
  // check cookies
  var username = req.cookies.username;
  var password = req.cookies.password;
  
  if(username && password) {
    // check if it exists in mongo
    User.find({ username: username, password: password }, function(err, docs) {
      if(docs) {
        // user is logged in
        res.write(cb('mini_dash', { email: docs[0].email, username: docs[0].username }));
        res.end();
      } else {
        // user is not logged in
        res.write(cb('mini_dash', null));
        res.end();
      }
    })
  } else {
    res.write(cb('mini_dash', null));
    res.end();
  }
}
Routes.prototype.bmjs = function(req, res) {
  fs.readFile(__dirname + '/js/bookmarklet.js', 'utf8', function(err, data) {
    data = data.replace(/#{url}/,"'" + r.URL + "'")
    res.writeHead(200, {'Content-Type':'text/javascript'});
    res.write(data, 'utf8');
    res.end();
  })
}

function cb(fn, data) {
  return 'GC.' + fn + '(' + json(data) + ')';
}

module.exports = Routes;