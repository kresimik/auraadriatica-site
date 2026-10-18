/* /assets/js/aa-calendar.js */

/* Aura Adriatica – Fancy Monthly Calendar (vanilla JS)
   - Fetches /api/ical/{apt} -> { bookings:[{start,end}...] } (DTEND is exclusive / checkout)
   - Monday-first grid, prev/next nav, elegant styles (see /assets/css/aa-calendar.css)
   - Multi-language month/day labels: data-locale="hr|en|de|pl|hu|sk" (fallback: localStorage.lang -> <html lang>)
   - Marks booked days with subtle background + dot; check-in / check-out days half-filled
   - Safe to include on multiple pages; auto-inits elements with .aa-ical-calendar[data-apt]
*/

(function () {
  "use strict";

  // ---- Built-in I18N (fallback) ----
  const I18N = {
    hr: {
      months: ["siječanj","veljača","ožujak","travanj","svibanj","lipanj","srpanj","kolovoz","rujan","listopad","studeni","prosinac"],
      dows:   ["Pon","Uto","Sri","Čet","Pet","Sub","Ned"],
      booked: "Zauzeto",
      free:   "Slobodno",
      prev: "⟵", next: "⟶"
    },
    en: {
      months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
      dows:   ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      booked: "Booked",
      free:   "Available",
      prev: "⟵", next: "⟶"
    },
    de: {
      months: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
      dows:   ["Mo","Di","Mi","Do","Fr","Sa","So"],
      booked: "Belegt",
      free:   "Frei",
      prev: "⟵", next: "⟶"
    },
    pl: {
      months: ["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"],
      dows:   ["Pn","Wt","Śr","Cz","Pt","So","Nd"],
      booked: "Zajęte",
      free:   "Wolne",
      prev: "⟵", next: "⟶"
    },
    hu: {
      months: ["január","február","március","április","május","június","július","augusztus","szeptember","október","november","december"],
      dows:   ["Hé","Ke","Sze","Cs","Pé","Szo","Va"],
      booked: "Foglalt",
      free:   "Szabad",
      prev: "⟵", next: "⟶"
    },
    sk: {
      months: ["január","február","marec","apríl","máj","jún","júl","august","september","október","november","december"],
      dows:   ["Po","Ut","St","Št","Pi","So","Ne"],
      booked: "Obsadené",
      free:   "Voľné",
      prev: "⟵", next: "⟶"
    }
  };

  // Half-day labels for all site languages (check-in 15:00, check-out 10:00).
  // "free" lives here too: the dictionaries above and in i18n.js lack it for
  // several languages, which left an English "Available" on those pages.
  const LABELS = {
    hr: { half: "Dolazak / odlazak", free: "Slobodno", checkin: "Dolazak gosta od 15:00 – slobodno do tada", checkout: "Odlazak gosta do 10:00 – slobodno od tada" },
    en: { half: "Check-in / check-out", free: "Available", checkin: "Guest arrives from 15:00 – free until then", checkout: "Guest leaves by 10:00 – free from then" },
    de: { half: "An- / Abreise", free: "Frei", checkin: "Anreise ab 15:00 – bis dahin frei", checkout: "Abreise bis 10:00 – danach frei" },
    it: { half: "Arrivo / partenza", free: "Libero", checkin: "Arrivo dalle 15:00 – libero fino ad allora", checkout: "Partenza entro le 10:00 – libero da allora" },
    sl: { half: "Prihod / odhod", free: "Prosto", checkin: "Prihod gosta od 15:00 – do takrat prosto", checkout: "Odhod gosta do 10:00 – nato prosto" },
    hu: { half: "Érkezés / távozás", free: "Szabad", checkin: "Érkezés 15:00-tól – addig szabad", checkout: "Távozás 10:00-ig – utána szabad" },
    cs: { half: "Příjezd / odjezd", free: "Volno", checkin: "Příjezd hosta od 15:00 – do té doby volno", checkout: "Odjezd hosta do 10:00 – poté volno" },
    sk: { half: "Príchod / odchod", free: "Voľné", checkin: "Príchod hosťa od 15:00 – dovtedy voľné", checkout: "Odchod hosťa do 10:00 – potom voľné" },
    uk: { half: "Заїзд / виїзд", free: "Вільно", checkin: "Заїзд гостя з 15:00 – до того вільно", checkout: "Виїзд гостя до 10:00 – після того вільно" },
    pl: { half: "Przyjazd / wyjazd", free: "Wolne", checkin: "Przyjazd gościa od 15:00 – do tego czasu wolne", checkout: "Wyjazd gościa do 10:00 – potem wolne" }
  };

  // [AA CAL] Optional override from global window.I18N[lang].calendar (if provided by i18n.js)
  function pickCalendarDict(lang) {
    const base = I18N[lang] || I18N.en;
    try {
      const g = (window.I18N && window.I18N[lang] && window.I18N[lang].calendar) || null;
      if (!g) return base;
      return {
        months: Array.isArray(g.months) ? g.months : base.months,
        dows:   Array.isArray(g.dows)   ? g.dows   : base.dows,
        booked: typeof g.booked === "string" ? g.booked : base.booked,
        free:   typeof g.free   === "string" ? g.free   : base.free,
        prev:   typeof g.prev   === "string" ? g.prev   : base.prev,
        next:   typeof g.next   === "string" ? g.next   : base.next
      };
    } catch { return base; }
  }

  // ---- Date helpers (UTC, Monday-first) ----
  const iso = d => d.toISOString().slice(0, 10);
  const atMid = (y, m, day) => new Date(Date.UTC(y, m, day));
  const addMonths = (d, m) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, 1));
  const sameYMD = (a, b) => iso(a) === iso(b);
  const parseISOmid = (s) => Date.parse(s + "T00:00:00Z");

  // check if a UTC date is in [startISO, endISO)
  function inRange(dateUTC, startISO, endISO) {
    const t = dateUTC.getTime();
    const s = parseISOmid(startISO);
    const e = parseISOmid(endISO); // DTEND exclusive
    return t >= s && t < e;
  }

  // ---- UI builder ----
  function buildCalendar(container, state) {
    const lang = pickCalendarDict(state.locale); // [AA CAL]
    const labels = LABELS[state.locale] || LABELS.en;
    container.innerHTML = "";

    const wrap = el("div", "aa-cal");

    // header
    const header = el("div", "aa-cal__header");
    const title = el("div", "aa-cal__month",
      `${lang.months[state.viewDate.getUTCMonth()]} ${state.viewDate.getUTCFullYear()}`
    );
    const nav = el("div", "aa-cal__nav");
    const prevBtn = el("button", "aa-cal__btn", lang.prev);
    const nextBtn = el("button", "aa-cal__btn", lang.next);
    nav.append(prevBtn, nextBtn);
    header.append(title, nav);
    wrap.append(header);

    // grid
    const grid = el("div", "aa-cal__grid");
    const dow = el("div", "aa-cal__dow");
    lang.dows.forEach(d => dow.append(el("span", "", d)));
    grid.append(dow);

    const days = el("div", "aa-cal__days");
    const y = state.viewDate.getUTCFullYear();
    const m = state.viewDate.getUTCMonth();
    const firstOfMonth = atMid(y, m, 1);
    const startWeekIdx = (firstOfMonth.getUTCDay() + 6) % 7; // 0=Mon .. 6=Sun
    const today = atMid(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());

    // start date for 6x7 grid
    let current = atMid(y, m, 1 - startWeekIdx);
    for (let i = 0; i < 42; i++) {
      const isOther = current.getUTCMonth() !== m;
      const cell = el("div", "aa-cal__day" + (isOther ? " aa-cal__day--other" : ""));
      if (sameYMD(current, today)) cell.classList.add("aa-cal__day--today");

      // A day has two halves: the morning belongs to the night before (guest
      // leaves by 10:00), the evening to the night after (guest arrives from
      // 15:00). Both booked = full day; one = check-in or check-out day, which
      // also means back-to-back stays merge into a full day on their own.
      const prevDay = atMid(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - 1);
      const nightBooked = (d) => state.bookings.some(r => inRange(d, r.start, r.end));
      const am = nightBooked(prevDay);
      const pm = nightBooked(current);
      if (am || pm) {
        cell.append(el("div", "aa-cal__booked"));
        if (am && pm) {
          cell.append(el("i", "aa-cal__dot"));
          cell.classList.add("aa-cal__day--booked"); // [AA CAL] pomaže CSS-u
          cell.title = lang.booked;
        } else {
          cell.classList.add(pm ? "aa-cal__day--checkin" : "aa-cal__day--checkout");
          cell.title = pm ? labels.checkin : labels.checkout;
        }
      }

      cell.append(el("div", "aa-cal__num", String(current.getUTCDate())));
      days.append(cell);

      current = atMid(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() + 1);
    }

    grid.append(days);
    wrap.append(grid);

    // legend (Booked + Check-in/out + Available)
    const legend = el("div", "aa-cal__legend");
    const bookedBadge = el("span", "badge");
    bookedBadge.append(el("i", "swatch"), el("em", "", " " + (lang.booked || "Booked")));
    const halfBadge = el("span", "badge");
    halfBadge.append(el("i", "swatch swatch--half"), el("em", "", " " + labels.half));
    const freeBadge = el("span", "badge");
    freeBadge.append(el("i", "swatch swatch--free"), el("em", "", " " + labels.free));
    legend.append(bookedBadge, halfBadge, freeBadge);
    wrap.append(legend);

    container.append(wrap);

    // actions
    prevBtn.addEventListener("click", () => {
      state.viewDate = addMonths(state.viewDate, -1);
      buildCalendar(container, state);
    });
    nextBtn.addEventListener("click", () => {
      state.viewDate = addMonths(state.viewDate, +1);
      buildCalendar(container, state);
    });
  }

  // ---- Init per element ----
  async function initCalendar(el) {
    const apt = (el.dataset.apt || "").toLowerCase();
    if (!apt) { el.textContent = "Missing data-apt"; return; }

    // [AA CAL] pick locale: element -> localStorage -> <html lang> -> en
    let loc =
      (el.dataset.locale ||
       localStorage.getItem("lang") ||
       document.documentElement.getAttribute("lang") ||
       "en").toLowerCase();

    el.textContent = "Loading…";

    try {
      const res = await fetch(`/api/ical/${apt}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();

      const bookings = (data.bookings || [])
        .filter(b => b && b.start && b.end)
        .map(b => ({ start: b.start, end: b.end }))
        .sort((a, b) => a.start.localeCompare(b.start));

      // current month (UTC)
      const now = new Date();
      const viewDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      // validate locale at the end (after fetch), to allow i18n override
      if (!pickCalendarDict(loc)) loc = "en";

      buildCalendar(el, { locale: loc, bookings, viewDate });
    } catch (err) {
      console.error(err);
      el.textContent = "Unable to load availability.";
    }
  }

  // ---- Small helpers ----
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // A calendar inside data-booking-mode="direct" is hidden (see style.css):
  // skip it so we don't spend a request fetching a feed nobody will see.
  const isHidden = (el) => !!el.closest('[data-booking-mode="direct"]');

  // ---- Auto-init on DOM ready ----
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".aa-ical-calendar[data-apt]").forEach((el) => {
      if (!isHidden(el)) initCalendar(el);
    });
  });

  // ---- Optional: live re-render on locale change ----
  // Call: window.AACalendarRerender('de'); // or without arg to just rebuild with current data-locale values
  window.AACalendarRerender = function (lang) {
    document.querySelectorAll(".aa-ical-calendar[data-apt]").forEach((el) => {
      if (isHidden(el)) return;
      if (lang) el.dataset.locale = String(lang).toLowerCase();
      el.innerHTML = "";
      initCalendar(el);
    });
  };

})();
