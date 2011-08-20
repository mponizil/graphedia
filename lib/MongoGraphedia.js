var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/graffidia');

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var PageSchema = new Schema({
  page_url: String,
  page_hash: String,
  num_comments: { type: Number, default: 0 }
})
var UserSchema = new Schema({
  username: { type: String, unique: true },
  password: String,
  email: { type: String, unique: true, validate: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/ },
  ups: { type: Number, default: 0 }
})
var CommentSchema = new Schema({
  author_id: { type: ObjectId, index: true },
  body: String,
  date: { type: Date, default: Date.now },
  page_x: { type: Number, default: 0 },
  page_y: { type: Number, default: 0 },
  ups: { type: Number, default: 0 }
})
var CommentStreamSchema = new Schema({
  page_id: { type: ObjectId, index: true },
  parent_id: { type: ObjectId, index: true },
  parent_author_id: { type: ObjectId, index: true },
  num_comments: { type: Number, default: 0 },
  comments: [CommentSchema]
})
var VoteSchema = new Schema({
  author_id: { type: ObjectId, index: true },
  comment_id: { type: ObjectId },
  date: { type: Date, default: Date.now },
  vote: { type: Number, default: 1 }
})
var AuthSchema = new Schema({
  access_token: String,
  socket_id: String,
  user_id: { type: ObjectId }
})

var Page = mongoose.model('Page', PageSchema);
var User = mongoose.model('User', UserSchema);
var CommentStream = mongoose.model('CommentStream', CommentStreamSchema);
var Vote = mongoose.model('Vote', VoteSchema);
var Auth = mongoose.model('Auth', AuthSchema);

exports.Page = Page;
exports.User = User;
exports.CommentStream = CommentStream;
exports.Vote = Vote;
exports.Auth = Auth;