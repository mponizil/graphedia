var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/graffidia');

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var CommentSchema = new Schema({
  author_id: { type: ObjectId },
  body: String,
  date: { type: Date, default: Date.now },
  ups: { type: Number, default: 0 },
  page_url: String,
  page_hash: String,
  page_x: Number,
  page_y: Number
})
var UserSchema = new Schema({
  username: String,
  password: String,
  email: String,
  ups: Number,
  access_token: String,
  socket_id: String
})
var VoteSchema = new Schema({
  author_id: { type: ObjectId },
  comment_id: { type: ObjectId },
  date: { type: Date, default: Date.now },
  vote: { type: Number, default: 1 }
})

var Comment = mongoose.model('Comment', CommentSchema);
var User = mongoose.model('User', UserSchema);
var Vote = mongoose.model('Vote', VoteSchema);

exports.Comment = Comment;
exports.User = User;
exports.Vote = Vote;