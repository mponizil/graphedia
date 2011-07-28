var socket = io.connect('http://' + URL + '/dashboard');

socket.emit('users.confirm_socket', $.cookie('access_token'))

socket.on('firehose', function(data) {
  var comment = $('<div>').addClass('comment').attr('id','fh_' + data.comment_id);
  var page_url = $('<a>').attr('href',data.page_url).html(data.page_url);
  var author = $('<div>').addClass('author').html(data.author);
  var text = $('<div>').addClass('text').html(data.comment)
  
  comment.append(page_url,author,text);
  
  $('#firehose .jspPane').prepend(comment);
})

socket.on('reply', function(data) {
  var reply = $('<div>').addClass('reply').attr('id','reply_' + data.comment_id);
  var author = $('<div>').addClass('author').html(data.author);
  var text = $('<div>').addClass('text').html(data.comment);
  var original = $('<div>').addClass('original');
  var a = $('<a>').attr('href',data.page_url).html(data.parent_body);
  
  original.append(a);
  reply.append(author,text,original);
  
  $('#column2 .jspPane').prepend(reply);
})