var MongoGraphedia = require('./MongoGraphedia');
var Page = MongoGraphedia.Page,
    CommentStream = MongoGraphedia.CommentStream,
    Comment = MongoGraphedia.Comment,
    User = MongoGraphedia.User,
    Vote = MongoGraphedia.Vote;

function Graphedia(socket) {
  this.page_id = null;
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
  Page.findOne({ page_hash: _g.page_hash }, function(err, page) {
    if(!page) {
      var page = new Page;
      page.page_url = _g.page_url;
      page.page_hash = _g.page_hash;
      page.save(function(err) {
        _g.page_id = page._id;
        fn([])
      })
    } else {
      _g.page_id = page._id;
      CommentStream.find({ page_id: page._id }, function(err, comment_streams) {
        fn(comment_streams);
      })
    }
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
Graphedia.prototype.new_comment = function(access_token, comment_stream_id, body, x, y, fn) {
  var _g = this;
  
  User.findOne({ access_token: access_token }, function(err, user) {
    if(user) {
      var new_comment = {
        author_id: user._id,
        body: body,
        page_x: x,
        page_y: y
      };

      if(comment_stream_id == 0) {
        // create new comment stream
        var comment_stream = new CommentStream;
        comment_stream.page_id = _g.page_id;
        comment_stream.num_comments = 1;
        comment_stream.comments.push(new_comment)
        comment_stream.save(function(err) {
          
          // broadcast to all users
          var comment = comment_stream.comments[comment_stream.num_comments-1];
          _g.socket.broadcast.to(_g.page_hash).emit('comments.new', { comment_id: comment._id, comment: body, author: user, comment_stream_id: comment_stream_id, x: x, y: y });
          fn({ success: true, comment_id: comment._id })
          
        })
      } else {
        // add to existing comment stream
        CommentStream.findById(comment_stream_id, function(err, comment_stream) {
          comment_stream.page_id = _g.page_id;
          comment_stream.comments.push(new_comment);
          comment_stream.num_comments += 1;
          comment_stream.save(function(err) {
            
            // broadcast to all users
            var comment = comment_stream.comments[comment_stream.num_comments-1];
            _g.socket.broadcast.to(_g.page_hash).emit('comments.new', { comment_id: comment._id, comment: body, author: user, comment_stream_id: comment_stream_id, x: x, y: y });
            fn({ success: true, comment_id: comment._id })
            
          })
        })
      }
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
      } else {
        fn({ success: false })
      }
    })
  })
}

module.exports = Graphedia;