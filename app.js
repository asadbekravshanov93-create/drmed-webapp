/* ==========================================================================
   DR.MED PRO SYSTEM - MAIN APPLICATION LOGIC & TELEGRAM INTEGRATION
   ========================================================================== */

// TELEGRAM WEB APP INITIALIZATION
const tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
  tg.ready();
  tg.expand();
  document.body.classList.add('tg-theme');
}

// GLOBAL STATE
let currentStep = 1;
let currentGender = 'Erkak';
let signatureDataURL = null;
let customStampDataURL = null;

// DEFAULT DOCTOR & CLINIC SETTINGS
let doctorProfile = {
  name: "Asrorov Asadbek Asliddinovich",
  spec: "Shifokor-Terapevt",
  id: "012345"
};

let clinicProfile = {
  name: "DR.MED Tibbiyot Markazi",
  address: "Toshkent sh., Chilonzor tumani, Bunyodkor ko'chasi 12-uy",
  phone: "+998 (71) 200-00-11"
};

// DEFAULT DRUGS ARRAY
let drugs = [];

// DYNAMIC ICD-10 DATABASE
let icd10Data = [];

function loadICD10Database() {
  fetch('icd10_uz.json')
    .then(response => response.json())
    .then(data => {
      icd10Data = data;
      console.log(
        `✅ ICD-10 O'zbekcha bazasi yuklandi: ${icd10Data.length} ta tashxis.`
      );
    })
    .catch(err => {
      console.error(
        "❌ ICD-10 bazasini yuklashda xatolik:",
        err
      );
    });
}

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  loadSettingsFromStorage();
  loadICD10Database();
  renderDrugCards();
  initSignatureCanvas();
  checkURLParamsAndRender();
  liveUpdate();
});

/* ================= URL PARAMETERS CHECK ================= */

function checkURLParamsAndRender() {
  const urlParams = new URLSearchParams(window.location.search);
  const viewRxId = urlParams.get('rx_id');

  if (!viewRxId) return;

  const history = JSON.parse(
    localStorage.getItem('drmed_history') || '[]'
  );

  const targetRx = history.find(
    item => item.id === viewRxId
  );

  if (!targetRx) return;

  const nameEl = document.getElementById('p_name');
  const diagEl = document.getElementById('p_diag');

  if (nameEl) {
    nameEl.value = targetRx.patientName || '';
  }

  if (diagEl) {
    diagEl.value = targetRx.diag || '';
  }

  if (targetRx.drugs) {
    drugs = targetRx.drugs;
  }

  renderDrugCards();
  switchStep(3);
}

/* ================= WIZARD NAVIGATION ================= */

function switchStep(stepNum) {
  currentStep = stepNum;

  document
    .querySelectorAll('.step-content')
    .forEach(el => {
      el.classList.remove('active');
    });

  document
    .querySelectorAll('.wizard-tab')
    .forEach(el => {
      el.classList.remove('active');
    });

  const stepEl = document.getElementById(`step${stepNum}`);
  const tabEl = document.getElementById(`tab${stepNum}`);

  if (stepEl) {
    stepEl.classList.add('active');
  }

  if (tabEl) {
    tabEl.classList.add('active');
  }

  if (stepNum === 3) {
    liveUpdate();
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  if (tg && tg.HapticFeedback) {
    tg.HapticFeedback.impactOccurred('light');
  }
}

function selectGender(gender) {
  currentGender = gender;

  const male = document.getElementById('gender_m');
  const female = document.getElementById('gender_f');

  if (male) {
    male.classList.toggle(
      'active',
      gender === 'Erkak'
    );
  }

  if (female) {
    female.classList.toggle(
      'active',
      gender === 'Ayol'
    );
  }

  liveUpdate();
}

function calculateAge() {
  const birthEl = document.getElementById('p_birth');

  if (!birthEl || !birthEl.value) {
    return;
  }

  const birthDate = new Date(birthEl.value);
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);

  const calculatedAge =
    Math.abs(ageDate.getUTCFullYear() - 1970);

  const ageEl = document.getElementById('p_age');

  if (ageEl) {
    ageEl.value = calculatedAge;
  }

  liveUpdate();
}

/* ================= DRUG BUILDER LOGIC ================= */

function renderDrugCards() {
  const container =
    document.getElementById('drugsListContainer');

  if (!container) return;

  container.innerHTML = '';

  drugs.forEach((d, idx) => {
    const card = document.createElement('div');

    card.className = 'drug-card';

    card.innerHTML = `
      <div class="drug-card-head">

        <span class="drug-num">
          ${idx + 1}. Rp.:
        </span>

        <div class="drug-card-actions">

          <button
            class="sm-btn"
            style="color:var(--danger);"
            onclick="removeDrug(${idx})"
          >
            🗑️ O'chirish
          </button>

        </div>
      </div>

      <div class="form-row">

        <div class="form-group col-7">

          <label>
            Dori nomi (Lat)
            <span class="req">*</span>
          </label>

          <input
            type="text"
            value="${escapeHtml(d.name || '')}"
            placeholder="Masalan: Paracetamoli"
            oninput="drugs[${idx}].name=this.value; liveUpdate();"
          >

        </div>

        <div class="form-group col-3">

          <label>
            Dozasi
          </label>

          <input
            type="text"
            value="${escapeHtml(d.dose || '')}"
            placeholder="500 mg"
            oninput="drugs[${idx}].dose=this.value; liveUpdate();"
          >

        </div>

        <div class="form-group col-2">

          <label>
            Shakli
          </label>

          <select
            onchange="drugs[${idx}].shape=this.value; liveUpdate();"
          >

            ${createShapeOptions(d.shape)}

          </select>

        </div>

      </div>

      <div class="form-row">

        <div class="form-group col-6">

          <label>
            D.t.d. (Reseptura ko'rsatmasi)
          </label>

          <input
            type="text"
            value="${escapeHtml(d.dtd || '')}"
            placeholder="D.t.d. № 10"
            oninput="drugs[${idx}].dtd=this.value; liveUpdate();"
          >

        </div>

        <div class="form-group col-6"></div>

      </div>

      <div class="form-group">

        <label>
          S. (Qabul qilish usuli)
        </label>

        <input
          type="text"
          value="${escapeHtml(d.ds || '')}"
          placeholder="Kuniga 2 mahal 1 tabletkadan..."
          oninput="drugs[${idx}].ds=this.value; liveUpdate();"
        >

      </div>
    `;

    container.appendChild(card);
  });
}

function createShapeOptions(selected) {
  const shapes = [
    'Tab.',
    'Caps.',
    'Amp.',
    'Inj.',
    'Sol.',
    'Syr.',
    'Susp.',
    'Pulv.',
    'Ung.',
    'Gel',
    'Crem.',
    'Spray',
    'Aeros.',
    'Supp.',
    'Gtt.'
  ];

  return shapes
    .map(shape => `
      <option
        value="${shape}"
        ${shape === selected ? 'selected' : ''}
      >
        ${shape}
      </option>
    `)
    .join('');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function addNewDrugCard() {
  drugs.push({
    name: '',
    dose: '',
    shape: 'Tab.',
    dtd: '',
    ds: ''
  });

  renderDrugCards();
  liveUpdate();
}

function removeDrug(index) {
  drugs.splice(index, 1);

  renderDrugCards();
  liveUpdate();
}

function clearAllDrugs() {
  if (
    confirm(
      "Barcha dorilarni o'chirishga ishonchingiz komilmi?"
    )
  ) {
    drugs = [];

    renderDrugCards();
    liveUpdate();
  }
}

/* ================= PREDEFINED CLINICAL CASES ================= */

function applyPreset(type) {

  if (type === 'bronchitis') {

    drugs = [
      {
        name: 'Amoxicillini',
        dose: '0.5 g',
        shape: 'Caps.',
        count: '21 caps',
        dtd: 'D.t.d. № 21',
        ds: 'Kuniga 3 mahal 1 kapsuladan, 7 kun.'
      },
      {
        name: 'Ambroxoli',
        dose: '30 mg',
        shape: 'Tab.',
        count: '20 tab',
        dtd: 'D.t.d. № 20',
        ds: 'Kuniga 3 mahal 1 tabletkadan ovqatdan keyin.'
      }
    ];

  } else if (type === 'gripp') {

    drugs = [
      {
        name: 'Paracetamoli',
        dose: '500 mg',
        shape: 'Tab.',
        count: '10 tab',
        dtd: 'D.t.d. № 10',
        ds: 'Harorat 38°C dan oshganda 1 tabletka.'
      },
      {
        name: 'Acid Ascorbinici',
        dose: '500 mg',
        shape: 'Tab.',
        count: '20 tab',
        dtd: 'D.t.d. № 20',
        ds: 'Kuniga 2 mahal 1 tabletkadan.'
      }
    ];

  } else if (type === 'gastritis') {

    drugs = [
      {
        name: 'Omeprazoli',
        dose: '20 mg',
        shape: 'Caps.',
        count: '14 caps',
        dtd: 'D.t.d. № 14',
        ds: 'Kuniga 1 mahal ertalab ovqatdan 30 daqiqa oldin.'
      }
    ];
  }

  renderDrugCards();
  liveUpdate();
}

/* ================= LIVE BLANK UPDATER ================= */

function liveUpdate() {

  const pName =
    document.getElementById('p_name')?.value || '';

  const pBirth =
    document.getElementById('p_birth')?.value || '';

  const pAge =
    document.getElementById('p_age')?.value || '0';

  const pAddress =
    document.getElementById('p_address')?.value || '';

  const pCard =
    document.getElementById('p_card')?.value || '';

  const setText = (id, value) => {
    const el = document.getElementById(id);

    if (el) {
      el.innerText = value;
    }
  };

  setText(
    'paper_p_name',
    pName || '—'
  );

  setText(
    'paper_p_birth',
    pBirth || '—'
  );

  setText(
    'paper_p_age',
    pAge || '0'
  );

  setText(
    'paper_p_gender',
    currentGender
  );

  setText(
    'paper_p_address',
    pAddress || '—'
  );

  setText(
    'paper_p_card',
    pCard || '—'
  );

  setText(
    'paper_p_icd',
    document.getElementById('p_icd')?.value || '—'
  );

  setText(
    'paper_p_diag',
    document.getElementById('p_diag')?.value || '—'
  );

  setText(
    'paper_p_allergy',
    document.getElementById('p_allergy')?.value || 'Yo\'q'
  );

  setText(
    'paper_p_note',
    document.getElementById('p_note')?.value ||
      'Ko\'rsatma bo\'yicha qabul qilinsin.'
  );

  setText(
    'paper_doc_name',
    doctorProfile.name
  );

  setText(
    'paper_doc_spec',
    doctorProfile.spec
  );

  setText(
    'paper_doc_id',
    doctorProfile.id
  );

  setText(
    'paper_clinic_name',
    clinicProfile.name
  );

  setText(
    'paper_clinic_address',
    clinicProfile.address
  );

  setText(
    'paper_clinic_phone',
    clinicProfile.phone
  );

  const today = new Date();

  const formattedDate =
    `${String(today.getDate()).padStart(2, '0')}.` +
    `${String(today.getMonth() + 1).padStart(2, '0')}.` +
    `${today.getFullYear()}`;

  setText(
    'paper_rx_date',
    formattedDate
  );

  const rxIdEl =
    document.getElementById('paper_rx_id');

  if (
    rxIdEl &&
    (
      !rxIdEl.innerText ||
      rxIdEl.innerText === '—' ||
      rxIdEl.innerText === ''
    )
  ) {
    rxIdEl.innerText =
      'RX-' +
      Math.floor(
        100000 + Math.random() * 900000
      );
  }

  const currentRxId =
    rxIdEl?.innerText || 'RX-000000';

  const paperDrugsContainer =
    document.getElementById('paper_drugs_list');

  if (paperDrugsContainer) {

    paperDrugsContainer.innerHTML = '';

    drugs.forEach((d, idx) => {

      if (
        d.name &&
        d.name.trim() !== ''
      ) {

        const item =
          document.createElement('div');

        item.className =
          'rx-drug-item';

        item.innerHTML = `
          <strong>
            ${idx + 1}. Rp.:
            ${escapeHtml(d.shape || '')}
            ${escapeHtml(d.name || '')}
            ${escapeHtml(d.dose || '')}
          </strong>

          <div class="rx-drug-sub">

            ${
              d.dtd &&
              d.dtd !== '-'
                ? escapeHtml(d.dtd) + '<br>'
                : ''
            }

            ${
              d.count
                ? 'Miqdori: ' +
                  escapeHtml(d.count) +
                  '<br>'
                : ''
            }

            <b>S.</b>
            ${escapeHtml(d.ds || '')}

          </div>
        `;

        paperDrugsContainer.appendChild(item);
      }
    });
  }

  const stampImgEl =
    document.getElementById('paper_stamp_img');

  const stampDefaultEl =
    document.getElementById('paper_stamp_default');

  if (stampImgEl) {

    if (customStampDataURL) {

      stampImgEl.src =
        customStampDataURL;

      stampImgEl.style.display =
        'block';

      if (stampDefaultEl) {
        stampDefaultEl.style.display =
          'none';
      }

    } else {

      stampImgEl.style.display =
        'none';

      if (stampDefaultEl) {
        stampDefaultEl.style.display =
          'block';
      }
    }
  }

  // QR
  const qrContainer =
    document.getElementById('paper_qr_code');

  if (qrContainer) {

    qrContainer.innerHTML = '';

    const baseUrl =
      window.location.origin +
      window.location.pathname;

    const pdfViewUrl =
      `${baseUrl}?rx_id=${currentRxId}` +
      `&patient=${encodeURIComponent(
        pName || 'bemor'
      )}`;

    if (window.QRCode) {

      new QRCode(qrContainer, {
        text: pdfViewUrl,
        width: 64,
        height: 64,
        correctLevel:
          QRCode.CorrectLevel.M
      });
    }
  }
}

/* ================= STAMP IMAGE UPLOAD ================= */

function uploadStampImage(event) {

  const file =
    event.target.files?.[0];

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload = function(e) {

    customStampDataURL =
      e.target.result;

    localStorage.setItem(
      'drmed_stamp',
      customStampDataURL
    );

    liveUpdate();
  };

  reader.readAsDataURL(file);
}

/* ================= SIGNATURE CANVAS ================= */

let canvas;
let ctx;
let isDrawing = false;

function initSignatureCanvas() {

  canvas =
    document.getElementById(
      'signatureCanvas'
    );

  if (!canvas) return;

  ctx =
    canvas.getContext('2d');

  ctx.strokeStyle =
    "#002b80";

  ctx.lineWidth =
    2.5;

  ctx.lineCap =
    "round";

  canvas.addEventListener(
    'mousedown',
    startDrawing
  );

  canvas.addEventListener(
    'mousemove',
    draw
  );

  canvas.addEventListener(
    'mouseup',
    stopDrawing
  );

  canvas.addEventListener(
    'mouseleave',
    stopDrawing
  );

  canvas.addEventListener(
    'touchstart',
    e => {

      const touch =
        e.touches[0];

      const rect =
        canvas.getBoundingClientRect();

      startDrawing({
        clientX: touch.clientX,
        clientY: touch.clientY,
        rect
      });
    },
    { passive: true }
  );

  canvas.addEventListener(
    'touchmove',
    e => {

      e.preventDefault();

      const touch =
        e.touches[0];

      const rect =
        canvas.getBoundingClientRect();

      draw({
        clientX: touch.clientX,
        clientY: touch.clientY,
        rect
      });
    },
    { passive: false }
  );

  canvas.addEventListener(
    'touchend',
    stopDrawing
  );
}

function startDrawing(e) {

  isDrawing = true;

  const rect =
    e.rect ||
    canvas.getBoundingClientRect();

  ctx.beginPath();

  ctx.moveTo(
    e.clientX - rect.left,
    e.clientY - rect.top
  );
}

function draw(e) {

  if (!isDrawing) return;

  const rect =
    e.rect ||
    canvas.getBoundingClientRect();

  ctx.lineTo(
    e.clientX - rect.left,
    e.clientY - rect.top
  );

  ctx.stroke();
}

function stopDrawing() {
  isDrawing = false;
}

function clearSignatureCanvas() {

  if (!ctx) return;

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const img =
    document.getElementById(
      'paper_sig_img'
    );

  if (img) {
    img.style.display =
      'none';
  }

  const fallback =
    document.getElementById(
      'sig_text_fallback'
    );

  if (fallback) {
    fallback.style.display =
      'inline-block';
  }
}

function applySignatureToPaper() {

  if (!canvas) return;

  signatureDataURL =
    canvas.toDataURL(
      "image/png"
    );

  const imgEl =
    document.getElementById(
      'paper_sig_img'
    );

  if (imgEl) {

    imgEl.src =
      signatureDataURL;

    imgEl.style.display =
      'block';
  }

  const fallback =
    document.getElementById(
      'sig_text_fallback'
    );

  if (fallback) {
    fallback.style.display =
      'none';
  }

  alert(
    "Imzo blankaga muvaffaqiyatli tushirildi!"
  );
}

/* ================= MODAL CONTROLS ================= */

function openModal(id) {

  const modal =
    document.getElementById(id);

  if (!modal) return;

  modal.classList.add('active');

  if (id === 'historyModal') {
    renderHistoryList();
  }

  if (id === 'icdModal') {
    searchICD10();
  }
}

function closeModal(id) {

  const modal =
    document.getElementById(id);

  if (modal) {
    modal.classList.remove('active');
  }
}

/* ================= SETTINGS ================= */

function saveSettings() {

  doctorProfile.name =
    document.getElementById(
      'set_doc_name'
    ).value;

  doctorProfile.spec =
    document.getElementById(
      'set_doc_spec'
    ).value;

  doctorProfile.id =
    document.getElementById(
      'set_doc_id'
    ).value;

  clinicProfile.name =
    document.getElementById(
      'set_clinic_name'
    ).value;

  clinicProfile.address =
    document.getElementById(
      'set_clinic_address'
    ).value;

  clinicProfile.phone =
    document.getElementById(
      'set_clinic_phone'
    ).value;

  localStorage.setItem(
    'drmed_doctor',
    JSON.stringify(doctorProfile)
  );

  localStorage.setItem(
    'drmed_clinic',
    JSON.stringify(clinicProfile)
  );

  liveUpdate();

  closeModal(
    'settingsModal'
  );

  alert(
    "Sozlamalar saqlandi!"
  );
}

function loadSettingsFromStorage() {

  const savedDoc =
    localStorage.getItem(
      'drmed_doctor'
    );

  const savedClinic =
    localStorage.getItem(
      'drmed_clinic'
    );

  const savedStamp =
    localStorage.getItem(
      'drmed_stamp'
    );

  if (savedDoc) {
    try {
      doctorProfile =
        JSON.parse(savedDoc);
    } catch (e) {
      console.error(e);
    }
  }

  if (savedClinic) {
    try {
      clinicProfile =
        JSON.parse(savedClinic);
    } catch (e) {
      console.error(e);
    }
  }

  if (savedStamp) {
    customStampDataURL =
      savedStamp;
  }

  const fields = {
    set_doc_name: doctorProfile.name,
    set_doc_spec: doctorProfile.spec,
    set_doc_id: doctorProfile.id,
    set_clinic_name: clinicProfile.name,
    set_clinic_address: clinicProfile.address,
    set_clinic_phone: clinicProfile.phone
  };

  Object.entries(fields).forEach(
    ([id, value]) => {

      const el =
        document.getElementById(id);

      if (el) {
        el.value = value;
      }
    }
  );
}

/* ================= HISTORY CRUD ================= */

function savePrescriptionToHistory() {

  const patientName =
    document.getElementById(
      'p_name'
    )?.value || '';

  if (!patientName.trim()) {

    alert(
      "Bemor ismini kiriting!"
    );

    return;
  }

  const rxId =
    document.getElementById(
      'paper_rx_id'
    )?.innerText ||
    'RX-' +
      Date.now()
        .toString()
        .slice(-6);

  const record = {

    id: rxId,

    date:
      new Date().toLocaleDateString(
        'uz-UZ'
      ),

    patientName,

    diag:
      document.getElementById(
        'p_diag'
      )?.value || '',

    drugs:
      JSON.parse(
        JSON.stringify(drugs)
      )
  };

  let history =
    JSON.parse(
      localStorage.getItem(
        'drmed_history'
      ) || '[]'
    );

  history.unshift(record);

  localStorage.setItem(
    'drmed_history',
    JSON.stringify(history)
  );

  alert(
    "Retsept arxivga saqlandi!"
  );
}

function renderHistoryList() {

  const container =
    document.getElementById(
      'historyListContainer'
    );

  if (!container) return;

  const history =
    JSON.parse(
      localStorage.getItem(
        'drmed_history'
      ) || '[]'
    );

  const searchInput =
    document.getElementById(
      'historySearchInput'
    );

  const searchQuery =
    searchInput
      ? searchInput.value
          .toLowerCase()
          .trim()
      : '';

  let filteredHistory =
    history;

  if (searchQuery) {

    filteredHistory =
      history.filter(
        item =>
          (
            item.patientName &&
            item.patientName
              .toLowerCase()
              .includes(searchQuery)
          ) ||
          (
            item.id &&
            item.id
              .toLowerCase()
              .includes(searchQuery)
          )
      );
  }

  if (filteredHistory.length === 0) {

    container.innerHTML =
      '<p class="help-text" style="padding:10px;text-align:center;">Hozircha saqlangan retseptlar mavjud emas.</p>';

    return;
  }

  container.innerHTML =
    filteredHistory
      .map(
        (item, idx) => `

          <div class="history-item">

            <div class="history-info">

              <h4>
                ${escapeHtml(item.patientName)}
                (${escapeHtml(item.id)})
              </h4>

              <p>
                ${escapeHtml(item.date)}
                —
                ${
                  escapeHtml(
                    item.diag ||
                    'Tashxis ko\'rsatilmagan'
                  )
                }
              </p>

            </div>

            <button
              class="sm-btn btn-add"
              onclick="loadFromHistory(${idx})"
            >
              Yuklash
            </button>

          </div>

        `
      )
      .join('');
}

function loadFromHistory(index) {

  const history =
    JSON.parse(
      localStorage.getItem(
        'drmed_history'
      ) || '[]'
    );

  const item =
    history[index];

  if (!item) return;

  const nameEl =
    document.getElementById('p_name');

  const diagEl =
    document.getElementById('p_diag');

  const rxEl =
    document.getElementById('paper_rx_id');

  if (nameEl) {
    nameEl.value =
      item.patientName || '';
  }

  if (diagEl) {
    diagEl.value =
      item.diag || '';
  }

  if (rxEl) {
    rxEl.innerText =
      item.id;
  }

  drugs =
    item.drugs || [];

  renderDrugCards();
  liveUpdate();

  closeModal(
    'historyModal'
  );

  switchStep(3);
}

function clearAllHistory() {

  if (
    confirm(
      "Butun arxivni o'chirib tashlamoqchimisiz?"
    )
  ) {

    localStorage.removeItem(
      'drmed_history'
    );

    renderHistoryList();
  }
}

/* ================= DYNAMIC ICD-10 SEARCH ================= */

function searchICD10() {

  const queryInput =
    document.getElementById(
      'icdSearchInput'
    );

  const query =
    queryInput
      ? queryInput.value
          .toLowerCase()
          .trim()
      : '';

  const resultsContainer =
    document.getElementById(
      'icdResultsList'
    );

  if (!resultsContainer) return;

  let filtered = [];

  if (!query) {

    filtered =
      icd10Data.slice(0, 30);

  } else {

    filtered =
      icd10Data
        .filter(
          i =>
            (
              i.code &&
              i.code
                .toLowerCase()
                .includes(query)
            ) ||
            (
              i.title &&
              i.title
                .toLowerCase()
                .includes(query)
            )
        )
        .slice(0, 50);
  }

  if (filtered.length === 0) {

    resultsContainer.innerHTML =
      '<p class="help-text" style="padding:12px;text-align:center;">Tashxis topilmadi.</p>';

    return;
  }

  resultsContainer.innerHTML =
    filtered
      .map(
        i => `

          <div
            class="history-item"
            onclick="selectICD(
              '${escapeJsString(i.code)}',
              '${escapeJsString(i.title)}'
            )"
            style="cursor:pointer;"
          >

            <div class="history-info">

              <h4>
                ${escapeHtml(i.code)}
              </h4>

              <p>
                ${escapeHtml(i.title)}
              </p>

            </div>

          </div>

        `
      )
      .join('');
}

function escapeJsString(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function selectICD(code, title) {

  const icdEl =
    document.getElementById('p_icd');

  const diagEl =
    document.getElementById('p_diag');

  if (icdEl) {
    icdEl.value = code;
  }

  if (diagEl) {
    diagEl.value = title;
  }

  liveUpdate();

  closeModal(
    'icdModal'
  );
}
/* ==========================================================================
   2-QISM
   PDF EXPORT — A4 / A5
   ========================================================================== */

/* ================= PDF FORMAT MODAL ================= */

let selectedPdfFormat = null;

function openPdfFormatModal() {
  const modal =
    document.getElementById('pdfFormatModal');

  if (!modal) {
    // Agar modal index.html'da hali bo'lmasa,
    // JS orqali yaratamiz.
    createPdfFormatModal();
  }

  const target =
    document.getElementById('pdfFormatModal');

  if (target) {
    target.classList.add('active');
  }

  if (tg && tg.HapticFeedback) {
    tg.HapticFeedback.impactOccurred('light');
  }
}

function closePdfFormatModal() {

  const modal =
    document.getElementById('pdfFormatModal');

  if (modal) {
    modal.classList.remove('active');
  }

  selectedPdfFormat = null;
}

function createPdfFormatModal() {

  if (
    document.getElementById(
      'pdfFormatModal'
    )
  ) {
    return;
  }

  const modal =
    document.createElement('div');

  modal.id =
    'pdfFormatModal';

  modal.className =
    'modal-overlay';

  modal.innerHTML = `

    <div
      class="modal-dialog"
      onclick="event.stopPropagation()"
    >

      <div class="modal-header">

        <div>
          <h3>
            📄 PDF formatini tanlang
          </h3>

          <p
            style="
              margin:4px 0 0;
              font-size:12px;
              opacity:.85;
            "
          >
            Retseptni qaysi formatda yuklamoqchisiz?
          </p>
        </div>

        <button
          class="modal-close"
          onclick="closePdfFormatModal()"
        >
          ×
        </button>

      </div>

      <div class="modal-body">

        <div class="pdf-format-options">

          <button
            type="button"
            class="pdf-format-option"
            onclick="downloadPDF('a4')"
          >

            <div class="format-icon">
              <span>A4</span>
            </div>

            <div class="format-title">
              A4 — Knijniy
            </div>

            <div class="format-description">
              Oddiy A4 qog'oz.
              Tik holatda.
            </div>

          </button>


          <button
            type="button"
            class="pdf-format-option a5-option"
            onclick="downloadPDF('a5')"
          >

            <div class="format-icon">
              <span>A5</span>
            </div>

            <div class="format-title">
              A5 — Albom
            </div>

            <div class="format-description">
              A5 albom holati.
              Chap yarmida retsept.
            </div>

          </button>

        </div>

        <div
          style="
            margin-top:15px;
            padding:10px;
            border-radius:10px;
            background:var(--primary-light);
            color:var(--text-main);
            font-size:11px;
            line-height:1.45;
          "
        >
          💡 A5 formatda qog'ozning chap
          yarmiga retsept joylashtiriladi,
          o'ng yarmi bo'sh qoladi.
        </div>

      </div>

    </div>
  `;

  modal.addEventListener(
    'click',
    event => {

      if (
        event.target === modal
      ) {
        closePdfFormatModal();
      }
    }
  );

  document.body.appendChild(modal);
}


/* ================= PDF LIBRARIES CHECK ================= */

function checkPdfLibraries() {

  const html2canvasAvailable =
    typeof window.html2canvas ===
    'function';

  const jsPdfAvailable =
    !!(
      window.jspdf &&
      typeof window.jspdf.jsPDF ===
      'function'
    );

  if (
    !html2canvasAvailable ||
    !jsPdfAvailable
  ) {

    console.error(
      'PDF kutubxonalari topilmadi.',
      {
        html2canvas:
          html2canvasAvailable,

        jsPDF:
          jsPdfAvailable
      }
    );

    alert(
      "PDF moduli yuklanmagan. " +
      "Internet aloqasini tekshiring."
    );

    return false;
  }

  return true;
}


/* ================= WAIT FOR IMAGES ================= */

function waitForImages(container) {

  if (!container) {
    return Promise.resolve();
  }

  const images =
    Array.from(
      container.querySelectorAll('img')
    );

  if (images.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(

    images.map(img => {

      if (
        img.complete &&
        img.naturalWidth > 0
      ) {
        return Promise.resolve();
      }

      return new Promise(resolve => {

        const done = () => {
          resolve();
        };

        img.addEventListener(
          'load',
          done,
          { once: true }
        );

        img.addEventListener(
          'error',
          done,
          { once: true }
        );

        setTimeout(
          resolve,
          5000
        );
      });
    })

  ).then(() => undefined);
}


/* ================= WAIT FOR RENDER ================= */

function waitForRender(ms = 300) {

  return new Promise(resolve => {

    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        setTimeout(
          resolve,
          ms
        );

      });

    });

  });
}


/* ================= GET PAPER ================= */

function getPrintablePaper() {

  const paper =
    document.getElementById(
      'printablePaper'
    );

  if (!paper) {

    alert(
      "Retsept blankasi topilmadi."
    );

    return null;
  }

  return paper;
}


/* ================= CLONE PAPER FOR A4 ================= */

/*
   Muhim:
   Oldingi versiyada clone yashirin joyga
   yuborilgan edi. html2canvas ayrim
   WebView'larda uni oq qilib render qilishi
   mumkin.

   Endi clone ko'rinadigan, ekrandan tashqari
   maxsus export konteynerda render qilinadi.
*/

function createPdfExportSurface(
  format,
  sourcePaper
) {

  const old =
    document.getElementById(
      '__drmed_pdf_export_surface'
    );

  if (old) {
    old.remove();
  }

  const surface =
    document.createElement('div');

  surface.id =
    '__drmed_pdf_export_surface';

  surface.dataset.format =
    format;

  surface.style.position =
    'fixed';

  surface.style.left =
    '0';

  surface.style.top =
    '0';

  surface.style.zIndex =
    '-9999';

  surface.style.background =
    '#ffffff';

  surface.style.overflow =
    'hidden';

  surface.style.pointerEvents =
    'none';

  surface.style.opacity =
    '1';


  const paper =
    sourcePaper.cloneNode(true);

  paper.id =
    '__drmed_pdf_export_paper';

  paper.style.position =
    'absolute';

  paper.style.margin =
    '0';

  paper.style.background =
    '#ffffff';

  paper.style.boxShadow =
    'none';

  paper.style.borderRadius =
    '0';

  paper.style.overflow =
    'hidden';


  /*
     A4:
     210 × 297 mm
  */

  if (format === 'a4') {

    surface.style.width =
      '210mm';

    surface.style.height =
      '297mm';

    paper.style.width =
      '210mm';

    paper.style.height =
      '297mm';

    paper.style.left =
      '0';

    paper.style.top =
      '0';
  }


  /*
     A5:
     210 × 148 mm
     Retsept chap 105 mm.
  */

  if (format === 'a5') {

    surface.style.width =
      '210mm';

    surface.style.height =
      '148mm';

    paper.style.width =
      '105mm';

    paper.style.height =
      '148mm';

    paper.style.left =
      '0';

    paper.style.top =
      '0';

    /*
       A5 da retseptni toraytirish.
       Ichki kontent chiqib ketmasligi uchun.
    */

    paper.style.transform =
      'scale(0.98)';

    paper.style.transformOrigin =
      'top left';

    const empty =
      document.createElement('div');

    empty.className =
      'drmed-a5-empty-space';

    empty.style.position =
      'absolute';

    empty.style.right =
      '0';

    empty.style.top =
      '0';

    empty.style.width =
      '105mm';

    empty.style.height =
      '148mm';

    empty.style.background =
      '#ffffff';

    surface.appendChild(
      empty
    );
  }

  surface.appendChild(
    paper
  );

  document.body.appendChild(
    surface
  );

  return {
    surface,
    paper
  };
}


/* ================= CREATE CANVAS ================= */

async function createPdfCanvas(
  paper
) {

  if (!paper) {
    throw new Error(
      'PDF paper topilmadi.'
    );
  }

  /*
     Barcha rasm va QR kodlar
     yuklanganini kutamiz.
  */

  await waitForImages(
    paper
  );

  await waitForRender(
    500
  );


  /*
     Scroll pozitsiyasidan mustaqil
     ishlashi uchun.
  */

  const rect =
    paper.getBoundingClientRect();

  /*
     Yuqori sifatli canvas.
  */

  const canvas =
    await html2canvas(
      paper,
      {
        backgroundColor:
          '#ffffff',

        scale:
          Math.min(
            3,
            Math.max(
              2,
              window.devicePixelRatio || 1
            )
          ),

        useCORS:
          true,

        allowTaint:
          false,

        imageTimeout:
          15000,

        logging:
          false,

        removeContainer:
          false,

        width:
          Math.ceil(rect.width),

        height:
          Math.ceil(rect.height),

        scrollX:
          0,

        scrollY:
          0,

        windowWidth:
          Math.max(
            document.documentElement.clientWidth,
            rect.width
          ),

        windowHeight:
          Math.max(
            document.documentElement.clientHeight,
            rect.height
          )
      }
    );

  return canvas;
}


/* ================= CANVAS TO BLOB ================= */

function canvasToBlob(
  canvas,
  quality = 0.95
) {

  return new Promise(
    (resolve, reject) => {

      canvas.toBlob(
        blob => {

          if (!blob) {

            reject(
              new Error(
                'Canvas Blob yaratilmadi.'
              )
            );

            return;
          }

          resolve(blob);

        },
        'image/png',
        quality
      );
    }
  );
}


/* ================= PDF FILE NAME ================= */

function getPdfFileName() {

  const patientName =
    document.getElementById(
      'p_name'
    )?.value?.trim() ||
    'Bemor';

  const rxId =
    document.getElementById(
      'paper_rx_id'
    )?.innerText?.trim() ||
    'RX';

  const safeName =
    patientName
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        '_'
      )
      .replace(
        /\s+/g,
        '_'
      )
      .slice(
        0,
        80
      );

  return (
    `DRMED_Retsept_${safeName}_${rxId}.pdf`
  );
}


/* ================= CREATE PDF DOCUMENT ================= */

async function buildPdfDocument(
  format
) {

  if (!checkPdfLibraries()) {
    return null;
  }

  const sourcePaper =
    getPrintablePaper();

  if (!sourcePaper) {
    return null;
  }

  /*
     Ekrandagi ma'lumotlarni
     oxirgi marta yangilaymiz.
  */

  liveUpdate();

  await waitForRender(
    250
  );


  /*
     Export surface yaratamiz.
  */

  const {
    surface,
    paper
  } =
    createPdfExportSurface(
      format,
      sourcePaper
    );


  try {

    /*
       Browser layout'ini
       qayta hisoblashga majbur qilamiz.
    */

    surface.offsetHeight;
    paper.offsetHeight;

    await waitForRender(
      500
    );

    /*
       QR va signature rasmlari
       yuklanganini kutamiz.
    */

    await waitForImages(
      paper
    );

    /*
       Canvas.
    */

    const canvas =
      await createPdfCanvas(
        paper
      );


    /*
       PDF format.
    */

    const {
      jsPDF
    } = window.jspdf;

    let pdf;

    if (format === 'a4') {

      pdf =
        new jsPDF({
          orientation:
            'portrait',

          unit:
            'mm',

          format:
            'a4',

          compress:
            true
        });

    } else {

      pdf =
        new jsPDF({
          orientation:
            'landscape',

          unit:
            'mm',

          format:
            'a5',

          compress:
            true
        });
    }


    /*
       Canvas o'lchamlari.
    */

    const canvasWidth =
      canvas.width;

    const canvasHeight =
      canvas.height;


    if (format === 'a4') {

      const pageWidth =
        210;

      const pageHeight =
        297;

      /*
         A4 uchun maksimal
         foydalaniladigan joy.
      */

      const margin =
        0;

      const availableWidth =
        pageWidth -
        margin * 2;

      const availableHeight =
        pageHeight -
        margin * 2;

      const ratio =
        Math.min(
          availableWidth /
            canvasWidth,

          availableHeight /
            canvasHeight
        );

      const renderWidth =
        canvasWidth * ratio;

      const renderHeight =
        canvasHeight * ratio;

      const x =
        (pageWidth -
          renderWidth) /
        2;

      const y =
        (pageHeight -
          renderHeight) /
        2;


      pdf.addImage(
        canvas.toDataURL(
          'image/png'
        ),
        'PNG',
        x,
        y,
        renderWidth,
        renderHeight,
        undefined,
        'FAST'
      );

    } else {

      /*
         A5 LANDSCAPE:
         210 × 148 mm.

         Retsept chap 105 mm.
      */

      const halfWidth =
        105;

      const pageHeight =
        148;

      const ratio =
        Math.min(
          halfWidth /
            canvasWidth,

          pageHeight /
            canvasHeight
        );

      const renderWidth =
        canvasWidth * ratio;

      const renderHeight =
        canvasHeight * ratio;

      const x =
        (halfWidth -
          renderWidth) /
        2;

      const y =
        (pageHeight -
          renderHeight) /
        2;


      /*
         Chap taraf.
      */

      pdf.addImage(
        canvas.toDataURL(
          'image/png'
        ),
        'PNG',
        x,
        y,
        renderWidth,
        renderHeight,
        undefined,
        'FAST'
      );

      /*
         O'ng taraf ataylab
         bo'sh qoldiriladi.
      */
    }


    /*
       Metadata.
    */

    pdf.setProperties({

      title:
        'DR.MED Elektron Retsept',

      subject:
        'Elektron retsept',

      author:
        doctorProfile.name ||
        'DR.MED',

      creator:
        'DR.MED PRO'
    });


    /*
       Blob.
    */

    const blob =
      pdf.output(
        'blob'
      );


    return {
      pdf,
      blob,
      fileName:
        getPdfFileName(),
      format
    };

  } finally {

    /*
       Export surface'ni
       doimo o'chiramiz.
    */

    surface.remove();
  }
}


/* ================= DOWNLOAD PDF ================= */

async function downloadPDF(
  format
) {

  if (
    format !== 'a4' &&
    format !== 'a5'
  ) {

    alert(
      'PDF formatini tanlang.'
    );

    return;
  }

  selectedPdfFormat =
    format;


  /*
     Modalni yopamiz.
  */

  closePdfFormatModal();


  /*
     Tugmani loading holatiga
     o'tkazamiz.
  */

  const pdfButton =
    document.querySelector(
      '.btn-pdf'
    ) ||
    document.getElementById(
      'pdfDownloadButton'
    );

  const oldText =
    pdfButton?.innerHTML;


  if (pdfButton) {

    pdfButton.disabled =
      true;

    pdfButton.classList.add(
      'pdf-loading'
    );

    pdfButton.innerHTML =
      `
        <i>⏳</i>
        <span>PDF tayyorlanmoqda...</span>
      `;
  }


  try {

    /*
       PDF yaratamiz.
    */

    const result =
      await buildPdfDocument(
        format
      );

    if (!result) {
      return;
    }


    /*
       Browser download.
    */

    const url =
      URL.createObjectURL(
        result.blob
      );

    const link =
      document.createElement(
        'a'
      );

    link.href =
      url;

    link.download =
      result.fileName;

    link.style.display =
      'none';

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();


    /*
       URL'ni darhol o'chirmaymiz.
       Mobil browserlarda download
       boshlanishiga vaqt kerak bo'lishi
       mumkin.
    */

    setTimeout(
      () => {
        URL.revokeObjectURL(url);
      },
      10000
    );


    if (
      tg &&
      tg.HapticFeedback
    ) {

      tg.HapticFeedback
        .notificationOccurred(
          'success'
        );
    }


  } catch (error) {

    console.error(
      'PDF yaratish xatosi:',
      error
    );

    alert(
      'PDF yaratishda xatolik yuz berdi.\n\n' +
      'Iltimos, qaytadan urinib ko‘ring.'
    );

  } finally {

    if (pdfButton) {

      pdfButton.disabled =
        false;

      pdfButton.classList.remove(
        'pdf-loading'
      );

      if (oldText) {
        pdfButton.innerHTML =
          oldText;
      }
    }
  }
}


/* ================= GENERATE PDF BLOB ================= */

/*
   Telegram Share va boshqa funksiyalar
   uchun PDFni Blob ko'rinishida olish.
*/

async function generatePdfBlob(
  format = 'a4'
) {

  const result =
    await buildPdfDocument(
      format
    );

  if (!result) {
    return null;
  }

  return result;
}


/* ================= OPEN PDF PREVIEW ================= */

async function previewPDF(
  format = 'a4'
) {

  try {

    const result =
      await buildPdfDocument(
        format
      );

    if (!result) {
      return;
    }

    const url =
      URL.createObjectURL(
        result.blob
      );

    /*
       Mobil browserlarda
       yangi tab ochilishi.
    */

    const opened =
      window.open(
        url,
        '_blank'
      );

    /*
       Agar popup blocker
       to'ssa, link orqali.
    */

    if (!opened) {

      const link =
        document.createElement(
          'a'
        );

      link.href =
        url;

      link.target =
        '_blank';

      link.rel =
        'noopener';

      link.click();
    }

    setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      60000
    );

  } catch (error) {

    console.error(
      'PDF preview error:',
      error
    );

    alert(
      'PDFni ko‘rishda xatolik yuz berdi.'
    );
  }
}


/* ================= PRINT ================= */

function printPrescription() {

  liveUpdate();

  /*
     Brauzer print oynasini
     ochamiz.
  */

  window.print();
}


/* ================= COPY PDF TO CLIPBOARD ================= */

async function copyPdfToClipboard(
  format = 'a4'
) {

  try {

    const result =
      await buildPdfDocument(
        format
      );

    if (!result) {
      return false;
    }

    /*
       Clipboard API har bir
       browserda PDF Blobni qo'llamaydi.
    */

    if (
      !navigator.clipboard ||
      typeof ClipboardItem ===
      'undefined'
    ) {

      return false;
    }

    const item =
      new ClipboardItem({
        'application/pdf':
          result.blob
      });

    await navigator.clipboard.write([
      item
    ]);

    return true;

  } catch (error) {

    console.warn(
      'PDF clipboard ishlamadi:',
      error
    );

    return false;
  }
}


/* ================= SAVE PDF AS FILE ================= */

async function savePdfBlob(
  blob,
  fileName
) {

  if (!blob) {
    return false;
  }

  const url =
    URL.createObjectURL(
      blob
    );

  try {

    const link =
      document.createElement(
        'a'
      );

    link.href =
      url;

    link.download =
      fileName ||
      getPdfFileName();

    link.style.display =
      'none';

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    return true;

  } finally {

    setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      10000
    );
  }
}


/* ================= PDF BUTTON HANDLER ================= */

function handlePdfButtonClick() {

  /*
     Avval format oynasini
     ochamiz.
  */

  openPdfFormatModal();
}


/* ================= GLOBAL PDF HANDLERS ================= */

window.openPdfFormatModal =
  openPdfFormatModal;

window.closePdfFormatModal =
  closePdfFormatModal;

window.downloadPDF =
  downloadPDF;

window.previewPDF =
  previewPDF;

window.printPrescription =
  printPrescription;

window.handlePdfButtonClick =
  handlePdfButtonClick;


/* ==========================================================================
   END OF 2-QISM
   ========================================================================== */
   /* ==========================================================================
   3-QISM
   TELEGRAM SHARE + YAKUNIY FUNKSIYALAR
   ========================================================================== */


/* ==========================================================================
   TELEGRAM / FILE SHARE
   ========================================================================== */

/*
   TELEFON / PLANShet:

   1. PDF Blob yaratiladi
   2. File obyektiga aylantiriladi
   3. navigator.share() chaqiriladi
   4. Telefonning Share oynasi ochiladi
   5. Telegram, WhatsApp, Gmail va boshqa ilovalarni tanlash mumkin

   KOMPYUTER:

   Browserda native file sharing mavjud bo'lmasa:
   1. PDF yuklab olinadi
   2. Telegram ochiladi

   MUHIM:
   Oddiy frontend JavaScript Telegram Bot API orqali
   foydalanuvchiga avtomatik PDF yubora olmaydi.
   Buning uchun keyingi bosqichda main.py backend kerak bo'ladi.
*/


async function shareTelegram() {

  liveUpdate();

  const button =
    document.getElementById(
      'telegramShareButton'
    ) ||
    document.querySelector(
      '.btn-share'
    );

  const oldHtml =
    button
      ? button.innerHTML
      : null;


  /*
     Tugmani loading holatiga o'tkazamiz.
  */

  if (button) {

    button.disabled =
      true;

    button.style.opacity =
      '0.7';

    button.innerHTML =
      `
        <i>⏳</i>
        <span>PDF tayyorlanmoqda...</span>
      `;
  }


  try {

    /*
       PDF yaratamiz.

       Telegram uchun A4 formatdan foydalanamiz.
    */

    const result =
      await generatePdfBlob(
        'a4'
      );


    if (!result) {

      throw new Error(
        'PDF yaratilmadi.'
      );
    }


    const pdfBlob =
      result.blob;

    const filename =
      result.fileName ||
      getPdfFileName();


    /*
       PDF Blobni File obyektiga aylantiramiz.
    */

    const file =
      new File(
        [pdfBlob],
        filename,
        {
          type:
            'application/pdf'
        }
      );


    /*
       Share uchun matn.
    */

    const shareText =
      getTelegramShareText();


    /* ======================================================================
       TELEFON / PLANShet
       ====================================================================== */

    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {

      const shareData = {

        title:
          'DR.MED Elektron Retsept',

        text:
          shareText,

        files: [
          file
        ]
      };


      /*
         Browser fayl ulashishni
         qo'llaydimi?
      */

      let canShareFiles =
        true;


      if (
        typeof navigator.canShare ===
        'function'
      ) {

        try {

          canShareFiles =
            navigator.canShare({
              files: [file]
            });

        } catch (shareCheckError) {

          console.warn(
            'navigator.canShare tekshirishda xato:',
            shareCheckError
          );

          canShareFiles =
            false;
        }
      }


      /*
         Fayl ulashish mumkin bo'lsa,
         native Share oynasini ochamiz.
      */

      if (canShareFiles) {

        try {

          await navigator.share(
            shareData
          );


          /*
             Foydalanuvchi Share oynasida
             Telegramni tanlaydi.
          */

          if (
            tg &&
            tg.HapticFeedback
          ) {

            tg.HapticFeedback
              .notificationOccurred(
                'success'
              );
          }


          return;

        } catch (shareError) {

          /*
             Foydalanuvchi Share oynasini
             yopgan bo'lsa — xato emas.
          */

          if (
            shareError &&
            shareError.name ===
              'AbortError'
          ) {

            return;
          }


          console.warn(
            'Native Share ishlamadi:',
            shareError
          );

          /*
             Pastdagi fallbackga o'tamiz.
          */
        }
      }
    }


    /* ======================================================================
       MOBIL / DESKTOP FALLBACK
       ====================================================================== */

    /*
       Native Share mavjud bo'lmasa
       PDFni yuklab olamiz.
    */

    const url =
      URL.createObjectURL(
        pdfBlob
      );

    const link =
      document.createElement(
        'a'
      );

    link.href =
      url;

    link.download =
      filename;

    link.style.display =
      'none';

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();


    setTimeout(
      () => {

        URL.revokeObjectURL(
          url
        );

      },
      10000
    );


    /*
       Telegram bot username.
    */

    const botUsername =
      'drmeduz1bot';


    /*
       Telegramni ochamiz.
    */

    const telegramUrl =
      `https://t.me/${botUsername}`;


    /*
       Telegram WebApp ichida.
    */

    if (
      tg &&
      typeof tg.openTelegramLink ===
        'function'
    ) {

      try {

        tg.openTelegramLink(
          telegramUrl
        );

      } catch (telegramError) {

        console.warn(
          'tg.openTelegramLink ishlamadi:',
          telegramError
        );

        window.open(
          telegramUrl,
          '_blank'
        );
      }

    } else {

      /*
         Oddiy browser / kompyuter.
      */

      const opened =
        window.open(
          telegramUrl,
          '_blank'
        );

      /*
         Popup blocker bo'lsa,
         location orqali o'tamiz.
      */

      if (!opened) {

        window.location.href =
          telegramUrl;
      }
    }


    /*
       Foydalanuvchiga aniq tushuntirish.
    */

    alert(
      '📄 PDF yuklab olindi.\n\n' +
      'Telegram ochildi.\n\n' +
      'PDF faylni Telegramdagi kerakli chatga yuboring.'
    );


  } catch (error) {

    console.error(
      'Telegram/PDF yuborishda xatolik:',
      error
    );


    /*
       Share oynasi yopilgan bo'lsa,
       hech qanday xabar bermaymiz.
    */

    if (
      error &&
      error.name ===
        'AbortError'
    ) {

      return;
    }


    alert(
      '❌ PDFni Telegram orqali yuborishda xatolik yuz berdi.\n\n' +
      (
        error?.message ||
        'Nomaʼlum xatolik'
      )
    );


  } finally {

    /*
       Tugmani normal holatga qaytaramiz.
    */

    if (button) {

      button.disabled =
        false;

      button.style.opacity =
        '1';

      if (oldHtml) {

        button.innerHTML =
          oldHtml;

      } else {

        button.innerHTML =
          `
            <i>✈️</i>
            <span>Telegram</span>
          `;
      }
    }
  }
}


/* ==========================================================================
   TELEGRAM SHARE TEXT
   ========================================================================== */

function getTelegramShareText() {

  const patientName =
    document.getElementById(
      'p_name'
    )?.value?.trim() ||
    'Bemor';


  const rxId =
    document.getElementById(
      'paper_rx_id'
    )?.innerText?.trim() ||
    'RX';


  const diagnosis =
    document.getElementById(
      'p_diag'
    )?.value?.trim() ||
    '—';


  return (
    `DR.MED Elektron Retsept\n` +
    `Retsept: ${rxId}\n` +
    `Bemor: ${patientName}\n` +
    `Tashxis: ${diagnosis}`
  );
}


/* ==========================================================================
   OPEN TELEGRAM DIRECTLY
   ========================================================================== */

function openTelegramBot() {

  const botUsername =
    'drmeduz1bot';

  const telegramUrl =
    `https://t.me/${botUsername}`;


  if (
    tg &&
    typeof tg.openTelegramLink ===
      'function'
  ) {

    tg.openTelegramLink(
      telegramUrl
    );

  } else {

    window.open(
      telegramUrl,
      '_blank'
    );
  }
}


/* ==========================================================================
   SHARE PDF GENERIC
   ========================================================================== */

/*
   Telegramdan tashqari boshqa ilovalarga ham
   PDF yuborish uchun universal funksiya.

   Masalan:
   - Telegram
   - WhatsApp
   - Gmail
   - Google Drive
   - Nearby Share
   - AirDrop
   va boshqalar.
*/

async function sharePdfGeneric(
  format = 'a4'
) {

  const button =
    document.getElementById(
      'telegramShareButton'
    ) ||
    document.querySelector(
      '.btn-share'
    );


  const oldHtml =
    button
      ? button.innerHTML
      : null;


  if (button) {

    button.disabled =
      true;

    button.style.opacity =
      '0.7';

    button.innerHTML =
      `
        <i>⏳</i>
        <span>Tayyorlanmoqda...</span>
      `;
  }


  try {

    const result =
      await generatePdfBlob(
        format
      );


    if (!result) {

      throw new Error(
        'PDF yaratilmadi.'
      );
    }


    const file =
      new File(
        [result.blob],
        result.fileName,
        {
          type:
            'application/pdf'
        }
      );


    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {

      const shareData = {

        title:
          'DR.MED Elektron Retsept',

        text:
          getTelegramShareText(),

        files: [
          file
        ]
      };


      let supported =
        true;


      if (
        typeof navigator.canShare ===
        'function'
      ) {

        supported =
          navigator.canShare({
            files: [file]
          });
      }


      if (supported) {

        await navigator.share(
          shareData
        );

        return true;
      }
    }


    /*
       Share ishlamasa PDFni yuklab olamiz.
    */

    await savePdfBlob(
      result.blob,
      result.fileName
    );


    alert(
      'PDF yuklab olindi.'
    );


    return false;


  } catch (error) {

    if (
      error &&
      error.name ===
        'AbortError'
    ) {

      return false;
    }


    console.error(
      'Universal PDF share error:',
      error
    );


    alert(
      'PDFni ulashishda xatolik yuz berdi.'
    );


    return false;


  } finally {

    if (button) {

      button.disabled =
        false;

      button.style.opacity =
        '1';

      if (oldHtml) {

        button.innerHTML =
          oldHtml;

      } else {

        button.innerHTML =
          `
            <i>✈️</i>
            <span>Telegram</span>
          `;
      }
    }
  }
}


/* ==========================================================================
   CLEAR PATIENT FORM
   ========================================================================== */

function clearPatientForm() {

  const fields = [

    'p_name',

    'p_age',

    'p_birth',

    'p_phone',

    'p_card',

    'p_address',

    'p_icd',

    'p_diag',

    'p_allergy',

    'p_note'

  ];


  fields.forEach(
    id => {

      const el =
        document.getElementById(
          id
        );

      if (el) {

        el.value =
          '';
      }
    }
  );


  /*
     Jinsni default holatga
     qaytaramiz.
  */

  currentGender =
    'Erkak';


  const male =
    document.getElementById(
      'gender_m'
    );

  const female =
    document.getElementById(
      'gender_f'
    );


  if (male) {

    male.classList.add(
      'active'
    );
  }


  if (female) {

    female.classList.remove(
      'active'
    );
  }


  /*
     Retsept IDni yangilaymiz.
  */

  const rxId =
    document.getElementById(
      'paper_rx_id'
    );

  if (rxId) {

    rxId.innerText =
      'RX-' +
      new Date()
        .getFullYear() +
      '-' +
      Math.floor(
        10000 +
        Math.random() * 90000
      );
  }


  /*
     Dorilarni ham tozalaymiz.
  */

  drugs = [];


  renderDrugCards();

  liveUpdate();


  /*
     Imzoni tozalaymiz.
  */

  if (
    typeof clearSignatureCanvas ===
    'function'
  ) {

    clearSignatureCanvas();
  }


  if (
    tg &&
    tg.HapticFeedback
  ) {

    tg.HapticFeedback
      .notificationOccurred(
        'success'
      );
  }
}


/* ==========================================================================
   RESET APPLICATION DEFAULTS
   ========================================================================== */

function resetAppDefaults() {

  if (
    confirm(
      "Dasturni dastlabki holatga qaytarmoqchimisiz?\n\nBarcha saqlangan sozlamalar va retseptlar o'chiriladi."
    )
  ) {

    localStorage.clear();

    location.reload();
  }
}


/* ==========================================================================
   KEYBOARD SHORTCUTS
   ========================================================================== */

document.addEventListener(
  'keydown',
  event => {

    /*
       Ctrl + P
       Print.
    */

    if (
      event.ctrlKey &&
      event.key.toLowerCase() ===
        'p'
    ) {

      /*
         Brauzerning standart
         printini o'zimiz boshqaramiz.
      */

      event.preventDefault();

      printPrescription();
    }


    /*
       Escape
       PDF modalini yopish.
    */

    if (
      event.key ===
        'Escape'
    ) {

      const modal =
        document.getElementById(
          'pdfFormatModal'
        );

      if (
        modal &&
        modal.classList.contains(
          'active'
        )
      ) {

        closePdfFormatModal();
      }
    }
  }
);


/* ==========================================================================
   WINDOW RESIZE
   ========================================================================== */

window.addEventListener(
  'resize',
  () => {

    /*
       PDF preview faqat
       ekrandagi ko'rinish uchun
       qayta yangilanadi.
    */

    if (
      currentStep === 3
    ) {

      liveUpdate();
    }
  }
);


/* ==========================================================================
   VISIBILITY CHANGE
   ========================================================================== */

document.addEventListener(
  'visibilitychange',
  () => {

    if (
      !document.hidden &&
      currentStep === 3
    ) {

      liveUpdate();
    }
  }
);


/* ==========================================================================
   TELEGRAM THEME UPDATE
   ========================================================================== */

if (tg) {

  try {

    tg.onEvent(
      'themeChanged',
      () => {

        document.body.classList.add(
          'tg-theme'
        );

        liveUpdate();
      }
    );

  } catch (error) {

    console.warn(
      'Telegram theme event ulanmadi:',
      error
    );
  }
}


/* ==========================================================================
   FINAL GLOBAL FUNCTIONS
   ========================================================================== */

window.shareTelegram =
  shareTelegram;

window.sharePdfGeneric =
  sharePdfGeneric;

window.openTelegramBot =
  openTelegramBot;

window.getTelegramShareText =
  getTelegramShareText;

window.clearPatientForm =
  clearPatientForm;

window.resetAppDefaults =
  resetAppDefaults;

window.printPrescription =
  printPrescription;


/* ==========================================================================
   FINAL INITIALIZATION
   ========================================================================== */

window.addEventListener(
  'load',
  () => {

    /*
       Sahifa to'liq yuklangandan keyin
       retseptni yana bir marta yangilaymiz.
    */

    setTimeout(
      () => {

        liveUpdate();

      },
      300
    );


    /*
       PDF format modal mavjud
       bo'lmasa yaratamiz.
    */

    if (
      !document.getElementById(
        'pdfFormatModal'
      )
    ) {

      createPdfFormatModal();
    }
  }
);


/* ==========================================================================
   DR.MED APP READY
   ========================================================================== */

console.log(
  '✅ DR.MED PRO — app.js muvaffaqiyatli yuklandi.'
);

console.log(
  '📄 PDF: A4 / A5'
);

console.log(
  '📱 Mobile Share: Web Share API'
);

console.log(
  '✈️ Telegram Share: tayyor'
);


/* ==========================================================================
   END OF APP.JS
   ========================================================================== */
