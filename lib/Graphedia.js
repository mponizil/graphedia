var MongoGraphedia = require('./MongoGraphedia');
var Page = MongoGraphedia.Page,
    CommentStream = MongoGraphedia.CommentStream,
    User = MongoGraphedia.User,
    Vote = MongoGraphedia.Vote,
    Auth = MongoGraphedia.Auth;
var CommentManager = require('./CommentManager');

function Graphedia(socket, rtd) {
  this.page_id = null;
  this.page_url = null;
  this.page_hash = null;
  this.socket = socket;
  this.rtd = rtd;
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
Graphedia.prototype.leave = function() {
  var _g = this;
  
  _g.page_url = null;
  _g.page_hash = null;
  
  _g.socket.leave(_g.page_hash);
}
Graphedia.prototype.load_user = function(user_id, fn) {
  var _g = this;
  
  User.findById(user_id, function(err, user) {
    fn(user);
  })
}
Graphedia.prototype.confirm_socket = function(access_token, socket_id) {
  var _g = this;
  
  Auth.findOne({ access_token: access_token }, function(err, auth) {
    if(auth) {
      auth.socket_id = socket_id;
      auth.save();
    }
  })
}
Graphedia.prototype.disconnect = function(socket_id) {
  var _g = this;
  
  Auth.findOne({ socket_id: socket_id }, function(err, auth) {
    if(auth) auth.remove();
  })
}
Graphedia.prototype.new_comment = function(access_token, parent_id, parent_author_id, body, page_x, page_y, fn) {
  var _g = this;
  
  Auth.findOne({ access_token: access_token }, function(err, auth) {
    if(auth) {
      User.findById(auth.user_id, function(err, user) {
        var new_comment = {
          author_id: user._id,
          body: body,
          page_x: page_x,
          page_y: page_y
        }

        parent_id = (parent_id == 0) ? _g.page_id : parent_id;
        parent_author_id = (parent_author_id == 0) ? _g.page_id : parent_author_id;

        CommentStream.findOne({ parent_id: parent_id }, function(err, comment_stream) {
          if(comment_stream) {
            // add to existing comment stream
            comment_stream.page_id = _g.page_id;
            comment_stream.num_comments += 1;
            comment_stream.comments.push(new_comment);
            comment_stream.save(function(err) {

              // broadcast to all users
              var comment = comment_stream.comments[comment_stream.num_comments-1];
              var comment_obj = {
                comment_id: comment._id,
                comment: body,
                author: user.username,
                parent_id: parent_id,
                parent_author_id: parent_author_id,
                page_url: _g.page_url,
                page_x: page_x,
                page_y: page_y
              }
              _g.socket.broadcast.to(_g.page_hash).emit('comments.new', comment_obj);
              
              // tell the real time dash of the new event
              _g.rtd.new_event('comment', comment_obj);
              
              fn({ success: true, comment_id: comment._id })

            })
          } else {
            // create new comment stream
            var comment_stream = new CommentStream();
            comment_stream.page_id = _g.page_id;
            comment_stream.parent_id = parent_id;
            comment_stream.parent_author_id = parent_author_id;
            comment_stream.num_comments = 1;
            comment_stream.comments.push(new_comment)
            comment_stream.save(function(err) {

              // broadcast to all users
              var comment = comment_stream.comments[comment_stream.num_comments-1];
              var comment_obj = {
                comment_id: comment._id,
                comment: body,
                author: user.username,
                parent_id: parent_id,
                parent_author_id: parent_author_id,
                page_url: _g.page_url,
                page_x: page_x,
                page_y: page_y
              };
              _g.socket.broadcast.to(_g.page_hash).emit('comments.new', comment_obj);
              
              // tell the real time dash of the new event
              _g.rtd.new_event('comment', comment_obj);
              
              fn({ success: true, comment_id: comment._id })

            })
          }

        })
      })
    } else {
      fn({ success: false })
    }
  })
}
Graphedia.prototype.upvote = function(access_token, parent_id, comment_id, fn) {
  var _g = this;
  
  Auth.findOne({ access_token: access_token }, function(err, auth) {
    if(auth) {
      User.findById(auth.user_id, function(err, user) {
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
                  
                  // tell the real time dash of the new upvote
                  vote = vote.toObject();
                  vote.comment_author_id = comment_stream.comments.id(comment_id).author_id;
                  vote.total_ups = total_ups;
                  _g.rtd.new_event('upvote', vote);
                  
                  fn({ success: true, total_ups: total_ups })
                
                })
              })
            })
          } else {
            fn({ success: false, error: 'already voted' })
          }
        })
      })
    } else {
      fn({ success: false, error: 'invalid access token' })
    }
  })
}

module.exports = Graphedia;