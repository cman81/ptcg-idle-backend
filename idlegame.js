$(document).ready(function() {

  let timer, spacer, interval;

  $('.add-cash').hide();
  $('#open-pack').attr('disabled', 'disabled');
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
      $('.add-cash').css('margin-left', spacer + '%');
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
    spacer = Math.floor(Math.random() * 90);
  }

  function earnByBeingIdle() {
    setInterval(
      function() {
        if (!profileId) {
          return;
        }

        wallet += 0.01;
        updateStats();
      },
      10000
    );
  }
});


/**
 * Cash accumulates for the user when they close the app. When they return, give them that cash.
 */
 function getAwayCash(lastUpdatedSeconds) {
  if (!lastUpdatedSeconds) {
      // sorry, no soup for you :(
      return 0;
  }
  const timestampSeconds = Date.now() / 1000;
  let remainingSecondsAway = timestampSeconds - lastUpdatedSeconds;

  // deduct 5 minutes
  remainingSecondsAway -= 5 * 60;
  if (remainingSecondsAway < 0) {
      return 0;
  }
  let awayCash = remainingSecondsAway * .001;

  // deduct 6 hours
  remainingSecondsAway -= 6 * 60 * 60;
  if (remainingSecondsAway < 0) {
      return awayCash;
  }
  awayCash += remainingSecondsAway * .001;

  // deduct 24 hours
  remainingSecondsAway -= 24 * 60 * 60;
  if (remainingSecondsAway < 0) {
      return awayCash;
  }
  awayCash += remainingSecondsAway * .001;

  return awayCash;
}
