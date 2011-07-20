// constants, rendered by app.js with environment variables
var URL = #{url};

// jquery
var $g;

// variables preceeded by underscores refer to the 'this' object
// _g : Graphedia
// _md : MiniDash
var _g = null;
var _md = null;

//
var _activeComment = null;
var _activeCoords = [];

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
    load_elastic();
  }
}

load_elastic = function() {
  load_js("http://" + URL + "/javascripts/elastic.js",load_elastic.try_ready)
}
load_elastic.try_ready = function(time_elapsed) {
  //TODO: fix this shit. a way to detect if it's loaded or not
  // if (typeof $g.elastic == "undefined") {
    // if (time_elapsed <= 5000) setTimeout("load_elastic.try_ready(" + (time_elapsed + 200) + ")", 200);
    // else alert("Timed out while loading jQuery Elastic.")
  // } else {
    load_dep.loaded(load_jq);
  // }
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
  
  _g.socket.on('comments.new', function(data) {
    _g.container.append(
      new Comment('add', { x: data.x, y: data.y, author: data.author, comment_id: data.comment_id, comment: data.comment, ups: 0 })
    );
  })
  _g.socket.on('comments.upvote', function(data) {
    var comment_id = data.comment_id;
    var total_ups = data.total_ups;
    _g.container.find('#' + comment_id).children('.upvotes').html(total_ups)
  })
}
// load comments recursively, which is kinda dumb but i can't figure out how else to do it
Graphedia.prototype.next_comment = function(comments) {
  if(comments.length > 0) {
    _g.socket.emit('users.load', comments[0].author_id, function(author) {
      _g.container.append(
        new Comment('add', { x: comments[0].page_x, y: comments[0].page_y, author: author, comment_id: comments[0]._id, comment: comments[0].body, ups: comments[0].ups })
      );
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
  _g.socket.emit('users.access_token', _g.user.access_token);
}

// comment object
function Comment(method, params) {
  this.author_id = params.author._id;
  this.author = params.author.username;
  this.timestamp = params.date || null;
  this.comment_id = params.comment_id || null;
  this.comment = params.comment || null;
  this.ups = params.ups || null;
  this.x = params.x || 0;
  this.y = params.y || 0;
  
  if(method == 'add') return this.add();
  else if(method == 'create') return this.create();
}

Comment.prototype.add = function() {
  var c = this;
  var container = $g('<div>').addClass('commentContainer').css({
    'position': 'absolute',
    'top': (c.y-10) + 'px',
    'left': (c.x-13) + 'px'
  }).attr('id',c.comment_id).click(function() {
      c.upvote();
       $g('#backgroundLightBox')[0] ? c.magic(true) : c.magic(false);
  })
  
  var author = $g('<div>').addClass('commentAuthor').html(c.author)
  
  var comment = $g('<div>').addClass('comment').html(c.comment)
  
  var ups = $g('<span>').addClass('upvotes').html(c.ups)
  
  container.append(ups)
  container.append(author)
  container.append(comment)
  
  return container;
}
Comment.prototype.create = function() {
  var c = this;
  
  // remove old unsubmitted comment forms
  $g('.new-comment').remove();
  
  // add new comment form
  var new_comment = $g('<div>').addClass('new-comment').css({ top: (c.y-10), left: (c.x-13) }); //i don't know why it starts out 50 pixels below, but whatever.
  var form = $g('<form>',{name:'new_comment'});
  var comment = $g('<textarea>').addClass('commentField').attr('name','new_comment').attr('id','newCommentId').css({'font-size': '12px', 'width':'210px', 'padding':'10px !important','height':'37px'});
  var submit = $g('<input>').attr('class','commentSubmit').attr('type','submit').attr('name','submit').attr('value','Post');
  
  comment.keydown(function(e){
    if (e.keyCode == 13) {
      submit.parents('form').submit();
      return false;
    }
  });
  
  new_comment.append(form);
  form.append(comment,submit);
  
  comment.elastic();
  
  return { obj: this, markup: new_comment, comment: comment, form: form };
}
Comment.prototype.ready = function(g, markup, comment, form) {
  var c = this;
  
  comment.focus();
  
  form.submit(function() {
    var body = comment.val();
    // use local g object instead of global _g
    g.socket.emit('comments.new', { access_token: _g.user.access_token, x: c.x, y: c.y, comment: body }, function(data) {
      if(data.success) {
        markup.remove();
        g.container.append(new Comment('add', { x: c.x, y: c.y, author: _g.user, comment_id: data.comment_id, comment: body, ups: 0 }));
      }
    })
    return false;
  })
}
Comment.prototype.upvote = function() {
  var c = this;
  
  _g.socket.emit('comments.upvote', { access_token: _g.user.access_token, comment_id: c.comment_id }, function(data) {
    if(data.success) _g.container.find('#' + c.comment_id).children('.upvotes').html(data.total_ups)
  })
}

Comment.prototype.magic = function(isActive){
  if(isActive){
    $g('#backgroundLightBox').remove();
    $g('html').find('.commentContainer').css('opacity', '1');
    $g('#' + _activeComment).animate({
              left: _activeCoords[0],
              top: _activeCoords[1]
            }, 200, function() {
              return false;
            })

      if (this.comment_id == _activeComment) {
        _activeComment = null;
        return;
      }
  }
  
  var c = this;
  
  _activeComment = this.comment_id;
  _activeCoords = [this.x, this.y]
  
  var background = $g('<div>').attr('id','backgroundLightBox').css({'position':'absolute','top':'0','left':'0','height':$g(document).height(),'width':$g(document).width(),'background':'black','opacity':'.6'})
  $g('html').append(background)
  $g('html').find('.commentContainer').css('opacity', '.4');
  
  width = ($g(window).width() / 2) - 105
  height = $g(window).height() / 6
  $g('#' + c.comment_id).css('opacity','1')
  $g('#' + c.comment_id).animate({
      left: width,
      top: height
    }, 200, function() {
        // background.click(resetMagic())
    })
  }

// mini dash object
function MiniDash() {
  this.markup = $g('<div>').attr('id','mini-dash');
  this.iframe = $g('<iframe>').attr('src','http://'+URL+'/remote_login?url='+encodeURI(document.URL)).addClass('remote-login')
  
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

function resetMagic(){
  console.log("reseting")
  var comment = $g('#' + _activeComment)
  comment.animate({
      left: _activeCoords[0],
      top: _activeCoords[1]
    }, 200, function() {
        
    })
}