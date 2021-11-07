$(document).ready(function() {

  let timer, spacer, interval;

  $('.add-cash').hide();
  $('#open-pack').attr('disabled', 'disabled');
  loadCards('SM12');
  changeTimer();
  changeSpacer();
  revealCashButton();
  earnByBeingIdle();

  /**
   * @see https://www.geeksforgeeks.org/how-to-change-the-time-interval-of-setinterval-method-at-runtime-using-javascript/
   */
  function revealCashButton() {
    clearInterval(interval);

    if (!$('.add-cash').is(':visible')) {
      $('.add-cash').css('margin-left', spacer);
      $('.add-cash').show();
    }

    changeTimer();
    changeSpacer();
    interval = setInterval(revealCashButton, timer);
  }

  function changeTimer() {
    timer = Math.random() * 10000;
  }
  function changeSpacer() {
    spacer = Math.floor(Math.random() * 300);
  }

  function earnByBeingIdle() {
    setInterval(
      function() {
        wallet += 0.01;
        updateStats();
      },
      1000
    );
  }
});

