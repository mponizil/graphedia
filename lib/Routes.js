var MongoGraphedia = require('./MongoGraphedia');
var fs = require('fs'),
    json = JSON.stringify,
    Page = MongoGraphedia.Page,
    CommentStream = MongoGraphedia.CommentStream,
    User = MongoGraphedia.User,
    Vote = MongoGraphedia.Vote;

var _r = null;

function Routes(host, port, url) {
  this.HOST = host;
  this.PORT = port;
  this.URL = url;
  
  _r = this;
}

Routes.prototype.dashboard = function(req, res) {
  // check cookies
  var username = req.cookies.username;
  var password = req.cookies.password;

  if(username && password) {
    // check if it exists in mongo
    User.findOne({ username: username, password: password }, function(err, user) {
      if(user) {
        // user is logged in
        res.render('dashboard', { _id: user._id, username: user.username });
      } else {
        // user is not logged in
        res.render('landing');
      }
    })
  } else { res.render('landing'); }
}
Routes.prototype.login = function(req, res) {
  var response;
  var username = req.body.username;
  var password = Hash.md5(req.body.password);
  
  User.findOne({ username: username, password: password }, function(err, user) {
    if(user) {
      // user exists, log them in
      res.cookie('username', user.username, { expires: new Date(Date.now() + 1000*60*60*24*30), httpOnly: true });
      res.cookie('password', user.password, { expires: new Date(Date.now() + 1000*60*60*24*30), httpOnly: true });
      
      var access_token = generate_token();
      user.access_token = access_token;
      user.save();
      
      response = { success: true, access_token: access_token, _id: user._id, username: user.username };
      res.write(json(response));
      
      res.end();
    } else {
      // user doesn't exist
      response = { success: false, error: 'No user found with the given username and password.' };
      res.write(json(response));
      
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
      res.write(json({ success: false, error: err }));
      res.end();
    }
  })
}
Routes.prototype.remote_login = function(req, res) {
  var url = req.query.url;
  
  // check cookies
  var username = req.cookies.username;
  var password = req.cookies.password;
  
  if(username && password) {
    // check if it exists in mongo
    User.findOne({ username: username, password: password }, function(err, user) {
      if(user) {
        // user is logged in
        
        // generate access token
        var access_token = generate_token();
        user.access_token = access_token;
        user.save();
        
        res.render('remote_login', { layout: false, url: url, access_token: access_token, _id: user._id, username: user.username });
      } else {
        // user is not logged in
        res.render('remote_login', { layout: false, url: url, access_token: null });
      }
    })
  } else {
    res.render('remote_login', { layout: false, url: url, access_token: null });
  }
}
Routes.prototype.bmjs = function(req, res) {
  fs.readFile(__dirname + '/js/bookmarklet.js', 'utf8', function(err, data) {
    data = data.replace(/#{url}/,"'" + _r.URL + "'")
    res.writeHead(200, {'Content-Type':'text/javascript'});
    res.write(data, 'utf8');
    res.end();
  })
}

function generate_token() {
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var string_length = 32;
	var random_string = '';
	for (var i=0; i<string_length; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		random_string += chars.substring(rnum,rnum+1);
	}
	return Hash.md5(random_string);
}

module.exports = Routes;