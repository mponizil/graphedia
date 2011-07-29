var MongoGraphedia = require('./MongoGraphedia');
var fs = require('fs'),
    json = JSON.stringify,
    parseUri = require('./util').parseUri,
    Page = MongoGraphedia.Page,
    CommentStream = MongoGraphedia.CommentStream,
    User = MongoGraphedia.User,
    Vote = MongoGraphedia.Vote,
    Auth = MongoGraphedia.Auth;

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
        var auth = new Auth;
        auth.access_token = generate_token();
        auth.user_id = user._id;
        auth.save();
        res.cookie('access_token', auth.access_token, { expires: new Date(Date.now() + 1000*60*60*24*30) });
        
        get_my_comments(user._id, function(my_comments) {
          get_replies_to_me(user._id, function(replies_to_me) {
            get_top_comments(function(top_comments) {
              get_top_sites(function(top_sites) {
                get_latest_comments(function(latest_comments) {
                  res.render('dashboard', {
                    url: _r.URL,
                    _id: user._id,
                    username: user.username,
                    my_comments: my_comments,
                    replies_to_me: replies_to_me,
                    top_comments: top_comments,
                    latest_comments: latest_comments
                  });
                })
              })
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
  var all_my_comments = [];
  CommentStream.find({ 'comments.author_id': user_id }).sort('comments.date',-1).run(function(err, comment_streams) {
    var page_ids = [];
    for(var i=0; i<comment_streams.length; i++) {
      for(var j=0; j<comment_streams[i].comments.length; j++) {
        var comment = comment_streams[i].comments[j].toObject();
        comment.page_id = comment_streams[i].page_id;
        if(comment.author_id.toString() == user_id) {
          all_my_comments.push(comment)
          page_ids.push(comment.page_id);
        }
      }
    }
    all_my_comments.sort(by_date)
    all_my_comments = all_my_comments.slice(0,20);
    Page.find({ _id: { '$in': page_ids } }, function(err, pages) {
      for(var i=0; i<pages.length; i++) {
        for(var j=0; j<all_my_comments.length; j++) {
          if(all_my_comments[j].page_id.toString() == pages[i]._id.toString()) {
            all_my_comments[j].page_url = pages[i].page_url;
            all_my_comments[j].stripped_url = parseUri(pages[i].page_url).host;
          }
        }
      }
      next(all_my_comments);
    })
  })
}
function get_replies_to_me (user_id, next) {
  var all_replies = [];
  CommentStream.find({ parent_author_id: user_id }, function(err, stream_replies) {
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
    all_replies.sort(by_date);
    all_replies = all_replies.slice(0,20);
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
                all_replies[j].stripped_url = parseUri(pages[i].page_url).host;
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
    var page_ids = [];
    for(var i=0; i<Math.min(comment_streams.length,20); i++) {
      for(var j=0; j<comment_streams[i].comments.length; j++) {
        var comment = comment_streams[i].comments[j].toObject();
        comment.parent_id = comment_streams[i].parent_id;
        comment.page_id = comment_streams[i].page_id;
        all_top_comments.push(comment);
        author_ids.push(comment.author_id);
        page_ids.push(comment.page_id);
      }
    }
    all_top_comments.sort(by_ups);
    all_my_comments = all_top_comments.slice(0,20);
    User.find({ _id: { '$in': author_ids } }, function(err, users) {
      for(var i=0; i<users.length; i++) {
        for(var j=0; j<all_top_comments.length; j++) {
          if(all_top_comments[j].author_id.toString() == users[i]._id.toString()) {
            all_top_comments[j].author = users[i].username;
          }
        }
      }
      Page.find({ _id: { '$in': page_ids } }, function(err, pages) {
        for(var i=0; i<pages.length; i++) {
          for(var j=0; j<all_top_comments.length; j++) {
            if(all_top_comments[j].page_id.toString() == pages[i]._id.toString()) {
              all_top_comments[j].page_url = pages[i].page_url;
              all_top_comments[j].stripped_url = parseUri(pages[i].page_url).host;
            }
          }
        }
        next(all_top_comments);
      })
    })
  })
}
// TODO: make this work
function get_top_sites(next) {
  CommentStream.find({}, ['page_id','num_comments'], {
    group: {
      cond: {},
      key: { page_id: true },
      initial: { num_comments: 0 },
      $reduce: function(obj,prev) { prev.num_comments += obj.num_comments }
    }
  }, function(err, pages) {
    var page_ids = [];
    for(var i=0; i<pages.length; i++) {
      page_ids.push(pages[i]._id)
    }
    //console.log(pages)
  })
  //db.commentstreams.group({ key: { page_id: true }, reduce: function(obj,prev) { prev.num_comments += obj.num_comments }, initial: { num_comments: 0 } })
  next()
}
function get_latest_comments(next) {
  var all_latest_comments = [];
  CommentStream.find().sort('comments.date',-1).run(function(err, comment_streams) {
    var author_ids = [];
    var page_ids = [];
    for(var i=0; i<Math.min(comment_streams.length,20); i++) {
      for(var j=0; j<comment_streams[i].comments.length; j++) {
        var comment = comment_streams[i].comments[j].toObject();
        comment.parent_id = comment_streams[i].parent_id;
        comment.page_id = comment_streams[i].page_id;
        all_latest_comments.push(comment);
        author_ids.push(comment.author_id);
        page_ids.push(comment.page_id);
      }
    }
    all_latest_comments.sort(by_date);
    all_latest_comments = all_latest_comments.slice(0,20);
    User.find({ _id: { '$in': author_ids } }, function(err, users) {
      for(var i=0; i<users.length; i++) {
        for(var j=0; j<all_latest_comments.length; j++) {
          if(all_latest_comments[j].author_id.toString() == users[i]._id.toString()) {
            all_latest_comments[j].author = users[i].username;
          }
        }
      }
      Page.find({ _id: { '$in': page_ids } }, function(err, pages) {
        for(var i=0; i<pages.length; i++) {
          for(var j=0; j<all_latest_comments.length; j++) {
            if(all_latest_comments[j].page_id.toString() == pages[i]._id.toString()) {
              all_latest_comments[j].page_url = pages[i].page_url;
              all_latest_comments[j].stripped_url = parseUri(pages[i].page_url).host;
            }
          }
        }
        next(all_latest_comments);
      })
    })
  })
}
function by_ups(a, b) { return (a.ups < b.ups) ? 1 : -1; }
function by_date(a, b) { return (a.date < b.date) ? 1 : -1; }
// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

Routes.prototype.login = function(req, res) {
  var response;
  var username = req.body.username;
  var password = Hash.md5(req.body.password);
  
  User.findOne({ username: username, password: password }, function(err, user) {
    if(user) {
      // user exists, log them in
      res.cookie('username', user.username, { expires: new Date(Date.now() + 1000*60*60*24*30) });
      res.cookie('password', user.password, { expires: new Date(Date.now() + 1000*60*60*24*30) });
      
      var auth = new Auth;
      auth.access_token = generate_token();
      auth.user_id = user._id;
      auth.save();
      
      response = { success: true, access_token: auth.access_token, _id: user._id, username: user.username };
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
      Auth.find({ user_id: user._id }, function(err, auths) {
        for(var i=0; i<auths.length; i++) auths[i].remove();
      })
      user.save(function(err) {
        res.clearCookie('username');
        res.clearCookie('password');
        res.clearCookie('access_token');
        res.redirect('/');
      })
    } else {
      res.clearCookie('username');
      res.clearCookie('password');
      res.clearCookie('access_token');
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
      // user exists, log them in
      res.cookie('username', username, { expires: new Date(Date.now() + 1000*60*60*24*30) });
      res.cookie('password', password, { expires: new Date(Date.now() + 1000*60*60*24*30) });
      
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
        
        var auth = new Auth;
        auth.access_token = generate_token();
        auth.user_id = user._id;
        auth.save();
        
        res.render('remote_login', { layout: false, url: url, access_token: auth.access_token, _id: user._id, username: user.username });
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