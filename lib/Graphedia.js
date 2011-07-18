var Comment = require('./MongoGraphedia').Comment,
    User = require('./MongoGraphedia').User,
    Vote = require('./MongoGraphedia').Vote;

function Graphedia(socket) {
  this.page_url = null;
  this.page_hash = null;
  this.socket = socket;
}
Graphedia.prototype.init = function(url, fn) {
  var _g = this;
  
  _g.page_url = url;
  _g.page_hash = Hash.md5(url);
  
  _g.socket.join(_g.page_hash);
  
  // get all comments from mongo
  Comment.find({ page_hash: _g.page_hash }, function(err, comments) {
    fn(comments);
  })
}
Graphedia.prototype.load_user = function(user_id, fn) {
  var _g = this;
  
  User.findById(user_id, function(err, user) {
    fn(user);
  })
}
Graphedia.prototype.access_token = function(access_token, socket_id) {
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
Graphedia.prototype.new_comment = function(access_token, body, x, y, fn) {
  var _g = this;
  
  User.findOne({ access_token: access_token }, function(err, user) {
    if(user) {
      // save to mongo
      var comment = new Comment;
      comment.author_id = user._id;
      comment.body = body;
      comment.page_url = _g.page_url;
      comment.page_hash = _g.page_hash;
      comment.page_x = x;
      comment.page_y = y;
      comment.save(function(err) {
        // broadcast to all users
        _g.socket.broadcast.to(_g.page_hash).emit('comments.new', { x: x, y: y, author: user, comment_id: comment._id, comment: body});
        fn({ success: true, comment_id: comment._id })
      })
    } else {
      fn({ success: false })
    }
  })
}
Graphedia.prototype.upvote = function(access_token, comment_id, fn) {
  var _g = this;
  
  User.findOne({ access_token: access_token }, function(err, user) {
    Vote.find({ author_id: user._id, comment_id: comment_id }, function(err, vote) {
      if(vote.length == 0) {
        var vote = new Vote;
        vote.author_id = user._id;
        vote.comment_id = comment_id;
        vote.vote = 1;
        vote.save(function(err) {
          Comment.findById(comment_id, function(err, comment) {
            comment.ups += 1;
            comment.save(function(err) {
              // tell everyone about the upvote
              _g.socket.broadcast.to(_g.page_hash).emit('comments.upvote', { comment_id: comment_id, total_ups: comment.ups });
              fn({ success: true, total_ups: comment.ups })
            })
          })
        })
      }
    })
  })
}

module.exports = Graphedia;