document.addEventListener('DOMContentLoaded', function () {

  // ── Reading form ──────────────────────────────────────────────
  const form        = document.querySelector('#readingForm');
  const records     = document.querySelector('#records');
  const sugarStat   = document.querySelector('#sugarStat');
  const bpStat      = document.querySelector('#bpStat');
  const statusTitle = document.querySelector('#statusTitle');
  const riskBadge   = document.querySelector('#riskBadge');
  const formMessage = document.querySelector('#formMessage');

  function getStatus(sugar, systolic, diastolic) {
    if (sugar >= 180 || systolic >= 140 || diastolic >= 90)
      return { title: 'Needs attention', badge: 'Review', className: 'alert',
               message: 'Saved. This reading is higher than the usual target.' };
    if (sugar >= 140 || systolic >= 130 || diastolic >= 85)
      return { title: 'Slightly elevated', badge: 'Watch', className: 'warn',
               message: 'Saved. Keep watching the next few readings.' };
    return { title: 'In target range', badge: 'Stable', className: '',
             message: 'Saved. This reading is in your usual target range.' };
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const data      = new FormData(form);
      const sugar     = Number(data.get('sugar'));
      const systolic  = Number(data.get('systolic'));
      const diastolic = Number(data.get('diastolic'));
      const meal      = data.get('meal');
      const now       = new Date();
      const status    = getStatus(sugar, systolic, diastolic);

      sugarStat.textContent   = sugar;
      bpStat.textContent      = systolic + '/' + diastolic;
      statusTitle.textContent = status.title;
      riskBadge.textContent   = status.badge;
      riskBadge.className     = ('badge ' + status.className).trim();
      formMessage.textContent = status.message;

      const article = document.createElement('article');
      const time    = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      article.innerHTML =
        '<time>Today, ' + time + '</time>' +
        '<strong>' + sugar + ' mg/dL · ' + systolic + '/' + diastolic + '</strong>' +
        '<span>' + meal + '</span>';
      records.prepend(article);
    });
  }

  // ── Hamburger menu ────────────────────────────────────────────
  const menuToggle = document.getElementById('menuToggle');
  const navMenu    = document.getElementById('navMenu');

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
  const now  = new Date();
  const curr = now.getHours() + now.getMinutes() / 60;
  const pct  = Math.min(100, Math.max(0, Math.round((curr - 5.5) / (22 - 5.5) * 100)));
  const fill = document.getElementById('progFill');
  const pctEl = document.getElementById('progPct');
  if (fill)  fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';

  /* Hydration tracker */
  const waterGrid  = document.getElementById('waterGrid');
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
   ═══════════════════════════════════════════════════════════════ */
(function () {
  if (!document.querySelector('.multi-profile-grid')) return;

  /* ── Helpers ── */
  function fmt(val) { return val || '<span class="empty">—</span>'; }

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

  /* ── Modal builder ── */
  function createModal(titleText, bodyHTML, onSubmit) {
    // Remove any existing modal
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

    createModal('➕ Add New Patient', body, function (overlay, close) {
      var name    = overlay.querySelector('#mName').value.trim();
      var age     = overlay.querySelector('#mAge').value.trim();
      var gender  = overlay.querySelector('#mGender').value;
      var weight  = overlay.querySelector('#mWeight').value.trim();
      var blood   = overlay.querySelector('#mBlood').value;
      var history = overlay.querySelector('#mHistory').value.trim();
      var err     = overlay.querySelector('#mError');

      if (!name) { err.textContent = 'Please enter the patient\'s full name.'; return false; }

      // Initials for avatar
      var initials = name.replace(/^(sh\.|smt\.|dr\.)\s*/i, '').trim()
        .split(' ').filter(Boolean).slice(0, 2)
        .map(function (w) { return w[0].toUpperCase(); }).join('');

      var genderIcon = gender === 'Female' ? '♀' : gender === 'Male' ? '♂' : '⚧';

      var grid = document.querySelector('.multi-profile-grid');
      var card = document.createElement('article');
      card.className = 'multi-profile-card';
      card.innerHTML =
        '<header class="card-header">' +
          '<div class="patient-identity">' +
            '<span class="avatar blue">' + initials + '</span>' +
            '<div class="patient-name">' +
              '<strong>' + name + '</strong>' +
              '<div class="badges-row">' +
                (age    ? '<span class="info-badge">🎂 ' + age + ' yrs</span>' : '') +
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
          '<table class="records-table">' +
            '<thead>' +
              '<tr><th>DATE</th><th>🩸 SUGAR (MG/DL)</th><th>♥ BLOOD PRESSURE (MMHG)</th></tr>' +
              '<tr class="sub-headers"><th>DATE</th><th>FASTING</th><th>AFTER BREAKFAST</th><th>MORNING</th><th>EVENING</th></tr>' +
            '</thead>' +
            '<tbody></tbody>' +
          '</table>' +
          '<div class="empty-records"><p>No records yet — click "Add Record" to begin tracking.</p></div>' +
        '</div>';

      grid.appendChild(card);
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
      var dateVal  = overlay.querySelector('#rDate').value;
      var fasting  = overlay.querySelector('#rFasting').value.trim();
      var after    = overlay.querySelector('#rAfter').value.trim();
      var bpMorn   = overlay.querySelector('#rBPMorn').value.trim();
      var bpEve    = overlay.querySelector('#rBPEve').value.trim();
      var err      = overlay.querySelector('#rError');

      if (!dateVal) { err.textContent = 'Please select a date.'; return false; }
      if (!fasting && !after && !bpMorn && !bpEve) {
        err.textContent = 'Please enter at least one reading.'; return false;
      }

      // Format date nicely
      var d = new Date(dateVal);
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var dateStr = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();

      // Build row
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + dateStr + '</td>' +
        '<td class="' + sugarClass(Number(fasting)) + '">' + (fasting || '—') + '</td>' +
        '<td class="' + sugarClass(Number(after))   + '">' + (after   || '—') + '</td>' +
        '<td class="' + bpClass(bpMorn) + '">' + (bpMorn || '—') + '</td>' +
        '<td class="' + bpClass(bpEve)  + '">' + (bpEve  || '—') + '</td>';

      // Insert at top of tbody
      var tbody = card.querySelector('tbody');
      tbody.insertBefore(tr, tbody.firstChild);

      // Hide empty state, update count
      var emptyEl = card.querySelector('.empty-records');
      if (emptyEl) emptyEl.style.display = 'none';

      var countEl = card.querySelector('.records-header h3 span');
      if (countEl) {
        var current = parseInt(countEl.textContent.replace(/\D/g, '')) || 0;
        countEl.textContent = '(' + (current + 1) + ' entries)';
      }

      // Update today's records stat pill
      var todayPill = document.querySelectorAll('.stat-pill')[1];
      if (todayPill) {
        var todayStr = new Date().toISOString().split('T')[0];
        if (dateVal === todayStr) {
          var strong = todayPill.querySelector('strong');
          if (strong) strong.textContent = parseInt(strong.textContent) + 1;
        }
      }

      return true;
    });
  }

  /* ════════════════════════════════════════════════
     DELETE PATIENT
  ════════════════════════════════════════════════ */
  function bindCardButtons(card) {
    var addRecBtn = card.querySelector('.add-record-btn');
    if (addRecBtn) addRecBtn.addEventListener('click', function () { openAddRecord(card); });

    var delBtn = card.querySelector('.icon-btn.delete');
    if (delBtn) delBtn.addEventListener('click', function () {
      if (confirm('Remove this patient and all their records?')) {
        card.style.transition = 'opacity 0.3s';
        card.style.opacity = '0';
        setTimeout(function () { card.remove(); updatePatientCount(); }, 300);
      }
    });
  }

  /* ── Init: bind existing cards ── */
  document.querySelectorAll('.multi-profile-card').forEach(bindCardButtons);

  /* ── Add Patient button ── */
  var addPatientBtn = document.querySelector('.add-patient-btn');
  if (addPatientBtn) addPatientBtn.addEventListener('click', openAddPatient);

}());


/* ═══════════════════════════════════════════════════════════════
   SPECIALISTS LIST PAGE
   ═══════════════════════════════════════════════════════════════ */
(function () {
  if (!document.querySelector('.sl-grid')) return;

  var cards   = Array.from(document.querySelectorAll('.sl-card'));
  var search  = document.getElementById('slSearch');
  var filters = document.querySelectorAll('.sl-filter');
  var empty   = document.getElementById('slEmpty');
  var active  = 'all';

  function filterCards() {
    var q = search.value.trim().toLowerCase();
    var any = false;
    cards.forEach(function (card) {
      var specialty = card.dataset.specialty || '';
      var text      = card.textContent.toLowerCase();
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
