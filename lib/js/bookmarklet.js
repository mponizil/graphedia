// constants, rendered by app.js with environment variables
var URL = #{url};

// jquery
var $g;

// variables preceeded by underscores refer to the 'this' object
// _g : Graphedia
// _md : MiniDash
// _c : Comment
var _g = null;
var _md = null;
var _c = null;

// load dependencies
var load_dep = {};
load_dep.start = function(next) {
  this.next = next;
  for(i=0;i<dep_needed.length;i++) dep_needed[i]();
}
load_dep.loaded = function(which) {
  dep_loaded.push(which);
  if(dep_loaded.length == dep_needed.length) this.next();
}

load_js = function(url,try_ready) {
	load_js.get_script(url);
	try_ready(0);
}
load_js.get_script = function(filename) {
  var script = document.createElement('script')
  script.setAttribute("type","text/javascript")
  script.setAttribute("src", filename)
  document.getElementsByTagName("head")[0].appendChild(script)
}

load_jq = function() {
  load_js("https://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js",load_jq.try_ready)
}
load_jq.try_ready = function(time_elapsed) {
  if (typeof jQuery == "undefined") {
    if (time_elapsed <= 5000) setTimeout("load_jq.try_ready(" + (time_elapsed + 200) + ")", 200);
    else alert("Timed out while loading jQuery.")
  } else {
    $g = jQuery.noConflict();
    load_dep.loaded(load_jq);
  }
}

load_socketio = function() {
  load_js("http://" + URL + "/socket.io/socket.io.js",load_socketio.try_ready)
}
load_socketio.try_ready = function(time_elapsed) {
  if (typeof io == "undefined") {
    if (time_elapsed <= 5000) setTimeout("load_socketio.try_ready(" + (time_elapsed + 200) + ")", 200);
    else alert("Timed out while loading socket.io.")
  } else { load_dep.loaded(load_socketio); }
}

load_css = function() {
  var css = document.createElement('link');
  css.setAttribute('rel','stylesheet');
  css.setAttribute('href','http://' + URL + '/stylesheets/bookmarklet.css');
  document.getElementsByTagName('head')[0].appendChild(css);
  load_dep.loaded(load_css);
}

var dep_needed = [load_jq,load_socketio,load_css];
var dep_loaded = [];

// load dependencies then init
(function() {
  load_dep.start(init);
}())

function init() {
  var graphedia = new Graphedia();
  graphedia.setup_socket();
  graphedia.add_markup();
}

// Graphedia object
function Graphedia() {
  this.socket = null;
  this.user = {
    access_token: null,
    email: null,
    username: null
  }
  this.container = null;
  this.mini_dash = new MiniDash();
  this.url = null;
  
  _g = this;
}
Graphedia.prototype.setup_socket = function() {
  _g.socket = io.connect('http://' + URL, 3000);
  _g.socket.emit('graphedia.init', document.URL, function(comments) {
    _g.next_comment(comments);
  });
  
  _g.socket.on('comments.new',function(data) {
    _g.container.append(new Comment('add', { x: data.x, y: data.y, author: data.author, comment: data.comment }));
  })
}
// load comments recursively, which is kinda dumb but i can't figure out how else to do it
Graphedia.prototype.next_comment = function(comments) {
  if(comments.length > 0) {
    _g.socket.emit('user.load', comments[0].author, function(author) {
      _g.container.append(new Comment('add', { x: comments[0].page_x, y: comments[0].page_y, author: author, comment: comments[0].body }));
      comments.shift(1);
      _g.next_comment(comments);
    })
  }
}
Graphedia.prototype.add_markup = function() {
  // add graphedia container
  var gcont = _g.container = $g('<div>').attr('id','graphedia_container');
  $g('body').prepend(gcont);
  
  // add mini dash
  _g.container.append(_g.mini_dash.markup);
  _g.mini_dash.init();
  
  // listen for iframe post message
  window.addEventListener("message", function(e) {
    _g.user = e.data;
    
    _g.confirm_socket();
    _g.mini_dash.logged_in();
  }, false);
  
  // create comment on shift click
  $g(window).click(function(e) {
    if(e.shiftKey && _g.user.access_token) {
      var new_comment = new Comment('create', { x: e.pageX, y: e.pageY, author: _g.user })
      _g.container.append(new_comment.markup);
      new_comment.obj.ready(_g, new_comment.markup, new_comment.comment, new_comment.form);
    }
  })
}
Graphedia.prototype.confirm_socket = function() {
  _g.socket.emit('user.access_token', _g.user.access_token);
}

// comment object
function Comment(method, params) {
  this.author_id = params.author._id;
  this.author = params.author.username;
  this.timestamp = params.date || null;
  this.comment = params.comment || null;
  this.x = params.x || 0;
  this.y = params.y || 0;
  
  _c = this;
  
  if(method == 'add') return _c.add();
  else if(method == 'create') return _c.create();
}
Comment.prototype.add = function() {
  var comment = $g('<div>').addClass('comment').css({
    'position': 'absolute',
    'top': _c.y+'px',
    'left': _c.x+'px'
  }).html(_c.comment);
  
  return comment;
}
Comment.prototype.create = function() {
  // remove old unsubmitted comment forms
  $g('.new-comment').remove();
  
  // add new comment form
  var new_comment = $g('<div>').addClass('new-comment').css({top:_c.y,left:_c.x});
  var form = $g('<form>',{name:'new_comment'});
  var comment = $g('<input>',{type:'text',name:'new_comment'});
  var submit = $g('<input>',{type:'submit',name:'submit',value:'Post'});
  
  new_comment.append(form);
  form.append(comment,$g('<br>'),submit);
  
  return { obj: this, markup: new_comment, comment: comment, form: form };
}
Comment.prototype.ready = function(g, markup, comment, form) {
  comment.focus();
  
  form.submit(function() {
    var comment_val = comment.val();
    g.socket.emit('comments.new', { access_token: _g.user.access_token, x: _c.x, y: _c.y, comment: comment_val }, function(data) {
      if(data.success) {
        markup.remove();
        g.container.append(new Comment('add', { x: _c.x, y: _c.y, author: _g.user, comment: comment_val }));
      }
    })
    return false;
  })
}

// mini dash object
function MiniDash() {
  this.markup = $g('<div>').addClass('mini-dash');
  this.iframe = $g('<iframe>',{src:'http://'+URL+'/remote_login?url='+encodeURI(document.URL),width:'100%',height:'30'})
  
  this.markup.append(this.iframe);
  
  _md = this;
}
MiniDash.prototype.init = function() {
  _md.markup.slideDown('fast')
}
MiniDash.prototype.logged_in = function() {
  _md.iframe.remove();
  _md.markup.append('Hey ' + _g.user.username + '!')
  
  setTimeout(function() {
    _md.markup.slideUp('fast')
  }, 1500)
}