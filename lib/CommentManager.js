var MongoGraphedia = require('./MongoGraphedia');
var Page = MongoGraphedia.Page,
    CommentStream = MongoGraphedia.CommentStream,
    User = MongoGraphedia.User,
    Vote = MongoGraphedia.Vote;

function CommentManager() {
  this.all_streams = null;
  this.all_comments = null;
  this.num_comments = 0;
  this.authors = {};
  this.authors_resolved = 0;
  this.next = null;
}
CommentManager.prototype.get_all_comments = function(page_id, next) {
  var _cm = this;
  
  _cm.next = next;
  
  CommentStream.find({ page_id: page_id }, function(err, all_streams) {
    _cm.all_streams = all_streams;
    if(_cm.all_streams.length == 0) { next([]); }
    else _cm.all_comments = _cm.streams_to_comments();
  })
};
CommentManager.prototype.ready = function(user_id, username) {
  var _cm = this;
  
  _cm.authors[user_id] = username;
  _cm.authors_resolved++;
  if(_cm.authors_resolved == _cm.num_comments) {
    for(i in _cm.all_comments) _cm.resolve_author(_cm.all_comments[i]);
    _cm.next(_cm.all_comments);
  }
}
CommentManager.prototype.resolve_author = function(comment) {
  var _cm = this;
  
  comment.author = _cm.authors[comment.author_id];
  for(i in comment.replies) _cm.resolve_author(comment.replies[i]);
}
CommentManager.prototype.streams_to_comments = function() {
  var _cm = this;
  
  var top_level = _cm.top_level_comments(_cm.all_streams)
  var all_comments = _cm.create_comments_tree(top_level)
  return all_comments;
};
CommentManager.prototype.create_comments_tree = function(comment_stream) {
  var _cm = this;
  
  var all_comments = []
  for(var i = 0; i < comment_stream.comments.length; i++) {
    var comment = comment_stream.comments[i].toObject();
    
    User.findById(comment.author_id, function(err, user) {
      _cm.ready(user._id, user.username)
    });
    _cm.num_comments++;
    
    comment.body = comment.body.replace('<','&lt;').replace('>','&gt;');
    comment.parent_id = comment_stream.parent_id;
    comment.parent_author_id = comment_stream.parent_author_id;
    comment.replies = _cm.get_replies(comment._id);
    all_comments.push(comment);
  }
  return all_comments;
};
CommentManager.prototype.get_replies = function(comment_id) {
  var _cm = this;
  
  for(var i = 0; i < _cm.all_streams.length; i++) {
    if(_cm.all_streams[i].parent_id.toString() == comment_id.toString()) {
      return _cm.create_comments_tree(_cm.all_streams[i]);
    }
  }
};
CommentManager.prototype.top_level_comments = function() {
  var _cm = this;
  
  var top_level;
  for(i in _cm.all_streams) {
    if(_cm.all_streams[i].page_id.toString() == _cm.all_streams[i].parent_id.toString()) {
      top_level = _cm.all_streams[i];
      break;
    }
  }
  return top_level;
};

module.exports = CommentManager;