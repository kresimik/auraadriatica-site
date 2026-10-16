/* lang-route.js — keeps the stored language and the address in step.
   Loaded WITHOUT defer in <head>, so it runs before the page paints: a
   redirect happens before any English is drawn, and localStorage.lang is
   settled before i18n.js, apt.js and the other page scripts read it.

   English lives at the root (/explore); every other language under its own
   prefix (/de/explore). The address always wins: someone arriving on /de/
   from a search result gets German, whatever they chose last time.

   Not loaded on the guest page (it switches language in place) or the 404. */
(function () {
  var PREFIXED = ["hr", "de", "it", "sl", "hu", "cs", "sk", "uk"];
  // Bosnian, Serbian and Serbo-Croatian readers are better served by Croatian.
  var ALIAS = { bs: "hr", sr: "hr", sh: "hr" };

  var path = location.pathname;
  var m = path.match(/^\/([a-z]{2})(\/|$)/);
  var urlLang = m && PREFIXED.indexOf(m[1]) !== -1 ? m[1] : "en";

  var saved = null;
  try { saved = localStorage.getItem("lang"); } catch (e) { return; } // storage blocked: leave as is

  if (urlLang !== "en") {
    if (saved !== urlLang) { try { localStorage.setItem("lang", urlLang); } catch (e) {} }
    return;
  }

  // English address. On a first visit, adopt the browser's language.
  if (!saved) {
    saved = "en";
    var prefs = navigator.languages && navigator.languages.length
      ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < prefs.length; i++) {
      var base = String(prefs[i]).toLowerCase().split("-")[0];
      var lang = ALIAS[base] || base;
      if (lang === "en" || PREFIXED.indexOf(lang) !== -1) { saved = lang; break; }
    }
    try { localStorage.setItem("lang", saved); } catch (e) {}
  }

  // Someone who prefers another language lands on the English page: send
  // them to their version. Choosing EN in the menu stores "en", so English
  // stays reachable. Crawlers have no stored choice and an English browser
  // locale, so they are never redirected.
  if (saved !== "en" && PREFIXED.indexOf(saved) !== -1) {
    location.replace("/" + saved + path + location.search + location.hash);
  }
})();
