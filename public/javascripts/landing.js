$(function() { 
  $('#register_form').submit(function() {
    var email = $("#register input[name='email']");
    var username = $("#register input[name='username']");
    var password = $("#register input[name='password']");
    var email_re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    if(email.val().length > 0 && email.val().match(email_re)) {
      email.removeClass('form-error');
      if(username.val().length > 0) {
        username.removeClass('form-error');
        if(password.val().length > 0) {
          password.removeClass('form-error');
          $.post("/register", $("#register_form").serialize(), function(data) {
            var response = $.parseJSON(data)
            if(response.success) window.location = '/dashboard';
            else {
              $("#register .error-msg").html(response.error.message);
              $("#register input[name='" + response.target + "']").addClass('form-error');
              $("#register input[name='" + response.target + "']").focus();
            }
          })
        } else {
          password.addClass('form-error');
          $("#register .error-msg").html("Please choose a password.");
          password.focus();
        }
      } else {
        username.addClass('form-error');
        $("#register .error-msg").html("Please choose a username.");
        username.focus();
      }
    } else {
      email.addClass('form-error');
      $("#register .error-msg").html("Please enter a valid email address.");
      email.focus();
    }
    return false;
  })
  
  $('#login_form').submit(function() {
    $.post("/login", $("#login_form").serialize(), function(data) {
      var response = $.parseJSON(data);
      if(response.success) window.location = '/dashboard';
      else alert(response.error);
    })
    return false;
  })
  
  $("#login").click(function(){
    $("#login").hide();
    $("#mini-dash").slideDown('fast')
    $("#mini-dash input[name='username']").focus();
  });

  $('input').keydown(function(e){
    if (e.keyCode == 13) {
      $(this).parents('form').submit();
      return false;
    }
  });
});