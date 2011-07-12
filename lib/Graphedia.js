var Comment = require('./MongoGraphedia').Comment,
    User = require('./MongoGraphedia').User;

// variables preceeded by underscores refer to the 'this' object
// _g : Graphedia
var _g = null;

function Graphedia(socket) {
  this.page_url = null;
  this.page_hash = null;
  this.socket = socket;
  
  _g = this;
}
Graphedia.prototype.init = function(url, fn) {
  _g.page_url = url;
  _g.page_hash = Hash.md5(url);
  
  _g.socket.join(_g.page_hash);
  
  // get all comments from mongo
  Comment.find({ page_hash: _g.page_hash }, function(err, docs) {
    fn(docs);
  })
}
Graphedia.prototype.new_comment = function(data, fn) {
  // save to mongo
  var comment = new Comment;
  comment.body = data.comment;
  comment.page_url = _g.page_url;
  comment.page_hash = _g.page_hash;
  comment.page_x = data.x;
  comment.page_y = data.y;
  comment.save(function(err) {
    // broadcast to all users
    _g.socket.broadcast.to(_g.page_hash).emit('comments.new',{ x: data.x, y: data.y, comment: data.comment});
    fn({ success: true })
  })
}

module.exports = Graphedia;