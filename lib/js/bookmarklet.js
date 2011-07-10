// constants, rendered by app.js with environment variables
var URL = #{url};

// jquery
var $g;

// variables preceeded by underscores refer to the 'this' object
// _g : Graphedia
// _md : MiniDash
// _c : Comment
var _g = _md = _c = null;

// global utility hashes
var ajax = GC = {};

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
  } else { $g = jQuery.noConflict(); load_dep.loaded(load_jq); }
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
  ajax.get_user();
  graphedia.setup_socket();
  graphedia.add_markup();
}

// ajax rpc calls utility
ajax.get_user = function() {
  // callback : GC.mini_dash
  $g.ajax({
    type: 'GET',
    url: 'http://' + URL + '/mini_dash',
    dataType: 'jsonp'
  })
}

// callback object
GC.mini_dash = function(data) {
  if(data) _g.mini_dash.returning(data.email, data.username);
  else _g.mini_dash.guest();
}

// Graphedia object
function Graphedia() {
  this.socket = null;
  this.container = null;
  this.mini_dash = new MiniDash();
  this.url = null;
  
  _g = this;
}
Graphedia.prototype.setup_socket = function() {
  _g.socket = io.connect('http://' + URL, 3000);
  _g.socket.emit('init', document.URL, function(data) {
    for(i in data) _g.container.append(new Comment('add', { x: data[i].page_x, y: data[i].page_y, comment: data[i].body }));
  });
  
  _g.socket.on('comments.new',function(data) {
    _g.append(new Comment('add', data.x, data.y, data.comment));
  })
}
Graphedia.prototype.add_markup = function() {
  var gcont = _g.container = $g('<div>').attr('id','graphedia_container');
  $g('body').prepend(gcont);
  
  _g.container.append(_g.mini_dash.markup);
  
  $g(window).click(function(e) {
    if(e.shiftKey) {
      var new_comment = new Comment('create', { x: e.pageX, y: e.pageY })
      _g.container.append(new_comment.markup);
      new_comment.obj.ready(_g, new_comment.markup, new_comment.comment, new_comment.form);
    }
  })
}

// comment object
function Comment(method, params) {
  this.author_id = null;
  this.author = null;
  this.timestamp = null;
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
    g.socket.emit('comments.new', { x: _c.x, y: _c.y, comment: comment_val }, function(data) {
      if(data.success) {
        markup.remove();
        g.container.append(new Comment('add', { x: _c.x, y: _c.y, comment: comment_val }));
      }
    })
    return false;
  })
}

// mini dash object
function MiniDash() {
  this.markup = $('<div>').addClass('mini-dash');
  
  _md = this;
}
MiniDash.prototype.guest = function() {
  _md.markup.append("Sup noob. How bout you register or login?");
  _md.markup.fadeIn('fast')
}
MiniDash.prototype.returning = function(email, username) {
  _md.markup.append("Hey " + username + ", what's good?");
  _md.markup.fadeIn('fast', function() {
    setTimeout(function() {
      _md.markup.fadeOut('fast')
    }, 1500)
  })
}