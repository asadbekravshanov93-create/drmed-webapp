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


// ==========================================================================
// GLOBAL STATE
// ==========================================================================

let currentStep = 1;
let currentGender = 'Erkak';
let signatureDataURL = null;
let customStampDataURL = null;


// ==========================================================================
// DEFAULT DOCTOR & CLINIC SETTINGS
// ==========================================================================

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


// ==========================================================================
// DEFAULT DRUGS ARRAY
// ==========================================================================

let drugs = [];


// ==========================================================================
// DR.MED — RETSEPT RAQAMI
// ==========================================================================

let currentPrescriptionId = null;


/**
 * Yangi retsept raqamini yaratadi.
 *
 * Format:
 * RX-2026-00001
 * RX-2026-00002
 * RX-2026-00003
 */
function generateNewPrescriptionId() {

  const year = new Date().getFullYear();

  let counter = parseInt(
    localStorage.getItem('drmed_rx_counter') || '0',
    10
  );

  counter += 1;

  localStorage.setItem(
    'drmed_rx_counter',
    String(counter)
  );

  return (
    'RX-' +
    year +
    '-' +
    String(counter).padStart(5, '0')
  );
}


/**
 * Yangi retseptni boshlaydi.
 *
 * Bu funksiya:
 * 1. Yangi RX raqam yaratadi
 * 2. Blankadagi RX raqamini yangilaydi
 * 3. Eski QR kodni tozalaydi
 * 4. PDF moduliga yangi retsept raqamini bildiradi
 */
function startNewPrescription() {

  currentPrescriptionId =
    generateNewPrescriptionId();


  const rxIdEl =
    document.getElementById(
      'paper_rx_id'
    );


  if (rxIdEl) {

    rxIdEl.innerText =
      currentPrescriptionId;
  }


  /*
   * QR moduliga yangi retsept boshlanganini bildiradi.
   * Eski QR shu yerda tozalanadi va yangi RX uchun
   * yangi QR token yaratiladi.
   */
  if (
    window.DRMED_QR &&
    typeof window.DRMED_QR.reset ===
      'function'
  ) {

    try {

      window.DRMED_QR.reset(
        currentPrescriptionId
      );

    } catch (error) {

      console.warn(
        'DRMED_QR.reset xatosi:',
        error
      );

    }

  }


  /*
   * PDF moduliga yangi retsept boshlanganini bildiradi.
   *
   * Agar pdf.js mavjud bo'lsa ishlaydi.
   */
  if (
    window.DRMED_PDF &&
    typeof window.DRMED_PDF.resetRecipe ===
      'function'
  ) {

    try {

      window.DRMED_PDF.resetRecipe(
        currentPrescriptionId
      );

    } catch (error) {

      console.warn(
        'DRMED_PDF.resetRecipe xatosi:',
        error
      );

    }

  }


  console.log(
    '🆕 Yangi retsept:',
    currentPrescriptionId
  );
}


/**
 * Joriy retsept raqamini qaytaradi.
 *
 * Agar hali mavjud bo'lmasa,
 * avtomatik yangi raqam yaratadi.
 */
function getCurrentPrescriptionId() {

  if (!currentPrescriptionId) {

    startNewPrescription();

  }

  return currentPrescriptionId;
}


// ==========================================================================
// DYNAMIC ICD-10 DATABASE
// ==========================================================================

let icd10Data = [];


function loadICD10Database() {

  fetch('icd10_uz.json')

    .then(
      response =>
        response.json()
    )

    .then(
      data => {

        icd10Data =
          data;

        console.log(
          `✅ ICD-10 O'zbekcha bazasi yuklandi: ${icd10Data.length} ta tashxis.`
        );

      }
    )

    .catch(
      err => {

        console.error(
          "❌ ICD-10 bazasini yuklashda xatolik:",
          err
        );

      }
    );

}


// ==========================================================================
// INITIALIZATION ON LOAD
// ==========================================================================

window.addEventListener(
  'DOMContentLoaded',
  () => {

    loadSettingsFromStorage();

    loadICD10Database();

    renderDrugCards();

    initSignatureCanvas();

    checkURLParamsAndRender();


    /*
     * Agar yangi retsept bo'lmasa,
     * avtomatik yaratamiz.
     */
    if (!currentPrescriptionId) {

      startNewPrescription();

    }


    liveUpdate();

  }
);


// ==========================================================================
// URL PARAMETERS CHECK FOR QR VIEW
// ==========================================================================

function checkURLParamsAndRender() {

  const urlParams =
    new URLSearchParams(
      window.location.search
    );


  const viewRxId =
    urlParams.get(
      'rx_id'
    );


  if (!viewRxId) {

    return;

  }


  const history =
    JSON.parse(
      localStorage.getItem(
        'drmed_history'
      ) || '[]'
    );


  const targetRx =
    history.find(
      item =>
        item.id ===
        viewRxId
    );


  if (!targetRx) {

    console.warn(
      'QR orqali so‘ralgan retsept topilmadi:',
      viewRxId
    );

    return;

  }


  /*
   * QR orqali eski retsept ochilganda
   * yangi RX raqam yaratmaymiz.
   *
   * Aynan QR ichidagi RX raqamni
   * saqlab qolamiz.
   */
  currentPrescriptionId =
    targetRx.id;


  const rxIdEl =
    document.getElementById(
      'paper_rx_id'
    );


  if (rxIdEl) {

    rxIdEl.innerText =
      currentPrescriptionId;

  }


  const pNameEl =
    document.getElementById(
      'p_name'
    );


  if (pNameEl) {

    pNameEl.value =
      targetRx.patientName ||
      '';

  }


  const pDiagEl =
    document.getElementById(
      'p_diag'
    );


  if (pDiagEl) {

    pDiagEl.value =
      targetRx.diag ||
      '';

  }


  if (targetRx.drugs) {

    drugs =
      targetRx.drugs;

  }


  renderDrugCards();

  liveUpdate();


  /*
   * QR orqali kelgan retseptni
   * 3-qadamda ko'rsatamiz.
   *
   * switchStep() ichidagi
   * "3 -> 1" yangi retsept logikasi
   * bu yerda ishga tushmaydi.
   */
  switchStep(3);

}


// ==========================================================================
// WIZARD NAVIGATION
// ==========================================================================

function switchStep(stepNum) {

  /*
   * Faqat foydalanuvchi 3-qadamdan
   * 1-qadamga qaytganda yangi retsept
   * yaratiladi.
   *
   * 1 -> 2
   * 2 -> 3
   * 2 -> 1
   *
   * mavjud retsept raqamini saqlaydi.
   *
   * 3 -> 1
   * yangi retsept yaratadi.
   */
  if (
    stepNum === 1 &&
    currentStep === 3
  ) {

    startNewPrescription();

  }


  currentStep =
    stepNum;


  document
    .querySelectorAll(
      '.step-content'
    )
    .forEach(
      el => {

        el.classList.remove(
          'active'
        );

      }
    );


  document
    .querySelectorAll(
      '.wizard-tab'
    )
    .forEach(
      el => {

        el.classList.remove(
          'active'
        );

      }
    );


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


  /*
   * 3-qadamga o'tilganda
   * blankani yangilaymiz.
   */
  if (
    stepNum === 3
  ) {

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


// ==========================================================================
// GENDER
// ==========================================================================

function selectGender(
  gender
) {

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


// ==========================================================================
// AGE CALCULATION
// ==========================================================================

function calculateAge() {

  const birthEl =
    document.getElementById(
      'p_birth'
    );


  if (!birthEl) {

    return;

  }


  const birthVal =
    birthEl.value;


  if (!birthVal) {

    return;

  }


  const birthDate =
    new Date(
      birthVal
    );


  const diff =
    Date.now() -
    birthDate.getTime();


  const ageDate =
    new Date(
      diff
    );


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


// ==========================================================================
// DRUG BUILDER LOGIC
// ==========================================================================

function renderDrugCards() {

  const container =
    document.getElementById(
      'drugsListContainer'
    );


  if (!container) {

    return;

  }


  container.innerHTML =
    '';


  drugs.forEach(
    (
      d,
      idx
    ) => {

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


// ==========================================================================
// ADD DRUG
// ==========================================================================

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


// ==========================================================================
// REMOVE DRUG
// ==========================================================================

function removeDrug(
  index
) {

  drugs.splice(
    index,
    1
  );


  renderDrugCards();

  liveUpdate();

}


// ==========================================================================
// CLEAR DRUGS
// ==========================================================================

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


// ==========================================================================
// PRESET PRE-DEFINED CLINICAL CASES
// ==========================================================================

function applyPreset(
  type
) {

  if (
    type ===
    'bronchitis'
  ) {

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

  else if (
    type ===
    'gripp'
  ) {

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

  else if (
    type ===
    'gastritis'
  ) {

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


// ==========================================================================
// LIVE BLANK UPDATER
// ==========================================================================

function liveUpdate() {

  // ------------------------------------------------------------------------
  // Patient Details
  // ------------------------------------------------------------------------

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


  // ------------------------------------------------------------------------
  // Diagnosis
  // ------------------------------------------------------------------------

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
          ).value ||
          'Yo\'q'
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


  // ------------------------------------------------------------------------
  // Doctor & Clinic
  // ------------------------------------------------------------------------

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


  // ------------------------------------------------------------------------
  // Today Date
  // ------------------------------------------------------------------------

  const today =
    new Date();


  const formattedDate =
    `${String(
      today.getDate()
    ).padStart(2, '0')}.${String(
      today.getMonth() + 1
    ).padStart(2, '0')}.${today.getFullYear()}`;


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


  // ------------------------------------------------------------------------
  // Drugs Render in Paper
  // ------------------------------------------------------------------------

  const paperDrugsContainer =
    document.getElementById(
      'paper_drugs_list'
    );


  if (paperDrugsContainer) {

    paperDrugsContainer.innerHTML =
      '';


    drugs.forEach(
      (
        d,
        idx
      ) => {

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


  // ------------------------------------------------------------------------
  // Stamp Handling
  // ------------------------------------------------------------------------

  const stampImgEl =
    document.getElementById(
      'paper_stamp_img'
    );


  const stampDefaultEl =
    document.getElementById(
      'paper_stamp_default'
    );


  if (stampImgEl) {

    if (
      customStampDataURL
    ) {

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


  // ------------------------------------------------------------------------
  // RETSEPT RAQAMI
  // ------------------------------------------------------------------------

  const rxIdElement =
    document.getElementById(
      'paper_rx_id'
    );


  if (rxIdElement) {

    rxIdElement.innerText =
      getCurrentPrescriptionId();

  }


  // ------------------------------------------------------------------------
  // QR CODE
  // QR endi alohida qr.js modulida boshqariladi.
  // ------------------------------------------------------------------------

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
/* ==========================================================================
   SIGNATURE CANVAS
   ========================================================================== */

function initSignatureCanvas() {

  const canvas =
    document.getElementById(
      'signatureCanvas'
    );

  if (!canvas) {
    return;
  }


  const ctx =
    canvas.getContext('2d');

  let drawing = false;


  function getPosition(event) {

    const rect =
      canvas.getBoundingClientRect();


    if (
      event.touches &&
      event.touches.length
    ) {

      return {

        x:
          event.touches[0].clientX -
          rect.left,

        y:
          event.touches[0].clientY -
          rect.top

      };

    }


    return {

      x:
        event.clientX -
        rect.left,

      y:
        event.clientY -
        rect.top

    };

  }


  function startDrawing(event) {

    event.preventDefault();

    drawing = true;


    const pos =
      getPosition(event);


    ctx.beginPath();

    ctx.moveTo(
      pos.x,
      pos.y
    );

  }


  function draw(event) {

    if (!drawing) {
      return;
    }


    event.preventDefault();


    const pos =
      getPosition(event);


    ctx.lineWidth =
      2;


    ctx.lineCap =
      'round';


    ctx.strokeStyle =
      '#111827';


    ctx.lineTo(
      pos.x,
      pos.y
    );


    ctx.stroke();

  }


  function stopDrawing(event) {

    if (!drawing) {
      return;
    }


    event.preventDefault();

    drawing = false;


    signatureDataURL =
      canvas.toDataURL(
        'image/png'
      );


    const paperSignature =
      document.getElementById(
        'paper_signature_img'
      );


    if (paperSignature) {

      paperSignature.src =
        signatureDataURL;

      paperSignature.style.display =
        'block';

    }

  }


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
    startDrawing,
    {
      passive: false
    }
  );


  canvas.addEventListener(
    'touchmove',
    draw,
    {
      passive: false
    }
  );


  canvas.addEventListener(
    'touchend',
    stopDrawing,
    {
      passive: false
    }
  );

}


/* ==========================================================================
   CLEAR SIGNATURE
   ========================================================================== */

function clearSignature() {

  const canvas =
    document.getElementById(
      'signatureCanvas'
    );


  if (canvas) {

    const ctx =
      canvas.getContext('2d');


    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

  }


  signatureDataURL =
    null;


  const paperSignature =
    document.getElementById(
      'paper_signature_img'
    );


  if (paperSignature) {

    paperSignature.src =
      '';

    paperSignature.style.display =
      'none';

  }

}


/* ==========================================================================
   SETTINGS
   ========================================================================== */

function loadSettingsFromStorage() {

  try {

    const savedDoctor =
      localStorage.getItem(
        'drmed_doctor_profile'
      );


    const savedClinic =
      localStorage.getItem(
        'drmed_clinic_profile'
      );


    const savedStamp =
      localStorage.getItem(
        'drmed_stamp'
      );


    if (savedDoctor) {

      const parsedDoctor =
        JSON.parse(
          savedDoctor
        );


      if (parsedDoctor) {

        doctorProfile =
          {
            ...doctorProfile,
            ...parsedDoctor
          };

      }

    }


    if (savedClinic) {

      const parsedClinic =
        JSON.parse(
          savedClinic
        );


      if (parsedClinic) {

        clinicProfile =
          {
            ...clinicProfile,
            ...parsedClinic
          };

      }

    }


    if (savedStamp) {

      customStampDataURL =
        savedStamp;

    }


  }

  catch (error) {

    console.error(
      'Sozlamalarni yuklash xatosi:',
      error
    );

  }

}


/* ==========================================================================
   SAVE SETTINGS
   ========================================================================== */

function saveDoctorSettings() {

  const nameEl =
    document.getElementById(
      'doctor_name'
    );


  const specEl =
    document.getElementById(
      'doctor_spec'
    );


  const idEl =
    document.getElementById(
      'doctor_id'
    );


  if (nameEl) {

    doctorProfile.name =
      nameEl.value.trim();

  }


  if (specEl) {

    doctorProfile.spec =
      specEl.value.trim();

  }


  if (idEl) {

    doctorProfile.id =
      idEl.value.trim();

  }


  localStorage.setItem(
    'drmed_doctor_profile',
    JSON.stringify(
      doctorProfile
    )
  );


  liveUpdate();

}


function saveClinicSettings() {

  const nameEl =
    document.getElementById(
      'clinic_name'
    );


  const addressEl =
    document.getElementById(
      'clinic_address'
    );


  const phoneEl =
    document.getElementById(
      'clinic_phone'
    );


  if (nameEl) {

    clinicProfile.name =
      nameEl.value.trim();

  }


  if (addressEl) {

    clinicProfile.address =
      addressEl.value.trim();

  }


  if (phoneEl) {

    clinicProfile.phone =
      phoneEl.value.trim();

  }


  localStorage.setItem(
    'drmed_clinic_profile',
    JSON.stringify(
      clinicProfile
    )
  );


  liveUpdate();

}


/* ==========================================================================
   HISTORY
   ========================================================================== */

function getPrescriptionHistory() {

  try {

    return JSON.parse(
      localStorage.getItem(
        'drmed_history'
      ) || '[]'
    );

  }

  catch (error) {

    console.error(
      'Retsept tarixini o‘qishda xato:',
      error
    );

    return [];

  }

}


/* ==========================================================================
   SAVE PRESCRIPTION
   ========================================================================== */

function savePrescriptionToHistory() {

  liveUpdate();


  const pName =
    document.getElementById(
      'p_name'
    )?.value?.trim() ||
    'Nomaʼlum bemor';


  const pBirth =
    document.getElementById(
      'p_birth'
    )?.value ||
    '';


  const pAge =
    document.getElementById(
      'p_age'
    )?.value ||
    '';


  const pAddress =
    document.getElementById(
      'p_address'
    )?.value ||
    '';


  const pCard =
    document.getElementById(
      'p_card'
    )?.value ||
    '';


  const pICD =
    document.getElementById(
      'p_icd'
    )?.value ||
    '';


  const pDiag =
    document.getElementById(
      'p_diag'
    )?.value ||
    '';


  const pAllergy =
    document.getElementById(
      'p_allergy'
    )?.value ||
    '';


  const pNote =
    document.getElementById(
      'p_note'
    )?.value ||
    '';


  const prescription = {

    id:
      getCurrentPrescriptionId(),

    patientName:
      pName,

    birth:
      pBirth,

    age:
      pAge,

    gender:
      currentGender,

    address:
      pAddress,

    card:
      pCard,

    icd:
      pICD,

    diag:
      pDiag,

    allergy:
      pAllergy,

    note:
      pNote,

    drugs:
      JSON.parse(
        JSON.stringify(
          drugs
        )
      ),

    doctor:
      JSON.parse(
        JSON.stringify(
          doctorProfile
        )
      ),

    clinic:
      JSON.parse(
        JSON.stringify(
          clinicProfile
        )
      ),

    signature:
      signatureDataURL,

    stamp:
      customStampDataURL,

    createdAt:
      new Date().toISOString()

  };


  const history =
    getPrescriptionHistory();


  /*
   * Agar aynan shu RX oldin mavjud bo‘lsa,
   * uni yangilaymiz.
   */
  const existingIndex =
    history.findIndex(
      item =>
        item.id ===
        prescription.id
    );


  if (
    existingIndex >= 0
  ) {

    history[
      existingIndex
    ] =
      prescription;

  }

  else {

    history.unshift(
      prescription
    );

  }


  localStorage.setItem(
    'drmed_history',
    JSON.stringify(
      history
    )
  );


  renderHistoryList();


  console.log(
    '✅ Retsept tarixga saqlandi:',
    prescription.id
  );


  return prescription;

}


/* ==========================================================================
   HISTORY LIST
   ========================================================================== */

function renderHistoryList() {

  const container =
    document.getElementById(
      'historyList'
    );


  if (!container) {
    return;
  }


  const history =
    getPrescriptionHistory();


  container.innerHTML =
    '';


  if (
    history.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          📋
        </div>

        <div>
          Hozircha saqlangan retseptlar yo‘q.
        </div>

      </div>

    `;

    return;

  }


  history.forEach(
    prescription => {

      const item =
        document.createElement(
          'div'
        );


      item.className =
        'history-item';


      const created =
        prescription.createdAt
          ? new Date(
              prescription.createdAt
            ).toLocaleString(
              'uz-UZ'
            )
          : '';


      item.innerHTML = `

        <div class="history-main">

          <div class="history-title">

            ${escapeHTML(
              prescription.patientName ||
              'Nomaʼlum bemor'
            )}

          </div>


          <div class="history-meta">

            <span>
              ${escapeHTML(
                prescription.id ||
                ''
              )}
            </span>

            <span>
              ${escapeHTML(
                created
              )}
            </span>

          </div>

        </div>


        <div class="history-actions">

          <button
            type="button"
            class="sm-btn"
            onclick="loadFromHistory('${escapeJS(
              prescription.id
            )}')"
          >
            Ochish
          </button>


          <button
            type="button"
            class="sm-btn"
            style="color:var(--danger);"
            onclick="deleteFromHistory('${escapeJS(
              prescription.id
                          )}')"
          >
            O‘chirish
          </button>

        </div>

      `;


      container.appendChild(
        item
      );

    }
  );

}


/* ==========================================================================
   LOAD FROM HISTORY
   ========================================================================== */

function loadFromHistory(
  prescriptionId
) {

  const history =
    getPrescriptionHistory();


  const prescription =
    history.find(
      item =>
        item.id ===
        prescriptionId
    );


  if (!prescription) {

    alert(
      'Retsept topilmadi.'
    );

    return;

  }


  currentPrescriptionId =
    prescription.id;


  const rxIdEl =
    document.getElementById(
      'paper_rx_id'
    );


  if (rxIdEl) {

    rxIdEl.innerText =
      currentPrescriptionId;

  }


  const pNameEl =
    document.getElementById(
      'p_name'
    );


  if (pNameEl) {

    pNameEl.value =
      prescription.patientName ||
      '';

  }


  const pBirthEl =
    document.getElementById(
      'p_birth'
    );


  if (pBirthEl) {

    pBirthEl.value =
      prescription.birth ||
      '';

  }


  const pAgeEl =
    document.getElementById(
      'p_age'
    );


  if (pAgeEl) {

    pAgeEl.value =
      prescription.age ||
      '';

  }


  currentGender =
    prescription.gender ||
    'Erkak';


  const pAddressEl =
    document.getElementById(
      'p_address'
    );


  if (pAddressEl) {

    pAddressEl.value =
      prescription.address ||
      '';

  }


  const pCardEl =
    document.getElementById(
      'p_card'
    );


  if (pCardEl) {

    pCardEl.value =
      prescription.card ||
      '';

  }


  const pICDEl =
    document.getElementById(
      'p_icd'
    );


  if (pICDEl) {

    pICDEl.value =
      prescription.icd ||
      '';

  }


  const pDiagEl =
    document.getElementById(
      'p_diag'
    );


  if (pDiagEl) {

    pDiagEl.value =
      prescription.diag ||
      '';

  }


  const pAllergyEl =
    document.getElementById(
      'p_allergy'
    );


  if (pAllergyEl) {

    pAllergyEl.value =
      prescription.allergy ||
      '';

  }


  const pNoteEl =
    document.getElementById(
      'p_note'
    );


  if (pNoteEl) {

    pNoteEl.value =
      prescription.note ||
      '';

  }


  drugs =
    JSON.parse(
      JSON.stringify(
        prescription.drugs ||
        []
      )
    );


  signatureDataURL =
    prescription.signature ||
    null;


  customStampDataURL =
    prescription.stamp ||
    null;


  if (
    prescription.doctor
  ) {

    doctorProfile =
      {
        ...doctorProfile,
        ...prescription.doctor
      };

  }


  if (
    prescription.clinic
  ) {

    clinicProfile =
      {
        ...clinicProfile,
        ...prescription.clinic
      };

  }


  renderDrugCards();

  liveUpdate();


  /*
   * QR moduliga eski RX qayta ochilganini
   * bildiradi.
   *
   * Bu yerda yangi RX yaratmaymiz.
   */
  if (
    window.DRMED_QR &&
    typeof window.DRMED_QR.reset ===
      'function'
  ) {

    try {

      window.DRMED_QR.reset(
        currentPrescriptionId
      );

      /*
       * Eski retsept ochilgach,
       * shu RX uchun QRni qayta yaratamiz.
       */
      setTimeout(
        () => {

          if (
            window.DRMED_QR &&
            typeof window.DRMED_QR.refresh ===
              'function'
          ) {

            window.DRMED_QR.refresh();

          }

        },
        150
      );

    }

    catch (error) {

      console.warn(
        'History QR reset xatosi:',
        error
      );

    }

  }


  switchStep(3);

}


/* ==========================================================================
   DELETE HISTORY ITEM
   ========================================================================== */

function deleteFromHistory(
  prescriptionId
) {

  if (
    !confirm(
      'Ushbu retseptni tarixdan o‘chirishni xohlaysizmi?'
    )
  ) {

    return;

  }


  const history =
    getPrescriptionHistory();


  const filtered =
    history.filter(
      item =>
        item.id !==
        prescriptionId
    );


  localStorage.setItem(
    'drmed_history',
    JSON.stringify(
      filtered
    )
  );


  renderHistoryList();

}


/* ==========================================================================
   CLEAR ALL HISTORY
   ========================================================================== */

function clearPrescriptionHistory() {

  if (
    !confirm(
      'Barcha saqlangan retseptlarni o‘chirishni xohlaysizmi?'
    )
  ) {

    return;

  }


  localStorage.removeItem(
    'drmed_history'
  );


  renderHistoryList();

}


/* ==========================================================================
   HTML SAFETY HELPERS
   ========================================================================== */

function escapeHTML(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return '';

  }


  return String(
    value
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );

}


function escapeJS(
  value
) {

  return String(
    value || ''
  )
    .replace(
      /\\/g,
      '\\\\'
    )
    .replace(
      /'/g,
      "\\'"
    )
    .replace(
      /\r/g,
      '\\r'
    )
    .replace(
      /\n/g,
      '\\n'
    );

}
/* ==========================================================================
   ICD-10 SEARCH
   ========================================================================== */

function searchICD10() {

  const input =
    document.getElementById(
      'icdSearchInput'
    );


  const results =
    document.getElementById(
      'icdResults'
    );


  if (!input || !results) {

    return;

  }


  const query =
    input.value
      .trim()
      .toLowerCase();


  results.innerHTML =
    '';


  if (!query) {

    return;

  }


  if (
    !Array.isArray(
      icd10Data
    )
  ) {

    return;

  }


  const filtered =
    icd10Data
      .filter(
        item => {

          const code =
            String(
              item.code ||
              item.Code ||
              ''
            )
              .toLowerCase();


          const name =
            String(
              item.name ||
              item.title ||
              item.description ||
              item.Name ||
              ''
            )
              .toLowerCase();


          return (
            code.includes(query) ||
            name.includes(query)
          );

        }
      )
      .slice(
        0,
        50
      );


  if (
    filtered.length === 0
  ) {

    results.innerHTML = `

      <div class="empty-state">

        ICD-10 bo'yicha natija topilmadi.

      </div>

    `;

    return;

  }


  filtered.forEach(
    item => {

      const code =
        item.code ||
        item.Code ||
        '';


      const name =
        item.name ||
        item.title ||
        item.description ||
        item.Name ||
        '';


      const row =
        document.createElement(
          'button'
        );


      row.type =
        'button';


      row.className =
        'icd-result-item';


      row.innerHTML = `

        <strong>
          ${escapeHTML(code)}
        </strong>

        <span>
          ${escapeHTML(name)}
        </span>

      `;


      row.addEventListener(
        'click',
        () => {

          selectICD(
            code,
            name
          );

        }
      );


      results.appendChild(
        row
      );

    }
  );

}


/* ==========================================================================
   SELECT ICD-10
   ========================================================================== */

function selectICD(
  code,
  name
) {

  const codeEl =
    document.getElementById(
      'p_icd'
    );


  const diagEl =
    document.getElementById(
      'p_diag'
    );


  if (codeEl) {

    codeEl.value =
      code || '';

  }


  if (diagEl) {

    diagEl.value =
      name || '';

  }


  closeModal(
    'icdModal'
  );


  liveUpdate();

}


/* ==========================================================================
   ICD MODAL
   ========================================================================== */

function openICDModal() {

  const modal =
    document.getElementById(
      'icdModal'
    );


  if (!modal) {

    return;

  }


  modal.classList.add(
    'active'
  );


  const input =
    document.getElementById(
      'icdSearchInput'
    );


  if (input) {

    input.value =
      '';


    setTimeout(
      () => {

        input.focus();

      },
      100
    );

  }


  const results =
    document.getElementById(
      'icdResults'
    );


  if (results) {

    results.innerHTML =
      '';

  }

}


function closeModal(
  modalId
) {

  const modal =
    document.getElementById(
      modalId
    );


  if (!modal) {

    return;

  }


  modal.classList.remove(
    'active'
  );

}


/* ==========================================================================
   MODAL OUTSIDE CLICK
   ========================================================================== */

document.addEventListener(
  'click',
  event => {

    if (
      event.target.classList &&
      event.target.classList.contains(
        'modal-overlay'
      )
    ) {

      event.target.classList.remove(
        'active'
      );

    }

  }
);


/* ==========================================================================
   EXPORT & PRINT
   ========================================================================== */

/*
 * PDF yaratish uchun asosiy engine:
 *
 *     pdf.js
 *
 * app.js pdf.jsni o'zgartirmaydi.
 *
 * pdf.js mavjud bo'lsa:
 *     DRMED_PDF.openFormatModal()
 *
 * fallback:
 *     html2pdf
 */

async function exportToPDF(
  format = 'a4'
) {
  /*
   * PDF.js mavjud bo'lsa,
   * uning format oynasini ishlatamiz.
   */

  if (
    window.DRMED_PDF &&
    typeof window.DRMED_PDF.openFormatModal ===
      'function'
  ) {

    try {

      return await
        window.DRMED_PDF.openFormatModal();

    }

    catch (error) {

      console.error(
        'DRMED PDF export xatosi:',
        error
      );

    }

  }


  /*
   * PDF.js modal mavjud bo'lmasa,
   * A4/A5ni to'g'ridan-to'g'ri chaqiramiz.
   */

  if (
    window.DRMED_PDF
  ) {

    try {

      if (
        format === 'a5' &&
        typeof window.DRMED_PDF.downloadA5 ===
          'function'
      ) {

        return await
          window.DRMED_PDF.downloadA5();

      }


      if (
        typeof window.DRMED_PDF.downloadA4 ===
          'function'
      ) {

        return await
          window.DRMED_PDF.downloadA4();

      }

    }

    catch (error) {

      console.error(
        'PDF A4/A5 xatosi:',
        error
      );

    }

  }


  /*
   * Eski html2pdf fallback.
   */

  const element =
    document.getElementById(
      'printablePaper'
    ) ||
    document.getElementById(
      'prescriptionPaper'
    ) ||
    document.querySelector(
      '.rx-paper'
    );


  if (!element) {

    alert(
      'Retsept blankasi topilmadi.'
    );

    return;

  }


  const rxId =
    getCurrentPrescriptionId();


  const opt = {

    margin:
      8,

    filename:
      `Retsept_${rxId}.pdf`,

    image: {

      type:
        'jpeg',

      quality:
        0.98

    },

    html2canvas: {

      scale:
        3,

      useCORS:
        true,

      logging:
        false,

      scrollY:
        0

    },

    jsPDF: {

      unit:
        'mm',

      format:
        format === 'a5'
          ? 'a5'
          : 'a4',

      orientation:
        'portrait'

    }

  };


  if (
    window.html2pdf
  ) {

    return html2pdf()
      .set(opt)
      .from(element)
      .save();

  }


  alert(
    "PDF kutubxonasi yuklanmagan. Iltimos qayta urinib ko'ring."
  );

}


/* ==========================================================================
   PRINT
   ========================================================================== */

function printPrescription() {

  liveUpdate();

  window.print();

}


/* ==========================================================================
   TELEGRAM / UNIVERSAL SHARE
   ========================================================================== */

/*
 * PDF.jsdagi share funksiyasi ishlatiladi.
 *
 * Bu:
 *
 * iPhone
 * iPad
 * Android
 * Android tablet
 * Desktop
 *
 * qurilmalar uchun PDF.jsdagi mavjud
 * Share mexanizmini ishlatadi.
 */

async function shareTelegram() {

  liveUpdate();


  /*
   * Birinchi navbatda PDF.js.
   */

  if (
    window.DRMED_PDF &&
    typeof window.DRMED_PDF.share ===
      'function'
  ) {

    try {

      return await
        window.DRMED_PDF.share();

    }

    catch (error) {

      console.error(
        'PDF Telegram Share xatosi:',
        error
      );


      /*
       * User Share oynasini yopgan bo'lsa,
       * xabar bermaymiz.
       */

      if (
        error?.name ===
        'AbortError'
      ) {

        return;

      }

    }

  }


  /*
   * Telegram WebApp fallback.
   */

  if (
    tg &&
    typeof tg.sendData ===
      'function'
  ) {

    try {

      tg.sendData(

        JSON.stringify({

          action:
            'share_rx',

          rx_id:
            getCurrentPrescriptionId(),

          patient:
            document.getElementById(
              'p_name'
            )?.value ||
            ''

        })

      );


      return;

    }

    catch (error) {

      console.error(
        'Telegram sendData xatosi:',
        error
      );

    }

  }


  /*
   * Oddiy browser Share fallback.
   */

  if (
    typeof navigator.share ===
      'function'
  ) {

    try {

      await navigator.share({

        title:
          'DR.MED Elektron Retsept',

        text:
          'DR.MED elektron retsept'

      });


      return;

    }

    catch (error) {

      if (
        error?.name ===
        'AbortError'
      ) {

        return;

      }

    }

  }


  alert(
    'Bu qurilmada Share funksiyasi mavjud emas.'
  );

}


/* ==========================================================================
   UNIVERSAL PDF DOWNLOAD
   ========================================================================== */

/*
 * HTMLdagi PDF Yuklash tugmasi shu funksiyani chaqiradi.
 *
 * Muhim:
 *
 * Eski koddagi:
 *
 *     window.DRMED_PDF.download()
 *
 * OLIB TASHLANDI.
 *
 * Chunki pdf.jsda "download" API mavjud emas.
 *
 * Mavjud API:
 *
 *     openFormatModal
 *     downloadA4
 *     downloadA5
 */

async function downloadPDF() {

  liveUpdate();


  /*
   * Eng yaxshi variant:
   *
   * PDF.js format oynasi.
   */

  if (
    window.DRMED_PDF &&
    typeof window.DRMED_PDF.openFormatModal ===
      'function'
  ) {

    try {

      return await
        window.DRMED_PDF.openFormatModal();

    }

    catch (error) {

      console.error(
        'Universal PDF download xatosi:',
        error
      );


      if (
        error?.name ===
        'AbortError'
      ) {

        return;

      }

    }

  }


  /*
   * Format oynasi ishlamasa:
   *
   * A4.
   */

  if (
    window.DRMED_PDF &&
    typeof window.DRMED_PDF.downloadA4 ===
      'function'
  ) {

    try {

      return await
        window.DRMED_PDF.downloadA4();

    }

    catch (error) {

      console.error(
        'A4 PDF xatosi:',
        error
      );

    }

  }


  /*
   * Fallback — html2pdf.
   */

  const element =
    document.getElementById(
      'prescriptionPaper'
    ) ||
    document.getElementById(
      'printablePaper'
    ) ||
    document.querySelector(
      '.rx-paper'
    );


  if (!element) {

    alert(
      'Retsept topilmadi!'
    );

    return;

  }


  const rxId =
    getCurrentPrescriptionId();


  const opt = {

    margin:
      8,

    filename:
      `Retsept_${rxId}.pdf`,

    image: {

      type:
        'jpeg',

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

    return html2pdf()
      .set(opt)
      .from(element)
      .save();

  }


  alert(
    "PDF kutubxonasi yuklanmagan. Iltimos qayta urinib ko'ring."
  );

}


/* ==========================================================================
   UI BUTTON BINDINGS
   ========================================================================== */

window.addEventListener(
  'DOMContentLoaded',
  () => {

    /*
     * PDF tugmasi
     */

    const pdfButton =
      document.getElementById(
        'pdfDownloadButton'
      ) ||
      document.querySelector(
        '.btn-pdf'
      );


    if (pdfButton) {

      /*
       * HTML ichidagi eski onclick
       * bo'lsa ham downloadPDF ishlaydi.
       */

      pdfButton.addEventListener(
        'click',
        async event => {

          /*
           * Agar tugma <button> bo'lsa
           * default actionni to'xtatamiz.
           */

          event.preventDefault();

          event.stopPropagation();


          await downloadPDF();

        },
        false
      );

    }


    /*
     * Telegram Share tugmasi
     */

    const shareButton =
      document.getElementById(
        'telegramShareButton'
      ) ||
      document.querySelector(
        '.btn-share'
      );


    if (shareButton) {

      shareButton.addEventListener(
        'click',
        async event => {

          event.preventDefault();

          event.stopPropagation();


          await shareTelegram();

        },
        false
      );

    }


    /*
     * Tarixni render qilish.
     */

    renderHistoryList();

  }
);


/* ==========================================================================
   WINDOW GLOBAL API
   ========================================================================== */

/*
 * HTML onclick="" ishlatadigan funksiyalar
 * global bo'lishi kerak.
 */

window.switchStep =
  switchStep;


window.selectGender =
  selectGender;


window.calculateAge =
  calculateAge;


window.addNewDrugCard =
  addNewDrugCard;


window.removeDrug =
  removeDrug;


window.clearAllDrugs =
  clearAllDrugs;


window.applyPreset =
  applyPreset;


window.uploadStampImage =
  uploadStampImage;


window.clearSignature =
  clearSignature;


window.saveDoctorSettings =
  saveDoctorSettings;


window.saveClinicSettings =
  saveClinicSettings;


window.savePrescriptionToHistory =
  savePrescriptionToHistory;


window.renderHistoryList =
  renderHistoryList;


window.loadFromHistory =
  loadFromHistory;


window.deleteFromHistory =
  deleteFromHistory;


window.clearPrescriptionHistory =
  clearPrescriptionHistory;


window.searchICD10 =
  searchICD10;


window.selectICD =
  selectICD;


window.openICDModal =
  openICDModal;


window.closeModal =
  closeModal;


window.exportToPDF =
  exportToPDF;


window.printPrescription =
  printPrescription;


window.shareTelegram =
  shareTelegram;


window.downloadPDF =
  downloadPDF;

/* ==========================================================================
   MISSING INDEX.HTML FUNCTIONS
   ========================================================================== */


/* ==========================================================================
   OPEN MODAL
   ========================================================================== */

function openModal(
  modalId
) {

  const modal =
    document.getElementById(
      modalId
    );


  if (!modal) {

    console.warn(
      'Modal topilmadi:',
      modalId
    );

    return;

  }


  modal.classList.add(
    'active'
  );


  /*
   * History ochilganda ro'yxatni yangilaymiz.
   */

  if (
    modalId ===
    'historyModal'
  ) {

    renderHistoryList();

  }


  /*
   * Settings ochilganda mavjud
   * ma'lumotlarni inputlarga qo'yamiz.
   */

  if (
    modalId ===
    'settingsModal'
  ) {

    loadSettingsIntoForm();

  }

}


/* ==========================================================================
   CLOSE MODAL
   ========================================================================== */

function closeModal(
  modalId
) {

  const modal =
    document.getElementById(
      modalId
    );


  if (!modal) {

    return;

  }


  modal.classList.remove(
    'active'
  );

}


/* ==========================================================================
   LOAD SETTINGS INTO FORM
   ========================================================================== */

function loadSettingsIntoForm() {

  const doctorName =
    document.getElementById(
      'doctor_name'
    );


  const doctorSpec =
    document.getElementById(
      'doctor_spec'
    );


  const doctorId =
    document.getElementById(
      'doctor_id'
    );


  const clinicName =
    document.getElementById(
      'clinic_name'
    );


  const clinicAddress =
    document.getElementById(
      'clinic_address'
    );


  const clinicPhone =
    document.getElementById(
      'clinic_phone'
    );


  if (doctorName) {

    doctorName.value =
      doctorProfile.name ||
      '';

  }


  if (doctorSpec) {

    doctorSpec.value =
      doctorProfile.spec ||
      '';

  }


  if (doctorId) {

    doctorId.value =
      doctorProfile.id ||
      '';

  }


  if (clinicName) {

    clinicName.value =
      clinicProfile.name ||
      '';

  }


  if (clinicAddress) {

    clinicAddress.value =
      clinicProfile.address ||
      '';

  }


  if (clinicPhone) {

    clinicPhone.value =
      clinicProfile.phone ||
      '';

  }

}


/* ==========================================================================
   SAVE SETTINGS
   ========================================================================== */

function saveSettings() {

  /*
   * Shifokor ma'lumotlari
   */

  const doctorName =
    document.getElementById(
      'doctor_name'
    );


  const doctorSpec =
    document.getElementById(
      'doctor_spec'
    );


  const doctorId =
    document.getElementById(
      'doctor_id'
    );


  if (doctorName) {

    doctorProfile.name =
      doctorName.value.trim();

  }


  if (doctorSpec) {

    doctorProfile.spec =
      doctorSpec.value.trim();

  }


  if (doctorId) {

    doctorProfile.id =
      doctorId.value.trim();

  }


  /*
   * Klinika ma'lumotlari
   */

  const clinicName =
    document.getElementById(
      'clinic_name'
    );


  const clinicAddress =
    document.getElementById(
      'clinic_address'
    );


  const clinicPhone =
    document.getElementById(
      'clinic_phone'
    );


  if (clinicName) {

    clinicProfile.name =
      clinicName.value.trim();

  }


  if (clinicAddress) {

    clinicProfile.address =
      clinicAddress.value.trim();

  }


  if (clinicPhone) {

    clinicProfile.phone =
      clinicPhone.value.trim();

  }


  /*
   * LocalStorage
   */

  localStorage.setItem(
    'drmed_doctor_profile',
    JSON.stringify(
      doctorProfile
    )
  );


  localStorage.setItem(
    'drmed_clinic_profile',
    JSON.stringify(
      clinicProfile
    )
  );


  /*
   * Blankani yangilash
   */

  liveUpdate();


  /*
   * Modalni yopish
   */

  closeModal(
    'settingsModal'
  );


  /*
   * Telegram haptic
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


  alert(
    'Sozlamalar saqlandi.'
  );

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
   * Jinsni default holatga qaytaramiz.
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
   * Dorilarni tozalash.
   */

  drugs = [];


  renderDrugCards();


  /*
   * Imzoni tozalash.
   */

  clearSignatureCanvas();


  /*
   * Yangi retsept raqami.
   *
   * QR ham yangi RXga o'tadi.
   */

  startNewPrescription();


  liveUpdate();

}


/* ==========================================================================
   CLEAR SIGNATURE CANVAS
   ========================================================================== */

function clearSignatureCanvas() {

  const canvas =
    document.getElementById(
      'signatureCanvas'
    );


  if (canvas) {

    const ctx =
      canvas.getContext(
        '2d'
      );


    ctx.clearRect(

      0,

      0,

      canvas.width,

      canvas.height

    );

  }


  signatureDataURL =
    null;


  const paperSignature =
    document.getElementById(
      'paper_signature_img'
    );


  if (paperSignature) {

    paperSignature.removeAttribute(
      'src'
    );


    paperSignature.style.display =
      'none';

  }


  /*
   * Agar eski ID ishlatilgan bo'lsa,
   * uni ham tozalaymiz.
   */

  const oldPaperSignature =
    document.getElementById(
      'paper_sig_img'
    );


  if (oldPaperSignature) {

    oldPaperSignature.removeAttribute(
      'src'
    );


    oldPaperSignature.style.display =
      'none';

  }

}


/* ==========================================================================
   APPLY SIGNATURE TO PAPER
   ========================================================================== */

function applySignatureToPaper() {

  const canvas =
    document.getElementById(
      'signatureCanvas'
    );


  if (!canvas) {

    alert(
      'Imzo oynasi topilmadi.'
    );

    return;

  }


  /*
   * Canvasdan PNG olamiz.
   */

  signatureDataURL =
    canvas.toDataURL(
      'image/png'
    );


  if (!signatureDataURL) {

    alert(
      'Avval imzo qo‘ying.'
    );

    return;

  }


  /*
   * Yangi ID
   */

  const paperSignature =
    document.getElementById(
      'paper_signature_img'
    );


  if (paperSignature) {

    paperSignature.src =
      signatureDataURL;


    paperSignature.style.display =
      'block';

  }


  /*
   * Eski ID bo‘lsa ham ishlasin.
   */

  const oldPaperSignature =
    document.getElementById(
      'paper_sig_img'
    );


  if (oldPaperSignature) {

    oldPaperSignature.src =
      signatureDataURL;


    oldPaperSignature.style.display =
      'block';

  }


  /*
   * Saqlab qo'yamiz.
   */

  localStorage.setItem(
    'drmed_signature',
    signatureDataURL
  );


  liveUpdate();


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


/* ==========================================================================
   CLEAR ALL HISTORY
   ========================================================================== */

function clearAllHistory() {

  if (
    !confirm(
      'Barcha retseptlar tarixini o‘chirishni xohlaysizmi?'
    )
  ) {

    return;

  }


  localStorage.removeItem(
    'drmed_history'
  );


  renderHistoryList();


  /*
   * Agar history modal ochiq bo'lsa,
   * bo'sh holatni ko'rsatamiz.
   */

  const container =
    document.getElementById(
      'historyList'
    );


  if (
    container &&
    !container.innerHTML.trim()
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          📋
        </div>

        <div>
          Hozircha saqlangan retseptlar yo‘q.
        </div>

      </div>

    `;

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
    !confirm(
      "Dasturni dastlabki holatga qaytarmoqchimisiz?\n\nBarcha saqlangan sozlamalar va retseptlar o‘chiriladi."
    )
  ) {

    return;

  }


  localStorage.clear();


  /*
   * Global state ham tozalanadi.
   */

  drugs = [];


  signatureDataURL =
    null;


  customStampDataURL =
    null;


  currentPrescriptionId =
    null;


  currentGender =
    'Erkak';


  /*
   * Sahifani qayta yuklaymiz.
   */

  location.reload();

}


/* ==========================================================================
   GLOBAL API — INDEX.HTML UCHUN
   ========================================================================== */

window.openModal =
  openModal;


window.closeModal =
  closeModal;


window.saveSettings =
  saveSettings;


window.clearPatientForm =
  clearPatientForm;


window.clearSignatureCanvas =
  clearSignatureCanvas;


window.applySignatureToPaper =
  applySignatureToPaper;


window.clearAllHistory =
  clearAllHistory;


window.resetAppDefaults =
  resetAppDefaults;
  
/* ==========================================================================
   DR.MED APP READY
   ========================================================================== */

console.log(
  '✅ DR.MED APP.JS LOADED'
);


console.log(
  '✅ QR: qr.js orqali boshqariladi'
);


console.log(
  '✅ PDF: pdf.js orqali boshqariladi'
);


console.log(
  '✅ PDF Download API: openFormatModal / downloadA4 / downloadA5'
);


console.log(
  '✅ Share API: DRMED_PDF.share()'
);
