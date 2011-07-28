var socket = io.connect('http://' + URL + '/dashboard');

socket.emit('users.confirm_socket', $.cookie('access_token'))

socket.on('firehose', function(data) {
  var comment = $('<div>').addClass('firehose-comment').attr('js_value',data.page_url).attr('id','fh_' + data.comment_id);
  var author = $('<div>').addClass('author').html(data.author);
  var text = $('<div>').addClass('text').html(data.comment)
  
  comment.append(author,text);
  
  // dont worry about this selector bein fuxxed right now
  $('#column4 .jspPane').prepend(comment);
})

socket.on('reply', function(data) {
  var reply = $('<div>').addClass('reply').attr('id','reply_' + data.comment_id);
  var author = $('<div>').addClass('author').html(data.author);
  var text = $('<div>').addClass('text').html(data.comment);
  var original = $('<div>').addClass('original');
  var a = $('<a>').attr('href',data.page_url).html(data.parent_body);
  
  original.append(a);
  reply.append(author,text,original);
  
  // dont worry about this selector bein fuxxed right now
  $('#firehose .jspPane').prepend(reply);
})

socket.on('my.upvote', function(data) {
  $('#mc_' + data.comment_id + ' .myCommentUps').html(data.total_ups);
})

socket.on('top.upvote', function(data) {
  $('#top_' + data.comment_id + ' .points').html(data.total_ups);
})

$(function() {
  $('.commentScroller').jScrollPane({showArrows:true});
});

$(".firehose-comment").live("mouseover mouseout click", function(event) {
  if ( event.type == "mouseover" ) {
    $(this).css({'border': '3px solid red', 'border-radius':'5px', 'margin-top': '-3px', 'margin-bottom': '12px'})
  } else if (event.type == "mouseout") {
    $(this).css({'border': 'none', 'margin-top': '0px', 'margin-bottom': '15px'})
  } else {
    window.open($(this).attr('js_value'), '_newtab');
  }
});
