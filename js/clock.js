$(document).ready(function () {
  // target in Israel time
  const target = moment.tz('2026-02-12 19:00', 'YYYY-MM-DD HH:mm', 'Asia/Jerusalem');
  const now = moment();
  let diff = target.diff(now, 'seconds');

  const $clock = $('.clock');
  let clock;

  if (diff <= 0) {
    clock = $clock.FlipClock(0, {
      clockFace: 'DailyCounter',
      countdown: true,
      autostart: false
    });
    console.log('Date has already passed!');
  } else {
    clock = $clock.FlipClock(diff, {
      clockFace: 'DailyCounter',
      countdown: true,
      callbacks: {
        stop: function () { console.log('Timer has ended!'); }
      }
    });

    // keep it pinned at 0 at the end
    (function checktime() {
      const t = clock.getTime();
      if (t <= 0) clock.setTime(0);
      setTimeout(checktime, 1000);
    })();
  }
});
