/* Lightweight availability calendar
   renderAvailabilityCalendar(mountEl, opts)
   opts = {
     ranges: Array<string|{start:string,end:string}>, // ISO datumi: "YYYY-MM-DD" ili "YYYY-MM-DD..YYYY-MM-DD"
     months: number,         // koliko mjeseci prikazati (default 3)
     startFrom?: Date,       // početni mjesec (default: prvi dan tekućeg mjeseca)
     locale?: string,        // npr "hr-HR"
     accent?: string         // CSS boja za zauzeto (npr. "var(--brand-olive)")
   }
*/

(function(){
  function parseRanges(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(item => {
      if (typeof item === 'string') {
        const rr = item.split('..');
        if (rr.length === 2) {
          return { start: new Date(rr[0] + 'T00:00:00'), end: new Date(rr[1] + 'T00:00:00') };
        } else {
          const d = new Date(item + 'T00:00:00');
          return { start: d, end: d };
        }
      }
      if (item && item.start && item.end) {
        return { start: new Date(item.start + 'T00:00:00'), end: new Date(item.end + 'T00:00:00') };
      }
      return null;
    }).filter(Boolean);
  }

  function isBusy(date, ranges){
    for (const r of ranges){
      if (date >= r.start && date <= r.end) return true;
    }
    return false;
  }

  function startOfMonth(d){
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  function endOfMonth(d){
    return new Date(d.getFullYear(), d.getMonth()+1, 0);
  }

  function monthMatrix(year, month, locale){
    const first = new Date(year, month, 1);
    const last  = new Date(year, month+1, 0);
    // Početak tjedna: ponedjeljak (1) — uskladit ćemo offset
    const wd = (first.getDay() + 6) % 7; // 0=Mon ... 6=Sun
    const days = [];
    // prethodni mjesec padding
    for (let i=0;i<wd;i++){
      const d = new Date(year, month, 1 - (wd-i));
      days.push({ date:d, current:false });
    }
    // tekući mjesec
    for (let d=1; d<=last.getDate(); d++){
      days.push({ date: new Date(year, month, d), current:true });
    }
    // popuni do punog reda
    while (days.length % 7 !== 0){
      const d = new Date(year, month, last.getDate() + (days.length % 7 === 0 ? 0 : (days.length % 7 ? 1 : 0)));
      days.push({ date:d, current:false });
    }
    const monthName = first.toLocaleDateString(locale, { month:'long', year:'numeric' });
    return { monthName, days };
  }

  function wdHeaders(locale){
    const base = [];
    // Pon -> Ned
    for (let i=1;i<=7;i++){
      const ref = new Date(2024, 0, i); // 1-7 Jan 2024: Mon-Sun
      base.push(ref.toLocaleDateString(locale, { weekday:'short' }));
    }
    return base;
  }

  function renderAvailabilityCalendar(mountEl, opts){
    const el = (typeof mountEl === 'string') ? document.getElementById(mountEl) : mountEl;
    if (!el) return;
    const locale = opts.locale || undefined;
    const months = Math.max(1, +opts.months || 3);
    const ranges = parseRanges(opts.ranges || []);
    const start  = opts.startFrom ? new Date(opts.startFrom) : startOfMonth(new Date());

    // Set accent if provided
    if (opts.accent){
      el.style.setProperty('--cal-accent', opts.accent);
    }

    const wdh = wdHeaders(locale);
    let html = '<div class="cal">';
    for (let m=0; m<months; m++){
      const base = new Date(start.getFullYear(), start.getMonth()+m, 1);
      const M = monthMatrix(base.getFullYear(), base.getMonth(), locale);
      html += `<div class="cal-month">
        <div class="cal-head">
          <div class="cal-title">${M.monthName}</div>
        </div>
        <div class="cal-grid">`;
      // headers
      for (const w of wdh){ html += `<div class="cal-wd">${w}</div>`; }
      // days
      for (const d of M.days){
        const y = d.date.getFullYear();
        const mon = (d.date.getMonth()+1).toString().padStart(2,'0');
        const day = d.date.getDate().toString().padStart(2,'0');
        const cls = ['cal-day', d.current ? '' : 'muted', isBusy(d.date, ranges) ? 'busy' : ''].filter(Boolean).join(' ');
        html += `<div class="${cls}" data-date="${y}-${mon}-${day}">${d.date.getDate()}</div>`;
      }
      html += `</div>
        <div class="cal-legend"><span class="cal-dot"></span><span>Zauzeto</span></div>
      </div>`;
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // Expose global
  window.renderAvailabilityCalendar = renderAvailabilityCalendar;
})();
