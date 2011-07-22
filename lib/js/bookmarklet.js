// constants, rendered by app.js with environment variables
var URL = #{url};

// jquery
var $g;

// variables preceeded by underscores refer to the 'this' object
// _g : Graphedia
var _g = null;

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
  this.comment_manager = new CommentManager();
  this.comment_magic = new CommentMagic();
  this.url = null;
  
  _g = this;
}
Graphedia.prototype.setup_socket = function() {
  _g.socket = io.connect('http://' + URL, 3000);
  _g.socket.emit('graphedia.init', document.URL, function(all_comments) {
    _g.display_comments(all_comments)
  });
  
  _g.socket.on('comments.new', function(data) {
    var new_comment = new Comment('show', {
      comment_id: data.comment_id,
      comment: data.comment,
      author_id: data.author._id,
      author: data.author.username,
      parent_id: data.parent_id,
      x: data.page_x,
      y: data.page_y,
      ups: 0
    })
    _g.comment_manager.display(new_comment);
  })
  _g.socket.on('comments.upvote', function(data) {
    _g.container.find('#' + data.comment_id).children('.upvotes').html(data.total_ups)
  })
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
      var new_comment = new Comment('create', {
        author_id: _g.user._id,
        author: _g.user.username,
        parent_id: 0,
        x: e.pageX,
        y: e.pageY
      })
      _g.comment_manager.display(new_comment);
      new_comment.ready();
    }
  })
}
Graphedia.prototype.confirm_socket = function() {
  _g.socket.emit('users.access_token', _g.user.access_token);
}
Graphedia.prototype.display_comments = function(comments) {
  for(i in comments) _g.display_replies(comments[i]);
}
Graphedia.prototype.display_replies = function(comment) {
  var reply = new Comment('show', {
    comment_id: comment._id,
    comment: comment.body,
    author_id: comment.author_id,
    author: 'john',
    parent_id: comment.parent_id,
    x: comment.page_x,
    y: comment.page_y,
    ups: comment.ups
  })
  
  _g.comment_manager.display(reply)
  
  for(i in comment.replies) {
    _g.display_replies(comment.replies[i])
  }
}

// comment manager object
function CommentManager() {
  this.last_create = null;
}

CommentManager.prototype.display = function(comment) {
  var parent = $g('#cp_' + comment.parent_id);
  var ul;
  if(parent.length == 0) {
    parent = _g.container;
    ul = $g('<ul>').addClass('top-level').css({
      position: 'absolute',
      top: comment.y,
      left: comment.x
    })
  } else {
    ul = parent.children('ul')
    if(ul.length == 0) ul = $g('<ul>')
  }
  
  var li = $g('<li>');
  var cp_div = $g('<div>').addClass('comment-parent').attr('id','cp_' + comment.comment_id)
  ul.append(li);
  li.append(cp_div)
  
  cp_div.append(comment.markup)
  
  parent.append(ul)
}
CommentManager.prototype.destroy = function(comment) {
  var cp_div = $g('#cp_' + comment.comment_id);
  var li = cp_div.parent('li');
  if(li.siblings().length == 0) {
    var ul = li.parent('ul');
    ul.remove();
  } else {
    li.remove();
  }
  
  this.last_create = null;
}
CommentManager.prototype.replace = function(old_comment, new_comment) {
  var cp_div = old_comment.markup.parent('#cp_' + old_comment.comment_id);
  cp_div.empty();
  cp_div.append(new_comment.markup);
  cp_div.attr('id','cp_' + new_comment.comment_id)
}

// comment object
function Comment(method, params) {
  this.comment_id = params.comment_id || 0;
  this.comment = params.comment || null;
  this.author_id = params.author_id;
  this.author = params.author;
  this.timestamp = params.date || null;
  this.parent_id = params.parent_id;
  this.x = params.x || 0;
  this.y = params.y || 0;
  this.ups = params.ups || null;
  this.markup = null;
  
  if(method == 'show') return this.show();
  else if(method == 'create') return this.create();
}

Comment.prototype.show = function() {
  var c = this;
  
  c.markup = $g('<div>').addClass('comment-container').attr('id',c.comment_id).click(function() {
    //$g('#bg-lightbox')[0] ? c.magic(true) : c.magic(false);
  })
  
  var author = $g('<div>').addClass('comment-author').html(c.author)
  
  var comment = $g('<div>').addClass('comment').html(c.comment)
  
  var ups = $g('<span>').addClass('upvotes').html(c.ups).click(function() {
    c.upvote();
  })
  
  var reply = $g('<a>').html('reply').click(function() {
    c.reply();
  })
  
  c.markup.append(ups, author, comment, reply)
  
  return c;
}
Comment.prototype.reply = function() {
  var c = this;
  
  var new_comment = new Comment('create', {
    author_id: _g.user._id,
    author: _g.user.username,
    parent_id: c.comment_id
  })
  _g.comment_manager.display(new_comment);
  new_comment.ready();
  
  _g.comment_manager.last_create = new_comment;
}
Comment.prototype.create = function() {
  var c = this;
  
  // remove old unsubmitted comment forms
  if(_g.comment_manager.last_create) _g.comment_manager.destroy(_g.comment_manager.last_create)
  
  // add new comment form
  c.markup = $g('<div>').addClass('new-comment'); //.css({ top: (c.y-10), left: (c.x-13) }); //i don't know why it starts out 50 pixels below, but whatever.
  var form = $g('<form>').addClass('new-comment-form').attr('name','new_comment_form');
  var comment = $g('<textarea>').addClass('new-comment-field').attr('name','new_comment');
  
  comment.keydown(function(e){
    if (e.keyCode == 13) {
      comment.parents('form').submit();
      return false;
    }
  });
  
  c.markup.append(form);
  form.append(comment);
  
  comment.elastic();
  
  _g.comment_manager.last_create = c;
  
  return c;
}
Comment.prototype.ready = function() {
  var c = this;
  
  var markup = c.markup;
  var form = c.markup.find('.new-comment-form')
  var comment = c.markup.find('.new-comment-field')
  
  comment.focus();
  
  form.submit(function() {
    var body = comment.val();
    _g.socket.emit('comments.new', {
      access_token: _g.user.access_token,
      comment: body,
      parent_id: c.parent_id,
      x: c.x,
      y: c.y
    }, function(data) {
      if(data.success) {
        var new_comment = new Comment('show', {
          comment_id: data.comment_id,
          comment: body,
          author_id: _g.user._id,
          author: _g.user.username,
          parent_id: c.parent_id,
          x: c.x,
          y: c.y,
          ups: 0
        })
        _g.comment_manager.replace(c, new_comment);
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
//TODO: arrow keys cycle through errthang
Comment.prototype.magic = function(is_active) {
  var c = this;
  
  if(is_active) {
    // move the current comment back to it's original position
    $g('#bg-lightbox').remove();
    $g('.comment-container').css('opacity', '1');
    $g('#cp_' + _g.comment_magic.active_comment).animate({
      left: _g.comment_magic.active_coords[0],
      top: _g.comment_magic.active_coords[1]
    }, 200, function() {
      return false;
    })
    
    if (c.comment_id == _g.comment_magic.active_comment) {
      _g.comment_magic.active_comment = null;
      return;
    }
  }
  
  _g.comment_magic.active_comment = c.comment_id;
  _g.comment_magic.active_coords = [c.x, c.y]
  
  var background = $g('<div>').attr('id','bg-lightbox').css({'height':$g(document).height(),'width':$g(document).width()});
  $g('html').append(background)
  $g('.comment-container').css('opacity', '.4');
  
  width = ($g(window).width() / 2) - 105;
  height = $g(window).height() / 6;
  
  var top_ul = $g('#cp_' + c.comment_id).parents('ul.top-level');
  
  $g('#cp_' + c.comment_id).css('opacity','1');
  $g('#cp_' + c.comment_id).animate({
    left: width,
    top: height
  }, 200, function() {
    // background.click(_g.comment_magic.reset_magic())
  })
}

// comment magic object
function CommentMagic() {
  this.active_comment = null;
  this.active_coords = [];
}
CommentMagic.prototype.reset_magic = function() {
  console.log("reseting")
  // var comment = $g('#' + _g.comment_magic.active_comment)
  // comment.animate({
  //     left: _g.comment_magic.active_coords[0],
  //     top: _g.comment_magic.active_coords[1]
  //   }, 200, function() {
  //       
  //   })
}

// mini dash object
function MiniDash() {
  this.markup = $g('<div>').attr('id','mini-dash');
  this.iframe = $g('<iframe>').attr('src','http://'+URL+'/remote_login?url='+encodeURI(document.URL)).addClass('remote-login')
  
  this.markup.append(this.iframe);
}
MiniDash.prototype.init = function() {
  _g.mini_dash.markup.slideDown('fast')
}
MiniDash.prototype.logged_in = function() {
  _g.mini_dash.iframe.remove();
  _g.mini_dash.markup.append('Hey ' + _g.user.username + '!')
  
  setTimeout(function() {
    _g.mini_dash.markup.slideUp('fast')
  }, 1500)
}