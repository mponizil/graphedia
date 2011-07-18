var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/graffidia');

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var PageSchema = new Schema({
  page_url: String,
  page_hash: String
})
var UserSchema = new Schema({
  username: String,
  password: String,
  email: String,
  ups: Number,
  access_token: String,
  socket_id: String
})
var CommentStreamSchema = new Schema({
  page_id: { type: ObjectId },
  parent_id: { type: Number, default: 0 },
  num_comments: { type: Number, default: 0 },
  comments: [CommentSchema]
})
var CommentSchema = new Schema({
  author_id: { type: ObjectId },
  body: String,
  date: { type: Date, default: Date.now },
  page_x: Number,
  page_y: Number,
  ups: { type: Number, default: 0 }
})
var VoteSchema = new Schema({
  author_id: { type: ObjectId },
  comment_id: { type: ObjectId },
  date: { type: Date, default: Date.now },
  vote: { type: Number, default: 1 }
})

var Page = mongoose.model('Page', PageSchema)
var User = mongoose.model('User', UserSchema);
var CommentStream = mongoose.model('CommentStream', CommentStreamSchema)
var Comment = mongoose.model('Comment', CommentSchema);
var Vote = mongoose.model('Vote', VoteSchema);

exports.Page = Page;
exports.User = User;
exports.CommentStream = CommentStream;
exports.Comment = Comment;
exports.Vote = Vote;