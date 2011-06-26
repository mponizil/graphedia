var URL = #{url};

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
  this.url = null;
}

Graphedia.prototype.setup_socket = function() {
  var g = this;
  
  g.socket = io.connect('http://' + URL, 3000);
  g.socket.emit('init', document.URL);
  
  g.socket.on('comment.new',function(data) {
    g.add_comment(data.x,data.y,data.comment);
  })
}
Graphedia.prototype.add_markup = function() {
  var g = this;
  
  var gcont = g.container = $('<div>').attr('id','graphedia_container');
  $('body').prepend(gcont);
  
  var enabled = $('<div>',{class:enabled});
  
  $(window).click(function(e) {
    if(e.shiftKey) g.create_comment(e.pageX, e.pageY);
  })
}
Graphedia.prototype.create_comment = function(x,y) {
  var g = this;
  
  // remove old unsubmitted comment forms
  $('.new-comment').remove();
  
  // add new comment form
  var new_comment = $('<div>',{class:'new-comment'}).css({top:y,left:x});
  var form = $('<form>',{name:'new_comment'});
  var textarea = $('<textarea>',{name:'new_comment'});
  var submit = $('<input>',{type:'submit',name:'submit',value:'Post'});
  g.container.append(new_comment);
  new_comment.append(form);
  form.append(textarea,$('<br>'),submit);
  textarea.focus();
  
  form.submit(function() {
    g.socket.emit('comment.new', { x: x, y: y, comment: textarea.val() }, function(data) {
      console.log(data);
    })
    return false;
  })
}
Graphedia.prototype.add_comment = function(x,y,comment) {
  var g = this;
  
  var comment = $('<div>',{class:'comment'}).css({
    'position': 'absolute',
    'top': y+'px',
    'left': x+'px'
  }).html(comment);
  
  g.container.append(comment);
}