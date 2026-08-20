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

// INITIALIZATION ON LOAD
window.addEventListener('DOMContentLoaded', () => {

  loadSettingsFromStorage();

  loadICD10Database();

  renderDrugCards();

  initSignatureCanvas();

  checkURLParamsAndRender();

  liveUpdate();

});

/* ================= URL PARAMETERS CHECK FOR QR VIEW ================= */

function checkURLParamsAndRender() {

  const urlParams =
    new URLSearchParams(
      window.location.search
    );

  const viewRxId =
    urlParams.get('rx_id');

  if (viewRxId) {

    const history =
      JSON.parse(
        localStorage.getItem(
          'drmed_history'
        ) || '[]'
      );

    const targetRx =
      history.find(
        item =>
          item.id === viewRxId
      );

    if (targetRx) {

      document.getElementById(
        'p_name'
      ).value =
        targetRx.patientName || '';

      document.getElementById(
        'p_diag'
      ).value =
        targetRx.diag || '';

      if (targetRx.drugs) {
        drugs =
          targetRx.drugs;
      }

      renderDrugCards();

      switchStep(3);

    }

  }

}

/* ================= WIZARD NAVIGATION ================= */

function switchStep(stepNum) {

  currentStep =
    stepNum;

  document
    .querySelectorAll(
      '.step-content'
    )
    .forEach(el => {

      el.classList.remove(
        'active'
      );

    });

  document
    .querySelectorAll(
      '.wizard-tab'
    )
    .forEach(el => {

      el.classList.remove(
        'active'
      );

    });

  const stepEl =
    document.getElementById(
      `step${stepNum}`
    );

  const tabEl =
    document.getElementById(
      `tab${stepNum}`
    );

  if (stepEl) {

    stepEl.classList.add(
      'active'
    );

  }

  if (tabEl) {

    tabEl.classList.add(
      'active'
    );

  }

  if (stepNum === 3) {

    liveUpdate();

  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  // Telegram Haptic Feedback
  if (
    tg &&
    tg.HapticFeedback
  ) {

    tg.HapticFeedback
      .impactOccurred(
        'light'
      );

  }

}

function selectGender(gender) {

  currentGender =
    gender;

  const male =
    document.getElementById(
      'gender_m'
    );

  const female =
    document.getElementById(
      'gender_f'
    );

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

  const birthEl =
    document.getElementById(
      'p_birth'
    );

  if (!birthEl) return;

  const birthVal =
    birthEl.value;

  if (!birthVal) return;

  const birthDate =
    new Date(
      birthVal
    );

  const diff =
    Date.now() -
    birthDate.getTime();

  const ageDate =
    new Date(diff);

  const calculatedAge =
    Math.abs(
      ageDate.getUTCFullYear() -
      1970
    );

  const ageEl =
    document.getElementById(
      'p_age'
    );

  if (ageEl) {

    ageEl.value =
      calculatedAge;

  }

}

/* ================= DRUG BUILDER LOGIC ================= */

function renderDrugCards() {

  const container =
    document.getElementById(
      'drugsListContainer'
    );

  if (!container) return;

  container.innerHTML = '';

  drugs.forEach(
    (d, idx) => {

      const card =
        document.createElement(
          'div'
        );

      card.className =
        'drug-card';

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
              type="button"
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
              value="${d.name || ''}"
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
              value="${d.dose || ''}"
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

              <option value="Tab.">
                Tab.
              </option>

              <option value="Caps.">
                Caps.
              </option>

              <option value="Amp.">
                Amp.
              </option>

              <option value="Inj.">
                Inj.
              </option>

              <option value="Sol.">
                Sol.
              </option>

              <option value="Syr.">
                Syr.
              </option>

              <option value="Susp.">
                Susp.
              </option>

              <option value="Pulv.">
                Pulv.
              </option>

              <option value="Ung.">
                Ung.
              </option>

              <option value="Gel">
                Gel
              </option>

              <option value="Crem.">
                Crem.
              </option>

              <option value="Spray">
                Spray
              </option>

              <option value="Aeros.">
                Aeros.
              </option>

              <option value="Supp.">
                Supp.
              </option>

              <option value="Gtt.">
                Gtt.
              </option>

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
              value="${d.dtd || ''}"
              placeholder="D.t.d. № 10"
              oninput="drugs[${idx}].dtd=this.value; liveUpdate();"
            >

          </div>

          <div class="form-group col-6">
          </div>

        </div>

        <div class="form-group">

          <label>
            S. (Qabul qilish usuli)
          </label>

          <input
            type="text"
            value="${d.ds || ''}"
            placeholder="Kuniga 2 mahal 1 tabletkadan..."
            oninput="drugs[${idx}].ds=this.value; liveUpdate();"
          >

        </div>

      `;

      container.appendChild(
        card
      );

    }
  );

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

  drugs.splice(
    index,
    1
  );

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

// PRESET PRE-DEFINED CLINICAL CASES

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

  }

  else if (type === 'gripp') {

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

  }

  else if (type === 'gastritis') {

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

  // Patient Details

  const pName =
    document.getElementById(
      'p_name'
    )
      ? document.getElementById(
          'p_name'
        ).value
      : '';

  const pBirth =
    document.getElementById(
      'p_birth'
    )
      ? document.getElementById(
          'p_birth'
        ).value
      : '';

  const pAge =
    document.getElementById(
      'p_age'
    )
      ? document.getElementById(
          'p_age'
        ).value
      : '0';

  const pAddress =
    document.getElementById(
      'p_address'
    )
      ? document.getElementById(
          'p_address'
        ).value
      : '';

  const pCard =
    document.getElementById(
      'p_card'
    )
      ? document.getElementById(
          'p_card'
        ).value
      : '';

  if (
    document.getElementById(
      'paper_p_name'
    )
  ) {

    document.getElementById(
      'paper_p_name'
    ).innerText =
      pName || '—';

  }

  if (
    document.getElementById(
      'paper_p_birth'
    )
  ) {

    document.getElementById(
      'paper_p_birth'
    ).innerText =
      pBirth || '—';

  }

  if (
    document.getElementById(
      'paper_p_age'
    )
  ) {

    document.getElementById(
      'paper_p_age'
    ).innerText =
      pAge || '0';

  }

  if (
    document.getElementById(
      'paper_p_gender'
    )
  ) {

    document.getElementById(
      'paper_p_gender'
    ).innerText =
      currentGender;

  }

  if (
    document.getElementById(
      'paper_p_address'
    )
  ) {

    document.getElementById(
      'paper_p_address'
    ).innerText =
      pAddress || '—';

  }

  if (
    document.getElementById(
      'paper_p_card'
    )
  ) {

    document.getElementById(
      'paper_p_card'
    ).innerText =
      pCard || '—';

  }

  // Diagnosis

  if (
    document.getElementById(
      'paper_p_icd'
    )
  ) {

    document.getElementById(
      'paper_p_icd'
    ).innerText =
      document.getElementById(
        'p_icd'
      )
        ? document.getElementById(
            'p_icd'
          ).value || '—'
        : '—';

  }

  if (
    document.getElementById(
      'paper_p_diag'
    )
  ) {

    document.getElementById(
      'paper_p_diag'
    ).innerText =
      document.getElementById(
        'p_diag'
      )
        ? document.getElementById(
            'p_diag'
          ).value || '—'
        : '—';

  }

  if (
    document.getElementById(
      'paper_p_allergy'
    )
  ) {

    document.getElementById(
      'paper_p_allergy'
    ).innerText =
      document.getElementById(
        'p_allergy'
      )
        ? document.getElementById(
            'p_allergy'
          ).value || 'Yo\'q'
        : 'Yo\'q';

  }

  if (
    document.getElementById(
      'paper_p_note'
    )
  ) {

    document.getElementById(
      'paper_p_note'
    ).innerText =
      document.getElementById(
        'p_note'
      )
        ? document.getElementById(
            'p_note'
          ).value ||
          'Ko\'rsatma bo\'yicha qabul qilinsin.'
        : 'Ko\'rsatma bo\'yicha qabul qilinsin.';

  }

  // Doctor & Clinic

  if (
    document.getElementById(
      'paper_doc_name'
    )
  ) {

    document.getElementById(
      'paper_doc_name'
    ).innerText =
      doctorProfile.name;

  }

  if (
    document.getElementById(
      'paper_doc_spec'
    )
  ) {

    document.getElementById(
      'paper_doc_spec'
    ).innerText =
      doctorProfile.spec;

  }

  if (
    document.getElementById(
      'paper_doc_id'
    )
  ) {

    document.getElementById(
      'paper_doc_id'
    ).innerText =
      doctorProfile.id;

  }

  if (
    document.getElementById(
      'paper_clinic_name'
    )
  ) {

    document.getElementById(
      'paper_clinic_name'
    ).innerText =
      clinicProfile.name;

  }

  if (
    document.getElementById(
      'paper_clinic_address'
    )
  ) {

    document.getElementById(
      'paper_clinic_address'
    ).innerText =
      clinicProfile.address;

  }

  if (
    document.getElementById(
      'paper_clinic_phone'
    )
  ) {

    document.getElementById(
      'paper_clinic_phone'
    ).innerText =
      clinicProfile.phone;

  }

  // Today Date

  const today =
    new Date();

  const formattedDate =
    `${String(
      today.getDate()
    ).padStart(2,'0')}.${String(
      today.getMonth()+1
    ).padStart(2,'0')}.${today.getFullYear()}`;

  if (
    document.getElementById(
      'paper_rx_date'
    )
  ) {

    document.getElementById(
      'paper_rx_date'
    ).innerText =
      formattedDate;

  }

  // Rx ID generator or getter

  let rxIdEl =
    document.getElementById(
      'paper_rx_id'
    );

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
        100000 +
        Math.random() *
        900000
      );

  }

  const currentRxId =
    rxIdEl
      ? rxIdEl.innerText
      : 'RX-000000';

  // Drugs Render in Paper

  const paperDrugsContainer =
    document.getElementById(
      'paper_drugs_list'
    );

  if (paperDrugsContainer) {

    paperDrugsContainer.innerHTML =
      '';

    drugs.forEach(
      (d, idx) => {

        if (
          d.name &&
          d.name.trim() !== ''
        ) {

          const item =
            document.createElement(
              'div'
            );

          item.className =
            'rx-drug-item';

          item.innerHTML = `

            <strong>
              ${idx + 1}. Rp.:
              ${d.shape || ''}
              ${d.name}
              ${d.dose || ''}
            </strong>

            <div class="rx-drug-sub">

              ${
                d.dtd !== '-' &&
                d.dtd !== ''
                  ? d.dtd + '<br>'
                  : ''
              }

              ${
                d.count
                  ? 'Miqdori: ' +
                    d.count +
                    '<br>'
                  : ''
              }

              <b>S.</b>
              ${d.ds || ''}

            </div>

          `;

          paperDrugsContainer.appendChild(
            item
          );

        }

      }
    );

  }

  // Stamp Handling

  const stampImgEl =
    document.getElementById(
      'paper_stamp_img'
    );

  const stampDefaultEl =
    document.getElementById(
      'paper_stamp_default'
    );

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

    }

    else {

      stampImgEl.style.display =
        'none';

      if (stampDefaultEl) {

        stampDefaultEl.style.display =
          'block';

      }

    }

  }

  // Dynamic QR Code Generation

  const qrContainer =
    document.getElementById(
      'paper_qr_code'
    );

  if (qrContainer) {

    qrContainer.innerHTML =
      '';

    const baseUrl =
      window.location.origin +
      window.location.pathname;

    const pdfViewUrl =
      `${baseUrl}?rx_id=${currentRxId}` +
      `&patient=${encodeURIComponent(
        pName || 'bemor'
      )}`;

    if (window.QRCode) {

      new QRCode(
        qrContainer,
        {

          text:
            pdfViewUrl,

          width:
            64,

          height:
            64,

          correctLevel:
            QRCode.CorrectLevel.M

        }
      );

    }

  }

}

/* ================= STAMP IMAGE UPLOAD LOGIC ================= */

function uploadStampImage(event) {

  const file =
    event.target.files[0];

  if (file) {

    const reader =
      new FileReader();

    reader.onload =
      function(e) {

        customStampDataURL =
          e.target.result;

        localStorage.setItem(
          'drmed_stamp',
          customStampDataURL
        );

        liveUpdate();

      };

    reader.readAsDataURL(
      file
    );

  }

}

/* ================= SIGNATURE CANVAS LOGIC ================= */

let canvas,
    ctx,
    isDrawing = false;

function initSignatureCanvas() {

  canvas =
    document.getElementById(
      'signatureCanvas'
    );

  if (!canvas) return;

  ctx =
    canvas.getContext(
      '2d'
    );

  ctx.strokeStyle =
    "#002b80";

  ctx.lineWidth =
    2.5;

  ctx.lineCap =
    "round";

  // Mouse Events

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

  // Touch Events

  canvas.addEventListener(
    'touchstart',
    (e) => {

      const touch =
        e.touches[0];

      const rect =
        canvas.getBoundingClientRect();

      startDrawing({

        clientX:
          touch.clientX,

        clientY:
          touch.clientY,

        rect

      });

    }
  );

  canvas.addEventListener(
    'touchmove',
    (e) => {

      e.preventDefault();

      const touch =
        e.touches[0];

      const rect =
        canvas.getBoundingClientRect();

      draw({

        clientX:
          touch.clientX,

        clientY:
          touch.clientY,

        rect

      });

    }
  );

  canvas.addEventListener(
    'touchend',
    stopDrawing
  );

}

function startDrawing(e) {

  isDrawing =
    true;

  const rect =
    e.rect ||
    canvas.getBoundingClientRect();

  ctx.beginPath();

  ctx.moveTo(
    e.clientX -
      rect.left,

    e.clientY -
      rect.top
  );

}

function draw(e) {

  if (!isDrawing)
    return;

  const rect =
    e.rect ||
    canvas.getBoundingClientRect();

  ctx.lineTo(
    e.clientX -
      rect.left,

    e.clientY -
      rect.top
  );

  ctx.stroke();

}

function stopDrawing() {

  isDrawing =
    false;

}

function clearSignatureCanvas() {

  if (!ctx) return;

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const sigImg =
    document.getElementById(
      'paper_sig_img'
    );

  if (sigImg) {

    sigImg.style.display =
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
    document.getElementById(
      id
    );

  if (modal) {

    modal.classList.add(
      'active'
    );

    if (
      id ===
      'historyModal'
    ) {

      renderHistoryList();

    }

    if (
      id ===
      'icdModal'
    ) {

      searchICD10();

    }

  }

}

function closeModal(id) {

  const modal =
    document.getElementById(
      id
    );

  if (modal) {

    modal.classList.remove(
      'active'
    );

  }

}

/* ================= SETTINGS & LOCAL STORAGE ================= */

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
    JSON.stringify(
      doctorProfile
    )
  );

  localStorage.setItem(
    'drmed_clinic',
    JSON.stringify(
      clinicProfile
    )
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

    doctorProfile =
      JSON.parse(
        savedDoc
      );

  }

  if (savedClinic) {

    clinicProfile =
      JSON.parse(
        savedClinic
      );

  }

  if (savedStamp) {

    customStampDataURL =
      savedStamp;

  }

  if (
    document.getElementById(
      'set_doc_name'
    )
  ) {

    document.getElementById(
      'set_doc_name'
    ).value =
      doctorProfile.name;

  }

  if (
    document.getElementById(
      'set_doc_spec'
    )
  ) {

    document.getElementById(
      'set_doc_spec'
    ).value =
      doctorProfile.spec;

  }

  if (
    document.getElementById(
      'set_doc_id'
    )
  ) {

    document.getElementById(
      'set_doc_id'
    ).value =
      doctorProfile.id;

  }

  if (
    document.getElementById(
      'set_clinic_name'
    )
  ) {

    document.getElementById(
      'set_clinic_name'
    ).value =
      clinicProfile.name;

  }

  if (
    document.getElementById(
      'set_clinic_address'
    )
  ) {

    document.getElementById(
      'set_clinic_address'
    ).value =
      clinicProfile.address;

  }

  if (
    document.getElementById(
      'set_clinic_phone'
    )
  ) {

    document.getElementById(
      'set_clinic_phone'
    ).value =
      clinicProfile.phone;

  }

}

/* ================= HISTORY CRUD & SEARCH ================= */

function savePrescriptionToHistory() {

  const patientName =
    document.getElementById(
      'p_name'
    )
      ? document.getElementById(
          'p_name'
        ).value
      : '';

  if (!patientName) {

    alert(
      "Bemor ismini kiriting!"
    );

    return;

  }

  const rxId =
    document.getElementById(
      'paper_rx_id'
    )
      ? document.getElementById(
          'paper_rx_id'
        ).innerText
      : 'RX-' +
        Date.now()
          .toString()
          .slice(-6);

  const record = {

    id:
      rxId,

    date:
      new Date()
        .toLocaleDateString(
          'uz-UZ'
        ),

    patientName:
      patientName,

    diag:
      document.getElementById(
        'p_diag'
      )
        ? document.getElementById(
            'p_diag'
          ).value
        : '',

    drugs:
      JSON.parse(
        JSON.stringify(
          drugs
        )
      )

  };

  let history =
    JSON.parse(
      localStorage.getItem(
        'drmed_history'
      ) || '[]'
    );

  history.unshift(
    record
  );

  localStorage.setItem(
    'drmed_history',
    JSON.stringify(
      history
    )
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
              .includes(
                searchQuery
              )
          )

          ||

          (
            item.id &&
            item.id
              .toLowerCase()
              .includes(
                searchQuery
              )
          )

      );

  }

  if (
    filteredHistory.length ===
    0
  ) {

    container.innerHTML =
      '<p class="help-text" style="padding:10px; text-align:center;">Hozircha saqlangan retseptlar mavjud emas.</p>';

    return;

  }

  container.innerHTML =
    filteredHistory
      .map(
        (
          item,
          idx
        ) => `

          <div class="history-item">

            <div class="history-info">

              <h4>
                ${item.patientName}
                (${item.id})
              </h4>

              <p>
                ${item.date}
                —
                ${
                  item.diag ||
                  'Tashxis ko\'rsatilmagan'
                }
              </p>

            </div>

            <button
              class="sm-btn btn-add"
              onclick="loadFromHistory(${idx})"
              type="button"
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

  if (item) {

    if (
      document.getElementById(
        'p_name'
      )
    ) {

      document.getElementById(
        'p_name'
      ).value =
        item.patientName ||
        '';

    }

    if (
      document.getElementById(
        'p_diag'
      )
    ) {

      document.getElementById(
        'p_diag'
      ).value =
        item.diag ||
        '';

    }

    if (
      document.getElementById(
        'paper_rx_id'
      )
    ) {

      document.getElementById(
        'paper_rx_id'
      ).innerText =
        item.id;

    }

    drugs =
      item.drugs ||
      [];

    renderDrugCards();

    liveUpdate();

    closeModal(
      'historyModal'
    );

    switchStep(3);

  }

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

  if (!resultsContainer)
    return;

  let filtered =
    [];

  if (!query) {

    filtered =
      icd10Data.slice(
        0,
        30
      );

  }

  else {

    filtered =
      icd10Data
        .filter(
          i =>

            (
              i.code &&
              i.code
                .toLowerCase()
                .includes(
                  query
                )
            )

            ||

            (
              i.title &&
              i.title
                .toLowerCase()
                .includes(
                  query
                )
            )

        )
        .slice(
          0,
          50
        );

  }

  if (
    filtered.length ===
    0
  ) {

    resultsContainer.innerHTML =
      '<p class="help-text" style="padding: 12px; text-align: center;">Tashxis topilmadi.</p>';

    return;

  }

  resultsContainer.innerHTML =
    filtered
      .map(
        i => `

          <div
            class="history-item"
            onclick="selectICD('${i.code}', '${i.title.replace(/'/g, "\\'")}')"
            style="cursor:pointer;"
          >

            <div class="history-info">

              <h4>
                ${i.code}
              </h4>

              <p>
                ${i.title}
              </p>

            </div>

          </div>

        `
      )
      .join('');

}

function selectICD(
  code,
  title
) {

  if (
    document.getElementById(
      'p_icd'
    )
  ) {

    document.getElementById(
      'p_icd'
    ).value =
      code;

  }

  if (
    document.getElementById(
      'p_diag'
    )
  ) {

    document.getElementById(
      'p_diag'
    ).value =
      title;

  }

  liveUpdate();

  closeModal(
    'icdModal'
  );

}

/* ================= EXPORT & PRINT ================= */

function exportToPDF() {

  const element =
    document.getElementById(
      'printablePaper'
    ) ||
    document.querySelector(
      '.rx-paper'
    );

  if (!element) {

    alert(
      "Retsept blankasi topilmadi."
    );

    return;

  }

  const pName =
    document.getElementById(
      'p_name'
    )
      ? document.getElementById(
          'p_name'
        ).value
      : 'bemor';

  const opt = {

    margin:
      [5, 5, 5, 5],

    filename:
      `DRMED_Retsept_${pName}.pdf`,

    image: {

      type:
        'jpeg',

      quality:
        0.98

    },

    html2canvas: {

      scale:
        2,

      useCORS:
        true,

      logging:
        false,

      windowWidth:
        800

    },

    jsPDF: {

      unit:
        'mm',

      format:
        'a4',

      orientation:
        'portrait'

    }

  };

  if (
    window.html2pdf
  ) {

    html2pdf()
      .set(opt)
      .from(element)
      .save();

  }

  else {

    alert(
      "PDF kutubxonasi yuklanmagan. Iltimos qayta urinib ko'ring."
    );

  }

}

function printPrescription() {

  window.print();

}

function shareTelegram() {

  if (tg) {

    tg.sendData(
      JSON.stringify({

        action:
          "share_rx",

        patient:
          document.getElementById(
            'p_name'
          )
            ? document.getElementById(
                'p_name'
              ).value
            : '',

        rx_id:
          document.getElementById(
            'paper_rx_id'
          )
            ? document.getElementById(
                'paper_rx_id'
              ).innerText
            : ''

      })
    );

  }

  else {

    alert(
      "Telegram Mini App rejimi faollashtirilmagan."
    );

  }

}

function clearPatientForm() {

  if (
    document.getElementById(
      'p_name'
    )
  ) {

    document.getElementById(
      'p_name'
    ).value =
      '';

  }

  if (
    document.getElementById(
      'p_age'
    )
  ) {

    document.getElementById(
      'p_age'
    ).value =
      '';

  }

  if (
    document.getElementById(
      'p_address'
    )
  ) {

    document.getElementById(
      'p_address'
    ).value =
      '';

  }

  if (
    document.getElementById(
      'p_phone'
    )
  ) {

    document.getElementById(
      'p_phone'
    ).value =
      '';

  }

  liveUpdate();

}

function resetAppDefaults() {

  if (
    confirm(
      "Dasturni dastlabki holatga qaytarmoqchimisiz? Barcha saqlanmagan ma'lumotlar o'chadi."
    )
  ) {

    localStorage.clear();

    location.reload();

  }

}

function downloadPDF() {

  liveUpdate();

  const element =
    document.getElementById(
      "prescriptionPaper"
    );

  if (!element) {

    alert(
      "Retsept topilmadi!"
    );

    return;

  }

  const rxElement =
    document.getElementById(
      "paper_rx_id"
    );

  const rxId =
    rxElement
      ? rxElement.innerText
      : 'RX-000000';

  const opt = {

    margin:
      8,

    filename:
      `Retsept_${rxId}.pdf`,

    image: {

      type:
        "jpeg",

      quality:
        1

    },

    html2canvas: {

      scale:
        3,

      useCORS:
        true,

      scrollY:
        0

    },

    jsPDF: {

      unit:
        "mm",

      format:
        "a4",

      orientation:
        "portrait"

    }

  };

  if (
    window.html2pdf
  ) {

    html2pdf()
      .set(opt)
      .from(element)
      .save();

  }

  else {

    alert(
      "PDF kutubxonasi yuklanmagan. Iltimos qayta urinib ko'ring."
    );

  }

}

