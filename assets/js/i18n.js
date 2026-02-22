// i18n.js — translations + language dropdown (single source of truth)

const DEFAULT_LANG = "en";
let currentLang = DEFAULT_LANG;
let translations = {};
const langCache = Object.create(null); // in-memory cache

// ---------- fetch + load ----------
async function fetchLangFile(lang) {
  if (langCache[lang]) return langCache[lang];
  const res = await fetch(`/content/${lang}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Missing lang file: ${lang}`);
  const json = await res.json();
  langCache[lang] = json;
  return json;
}

async function loadLang(lang) {
  const wanted = (lang || DEFAULT_LANG).toLowerCase();
  try {
    translations = await fetchLangFile(wanted);
    currentLang = wanted;
  } catch (err) {
    console.warn(`⚠️ ${err.message}. Falling back to ${DEFAULT_LANG}.`);
    translations = await fetchLangFile(DEFAULT_LANG);
    currentLang = DEFAULT_LANG;
  }

  applyTranslations();
  updateDropdown(currentLang);
  updateDocumentLang(currentLang);
}

// ---------- apply to DOM ----------
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = translations[key];
    if (typeof val !== "string") return; // only strings
    if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = val;
    } else {
      el.textContent = val;
    }
  });

  // Optional: translate <meta name="description">
  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc && typeof translations["meta_desc"] === "string") {
    metaDesc.setAttribute("content", translations["meta_desc"]);
  }
}

function updateDropdown(lang) {
  const lc = (lang || "").toLowerCase();
  document.querySelectorAll(".lang-menu button[data-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang?.toLowerCase() === lc);
  });
  document.querySelectorAll(".current-lang").forEach((el) => {
    el.textContent = lc.toUpperCase();
  });
}

function updateDocumentLang(lang) {
  const html = document.documentElement;
  if (html) html.setAttribute("lang", (lang || DEFAULT_LANG).toLowerCase());
}

// ---------- global setLang ----------
window.setLang = async function setLang(lang) {
  const lc = (lang || DEFAULT_LANG).toLowerCase();
  localStorage.setItem("lang", lc);
  await loadLang(lc);

  // ✅ NEW: update contact form labels/placeholders on language switch
  try { window.applyContactI18n?.(lc); } catch {}

  // [AA CAL] ✅ Re-render calendar (if present) with the new locale
  try { window.AACalendarRerender?.(lc); } catch {}

  // page hooks (safe fallbacks)
  const slug = document.body?.dataset?.aptSlug || document.body?.getAttribute("data-apt-slug") || "";

  if (typeof window.loadApartment === "function") {
    try { await window.loadApartment(slug, lc); } catch {}
  } else if (typeof window.loadApt === "function") {
    try { await window.loadApt(lc); } catch {}
  }

  if (typeof window.loadExplore === "function") {
    try { await window.loadExplore(lc); } catch {}
  }
  if (typeof window.loadHome === "function") {
    try { await window.loadHome(lc); } catch {}
  }
  if (typeof window.loadGuest === "function") {
    try { await window.loadGuest(lc); } catch {}
  }
};

// ---------- dropdown wiring ----------
function wireLanguageDropdowns() {
  document.querySelectorAll(".lang-dropdown").forEach((dd) => {
    const btn = dd.querySelector(".lang-toggle");
    const menu = dd.querySelector(".lang-menu");
    if (!btn || !menu) return;

    const open  = () => { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); };
    const close = () => { menu.hidden = true;  btn.setAttribute("aria-expanded", "false"); };

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.hidden ? open() : close();
    });

    menu.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-lang]");
      if (!b) return;
      await window.setLang(b.dataset.lang);
      close();
    });

    document.addEventListener("click", (e) => { if (!dd.contains(e.target)) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  });
}

// ---------- init ----------
document.addEventListener("DOMContentLoaded", async () => {
  const saved = (localStorage.getItem("lang") || DEFAULT_LANG).toLowerCase();
  await loadLang(saved);
  wireLanguageDropdowns();

  // initialize contact form i18n on first load
  try { window.applyContactI18n?.(saved); } catch {}
});

// ==== CONTACT FORM I18N =====================================================
window.I18N = Object.assign({}, window.I18N || {}, {
  en: { contact: {
    name_label: "Name", name_ph: "Your name",
    email_label: "Email", email_ph: "name@example.com",
    phone_label: "Phone (optional)", phone_ph: "+385…",
    message_label: "Message", message_ph: "Dates, number of guests, questions…",
    send_btn: "Send message",
    note_after: "We reply within 24h.",
    val_name: "Please enter your name.",
    val_email: "Please enter a valid email.",
    val_message: "Please enter a message.",
    sending: "Sending…",
    sent_ok: "Thank you! Your message has been sent.",
    sent_fail: "Sending failed — please try again later.",
    spam: "Something went wrong. Please try another channel.",
    verify_fail: "Verification failed. Please refresh and try again.",
    verify_unavail: "Verification service unavailable. Please refresh the page."
  }},
  hr: { contact: {
    name_label: "Ime i prezime", name_ph: "Vaše ime",
    email_label: "Email", email_ph: "ime@domena.com",
    phone_label: "Telefon (nije obavezno)", phone_ph: "+385…",
    message_label: "Poruka", message_ph: "Željeni datumi, broj gostiju, pitanja…",
    send_btn: "Pošalji poruku",
    note_after: "Odgovaramo unutar 24 sata.",
    val_name: "Unesite ime.",
    val_email: "Unesite ispravan email.",
    val_message: "Unesite poruku.",
    sending: "Šaljem…",
    sent_ok: "Hvala! Vaša poruka je poslana.",
    sent_fail: "Slanje nije uspjelo — pokušajte kasnije.",
    spam: "Nešto je pošlo po zlu. Pokušajte drugim kanalom.",
    verify_fail: "Provjera nije uspjela. Osvježite stranicu i pokušajte ponovno.",
    verify_unavail: "Usluga provjere nije dostupna. Osvježite stranicu."
  }},
  de: { contact: {
    name_label: "Name", name_ph: "Ihr Name",
    email_label: "E-Mail", email_ph: "name@beispiel.de",
    phone_label: "Telefon (optional)", phone_ph: "+49…",
    message_label: "Nachricht", message_ph: "Daten, Gästezahl, Fragen…",
    send_btn: "Nachricht senden",
    note_after: "Wir antworten innerhalb von 24h.",
    val_name: "Bitte geben Sie Ihren Namen ein.",
    val_email: "Bitte gültige E-Mail eingeben.",
    val_message: "Bitte eine Nachricht eingeben.",
    sending: "Senden…",
    sent_ok: "Danke! Ihre Nachricht wurde gesendet.",
    sent_fail: "Senden fehlgeschlagen — bitte später erneut versuchen.",
    spam: "Etwas ist schiefgelaufen. Bitte anderen Kanal versuchen.",
    verify_fail: "Verifizierung fehlgeschlagen. Seite aktualisieren und erneut versuchen.",
    verify_unavail: "Überprüfungsdienst nicht verfügbar. Seite aktualisieren."
  }},
  it: { contact: {
    name_label: "Nome", name_ph: "Il tuo nome",
    email_label: "Email", email_ph: "nome@esempio.it",
    phone_label: "Telefono (facoltativo)", phone_ph: "+39…",
    message_label: "Messaggio", message_ph: "Date, numero di ospiti, domande…",
    send_btn: "Invia messaggio",
    note_after: "Rispondiamo entro 24 ore.",
    val_name: "Inserisci il tuo nome.",
    val_email: "Inserisci un'email valida.",
    val_message: "Inserisci un messaggio.",
    sending: "Invio…",
    sent_ok: "Grazie! Il tuo messaggio è stato inviato.",
    sent_fail: "Invio non riuscito — riprova più tardi.",
    spam: "Qualcosa è andato storto. Prova un altro canale.",
    verify_fail: "Verifica fallita. Aggiorna la pagina e riprova.",
    verify_unavail: "Servizio di verifica non disponibile. Ricarica la pagina."
  }},
  sl: { contact: {
    name_label: "Ime in priimek", name_ph: "Vaše ime",
    email_label: "E-pošta", email_ph: "ime@domena.si",
    phone_label: "Telefon (neobvezno)", phone_ph: "+386…",
    message_label: "Sporočilo", message_ph: "Datumi, št. gostov, vprašanja…",
    send_btn: "Pošlji sporočilo",
    note_after: "Odgovorimo v 24 urah.",
    val_name: "Vnesite ime.",
    val_email: "Vnesite veljaven e-poštni naslov.",
    val_message: "Vnesite sporočilo.",
    sending: "Pošiljanje…",
    sent_ok: "Hvala! Vaše sporočilo je poslano.",
    sent_fail: "Pošiljanje ni uspelo — poskusite kasneje.",
    spam: "Prišlo je do napake. Poskusite drug kanal.",
    verify_fail: "Preverjanje ni uspelo. Osvežite stran in poskusite znova.",
    verify_unavail: "Storitev preverjanja ni na voljo. Osvežite stran."
  }},
  hu: { contact: {
    name_label: "Név", name_ph: "Az Ön neve",
    email_label: "E-mail", email_ph: "nev@pelda.hu",
    phone_label: "Telefon (nem kötelező)", phone_ph: "+36…",
    message_label: "Üzenet", message_ph: "Dátumok, vendégek száma, kérdések…",
    send_btn: "Üzenet küldése",
    note_after: "24 órán belül válaszolunk.",
    val_name: "Adja meg a nevét.",
    val_email: "Adjon meg érvényes e-mail címet.",
    val_message: "Írjon üzenetet.",
    sending: "Küldés…",
    sent_ok: "Köszönjük! Üzenete elküldve.",
    sent_fail: "Sikertelen küldés — próbálja meg később.",
    spam: "Hiba történt. Próbálja másik csatornán.",
    verify_fail: "Ellenőrzés sikertelen. Frissítsen és próbálja újra.",
    verify_unavail: "Az ellenőrző szolgáltatás nem érhető el. Frissítsen."
  }},
  cs: { contact: {
    name_label: "Jméno", name_ph: "Vaše jméno",
    email_label: "E-mail", email_ph: "jmeno@domena.cz",
    phone_label: "Telefon (nepovinné)", phone_ph: "+420…",
    message_label: "Zpráva", message_ph: "Termíny, počet hostů, dotazy…",
    send_btn: "Odeslat zprávu",
    note_after: "Odpovíme do 24 hodin.",
    val_name: "Zadejte své jméno.",
    val_email: "Zadejte platný e-mail.",
    val_message: "Zadejte zprávu.",
    sending: "Odesílám…",
    sent_ok: "Děkujeme! Zpráva byla odeslána.",
    sent_fail: "Odeslání selhalo — zkuste to později.",
    spam: "Nastala chyba. Zkuste jiný kanál.",
    verify_fail: "Ověření se nezdařilo. Obnovte stránku a zkuste znovu.",
    verify_unavail: "Služba ověření není dostupná. Obnovte stránku."
  }},
  sk: { contact: {
    name_label: "Meno a priezvisko", name_ph: "Vaše meno",
    email_label: "Email", email_ph: "meno@domena.sk",
    phone_label: "Telefón (nepovinné)", phone_ph: "+421…",
    message_label: "Správa", message_ph: "Termíny, počet hostí, otázky…",
    send_btn: "Odoslať správu",
    note_after: "Odpovieme do 24 hodín.",
    val_name: "Zadajte meno.",
    val_email: "Zadajte platný email.",
    val_message: "Zadajte správu.",
    sending: "Odosielam…",
    sent_ok: "Ďakujeme! Vaša správa bola odoslaná.",
    sent_fail: "Odoslanie zlyhalo — skúste neskôr.",
    spam: "Nastala chyba. Skúste iný kanál.",
    verify_fail: "Overenie zlyhalo. Obnovte stránku a skúste znovu.",
    verify_unavail: "Overovacia služba nie je dostupná. Obnovte stránku."
  }},
  uk: { contact: {
    name_label: "Ім'я та прізвище", name_ph: "Ваше ім'я",
    email_label: "Ел. пошта", email_ph: "name@domain.com",
    phone_label: "Телефон (необов'язково)", phone_ph: "+380…",
    message_label: "Повідомлення", message_ph: "Дати, кількість гостей, запитання…",
    send_btn: "Надіслати повідомлення",
    note_after: "Відповідаємо протягом 24 годин.",
    val_name: "Вкажіть ім’я.",
    val_email: "Вкажіть дійсну адресу ел. пошти.",
    val_message: "Введіть повідомлення.",
    sending: "Надсилання…",
    sent_ok: "Дякуємо! Ваше повідомлення надіслано.",
    sent_fail: "Не вдалося надіслати — спробуйте пізніше.",
    spam: "Сталася помилка. Спробуйте інший канал.",
    verify_fail: "Не вдалося перевірити. Оновіть сторінку і спробуйте ще раз.",
    verify_unavail: "Служба перевірки недоступна. Оновіть сторінку."
  }}
});

// --- helper: apply contact i18n ---
window.applyContactI18n = function(lang){
  const cur = (lang || document.documentElement.lang || 'en').toLowerCase();
  const dict = (window.I18N[cur] && window.I18N[cur].contact) || window.I18N.en.contact;
  const $ = (sel) => document.querySelector(sel);

  const set = (sel, key) => { const el = $(sel); if (el) el.textContent = dict[key]; };
  set('label[for="cf-name"]',    'name_label');
  set('label[for="cf-email"]',   'email_label');
  set('label[for="cf-phone"]',   'phone_label');
  set('label[for="cf-message"]', 'message_label');

  const btn = $('#cf-submit');
  if (btn) {
    const icon = btn.querySelector('svg');
    btn.textContent = dict.send_btn;
    if (icon) btn.appendChild(icon);
  }

  const note = document.querySelector('.form-note');
  if (note && !note.dataset.locked) note.textContent = dict.note_after;

  const setPh = (sel, key) => { const el = $(sel); if (el) el.placeholder = dict[key]; };
  setPh('#cf-name', 'name_ph');
  setPh('#cf-email','email_ph');
  setPh('#cf-phone','phone_ph');
  setPh('#cf-message','message_ph');
};

// ==================== [AA CAL] Optional: Calendar UI dictionaries ====================
// Ako želiš da kalendar koristi ovaj zajednički rječnik (umjesto ugrađenog),
// aa-calendar.js će automatski uzeti window.I18N[lang].calendar kad postoji.
window.I18N = Object.assign({}, window.I18N || {}, {
  en: Object.assign({}, window.I18N?.en || {}, {
    calendar: {
      months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
      dows:   ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      booked: "Booked", prev: "⟵", next: "⟶"
    }
  }),
  hr: Object.assign({}, window.I18N?.hr || {}, {
    calendar: {
      months: ["siječanj","veljača","ožujak","travanj","svibanj","lipanj","srpanj","kolovoz","rujan","listopad","studeni","prosinac"],
      dows:   ["Pon","Uto","Sri","Čet","Pet","Sub","Ned"],
      booked: "Zauzeto", prev: "⟵", next: "⟶"
    }
  }),
  de: Object.assign({}, window.I18N?.de || {}, {
    calendar: {
      months: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
      dows:   ["Mo","Di","Mi","Do","Fr","Sa","So"],
      booked: "Belegt", prev: "⟵", next: "⟶"
    }
  }),
  pl: Object.assign({}, window.I18N?.pl || {}, {
    calendar: {
      months: ["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"],
      dows:   ["Pn","Wt","Śr","Cz","Pt","So","Nd"],
      booked: "Zajęte", prev: "⟵", next: "⟶"
    }
  }),
  hu: Object.assign({}, window.I18N?.hu || {}, {
    calendar: {
      months: ["január","február","március","április","május","június","július","augusztus","szeptember","október","november","december"],
      dows:   ["Hé","Ke","Sze","Cs","Pé","Szo","Va"],
      booked: "Foglalt", prev: "⟵", next: "⟶"
    }
  }),
  sk: Object.assign({}, window.I18N?.sk || {}, {
    calendar: {
      months: ["január","február","marec","apríl","máj","jún","júl","august","september","október","november","december"],
      dows:   ["Po","Ut","St","Št","Pi","So","Ne"],
      booked: "Obsadené", prev: "⟵", next: "⟶"
    }
  })
});
