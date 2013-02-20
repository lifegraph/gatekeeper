var socket = io.connect(window.location.protocol + '//' + window.location.host);
socket.on('unmapped-pid', function (json) {
  $('#unclaimed-token').show();
  $('#unclaimed-token .namespace').text(json.namespace);
  $('#unclaimed-token .btn-info').unbind().on('click', function () {

    if (!json.pid) {
      window.location = '/' + json.namespace + '/login';
    } else {
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
    }
  });
});

$(function () {
  $('#unclaimed-token').hide();
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
  })
});