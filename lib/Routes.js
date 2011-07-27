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
        
        // get user's recent comments
        get_my_comments(user._id, function(my_comments) {
          get_replies_to_me(user._id, function(replies_to_me) {
            get_top_comments(function(top_comments) {
              console.log(top_comments)
              res.render('dashboard', {
                url: _r.URL,
                _id: user._id,
                username: user.username,
                my_comments: my_comments,
                replies_to_me: replies_to_me,
                top_comments: top_comments
              });
            })
          })
        })
        
      } else {
        // user is not logged in
        res.render('landing');
      }
    })
  } else { res.render('landing'); }
}

function get_my_comments(user_id, next) {
  CommentStream.find({ 'comments.author_id': user_id }, function(err, stream_my_comments) {
    var my_comments = [];
    var page_ids = [];
    for(var i=0; i<stream_my_comments.length; i++) {
      for(var j=0; j<stream_my_comments[i].comments.length; j++) {
        var comment = stream_my_comments[i].comments[j].toObject();
        comment.page_id = stream_my_comments[i].page_id;
        my_comments.push(comment)
        page_ids.push(comment.page_id);
      }
    }
    Page.find({ _id: { '$in': page_ids } }, function(err, pages) {
      for(var i=0; i<pages.length; i++) {
        for(var j=0; j<my_comments.length; j++) {
          if(my_comments[j].page_id.toString() == pages[i]._id.toString()) {
            my_comments[j].page_url = pages[i].page_url;
          }
        }
      }
      next(my_comments);
    })
  })
}
function get_replies_to_me (user_id, next) {
  CommentStream.find({ parent_author_id: user_id }, function(err, stream_replies) {
    var all_replies = [];
    var author_ids = [];
    var parent_ids = [];
    var page_ids = [];
    for(var i=0; i<stream_replies.length; i++) {
      for(var j=0; j<stream_replies[i].comments.length; j++) {
        var comment = stream_replies[i].comments[j].toObject();
        comment.parent_id = stream_replies[i].parent_id;
        comment.page_id = stream_replies[i].page_id;
        all_replies.push(comment);
        author_ids.push(comment.author_id);
        parent_ids.push(comment.parent_id);
        page_ids.push(comment.page_id);
      }
    }
    User.find({ _id: { '$in': author_ids } }, function(err, users) {
      for(var i=0; i<users.length; i++) {
        for(var j=0; j<all_replies.length; j++) {
          if(all_replies[j].author_id.toString() == users[i]._id.toString()) {
            all_replies[j].author = users[i].username;
          }
        }
      }
      CommentStream.find({ 'comments._id': { '$in': parent_ids } }, function(err, comment_streams) {
        for(var i=0; i<comment_streams.length; i++) {
          for(var j=0; j<comment_streams[i].comments.length; j++) {
            for(var k=0; k<all_replies.length; k++) {
              if(all_replies[k].parent_id.toString() == comment_streams[i].comments[j]._id.toString()) {
                all_replies[k].parent_body = comment_streams[i].comments[j].body;
              }
            }
          }
        }
        Page.find({ _id: { '$in': page_ids } }, function(err, pages) {
          for(var i=0; i<pages.length; i++) {
            for(var j=0; j<all_replies.length; j++) {
              if(all_replies[j].page_id.toString() == pages[i]._id.toString()) {
                all_replies[j].page_url = pages[i].page_url;
              }
            }
          }
          next(all_replies);
        })
      })
    })
  })
}
function get_top_comments(next) {
  var all_top_comments = [];
  CommentStream.find().sort('comments.ups',-1).run(function(err, comment_streams) {
    var author_ids = [];
    for(var i=0; i<Math.min(comment_streams.length,20); i++) {
      for(var j=0; j<comment_streams[i].comments.length; j++) {
        var comment = comment_streams[i].comments[j].toObject();
        comment.parent_id = comment_streams[i].parent_id;
        comment.page_id = comment_streams[i].page_id;
        all_top_comments.push(comment);
        author_ids.push(comment.author_id);
      }
    }
    all_top_comments.sort(sort_by_ups);
    all_top_comments.slice(0,20);
    User.find({ _id: { '$in': author_ids } }, function(err, users) {
      for(var i=0; i<users.length; i++) {
        for(var j=0; j<all_top_comments.length; j++) {
          if(all_top_comments[j].author_id.toString() == users[i]._id.toString()) {
            all_top_comments[j].author = users[i].username;
          }
        }
      }
      next(all_top_comments);
    })
  })
}
function sort_by_ups(a, b) { return a.ups < b.ups; }

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
  User.findOne({ username: req.cookies.username, password: req.cookies.password }, function(err, user) {
    if(user) {
      user.access_token = '';
      user.socket_id = '';
      user.save(function(err) {
        res.clearCookie('username');
        res.clearCookie('password');
        res.redirect('/');
      })
    } else {
      res.clearCookie('username');
      res.clearCookie('password');
      res.redirect('/');
    }
  })
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
      var target = err.message.match(/\$[a-z]+(?=_[0-9]+)/).toString().replace('$','');
      if(target == 'email') err.message = 'The email you entered already exists.';
      else if(target == 'username') err.message = 'The username you chose is already taken.';
      res.write(json({ success: false, error: err, target: target }));
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