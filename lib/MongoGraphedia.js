var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/graffidia');

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var PageSchema = new Schema({
  page_url: String,
  page_hash: String
})
var UserSchema = new Schema({
  username: { type: String, unique: true },
  password: String,
  email: { type: String, unique: true, validate: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/ },
  ups: { type: Number, default: 0 },
  access_token: String,
  socket_id: String
})
var CommentSchema = new Schema({
  author_id: ObjectId,
  body: String,
  date: { type: Date, default: Date.now },
  page_x: { type: Number, default: 0 },
  page_y: { type: Number, default: 0 },
  ups: { type: Number, default: 0 }
})
var CommentStreamSchema = new Schema({
  page_id: ObjectId,
  parent_id: ObjectId,
  parent_author_id: ObjectId,
  num_comments: { type: Number, default: 0 },
  comments: [CommentSchema]
})
var VoteSchema = new Schema({
  author_id: ObjectId,
  comment_id: ObjectId,
  date: { type: Date, default: Date.now },
  vote: { type: Number, default: 1 }
})

var Page = mongoose.model('Page', PageSchema);
var User = mongoose.model('User', UserSchema);
var CommentStream = mongoose.model('CommentStream', CommentStreamSchema);
var Vote = mongoose.model('Vote', VoteSchema);

exports.Page = Page;
exports.User = User;
exports.CommentStream = CommentStream;
exports.Vote = Vote;