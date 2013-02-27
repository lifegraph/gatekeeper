var socket = io.connect(window.location.protocol + '//' + window.location.host);
socket.on('unmapped-pid', function (json) {
  console.log("YEAH")
  // if (!$('.app[data-namespace=' + json.namespace + ']')[0] || $('.app[data-namespace=' + json.namespace + ']').attr('data-connected') == undefined) {
  //   return;
  // }
  var $unclaimed_token = $('<div></div>');
  $unclaimed_token.addClass('alert').addClass('alert-info').addClass('unclaimed-token');
  $unclaimed_token.append($('<button/>').addClass('close').attr('type', 'button').attr('data-dismiss', 'alert').html('&times;'));
  $unclaimed_token.append($('<span></span>').text('An unclaimed ID (' + json.pid + ') just connected to '));
  $unclaimed_token.append($('<span></span>').addClass('namespace').text(json.namespace));
  var $claim_button = $('<button/>').addClass('btn').addClass('btn-info').addClass('btn-small').css('margin-left', '15px').text('Claim this ID');
  $unclaimed_token.append($claim_button);
  $unclaimed_token.append($('<button/>').addClass('btn').addClass('btn-small').attr('type', 'button').attr('data-dismiss', 'alert').text('Dismiss'));


  $('#unclaimed-tokens').append($unclaimed_token);
  $claim_button.unbind().on('click', function () {

    $.ajax({
    method: 'POST',
    url: '/api/tokens/' + json.pid,
    success: function () {
      console.log(arguments);
      console.log('success');
      window.location.reload();
    },
    error: function () {
      console.log(arguments);
      console.log('error');
    }
  });

  });
});

$(function () {
  $('#token-status .label-success').on('click', function () {
    if (confirm('Would you like to unbind this ID?')) {
      $.ajax({
        method: 'DELETE',
        url: '/api/tokens/' + $(this).attr('data-pid'),
        success: function () {
          console.log(arguments);
          console.log('success');
          window.location.reload();
        },
        error: function () {
          console.log(arguments);
          console.log('error');
        }
      });
    }
  });
});