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
   * Eski QR kodni tozalaymiz.
   *
   * Yangi QR liveUpdate() ichida
   * yangi RX raqam bilan yaratiladi.
   */
  const qrEl =
    document.getElementById(
      'paper_qr_code'
    );


  if (qrEl) {

    qrEl.innerHTML =
      '';
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
  // DINAMIK QR CODE
  // ------------------------------------------------------------------------

  const qrContainer =
    document.getElementById(
      'paper_qr_code'
    );


  if (qrContainer) {

    const currentRxId =
      getCurrentPrescriptionId();


    /*
     * QR ichida aynan joriy retsept raqami bo'ladi.
     *
     * currentRxId bu yerda faqat bir marta
     * e'lon qilinadi.
     */

    const baseUrl =
      window.location.origin +
      window.location.pathname;


    const pdfViewUrl =
      `${baseUrl}?rx_id=${encodeURIComponent(
        currentRxId
      )}` +
      `&patient=${encodeURIComponent(
        pName || 'bemor'
      )}`;


    /*
     * Har safar yangi QR yaratishdan oldin
     * eski QRni tozalaymiz.
     */
    qrContainer.innerHTML =
      '';


    if (
      window.QRCode
    ) {

      try {

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

      } catch (error) {

        console.error(
          'QR yaratishda xatolik:',
          error
        );

      }

    }

  }

}
