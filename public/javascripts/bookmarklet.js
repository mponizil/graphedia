var load_dep = {};
load_dep.start = function(next) {
  this.next = next;
  for(i in dep_needed) dep_needed[i]();
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
  if (typeof $ == "undefined") {
    if (time_elapsed <= 5000) setTimeout("load_jq.try_ready(" + (time_elapsed + 200) + ")", 200);
    else alert("Timed out while loading jQuery.")
  } else { load_dep.loaded(load_jq); }
}

load_socketio = function() {
  load_js("/socket.io/socket.io.js",load_socketio.try_ready)
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
  css.setAttribute('href','/stylesheets/bookmarklet.css');
  document.getElementsByTagName('head')[0].appendChild(css);
  load_dep.loaded(load_css);
}

var dep_needed = [load_jq,load_socketio,load_css];
var dep_loaded = [];

(function() {
  load_dep.start(init);
}())

function init() {
  var graphedia = new Graphedia();
  graphedia.setup_socket();
  graphedia.add_markup();
}

function Graphedia() {
  this.socket = null;
  this.container = null;
}

Graphedia.prototype.setup_socket = function() {
  var g = this;
  
  g.socket = io.connect('http://localhost',3000);
  g.socket.emit('init', { url: document.URL })
}
Graphedia.prototype.add_markup = function() {
  var g = this;
  
  var gcont = g.container = $('<div>').attr('id','graphedia_container');
  $('body').prepend(gcont);
  
  var new_comment_cont = $('<div>').addClass('new-comment');
  var new_comment_checkbox = $('<input>',{type:'checkbox',name:'new_comment',id:'new_comment'});
  var new_comment_label = $('<label>',{for:'new_comment'}).html("new comment");
  new_comment_cont.append(new_comment_checkbox,new_comment_label);
  gcont.append(new_comment_cont);
  
  $(window).click(function(e) {
    var new_comment = (new_comment_checkbox.attr('checked')
                      && e.target != new_comment_checkbox[0]
                      && e.target != new_comment_label[0]);
    if(new_comment) g.create_comment(e.pageX, e.pageY);
  })
}
Graphedia.prototype.create_comment = function(x,y) {
  console.log('create comment at: ', x, y)
}
Graphedia.prototype.add_comment = function() {
  var g = this;
  
  var comment = $('<div>').addClass('comment').css({
    'position': 'absolute',
    'top': '550px',
    'left': '20px'
  }).html("here is a comment");
  
  g.container.append(comment);
}