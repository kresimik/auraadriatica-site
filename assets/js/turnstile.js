/* Turnstile callbacks — referenced by name from the widget's
   data-callback / data-expired-callback attributes, so they must be
   defined before Cloudflare's api.js initialises the widget.

   Loaded as a plain (non-deferred) script in <head> for that reason:
   on the apartment pages api.js is async, so a deferred file here
   could lose the race. */
window.cfStoreToken = function (token) {
  var t = document.getElementById('cf-token');
  if (t) t.value = token || '';
  var st = document.getElementById('cf-status');
  if (st && st.classList.contains('err')) st.textContent = '';
};

window.cfExpireToken = function () {
  var t = document.getElementById('cf-token');
  if (t) t.value = '';
};
