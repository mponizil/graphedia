jQuery.fn.sortElements = (function(){
 
    var sort = [].sort;
 
    return function(comparator, getSortable) {
 
        getSortable = getSortable || function(){return this;};
 
        var placements = this.map(function(){
 
            var sortElement = getSortable.call(this),
                parentNode = sortElement.parentNode,
 
                // Since the element itself will change position, we have
                // to have some way of storing its original position in
                // the DOM. The easiest way is to have a 'flag' node:
                nextSibling = parentNode.insertBefore(
                    document.createTextNode(''),
                    sortElement.nextSibling
                );
 
            return function() {
 
                if (parentNode === this) {
                    throw new Error(
                        "You can't sort elements if any one is a descendant of another."
                    );
                }
 
                // Insert before flag:
                parentNode.insertBefore(this, nextSibling);
                // Remove flag:
                parentNode.removeChild(nextSibling);
 
            };
 
        });
 
        return sort.call(this, comparator).each(function(i){
            placements[i].call(getSortable.call(this));
        });
 
    };
 
})();

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
  var author = $('<div>').addClass('author').html(data.author + ' ');
  var span = $('<span>').addClass('black').html('said')
  var text = $('<div>').addClass('text').html(data.comment);
  var original = $('<div>').addClass('original').html('in reply to');
  var a = $('<a>').attr('href',data.page_url).html(data.parent_body);
  
  author.append(span);
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
  
  $('#column3 .jspPane').sortElements(function(a, b) {
    return $(a).find('.points').text() > $(b).find('.points').text() ? 1 : -1;
  })
})

$(function() {
  $('.commentScroller').jScrollPane({showArrows:true});
});

$(".firehose-comment").live("mouseover mouseout click", function(event) {
  if ( event.type == "mouseover" ) {
    $(this).css({'border': '3px solid #FF57E3', 'border-radius':'5px', 'margin-top': '-3px', 'margin-bottom': '12px'})
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
    $(this).css({'border': '3px solid #00FAFF', 'border-radius':'5px', 'margin-top': '-3px', 'margin-bottom': '12px'})
  } else if (event.type == "mouseout") {
    $(this).css({'border': 'none', 'margin-top': '0px', 'margin-bottom': '15px'})
  } else {
    window.open($(this).attr('js_value'), '_newtab');
  }
});
