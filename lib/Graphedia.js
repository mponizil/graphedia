var Comment = require('./MongoGraphedia').Comment,
    User = require('./MongoGraphedia').User;

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
Graphedia.prototype.new_comment = function(data, fn) {
  var _g = this;
  
  User.findOne({ access_token: data.access_token }, function(err, user) {
    if(user) {
      // save to mongo
      var comment = new Comment;
      comment.author = user._id;
      comment.body = data.comment;
      comment.page_url = _g.page_url;
      comment.page_hash = _g.page_hash;
      comment.page_x = data.x;
      comment.page_y = data.y;
      comment.save(function(err) {
        // broadcast to all users
        _g.socket.broadcast.to(_g.page_hash).emit('comments.new',{ x: data.x, y: data.y, author: user, comment: data.comment});
        fn({ success: true })
      })
    } else {
      fn({ success: false })
    }
  })
}

module.exports = Graphedia;