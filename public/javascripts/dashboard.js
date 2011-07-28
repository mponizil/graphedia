var socket = io.connect('http://' + URL + '/dashboard');

socket.emit('users.confirm_socket', $.cookie('access_token'))

socket.on('firehose', function(data) {
  var comment = $('<div>').addClass('firehose-comment').attr('js_value',data.page_url).attr('id','fh_' + data.comment_id);
  var author = $('<div>').addClass('author').html(data.author);
  var text = $('<div>').addClass('text').html(data.comment)
  var url = $('<div>').addClass('commentUrl').html(data.stripped_url);
  
  comment.append(author,text,url);
  
  // dont worry about this selector bein fuxxed right now
  $('#column4 .jspPane').prepend(comment);
})

socket.on('reply', function(data) {
  var reply = $('<div>').addClass('reply').attr('js_value',data.page_url).attr('id','reply_' + data.comment_id);
  var author = $('<div>').addClass('author').html(data.author + ' ');
  var span = $('<span>').addClass('black').html('said')
  var text = $('<div>').addClass('text').html(data.comment);
  var original = $('<div>').addClass('original').html('in reply to ' + data.parent_body);
  var url = $('<div>').addClass('commentUrl').html(data.stripped_url);
  
  author.append(span);
  reply.append(author,text,original,url);
  
  // dont worry about this selector bein fuxxed right now
  $('#firehose .jspPane').prepend(reply);
})

socket.on('my.upvote', function(data) {
  $('#mc_' + data.comment_id + ' .myCommentUps').html(data.total_ups);
})

socket.on('top.upvote', function(data) {
  $('#top_' + data.comment_id + ' .points').html(data.total_ups);
  
  $('.top-comment').sortElements(function(a, b) {
    return $(a).find('.points').text() < $(b).find('.points').text() ? 1 : -1;
  })
})

$(function() {
  $('.commentScroller').jScrollPane({showArrows:true});
});

$(".firehose-comment").live("mouseover mouseout click", function(event) {
  if ( event.type == "mouseover" ) {
    $(this).css({'border': '3px solid #FF00CB', 'border-radius':'5px', 'margin-top': '-3px', 'margin-bottom': '12px'})
  } else if (event.type == "mouseout") {
    $(this).css({'border': 'none', 'margin-top': '0px', 'margin-bottom': '15px'})
  } else {
    window.open($(this).attr('js_value'), '_newtab');
  }
});

$(".top-comment").live("mouseover mouseout click", function(event) {
  if ( event.type == "mouseover" ) {
    $(this).css({'border': '3px solid #00FF10', 'border-radius':'5px', 'margin-top': '-3px', 'margin-bottom': '12px'})
  } else if (event.type == "mouseout") {
    $(this).css({'border': 'none', 'margin-top': '0px', 'margin-bottom': '15px'})
  } else {
    window.open($(this).attr('js_value'), '_newtab');
  }
});

$(".site").live("mouseover mouseout click", function(event) {
  if ( event.type == "mouseover" ) {
    $(this).css({'border': '3px solid #FFFA3B', 'border-radius':'5px', 'margin-top': '-3px', 'margin-bottom': '12px'})
  } else if (event.type == "mouseout") {
    $(this).css({'border': 'none', 'margin-top': '0px', 'margin-bottom': '15px'})
  } else {
    window.open($(this).attr('js_value'), '_newtab');
  }
});

$(".myComment").live("mouseover mouseout click", function(event) {
  if ( event.type == "mouseover" ) {
    $(this).css({'border': '3px solid #00FAFF', 'border-radius':'5px', 'margin-top': '-3px', 'margin-bottom': '12px'})
  } else if (event.type == "mouseout") {
    $(this).css({'border': 'none', 'margin-top': '0px', 'margin-bottom': '15px'})
  } else {
    window.open($(this).attr('js_value'), '_newtab');
  }
});

$(".reply").live("mouseover mouseout click", function(event) {
  if ( event.type == "mouseover" ) {
    $(this).css({'border': '3px solid #FF8500', 'border-radius':'5px', 'margin-top': '-3px', 'margin-bottom': '12px'})
  } else if (event.type == "mouseout") {
    $(this).css({'border': 'none', 'margin-top': '0px', 'margin-bottom': '15px'})
  } else {
    window.open($(this).attr('js_value'), '_newtab');
  }
});

stripChars = function(url){
  var endIndex = url.indexOf("/")
  var startIndex = url.indexOf("www.", 0)
  if (startIndex == -1){
    startIndex = 0;
  } else {
    startIndex = 4;
  }
  if (endIndex == -1){
    url = url.substring(startIndex);
  } else {
    url = url.substring(startIndex, endIndex);
  }
  return url;
}