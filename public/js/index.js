var socket = io.connect(window.location.protocol + '//' + window.location.host);
socket.on('unmapped-pid', function (json) {
  if (!$('.app[data-namespace=' + json.namespace + ']')[0] || $('.app[data-namespace=' + json.namespace + ']').attr('data-connected') == undefined) {
    return;
  }

  $('#unclaimed-token').show();
  $('#unclaimed-token .namespace').text(json.namespace);
  $('#unclaimed-token .btn-info').unbind().on('click', function () {

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