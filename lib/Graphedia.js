var MongoGraphedia = require('./MongoGraphedia');
var Page = MongoGraphedia.Page,
    CommentStream = MongoGraphedia.CommentStream,
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
      var all_comments = [];
      CommentStream.find({ page_id: page._id }, function(err, all_streams) {
        if(all_streams.length == 0) { fn([]); }
        else {
          var all_comments = streams_to_comments(all_streams);
          fn(all_comments);
        }
      })
    }
  })
}
function streams_to_comments(all_streams) {
  var top_level = top_level_comments(all_streams)
  var all_comments = create_comments_tree(top_level, all_streams)
  return all_comments;
}
function create_comments_tree(comment_stream, all_streams) {
  var all_comments = []
  for(var i = 0; i < comment_stream.comments.length; i++) {
    var comment = comment_stream.comments[i].toObject();
    comment.parent_id = comment_stream.parent_id;
    comment = get_comment_replies(comment, all_streams);
    all_comments.push(comment)
  }
  return all_comments;
}
function get_comment_replies(comment, all_streams) {
  for(var i = 0; i < all_streams.length; i++) {
    if(all_streams[i].parent_id.toString() == comment._id.toString()) {
      comment.replies = create_comments_tree(all_streams[i], all_streams);
      break;
    }
  }
  return comment;
}
function top_level_comments(all_streams) {
  var top_level;
  for(i in all_streams) {
    if(all_streams[i].page_id.toString() == all_streams[i].parent_id.toString()) {
      top_level = all_streams[i];
      break;
    }
  }
  return top_level;
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
Graphedia.prototype.new_comment = function(access_token, parent_id, body, x, y, fn) {
  var _g = this;
  
  User.findOne({ access_token: access_token }, function(err, user) {
    if(user) {
      var new_comment = {
        author_id: user._id,
        body: body,
        page_x: x,
        page_y: y
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
            _g.socket.broadcast.to(_g.page_hash).emit('comments.new', { comment_id: comment._id, comment: body, author: user, parent_id: parent_id, x: x, y: y });
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
            _g.socket.broadcast.to(_g.page_hash).emit('comments.new', { comment_id: comment._id, comment: body, author: user, parent_id: parent_id, x: x, y: y });
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
                
                // tell everyone about the upvote
                _g.socket.broadcast.to(_g.page_hash).emit('comments.upvote', {
                  comment_id: comment_id,
                  total_ups: comment_stream.comments.id(comment_id).ups
                });
                fn({ success: true, total_ups: comment_stream.comments.id(comment_id).ups })
                
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