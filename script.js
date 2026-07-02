document.addEventListener('DOMContentLoaded', function () {

  // ── Reading form ──────────────────────────────────────────────
  const form = document.querySelector('#readingForm');
  const records = document.querySelector('#records');
  const sugarStat = document.querySelector('#sugarStat');
  const bpStat = document.querySelector('#bpStat');
  const statusTitle = document.querySelector('#statusTitle');
  const riskBadge = document.querySelector('#riskBadge');
  const formMessage = document.querySelector('#formMessage');

  function getStatus(sugar, systolic, diastolic) {
    if (sugar >= 180 || systolic >= 140 || diastolic >= 90)
      return {
        title: 'Needs attention', badge: 'Review', className: 'alert',
        message: 'Saved. This reading is higher than the usual target.'
      };
    if (sugar >= 140 || systolic >= 130 || diastolic >= 85)
      return {
        title: 'Slightly elevated', badge: 'Watch', className: 'warn',
        message: 'Saved. Keep watching the next few readings.'
      };
    return {
      title: 'In target range', badge: 'Stable', className: '',
      message: 'Saved. This reading is in your usual target range.'
    };
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = new FormData(form);
      const sugar = Number(data.get('sugar'));
      const systolic = Number(data.get('systolic'));
      const diastolic = Number(data.get('diastolic'));
      const meal = data.get('meal');
      const now = new Date();
      const status = getStatus(sugar, systolic, diastolic);

      sugarStat.textContent = sugar;
      bpStat.textContent = systolic + '/' + diastolic;
      statusTitle.textContent = status.title;
      riskBadge.textContent = status.badge;
      riskBadge.className = ('badge ' + status.className).trim();
      formMessage.textContent = status.message;

      const article = document.createElement('article');
      const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      article.innerHTML =
        '<time>Today, ' + time + '</time>' +
        '<strong>' + sugar + ' mg/dL · ' + systolic + '/' + diastolic + '</strong>' +
        '<span>' + meal + '</span>';
      records.prepend(article);
    });
  }

  // ── Hamburger menu ────────────────────────────────────────────
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = navMenu.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', open);
      menuToggle.textContent = open ? '✕' : '☰';
    });

    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.textContent = '☰';
      });
    });

    document.addEventListener('click', function (e) {
      if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        navMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.textContent = '☰';
      }
    });
  }

});


/* ═══════════════════════════════════════════════════════════════
   DAILY ROUTINE PAGE
   ═══════════════════════════════════════════════════════════════ */
(function () {
  if (!document.querySelector('.routine-layout')) return; // only run on this page

  /* Day progress based on current time (5:30 AM → 10:00 PM) */
  const now = new Date();
  const curr = now.getHours() + now.getMinutes() / 60;
  const pct = Math.min(100, Math.max(0, Math.round((curr - 5.5) / (22 - 5.5) * 100)));
  const fill = document.getElementById('progFill');
  const pctEl = document.getElementById('progPct');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';

  /* Hydration tracker */
  const waterGrid = document.getElementById('waterGrid');
  const waterCount = document.getElementById('waterCount');
  let filled = 5;

  function renderWater() {
    if (!waterGrid) return;
    waterGrid.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const cup = document.createElement('div');
      cup.className = 'water-cup' + (i < filled ? ' filled' : '');
      cup.innerHTML = '<span class="cup-icon">🥤</span><span class="water-label">' + (i + 1) + '</span>';
      cup.addEventListener('click', function () {
        filled = i < filled ? i : i + 1;
        renderWater();
      });
      waterGrid.appendChild(cup);
    }
    if (waterCount) waterCount.textContent = filled + ' of 8';
  }
  renderWater();

  /* Medication checkboxes */
  ['nightMed', 'nightBP'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function () {
      const taken = el.classList.toggle('taken');
      el.textContent = taken ? '✓' : '';
    });
  });
}());


/* ═══════════════════════════════════════════════════════════════
   PATIENT PROFILE PAGE — Add Patient & Add Record
   (Records persist via localStorage — temporary stand-in until a
    real backend/database is wired up. Swap savePatientData() /
    loadPatientData() for API calls later; nothing else needs to change.)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  if (!document.querySelector('.multi-profile-grid')) return;

  var STORAGE_KEY = 'glucocare_patients_v3';
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* ── localStorage helpers (placeholder persistence layer) ── */
  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveStore(store) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) { }
  }

  function getPatient(store, id) {
    if (!store[id]) store[id] = { meta: null, records: [] };
    return store[id];
  }

  /* ── Helpers ── */
  /* Parse an ISO date string (YYYY-MM-DD) as a LOCAL date, not UTC.
     new Date('2026-06-26') parses as UTC midnight, which `.getMonth()`
     then reads back in local time — shifting it a day earlier for
     anyone west of UTC. That's what was throwing entries into the
     wrong month group near month boundaries. */
  function parseLocalDate(isoStr) {
    var parts = isoStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }

  function sugarClass(v) {
    if (!v) return 'empty';
    if (v >= 180) return 'high';
    if (v >= 140) return 'warning';
    return '';
  }

  function bpClass(v) {
    if (!v) return 'empty';
    var sys = parseInt(v.split('/')[0]);
    if (sys >= 140) return 'high-bp';
    return '';
  }

  function updatePatientCount() {
    var cards = document.querySelectorAll('.multi-profile-card');
    var pill = document.querySelector('.stat-pill strong');
    if (pill) pill.textContent = cards.length;
  }

  function nextPatientId() {
    var store = loadStore();
    var n = 1;
    while (store['p' + n]) n++;
    return 'p' + n;
  }

  /* ── Modal builder ── */
  function createModal(titleText, bodyHTML, onSubmit) {
    var old = document.getElementById('gc-modal');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'gc-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal-box">' +
      '<div class="modal-head">' +
      '<h3>' + titleText + '</h3>' +
      '<button class="modal-close" id="modalClose">✕</button>' +
      '</div>' +
      '<div class="modal-body">' + bodyHTML + '</div>' +
      '<div class="modal-foot">' +
      '<button class="modal-cancel" id="modalCancel">Cancel</button>' +
      '<button class="primary-action modal-submit" id="modalSubmit">Save</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('open'); });

    function close() {
      overlay.classList.remove('open');
      setTimeout(function () { overlay.remove(); }, 250);
    }

    document.getElementById('modalClose').addEventListener('click', close);
    document.getElementById('modalCancel').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.getElementById('modalSubmit').addEventListener('click', function () {
      if (onSubmit(overlay, close)) close();
    });
  }

  /* ════════════════════════════════════════════════
     RENDER: records table grouped by month
  ════════════════════════════════════════════════ */
  function renderRecordsTable(card, records) {
    var section = card.querySelector('.records-section');
    var countEl = card.querySelector('.records-header h3 span');
    if (countEl) countEl.textContent = '(' + records.length + ' entries)';

    // Remove any previously rendered month groups + old single table/empty state
    section.querySelectorAll('.month-group, .records-table, .empty-records').forEach(function (el) { el.remove(); });

    if (!records.length) {
      var emptyEl = document.createElement('div');
      emptyEl.className = 'empty-records';
      emptyEl.innerHTML = '<p>No records yet — click "Add Record" to begin tracking.</p>';
      section.appendChild(emptyEl);
      return;
    }

    // Sort newest first
    var sorted = records.slice().sort(function (a, b) { return parseLocalDate(b.date) - parseLocalDate(a.date); });

    // Group by "YYYY-M"
    var groups = {};
    var order = [];
    sorted.forEach(function (r) {
      var d = parseLocalDate(r.date);
      var key = d.getFullYear() + '-' + d.getMonth();
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(r);
    });

    var now = new Date();
    var currentKey = now.getFullYear() + '-' + now.getMonth();

    order.forEach(function (key) {
      var parts = key.split('-');
      var year = parts[0], monthIdx = parseInt(parts[1]);
      var isCurrent = key === currentKey;

      var wrap = document.createElement('div');
      wrap.className = 'month-group' + (isCurrent ? ' current' : '');

      var header = document.createElement('button');
      header.type = 'button';
      header.className = 'month-group-toggle';
      header.innerHTML =
        '<span class="month-group-title">' + MONTH_NAMES[monthIdx] + ' ' + year +
        (isCurrent ? ' <span class="month-current-badge">Current</span>' : '') + '</span>' +
        '<span class="month-group-count">' + groups[key].length + ' ' + (groups[key].length === 1 ? 'entry' : 'entries') + '</span>' +
        '<span class="month-group-chevron">⌄</span>';

      var tableWrap = document.createElement('div');
      tableWrap.className = 'month-group-body' + (isCurrent ? ' open' : '');

      var table = document.createElement('table');
      table.className = 'records-table';
      table.innerHTML =
        '<thead>' +
        '<tr><th>DATE</th><th>🩸 SUGAR (MG/DL)</th><th>♥ BLOOD PRESSURE (MMHG)</th></tr>' +
        '<tr class="sub-headers"><th>DATE</th><th>FASTING</th><th>AFTER BREAKFAST</th><th>MORNING</th><th>EVENING</th></tr>' +
        '</thead>' +
        '<tbody></tbody>';

      var tbody = table.querySelector('tbody');
      groups[key].forEach(function (r) {
        var d = parseLocalDate(r.date);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var dateStr = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + dateStr + '</td>' +
          '<td class="' + sugarClass(Number(r.fasting)) + '">' + (r.fasting || '—') + '</td>' +
          '<td class="' + sugarClass(Number(r.after)) + '">' + (r.after || '—') + '</td>' +
          '<td class="' + bpClass(r.bpMorn) + '">' + (r.bpMorn || '—') + '</td>' +
          '<td class="' + bpClass(r.bpEve) + '">' + (r.bpEve || '—') + '</td>';
        tbody.appendChild(tr);
      });

      tableWrap.appendChild(table);

      header.addEventListener('click', function () {
        tableWrap.classList.toggle('open');
        header.classList.toggle('open');
      });
      header.classList.toggle('open', isCurrent);

      wrap.appendChild(header);
      wrap.appendChild(tableWrap);
      section.appendChild(wrap);
    });
  }

  function refreshTodayPill() {
    var store = loadStore();
    var todayStr = new Date().toISOString().split('T')[0];
    var count = 0;
    Object.keys(store).forEach(function (id) {
      (store[id].records || []).forEach(function (r) { if (r.date === todayStr) count++; });
    });
    var todayPill = document.querySelectorAll('.stat-pill')[1];
    if (todayPill) {
      var strong = todayPill.querySelector('strong');
      if (strong) strong.textContent = count;
    }
  }

  /* ════════════════════════════════════════════════
     ADD PATIENT
  ════════════════════════════════════════════════ */
  function openAddPatient() {
    var body =
      '<div class="modal-grid">' +
      '<label class="modal-label">Full name<input class="modal-input" id="mName" placeholder="e.g. Sh. Raj Kumar" /></label>' +
      '<label class="modal-label">Age<input class="modal-input" id="mAge" type="number" min="1" max="120" placeholder="e.g. 55" /></label>' +
      '<label class="modal-label">Gender' +
      '<select class="modal-input" id="mGender"><option value="Male">Male ♂</option><option value="Female">Female ♀</option><option value="Other">Other</option></select>' +
      '</label>' +
      '<label class="modal-label">Weight (kg)<input class="modal-input" id="mWeight" type="number" placeholder="e.g. 68" /></label>' +
      '<label class="modal-label">Blood group' +
      '<select class="modal-input" id="mBlood"><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select>' +
      '</label>' +
      '<label class="modal-label" style="grid-column:1/-1">Medical history<input class="modal-input" id="mHistory" placeholder="e.g. Type 2 Diabetes, Hypertension" /></label>' +
      '</div>' +
      '<p class="modal-error" id="mError"></p>';

    createModal('➕ Add New Patient', body, function (overlay) {
      var name = overlay.querySelector('#mName').value.trim();
      var age = overlay.querySelector('#mAge').value.trim();
      var gender = overlay.querySelector('#mGender').value;
      var weight = overlay.querySelector('#mWeight').value.trim();
      var blood = overlay.querySelector('#mBlood').value;
      var history = overlay.querySelector('#mHistory').value.trim();
      var err = overlay.querySelector('#mError');

      if (!name) { err.textContent = 'Please enter the patient\'s full name.'; return false; }

      var initials = name.replace(/^(sh\.|smt\.|dr\.)\s*/i, '').trim()
        .split(' ').filter(Boolean).slice(0, 2)
        .map(function (w) { return w[0].toUpperCase(); }).join('');

      var genderIcon = gender === 'Female' ? '♀' : gender === 'Male' ? '♂' : '⚧';
      var patientId = nextPatientId();

      var grid = document.querySelector('.multi-profile-grid');
      var card = document.createElement('article');
      card.className = 'multi-profile-card';
      card.dataset.patientId = patientId;
      card.innerHTML =
        '<header class="card-header">' +
        '<div class="patient-identity">' +
        '<span class="avatar blue">' + initials + '</span>' +
        '<div class="patient-name">' +
        '<strong>' + name + '</strong>' +
        '<div class="badges-row">' +
        (age ? '<span class="info-badge">🎂 ' + age + ' yrs</span>' : '') +
        '<span class="info-badge">' + genderIcon + ' ' + gender + '</span>' +
        (weight ? '<span class="info-badge">⚖ ' + weight + ' kg</span>' : '') +
        '<span class="info-badge">🩸 ' + blood + '</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="card-actions">' +
        '<button class="icon-btn edit" title="Edit">✎</button>' +
        '<button class="icon-btn delete" title="Delete">🗑</button>' +
        '</div>' +
        '</header>' +
        '<div class="patient-history">' +
        '<span class="history-label">HISTORY</span>' +
        '<p>' + (history || 'No history added.') + '</p>' +
        '</div>' +
        '<div class="records-section">' +
        '<div class="records-header">' +
        '<h3>📋 Daily Health Records <span>(0 entries)</span></h3>' +
        '<button class="small-action-btn add-record-btn">+ Add Record</button>' +
        '</div>' +
        '</div>';

      grid.appendChild(card);

      var store = loadStore();
      getPatient(store, patientId).meta = { name: name, age: age, gender: gender, weight: weight, blood: blood, history: history };
      saveStore(store);

      renderRecordsTable(card, []);
      bindCardButtons(card);
      updatePatientCount();
      return true;
    });
  }

  /* ════════════════════════════════════════════════
     ADD RECORD
  ════════════════════════════════════════════════ */
  function openAddRecord(card) {
    var today = new Date().toISOString().split('T')[0];
    var body =
      '<div class="modal-grid">' +
      '<label class="modal-label" style="grid-column:1/-1">Date<input class="modal-input" id="rDate" type="date" value="' + today + '" /></label>' +
      '<label class="modal-label">Fasting sugar (mg/dL)<input class="modal-input" id="rFasting" type="number" min="40" max="600" placeholder="e.g. 126" /></label>' +
      '<label class="modal-label">After breakfast (mg/dL)<input class="modal-input" id="rAfter" type="number" min="40" max="600" placeholder="e.g. 160" /></label>' +
      '<label class="modal-label">Morning BP (mmHg)<input class="modal-input" id="rBPMorn" placeholder="e.g. 128/82" /></label>' +
      '<label class="modal-label">Evening BP (mmHg)<input class="modal-input" id="rBPEve" placeholder="e.g. 124/80" /></label>' +
      '</div>' +
      '<p class="modal-error" id="rError"></p>';

    createModal('📋 Add Health Record', body, function (overlay) {
      var dateVal = overlay.querySelector('#rDate').value;
      var fasting = overlay.querySelector('#rFasting').value.trim();
      var after = overlay.querySelector('#rAfter').value.trim();
      var bpMorn = overlay.querySelector('#rBPMorn').value.trim();
      var bpEve = overlay.querySelector('#rBPEve').value.trim();
      var err = overlay.querySelector('#rError');

      if (!dateVal) { err.textContent = 'Please select a date.'; return false; }
      if (!fasting && !after && !bpMorn && !bpEve) {
        err.textContent = 'Please enter at least one reading.'; return false;
      }

      var patientId = card.dataset.patientId;
      var store = loadStore();
      var patient = getPatient(store, patientId);
      patient.records.push({ date: dateVal, fasting: fasting, after: after, bpMorn: bpMorn, bpEve: bpEve });
      saveStore(store);

      renderRecordsTable(card, patient.records);
      refreshTodayPill();
      return true;
    });
  }

  /* ════════════════════════════════════════════════
     EDIT PATIENT
  ════════════════════════════════════════════════ */
  function openEditPatient(card) {
    var patientId = card.dataset.patientId;
    var store = loadStore();
    var patient = getPatient(store, patientId);
    var meta = patient.meta || {};

    var nameEl = card.querySelector('.patient-name strong');
    var historyEl = card.querySelector('.patient-history p');

    function opt(value, label, selected) {
      return '<option value="' + value + '"' + (selected ? ' selected' : '') + '>' + label + '</option>';
    }

    var body =
      '<div class="modal-grid">' +
      '<label class="modal-label">Full name<input class="modal-input" id="eName" value="' + (meta.name || '').replace(/"/g, '&quot;') + '" /></label>' +
      '<label class="modal-label">Age<input class="modal-input" id="eAge" type="number" min="1" max="120" value="' + (meta.age || '') + '" /></label>' +
      '<label class="modal-label">Gender' +
      '<select class="modal-input" id="eGender">' +
      opt('Male', 'Male ♂', meta.gender === 'Male') +
      opt('Female', 'Female ♀', meta.gender === 'Female') +
      opt('Other', 'Other', meta.gender === 'Other') +
      '</select>' +
      '</label>' +
      '<label class="modal-label">Weight (kg)<input class="modal-input" id="eWeight" type="number" value="' + (meta.weight || '') + '" /></label>' +
      '<label class="modal-label">Blood group' +
      '<select class="modal-input" id="eBlood">' +
      ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(function (bg) {
        return opt(bg, bg, bg === meta.blood);
      }).join('') +
      '</select>' +
      '</label>' +
      '<label class="modal-label" style="grid-column:1/-1">Medical history<input class="modal-input" id="eHistory" value="' + (meta.history || '').replace(/"/g, '&quot;') + '" /></label>' +
      '</div>' +
      '<p class="modal-error" id="eError"></p>';

    createModal('✎ Edit Patient', body, function (overlay) {
      var name = overlay.querySelector('#eName').value.trim();
      var age = overlay.querySelector('#eAge').value.trim();
      var gender = overlay.querySelector('#eGender').value;
      var weight = overlay.querySelector('#eWeight').value.trim();
      var blood = overlay.querySelector('#eBlood').value;
      var history = overlay.querySelector('#eHistory').value.trim();
      var err = overlay.querySelector('#eError');

      if (!name) { err.textContent = 'Please enter the patient\'s full name.'; return false; }

      var initials = name.replace(/^(sh\.|smt\.|dr\.)\s*/i, '').trim()
        .split(' ').filter(Boolean).slice(0, 2)
        .map(function (w) { return w[0].toUpperCase(); }).join('');

      var genderIcon = gender === 'Female' ? '♀' : gender === 'Male' ? '♂' : '⚧';

      var avatarEl = card.querySelector('.avatar');
      if (avatarEl) avatarEl.textContent = initials;
      if (nameEl) nameEl.textContent = name;

      var badgesRow = card.querySelector('.badges-row');
      if (badgesRow) {
        badgesRow.innerHTML =
          (age ? '<span class="info-badge">🎂 ' + age + ' yrs</span>' : '') +
          '<span class="info-badge">' + genderIcon + ' ' + gender + '</span>' +
          (weight ? '<span class="info-badge">⚖ ' + weight + ' kg</span>' : '') +
          '<span class="info-badge">🩸 ' + blood + '</span>';
      }

      if (historyEl) historyEl.textContent = history || 'No history added.';

      patient.meta = { name: name, age: age, gender: gender, weight: weight, blood: blood, history: history };
      saveStore(store);

      return true;
    });
  }

  /* ════════════════════════════════════════════════
     BIND / DELETE
  ════════════════════════════════════════════════ */
  function bindCardButtons(card) {
    var addRecBtn = card.querySelector('.add-record-btn');
    if (addRecBtn) addRecBtn.addEventListener('click', function () { openAddRecord(card); });

    var editBtn = card.querySelector('.icon-btn.edit');
    if (editBtn) editBtn.addEventListener('click', function () { openEditPatient(card); });

    var delBtn = card.querySelector('.icon-btn.delete');
    if (delBtn) delBtn.addEventListener('click', function () {
      if (confirm('Remove this patient and all their records?')) {
        var store = loadStore();
        delete store[card.dataset.patientId];
        saveStore(store);
        card.style.transition = 'opacity 0.3s';
        card.style.opacity = '0';
        setTimeout(function () { card.remove(); updatePatientCount(); refreshTodayPill(); }, 300);
      }
    });
  }

  /* ════════════════════════════════════════════════
     INIT — hydrate existing static cards into the store
     (only on first run; afterwards records come from storage)
  ════════════════════════════════════════════════ */
  function seedFromStaticHTML(card, id) {
    var store = loadStore();
    if (store[id]) return; // already seeded

    var rows = card.querySelectorAll('tbody tr');
    var records = [];
    var months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

    rows.forEach(function (tr) {
      var cells = tr.querySelectorAll('td');
      if (!cells.length) return;
      var dateText = cells[0].textContent.trim(); // e.g. "26 Jun 2026"
      var parts = dateText.split(' ');
      if (parts.length !== 3) return;
      var iso = parts[2] + '-' + String(months[parts[1]] + 1).padStart(2, '0') + '-' + String(parts[0]).padStart(2, '0');
      var fasting = cells[1] ? cells[1].textContent.trim() : '';
      var after = cells[2] ? cells[2].textContent.trim() : '';
      var bpMorn = cells[3] ? cells[3].textContent.trim() : '';
      var bpEve = cells[4] ? cells[4].textContent.trim() : '';
      records.push({
        date: iso,
        fasting: fasting === '—' ? '' : fasting,
        after: after === '—' ? '' : after,
        bpMorn: bpMorn === '—' ? '' : bpMorn,
        bpEve: bpEve === '—' ? '' : bpEve
      });
    });

    var nameEl = card.querySelector('.patient-name strong');
    var historyEl = card.querySelector('.patient-history p');
    getPatient(store, id).meta = { name: nameEl ? nameEl.textContent.trim() : '', history: historyEl ? historyEl.textContent.trim() : '' };
    getPatient(store, id).records = records;
    saveStore(store);
  }

  /* Assign stable IDs to the existing static cards, seed storage once,
     then re-render every card's table from storage so reloads persist. */
  var staticCards = document.querySelectorAll('.multi-profile-card');
  staticCards.forEach(function (card, idx) {
    if (!card.dataset.patientId) card.dataset.patientId = 'p' + (idx + 1);
    seedFromStaticHTML(card, card.dataset.patientId);
  });

  var store = loadStore();
  staticCards.forEach(function (card) {
    var patient = getPatient(store, card.dataset.patientId);
    renderRecordsTable(card, patient.records || []);
    bindCardButtons(card);
  });

  refreshTodayPill();
  updatePatientCount();

  /* ── Add Patient button ── */
  var addPatientBtn = document.querySelector('.add-patient-btn');
  if (addPatientBtn) addPatientBtn.addEventListener('click', openAddPatient);

}());


/* ═══════════════════════════════════════════════════════════════
   SPECIALISTS LIST PAGE
   ═══════════════════════════════════════════════════════════════ */
(function () {
  if (!document.querySelector('.sl-grid')) return;

  var cards = Array.from(document.querySelectorAll('.sl-card'));
  var search = document.getElementById('slSearch');
  var filters = document.querySelectorAll('.sl-filter');
  var empty = document.getElementById('slEmpty');
  var active = 'all';

  function filterCards() {
    var q = search.value.trim().toLowerCase();
    var any = false;
    cards.forEach(function (card) {
      var specialty = card.dataset.specialty || '';
      var text = card.textContent.toLowerCase();
      var matchFilter = active === 'all' || specialty === active;
      var matchSearch = !q || text.includes(q);
      var show = matchFilter && matchSearch;
      card.style.display = show ? '' : 'none';
      if (show) any = true;
    });
    empty.style.display = any ? 'none' : 'block';
  }

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      active = btn.dataset.filter;
      filterCards();
    });
  });

  search.addEventListener('input', filterCards);

  /* Book Appointment buttons */
  document.querySelectorAll('.sl-btn-primary').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.sl-card');
      var name = card.querySelector('h3').textContent;
      var slot = card.querySelector('.sl-timing strong').textContent;
      alert('Appointment request sent for ' + name + '\nNext available: ' + slot + '\n\nOur team will confirm within 24 hours.');
    });
  });

}());


/* ═══════════════════════════════════════════════════════════════
   LOGIN MODAL — site-wide, runs on every page
   ═══════════════════════════════════════════════════════════════ */
(function () {
  var loginBtn = document.querySelector('.header-action');
  if (!loginBtn) return;

  function openLoginModal() {
    var old = document.getElementById('gc-login-modal');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'gc-login-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal-box login-box">' +
      '<div class="modal-head">' +
      '<h3>👋 Welcome back</h3>' +
      '<button class="modal-close" id="loginClose">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +

      '<div class="login-tabs" id="loginTabs">' +
      '<button type="button" class="login-tab active" data-role="patient">🧑 Patient</button>' +
      '<button type="button" class="login-tab" data-role="doctor">🩺 Doctor / Caregiver</button>' +
      '</div>' +

      '<div class="modal-grid" style="grid-template-columns:1fr; gap:0.85rem; margin-top:1.1rem;">' +
      '<label class="modal-label">' +
      'Email or phone number' +
      '<input class="modal-input" id="loginId" type="text" placeholder="name@example.com" autocomplete="username" />' +
      '</label>' +
      '<label class="modal-label">' +
      'Password' +
      '<input class="modal-input" id="loginPass" type="password" placeholder="Enter your password" autocomplete="current-password" />' +
      '</label>' +
      '</div>' +

      '<div class="login-row">' +
      '<label class="login-remember">' +
      '<input type="checkbox" id="loginRemember" /> Remember me' +
      '</label>' +
      '<a href="#" class="login-forgot" id="loginForgot">Forgot password?</a>' +
      '</div>' +

      '<p class="modal-error" id="loginError"></p>' +

      '<div class="login-divider"><span>or continue with</span></div>' +

      '<div class="login-social">' +
      '<button type="button" class="login-social-btn">🔵 Google</button>' +
      '<button type="button" class="login-social-btn">📘 Facebook</button>' +
      '</div>' +

      '</div>' +
      '<div class="modal-foot login-foot">' +
      '<span class="login-signup">New to GlucoCare? <a href="#" id="loginSignup">Create an account</a></span>' +
      '<button class="primary-action modal-submit" id="loginSubmit">Login</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('open'); });

    function close() {
      overlay.classList.remove('open');
      setTimeout(function () { overlay.remove(); }, 250);
    }

    overlay.querySelector('#loginClose').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    /* Role tabs */
    var tabs = overlay.querySelectorAll('.login-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
      });
    });

    /* Forgot password */
    overlay.querySelector('#loginForgot').addEventListener('click', function (e) {
      e.preventDefault();
      var id = overlay.querySelector('#loginId').value.trim();
      alert(id ? ('Password reset instructions sent to ' + id) : 'Please enter your email or phone number first.');
    });

    /* Sign up link */
    overlay.querySelector('#loginSignup').addEventListener('click', function (e) {
      e.preventDefault();
      alert('Account creation isn\'t available yet — coming soon!');
    });

    /* Submit */
    overlay.querySelector('#loginSubmit').addEventListener('click', function () {
      var id = overlay.querySelector('#loginId').value.trim();
      var pass = overlay.querySelector('#loginPass').value.trim();
      var err = overlay.querySelector('#loginError');
      var role = overlay.querySelector('.login-tab.active').dataset.role;

      if (!id) { err.textContent = 'Please enter your email or phone number.'; return; }
      if (!pass) { err.textContent = 'Please enter your password.'; return; }

      err.style.color = 'var(--teal)';
      err.textContent = 'Signed in as ' + role + ' — redirecting…';
      setTimeout(close, 900);
    });

    overlay.querySelector('#loginId').focus();
  }

  loginBtn.addEventListener('click', openLoginModal);
}());
