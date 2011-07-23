var MongoGraphedia = require('./MongoGraphedia');
var Page = MongoGraphedia.Page,
    CommentStream = MongoGraphedia.CommentStream,
    User = MongoGraphedia.User,
    Vote = MongoGraphedia.Vote;
var CommentManager = require('./CommentManager');

function Graphedia(socket) {
  this.page_id = null;
  this.page_url = null;
  this.page_hash = null;
  this.socket = socket;
  this.comment_manager = new CommentManager();
}
Graphedia.prototype.init = function(url, fn) {
  var _g = this;
  
  _g.page_url = url;
  _g.page_hash = Hash.md5(url);
  
  _g.socket.join(_g.page_hash);
  
  // determine the page id from the page hash, create new page if one doesn't exist
  Page.findOne({ page_hash: _g.page_hash }, function(err, page) {
    if(!page) {
      var page = new Page;
      page.page_url = _g.page_url;
      page.page_hash = _g.page_hash;
      page.save(function(err) {
        _g.page_id = page._id;
        fn({ page_id: _g.page_id, all_comments: [] })
      })
    } else {
      _g.page_id = page._id;
      
      // get all comments from mongo
      _g.comment_manager.get_all_comments(_g.page_id, function(all_comments) {
        fn({ page_id: _g.page_id, all_comments: all_comments })
      });
    }
  })
}

Graphedia.prototype.load_user = function(user_id, fn) {
  var _g = this;
  
  User.findById(user_id, function(err, user) {
    fn(user);
  })
}
Graphedia.prototype.save_socket_id = function(access_token, socket_id) {
  var _g = this;
  
  User.findOne({ access_token: access_token }, function(err, user) {
    if(user) {
      user.socket_id = socket_id;
      user.save();
    }
  })
}
Graphedia.prototype.disconnect = function(socket_id) {
  var _g = this;
  
  User.findOne({ socket_id: socket_id }, function(err, user) {
    if(user) {
      user.access_token = '';
      user.socket_id = '';
      user.save();
    }
  })
}
Graphedia.prototype.new_comment = function(access_token, parent_id, body, page_x, page_y, fn) {
  var _g = this;
  
  User.findOne({ access_token: access_token }, function(err, user) {
    if(user) {
      var new_comment = {
        author_id: user._id,
        body: body,
        page_x: page_x,
        page_y: page_y
      }
      
      parent_id = (parent_id == 0) ? _g.page_id : parent_id
      
      CommentStream.findOne({ parent_id: parent_id }, function(err, comment_stream) {
        if(comment_stream) {
          // add to existing comment stream
          comment_stream.page_id = _g.page_id;
          comment_stream.num_comments += 1;
          comment_stream.comments.push(new_comment);
          comment_stream.save(function(err) {
            
            // broadcast to all users
            var comment = comment_stream.comments[comment_stream.num_comments-1];
            _g.socket.broadcast.to(_g.page_hash).emit('comments.new', { comment_id: comment._id, comment: body, author: user, parent_id: parent_id, page_x: page_x, page_y: page_y });
            fn({ success: true, comment_id: comment._id })

          })
        } else {
          // create new comment stream
          var comment_stream = new CommentStream();
          comment_stream.page_id = _g.page_id;
          comment_stream.parent_id = parent_id;
          comment_stream.num_comments = 1;
          comment_stream.comments.push(new_comment)
          comment_stream.save(function(err) {
            
            // broadcast to all users
            var comment = comment_stream.comments[comment_stream.num_comments-1];
            _g.socket.broadcast.to(_g.page_hash).emit('comments.new', { comment_id: comment._id, comment: body, author: user, parent_id: parent_id, page_x: page_x, page_y: page_y });
            fn({ success: true, comment_id: comment._id })

          })
        }

      })
    } else {
      fn({ success: false })
    }
  })
}
Graphedia.prototype.upvote = function(access_token, parent_id, comment_id, fn) {
  var _g = this;
  
  User.findOne({ access_token: access_token }, function(err, user) {
    if(user) {
      Vote.find({ author_id: user._id, comment_id: comment_id }, function(err, vote) {
        if(vote.length == 0) {
          var vote = new Vote;
          vote.author_id = user._id;
          vote.comment_id = comment_id;
          vote.vote = 1;
          vote.save(function(err) {
            CommentStream.findOne({ parent_id: parent_id }, function(err, comment_stream) {
              comment_stream.comments.id(comment_id).ups += 1;
              comment_stream.save(function(err) {
                
                var total_ups = comment_stream.comments.id(comment_id).ups;
                
                // tell everyone about the upvote
                _g.socket.broadcast.to(_g.page_hash).emit('comments.upvote', { comment_id: comment_id, total_ups: total_ups });
                fn({ success: true, total_ups: total_ups })
                
              })
            })
          })
        } else {
          fn({ success: false, error: 'already voted' })
        }
      })
    } else {
      fn({ success: false, error: 'invalid access token' })
    }
  })
}

module.exports = Graphedia;