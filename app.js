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

// ================= DOCTOR & CLINIC SETTINGS =================
// Birinchi marta ochilganda barcha maydonlar BO'SH bo'ladi.
// Foydalanuvchi "Saqlash va Yangilash"ni bosgandan keyin
// ma'lumotlar localStorage'da saqlanadi.

let doctorProfile = {
  name: "",
  spec: "",
  id: ""
};

let clinicProfile = {
  name: "",
  address: "",
  phone: ""
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
    localStorage.getItem('drmed_doctor');

  const savedClinic =
    localStorage.getItem('drmed_clinic');

  const savedStamp =
    localStorage.getItem('drmed_stamp');


  // =====================================================
  // ESKI DEFAULT MA'LUMOTLARNI AVTOMATIK TOZALASH
  // =====================================================

  const oldDefaultDoctor = {
    name: "Asrorov Asadbek Asliddinovich",
    spec: "Shifokor-Terapevt",
    id: "012345"
  };

  const oldDefaultClinic = {
    name: "DR.MED Tibbiyot Markazi",
    address: "Toshkent sh., Chilonzor tumani, Bunyodkor ko'chasi 12-uy",
    phone: "+998 (71) 200-00-11"
  };


  // Eski default doktor ma'lumotlari bo'lsa,
  // ularni saqlangan ma'lumot deb hisoblamaymiz.

  if (savedDoc) {

    try {

      const parsedDoc =
        JSON.parse(savedDoc);

      const isOldDefault =
        parsedDoc.name === oldDefaultDoctor.name &&
        parsedDoc.spec === oldDefaultDoctor.spec &&
        parsedDoc.id === oldDefaultDoctor.id;

      if (isOldDefault) {

        localStorage.removeItem(
          'drmed_doctor'
        );

        doctorProfile = {
          name: "",
          spec: "",
          id: ""
        };

      } else {

        doctorProfile = {
          name: parsedDoc.name || "",
          spec: parsedDoc.spec || "",
          id: parsedDoc.id || ""
        };

      }

    } catch (error) {

      console.error(
        "Doctor settings parse error:",
        error
      );

      localStorage.removeItem(
        'drmed_doctor'
      );

      doctorProfile = {
        name: "",
        spec: "",
        id: ""
      };
    }

  } else {

    doctorProfile = {
      name: "",
      spec: "",
      id: ""
    };
  }


  // =====================================================
  // KLINIKA
  // =====================================================

  if (savedClinic) {

    try {

      const parsedClinic =
        JSON.parse(savedClinic);

      const isOldDefault =
        parsedClinic.name === oldDefaultClinic.name &&
        parsedClinic.address === oldDefaultClinic.address &&
        parsedClinic.phone === oldDefaultClinic.phone;

      if (isOldDefault) {

        localStorage.removeItem(
          'drmed_clinic'
        );

        clinicProfile = {
          name: "",
          address: "",
          phone: ""
        };

      } else {

        clinicProfile = {
          name: parsedClinic.name || "",
          address: parsedClinic.address || "",
          phone: parsedClinic.phone || ""
        };

      }

    } catch (error) {

      console.error(
        "Clinic settings parse error:",
        error
      );

      localStorage.removeItem(
        'drmed_clinic'
      );

      clinicProfile = {
        name: "",
        address: "",
        phone: ""
      };
    }

  } else {

    clinicProfile = {
      name: "",
      address: "",
      phone: ""
    };
  }


  // =====================================================
  // STAMP / MUHR
  // =====================================================

  if (savedStamp) {

    customStampDataURL =
      savedStamp;

  } else {

    customStampDataURL =
      null;
  }


  // =====================================================
  // FORM MAYDONLARIGA QO'YISH
  // =====================================================

  const fields = {

    set_doc_name:
      doctorProfile.name,

    set_doc_spec:
      doctorProfile.spec,

    set_doc_id:
      doctorProfile.id,

    set_clinic_name:
      clinicProfile.name,

    set_clinic_address:
      clinicProfile.address,

    set_clinic_phone:
      clinicProfile.phone

  };


  Object.entries(fields).forEach(
    ([id, value]) => {

      const el =
        document.getElementById(id);

      if (el) {

        el.value =
          value || "";

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

/* =========================================================
   DR.MED — PDF.JS INTEGRATION
   ========================================================= */

window.addEventListener('DOMContentLoaded', () => {

    /*
     * PDF tugmasi
     */
    const pdfButton =
        document.getElementById('pdfDownloadButton') ||
        document.querySelector('.btn-pdf');

    if (pdfButton) {

        pdfButton.onclick = function () {

            if (
                window.DRMED_PDF &&
                typeof window.DRMED_PDF.openFormatModal === 'function'
            ) {
                window.DRMED_PDF.openFormatModal();
            } else {
                alert(
                    "PDF moduli hali yuklanmagan. Sahifani yangilang."
                );
            }

        };

    }


    /*
     * Telegram / Share tugmasi
     */
    const telegramButton =
        document.getElementById('telegramShareButton') ||
        document.querySelector('.btn-share');

    if (telegramButton) {

        telegramButton.onclick = async function () {

            if (
                window.DRMED_PDF &&
                typeof window.DRMED_PDF.share === 'function'
            ) {

                await window.DRMED_PDF.share();

            } else {

                alert(
                    "PDF moduli hali yuklanmagan. Sahifani yangilang."
                );

            }

        };

    }

});
