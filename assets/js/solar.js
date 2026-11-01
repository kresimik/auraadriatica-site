// /assets/js/solar.js — the private /solar/ page.
// Reads /api/solar and draws the two apartments' production, consumption,
// history and panels. No libraries: charts are plain SVG.

(() => {
  const APTS = { Olive: 'var(--sol-olive)', Onyx: 'var(--sol-onyx)' };
  const SUN = 'var(--sol-sun)';
  const USE = 'var(--sol-use)';
  const EXPORTED = '#ddd3c1';
  // A panel giving less than this share of its apartment's median is flagged.
  const WEAK_PANEL = 0.4;
  // Inverter channels with no panel on them, as "inverter-channel", so they
  // aren't flagged as broken. Onyx has 13 panels on 7 two-channel DS3-L
  // inverters, and this channel has read 0 kWh since commissioning.
  const EMPTY_CHANNELS = ['702000666597-2'];
  // From each apartment's Glavni projekt (Maro projekt, April 2025): panels
  // installed and the calculated yearly production.
  const PLANTS = {
    Olive: { panels: 14, plan: 6621 },
    Onyx: { panels: 13, plan: 6147 }
  };

  const MONTHS = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro'];
  const MONTHS_FULL = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac'];
  const MONTHS_GEN = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];
  const STATUS = {
    1: ['var(--ok)', 'Radi normalno'],
    2: ['#c98500', 'Upozorenje na inverteru'],
    3: ['var(--err)', 'ECU nije spojen'],
    4: ['var(--muted)', 'Još nema podataka']
  };
  const SVG = 'http://www.w3.org/2000/svg';

  const nf = (d) => new Intl.NumberFormat('hr-HR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const f0 = nf(0), f1 = nf(1), f2 = nf(2);
  const pct = new Intl.NumberFormat('hr-HR', { style: 'percent', maximumFractionDigits: 0 });
  const kwh = (v) => `${(v >= 100 ? f0 : f2).format(v)} kWh`;
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const median = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
  };
  const dayLabel = (iso) => `${Number(iso.slice(8, 10))}. ${MONTHS_GEN[Number(iso.slice(5, 7)) - 1]}`;

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'style') Object.assign(el.style, v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v);
    }
    el.append(...children.flat().filter((c) => c != null && c !== false));
    return el;
  }
  const s = (tag, attrs) => {
    const el = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };
  const swatch = (color) => h('span', { class: 'sol-sw', style: { background: color } });

  // ---------------------------------------------------------------- charts

  // Grouped bars: for each x, one bar per series. Redrawn on resize.
  const charts = [];
  function barChart(el, opts) {
    const draw = () => drawBars(el, opts);
    charts.push(draw);
    draw();
  }

  function drawBars(el, { labels, series, tip, every, colorOf, markZero }) {
    el.replaceChildren();
    const max = Math.max(0, ...series.flatMap((x) => x.values));
    if (!(max > 0)) {
      el.append(h('div', { class: 'sol-empty' }, 'Još nema proizvodnje'));
      return;
    }
    const W = Math.max(280, el.clientWidth), H = 220, T = 8, B = 24, R = 4;
    const step = niceStep(max / 4);
    const top = Math.ceil(max / step) * step;
    const fmt = step >= 1 ? f0 : step >= 0.1 ? f1 : f2;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' });
    el.append(svg);

    // Left margin from the widest tick label, as drawn.
    const ticks = [];
    for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
    const tickEls = ticks.map((v) => {
      const t = s('text', { class: 'sol-tick', 'text-anchor': 'end' });
      t.textContent = fmt.format(v);
      svg.append(t);
      return t;
    });
    const L = Math.max(...tickEls.map((t) => t.getComputedTextLength())) + 10;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    ticks.forEach((v, i) => {
      tickEls[i].setAttribute('x', L - 6);
      tickEls[i].setAttribute('y', y(v) + 4);
      svg.insertBefore(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: v === 0 ? 'rgba(14,14,14,.3)' : 'var(--sol-grid)' }), svg.firstChild);
    });

    const slot = (W - L - R) / labels.length;
    const groupW = Math.min(slot * 0.76, 30 * series.length + 4);
    const gap = series.length > 1 ? 2 : 0;
    const barW = (groupW - gap * (series.length - 1)) / series.length;
    const n = every || Math.max(1, Math.ceil(labels.length * 26 / (W - L)));

    labels.forEach((lab, i) => {
      const x0 = L + slot * i + (slot - groupW) / 2;
      series.forEach((ser, j) => {
        const v = ser.values[i] || 0;
        const x = x0 + j * (barW + gap);
        if (v <= 0) {
          // A flagged zero has no bar, so mark its place on the axis.
          if (markZero && markZero(i)) svg.append(s('rect', { x, width: barW, y: H - B - 3, height: 3, fill: colorOf(ser, i) }));
          return;
        }
        const yy = y(v), r = Math.min(3, barW / 2, H - B - yy);
        svg.append(s('path', {
          fill: colorOf ? colorOf(ser, i) : ser.color,
          d: `M${x},${H - B}V${yy + r}q0,-${r} ${r},-${r}H${x + barW - r}q${r},0 ${r},${r}V${H - B}Z`
        }));
      });
      if (i % n === 0) {
        const t = s('text', { class: 'sol-tick', 'text-anchor': 'middle', x: L + slot * i + slot / 2, y: H - 6 });
        t.textContent = lab;
        svg.append(t);
      }
    });

    const tipEl = h('div', { class: 'sol-tip' });
    el.append(tipEl);
    const hover = s('rect', { y: T, height: H - T - B, width: slot, fill: 'rgba(14,14,14,.05)', visibility: 'hidden' });
    svg.insertBefore(hover, svg.firstChild);
    labels.forEach((lab, i) => {
      const hit = s('rect', { x: L + slot * i, y: T, width: slot, height: H - T - B, fill: 'transparent' });
      hit.addEventListener('pointerenter', () => {
        hover.setAttribute('x', L + slot * i);
        hover.setAttribute('visibility', 'visible');
        tipEl.replaceChildren(...tip(i));
        tipEl.style.display = 'block';
        const cx = (L + slot * i + slot / 2) / W * el.clientWidth;
        tipEl.style.left = `${Math.min(Math.max(cx - tipEl.offsetWidth / 2, 0), el.clientWidth - tipEl.offsetWidth)}px`;
      });
      hit.addEventListener('pointerleave', () => {
        hover.setAttribute('visibility', 'hidden');
        tipEl.style.display = 'none';
      });
      svg.append(hit);
    });
  }

  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * p) return m * p;
    return 10 * p;
  }

  // Tooltip rows: a heading, then "swatch name: value" per series.
  const tipRows = (head, series, i, extra) => [
    h('strong', null, head),
    ...series.map((ser) => h('div', null, swatch(ser.color), `${ser.name}: ${kwh(ser.values[i] || 0)}`)),
    extra ? h('div', null, extra) : null
  ].filter(Boolean);

  // ---------------------------------------------------------------- sections

  function drawCards(ok, errors) {
    const card = (name, color, d, status) => h('article', { class: 'sol-card' },
      h('h3', null, color ? swatch(color) : null, name,
        status ? h('span', { class: 'sol-status' }, h('span', { class: 'sol-dot', style: { background: status[0] } }), status[1]) : null),
      h('div', { class: 'sol-big' }, h('b', null, f2.format(d.today.produced)), h('span', { class: 'sol-unit' }, 'kWh danas')),
      h('div', { class: 'sol-sub' }, `${f2.format(d.capacity)} kWp${d.panels ? ` · ${d.panels} panela` : ''} · potrošeno danas ${kwh(d.today.consumed)}`),
      h('div', { class: 'sol-stats' },
        h('div', null, 'Ovaj mjesec', h('b', null, kwh(d.month.produced))),
        h('div', null, 'Ova godina', h('b', null, kwh(d.year.produced))),
        h('div', null, 'Ukupno', h('b', null, kwh(d.lifetime.produced)))));

    const panels = (name) => (PLANTS[name] ? PLANTS[name].panels : 0);
    const cards = ok.map((x) => card(x.name, APTS[x.name], { capacity: x.capacity, panels: panels(x.name), ...x.summary }, STATUS[x.light] || STATUS[4]));
    if (ok.length > 1) {
      const total = (p, k) => sum(ok.map((x) => x.summary[p][k]));
      const t = { capacity: sum(ok.map((x) => x.capacity)), panels: sum(ok.map((x) => panels(x.name))) };
      for (const p of ['today', 'month', 'year', 'lifetime']) t[p] = { produced: total(p, 'produced'), consumed: total(p, 'consumed') };
      cards.push(card('Oba apartmana', null, t, null));
    }
    for (const e of errors) {
      cards.push(h('article', { class: 'sol-card' }, h('h3', null, swatch(APTS[e.name]), e.name), h('p', { class: 'sol-error' }, e.error)));
    }
    document.getElementById('sol-cards').replaceChildren(...cards);
  }

  function drawOwnUse(ok) {
    document.getElementById('sol-own').replaceChildren(...ok.map((x) => {
      const y = x.summary.year;
      const self = Math.max(0, y.produced - y.exported);
      const bar = (parts) => h('div', { class: 'sol-split' },
        parts.filter(([v]) => v > 0).map(([v, c]) => h('span', { style: { flex: `${v} 1 0`, background: c } })));
      return h('article', { class: 'sol-card' },
        h('h3', null, swatch(APTS[x.name]), x.name),
        h('div', { class: 'sol-big' },
          h('span', { class: 'sol-own-big' }, pct.format(y.produced ? self / y.produced : 0)),
          h('span', { class: 'sol-unit' }, 'proizvodnje potrošeno u apartmanu')),
        h('div', { class: 'sol-own-row' },
          h('div', { class: 'sol-own-label' }, h('span', null, `Proizvedeno ${kwh(y.produced)}`), h('span', null, `u mrežu ${kwh(y.exported)}`)),
          bar([[self, SUN], [y.exported, EXPORTED]])),
        h('div', { class: 'sol-own-row' },
          h('div', { class: 'sol-own-label' },
            h('span', null, `Potrošeno ${kwh(y.consumed)}, od toga ${pct.format(y.consumed ? Math.min(1, self / y.consumed) : 0)} sa sunca`),
            h('span', null, `iz mreže ${kwh(y.imported)}`)),
          bar([[self, SUN], [y.imported, USE]])));
    }));
  }

  function drawProduction(ok, today) {
    for (const el of document.querySelectorAll('[data-legend="apts"]')) {
      el.replaceChildren(...ok.map((x) => h('span', null, swatch(APTS[x.name]), x.name)));
    }
    const apts = (key, n) => ok.map((x) => ({ name: x.name, color: APTS[x.name], values: x[key].produced.slice(0, n) }));
    const month = Number(today.slice(5, 7));

    const hourly = apts('hourly', 24);
    barChart(document.getElementById('sol-hourly'), {
      labels: hourly[0].values.map((_, i) => String(i).padStart(2, '0')),
      series: hourly,
      tip: (i) => tipRows(`${String(i).padStart(2, '0')}:00–${String(i + 1).padStart(2, '0')}:00`, hourly, i)
    });

    const daily = apts('daily');
    barChart(document.getElementById('sol-daily'), {
      labels: daily[0].values.map((_, i) => String(i + 1)),
      series: daily,
      tip: (i) => tipRows(dayLabel(`${today.slice(0, 7)}-${String(i + 1).padStart(2, '0')}`), daily, i)
    });

    const monthly = apts('monthly', 12);
    barChart(document.getElementById('sol-monthly'), {
      labels: MONTHS,
      series: monthly,
      every: 1,
      tip: (i) => tipRows(MONTHS_FULL[i], monthly, i)
    });

    // Per apartment: production against consumption, months so far.
    document.getElementById('sol-balance').replaceChildren(...ok.map((x) => {
      const chart = h('div', { class: 'sol-chart' });
      const card = h('article', { class: 'sol-card' },
        h('div', { class: 'sol-card-head' }, h('h3', null, swatch(APTS[x.name]), x.name),
          h('div', { class: 'sol-legend' }, h('span', null, swatch(SUN), 'Proizvedeno'), h('span', null, swatch(USE), 'Potrošeno'))),
        h('p', { class: 'sol-note' }, 'kWh po mjesecu, s brojila'),
        chart);
      const series = [
        { name: 'Proizvedeno', color: SUN, values: x.monthly.produced.slice(0, month) },
        { name: 'Potrošeno', color: USE, values: x.monthly.consumed.slice(0, month) }
      ];
      queueMicrotask(() => barChart(chart, {
        labels: MONTHS.slice(0, month),
        series,
        every: 1,
        tip: (i) => tipRows(MONTHS_FULL[i], series, i,
          `Iz mreže ${kwh(x.monthly.imported[i] || 0)} · u mrežu ${kwh(x.monthly.exported[i] || 0)}`)
      }));
      return card;
    }));
  }

  function drawYears(ok) {
    const rows = ok.flatMap((x) => x.yearly.time.map((year, i) => h('tr', null,
      h('td', null, x.name), h('td', null, year),
      ...['produced', 'consumed', 'imported', 'exported'].map((k) => h('td', null, f0.format(x.yearly[k][i] || 0))),
      h('td', null, PLANTS[x.name] ? pct.format((x.yearly.produced[i] || 0) / PLANTS[x.name].plan) : '–'))));
    document.getElementById('sol-years').replaceChildren(...rows);
  }

  function drawPanels(ok) {
    const weak = [];
    const cards = ok.map((x) => {
      const list = x.panels.list
        .filter((p) => !EMPTY_CHANNELS.includes(`${p.inverter}-${p.channel}`))
        .map((p, i) => ({ ...p, no: i + 1 }));
      const med = median(list.map((p) => p.kwh));
      for (const p of list) {
        p.weak = p.kwh < WEAK_PANEL * med;
        if (p.weak) weak.push({ apt: x.name, med, ...p });
      }
      const chart = h('div', { class: 'sol-chart' });
      const series = [{ name: 'Panel', color: APTS[x.name], values: list.map((p) => p.kwh) }];
      queueMicrotask(() => barChart(chart, {
        labels: list.map((p) => String(p.no)),
        series,
        every: 1,
        colorOf: (_, i) => (list[i].weak ? 'var(--sol-bad)' : APTS[x.name]),
        markZero: (i) => list[i].weak,
        tip: (i) => [
          h('strong', null, `Panel ${list[i].no} · inverter ${list[i].inverter}, kanal ${list[i].channel}`),
          h('div', null, `${kwh(list[i].kwh)}${list[i].weak ? ' – puno manje od ostalih' : ''}`)
        ]
      }));
      return h('article', { class: 'sol-card' },
        h('h3', null, swatch(APTS[x.name]), x.name),
        h('p', { class: 'sol-note' }, `kWh po panelu, ${dayLabel(x.panels.date)} · ${list.length} panela na ${new Set(list.map((p) => p.inverter)).size} mikroinvertera`),
        chart);
    });
    document.getElementById('sol-panels').replaceChildren(...cards);

    const alert = document.getElementById('sol-panel-alert');
    alert.hidden = false;
    alert.classList.toggle('is-ok', !weak.length);
    alert.textContent = weak.length
      ? 'Provjeri: ' + weak.map((p) =>
        `${p.apt} panel ${p.no} (inverter ${p.inverter}, kanal ${p.channel}) dao je ${kwh(p.kwh)}, a ostali paneli tog apartmana oko ${kwh(p.med)}`).join('; ') + '.'
      : `Svi paneli rade: nijedan nije dao manje od ${pct.format(WEAK_PANEL)} prosjeka svog apartmana.`;
  }

  // ---------------------------------------------------------------- load

  async function load() {
    const updated = document.getElementById('sol-updated');
    const fail = document.getElementById('sol-fail');
    updated.textContent = 'Učitavam…';
    let data;
    try {
      const res = await fetch('/api/solar', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      data = await res.json();
    } catch (err) {
      fail.hidden = false;
      updated.textContent = '';
      return;
    }
    fail.hidden = true;
    const ok = data.systems.filter((x) => !x.error);
    const errors = data.systems.filter((x) => x.error);
    charts.length = 0;

    drawCards(ok, errors);
    if (!ok.length) {
      updated.textContent = 'Nema podataka';
      return;
    }
    const at = new Date(Math.min(...ok.map((x) => Date.parse(x.updated))));
    updated.textContent = `Podaci od ${at.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zagreb' })}`;
    drawOwnUse(ok);
    drawProduction(ok, data.today);
    drawYears(ok);
    drawPanels(ok);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => charts.forEach((draw) => draw()), 150);
  });
  document.getElementById('sol-reload').addEventListener('click', load);
  load();
})();
