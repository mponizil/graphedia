var Comment = require('./MongoGraphedia').Comment,
    User = require('./MongoGraphedia').User;

function Graphedia(socket) {
  this.page_url = null;
  this.page_hash = null;
  this.socket = socket;
}
Graphedia.prototype.init = function(url, fn) {
  var g = this;
  
  g.page_url = url;
  g.page_hash = Hash.md5(url);
  
  g.socket.join(g.page_hash);
  
  // get all comments from mongo
  Comment.find({ page_hash: g.page_hash }, function(err, docs) {
    fn(docs);
  })
}
Graphedia.prototype.new_comment = function(data, fn) {
  var g = this;
  
  // save to mongo
  var comment = new Comment;
  comment.body = data.comment;
  comment.page_url = g.page_url;
  comment.page_hash = g.page_hash;
  comment.page_x = data.x;
  comment.page_y = data.y;
  comment.save(function(err) {
    // broadcast to all users
    g.socket.broadcast.to(g.page_hash).emit('comments.new',{ x: data.x, y: data.y, comment: data.comment});
    fn({ success: true })
  })
}

module.exports = Graphedia;