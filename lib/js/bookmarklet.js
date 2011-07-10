var URL = #{url},
    $g = null,
    g = null,
    GC = {},
    md = null;

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
  graphedia.get_user();
  graphedia.setup_socket();
  graphedia.add_markup();
}

// Callback object
GC.mini_dash = function(data) {
  if(data) {
    // user is logged in
    // flash mini dash
    g.mini_dash.returning(data.email, data.username);
  } else {
    // user is not logged in
    // show login form
    g.mini_dash.guest();
  }
}

// Graphedia object
function Graphedia() {
  this.socket = null;
  this.container = null;
  this.mini_dash = new MiniDash();
  this.url = null;
  
  g = this;
}

Graphedia.prototype.get_user = function() {
  $g.ajax({
    type: 'GET',
    url: 'http://' + URL + '/mini_dash',
    dataType: 'jsonp'
  })
}
Graphedia.prototype.setup_socket = function() {
  g.socket = io.connect('http://' + URL, 3000);
  g.socket.emit('init', document.URL, function(data) {
    for(i in data) g.add_comment(data[i].page_x, data[i].page_y, data[i].body); 
  });
  
  g.socket.on('comments.new',function(data) {
    g.add_comment(data.x,data.y,data.comment);
  })
}
Graphedia.prototype.add_markup = function() {
  var gcont = g.container = $g('<div>').attr('id','graphedia_container');
  $g('body').prepend(gcont);
  
  g.add_mini_dash();
  
  $g(window).click(function(e) {
    if(e.shiftKey) g.create_comment(e.pageX, e.pageY);
  })
}
Graphedia.prototype.add_mini_dash = function() {
  g.container.append(g.mini_dash.markup);
  g.mini_dash.init();
}
Graphedia.prototype.create_comment = function(x,y) {
  // remove old unsubmitted comment forms
  $g('.new-comment').remove();
  
  // add new comment form
  var new_comment = $g('<div>').addClass('new-comment').css({top:y,left:x});
  var form = $g('<form>',{name:'new_comment'});
  var message = $g('<input>',{type:'text',name:'new_comment'});
  var submit = $g('<input>',{type:'submit',name:'submit',value:'Post'});
  g.container.append(new_comment);
  new_comment.append(form);
  form.append(message,$g('<br>'),submit);
  message.focus();
  
  form.submit(function() {
    var comment = message.val();
    g.socket.emit('comments.new', { x: x, y: y, comment: comment }, function(data) {
      if(data.success) {
        new_comment.remove();
        g.add_comment(x,y,comment)
      }
    })
    return false;
  })
}
Graphedia.prototype.add_comment = function(x,y,comment) {
  var comment = $g('<div>').addClass('comment').css({
    'position': 'absolute',
    'top': y+'px',
    'left': x+'px'
  }).html(comment);
  
  g.container.append(comment);
}

function MiniDash() {
  this.markup = $('<div>').addClass('mini-dash');
  
  md = this;
}
MiniDash.prototype.init = function() {
  md.markup.fadeIn('fast', function() {
    setTimeout(function() {
      md.markup.fadeOut('fast')
    }, 1500)
  })
}
MiniDash.prototype.guest = function() {
  md.markup.append("Sup noob. How bout you register or login?");
}
MiniDash.prototype.returning = function(email, username) {
  md.markup.append("Hey " + username + ", what's good?");
}