var MongoGraphedia = require('./MongoGraphedia');
var Page = MongoGraphedia.Page,
    CommentStream = MongoGraphedia.CommentStream,
    User = MongoGraphedia.User,
    Vote = MongoGraphedia.Vote,
    Auth = MongoGraphedia.Auth;

function RealTimeDash() {
  this.all_sockets = {};
}
RealTimeDash.prototype.confirm_socket = function(access_token, socket_id, next) {
  Auth.findOne({ access_token: access_token }, function(err, auth) {
    if(auth) {
      auth.socket_id = socket_id;
      auth.save();
      
      next(auth.user_id);
    }
  })
}
RealTimeDash.prototype.kill_auth = function(socket_id, next) {
  Auth.findOne({ socket_id: socket_id }, function(err, auth) {
    var user_id = auth.user_id;
    
    if(auth) auth.remove();
    
    next(user_id);
  })
}
RealTimeDash.prototype.add_socket = function(user_id, socket) {
  this.all_sockets[user_id] = socket;
}
RealTimeDash.prototype.remove_socket = function(user_id) {
  delete this.all_sockets[user_id];
}
RealTimeDash.prototype.new_event = function(type, data) {
  var _rtd = this;
  
  if(type == 'comment') {
    // send to firehose for everybody
    for(i in _rtd.all_sockets) _rtd.all_sockets[i].emit('firehose', data);
    
    // send to my replies of the parent comment author
    if(_rtd.all_sockets[data.parent_author_id]) {
      // IDK WHY THIS STUPID SHIT DOESNT WORK BUT IT DOESNT
      CommentStream.find({ 'comments._id': data.parent_id }, function(err, comment_streams) {
        console.log(comment_streams);
        data.parent_body = 'made up comment';
        _rtd.all_sockets[data.parent_author_id].emit('reply', data);
      })
    }
  } else if(type == 'upvote') {
    // send to my comments of comment author
    if(_rtd.all_sockets[data.comment_author_id]) _rtd.all_sockets[data.comment_author_id].emit('my.upvote', data);
    
    // send to top comments for everybody
  }
}

module.exports = RealTimeDash;