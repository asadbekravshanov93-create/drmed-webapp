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
let customStampDataURL = null; // Custom Stamp Image Data

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
let drugs = [
  {
    name: 'Amoxicillini',
    dose: '0.5 g',
    shape: 'Tab.',
    count: '21 in caps.',
    dtd: 'D.t.d. № 21 in caps.',
    ds: 'Kuniga 3 mahal 1 kapsuladan, ovqatdan keyin 7 kun.'
  },
  {
    name: 'Ambroxoli',
    dose: '15 mg/5 ml',
    shape: 'Syr.',
    count: '100 ml',
    dtd: '-',
    ds: 'Kuniga 3 mahal 5 ml dan, ovqatdan keyin 5 kun.'
  }
];

// ICD-10 DATABASE SAMPLE
const icd10Data = [
  { code: 'J20.9', title: "O'tkir bronxit, aniqlanmagan" },
  { code: 'J06.9', title: "Yuqori nafas yo'llarining o'tkir infektsiyasi (O'RVI)" },
  { code: 'K29.7', title: "Gastrit, aniqlanmagan" },
  { code: 'I10', title: "Essensial [birlamchi] gipertenziya (Qon bosimi)" },
  { code: 'J45.0', title: "Bronxial astma" }
];

// INITIALIZATION ON LOAD
window.addEventListener('DOMContentLoaded', () => {
  loadSettingsFromStorage();
  renderDrugCards();
  initSignatureCanvas();
  liveUpdate();
});

/* ================= WIZARD NAVIGATION ================= */
function switchStep(stepNum) {
  currentStep = stepNum;

  document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.wizard-tab').forEach(el => el.classList.remove('active'));

  document.getElementById(`step${stepNum}`).classList.add('active');
  document.getElementById(`tab${stepNum}`).classList.add('active');

  if (stepNum === 3) {
    liveUpdate();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Telegram Haptic Feedback
  if (tg && tg.HapticFeedback) {
    tg.HapticFeedback.impactOccurred('light');
  }
}

function selectGender(gender) {
  currentGender = gender;
  document.getElementById('gender_m').classList.toggle('active', gender === 'Erkak');
  document.getElementById('gender_f').classList.toggle('active', gender === 'Ayol');
  liveUpdate();
}

function calculateAge() {
  const birthVal = document.getElementById('p_birth').value;
  if (!birthVal) return;
  const birthDate = new Date(birthVal);
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
  document.getElementById('p_age').value = calculatedAge;
}

/* ================= DRUG BUILDER LOGIC ================= */
function renderDrugCards() {
  const container = document.getElementById('drugsListContainer');
  container.innerHTML = '';

  drugs.forEach((d, idx) => {
    const card = document.createElement('div');
    card.className = 'drug-card';
    card.innerHTML = `
      <div class="drug-card-head">
        <span class="drug-num">Rp. #${idx + 1}</span>
        <div class="drug-card-actions">
          <button class="sm-btn" onclick="duplicateDrug(${idx})">📋 Nusxa</button>
          <button class="sm-btn" style="color:var(--danger);" onclick="removeDrug(${idx})">🗑️ O'chirish</button>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group col-7">
          <label>Dori nomi (Lat) <span class="req">*</span></label>
          <input type="text" value="${d.name}" placeholder="Masalan: Paracetamoli" oninput="drugs[${idx}].name=this.value; liveUpdate();">
        </div>
        <div class="form-group col-3">
          <label>Dozasi</label>
          <input type="text" value="${d.dose}" placeholder="500 mg" oninput="drugs[${idx}].dose=this.value; liveUpdate();">
        </div>
        <div class="form-group col-2">
          <label>Shakli</label>
          <select onchange="drugs[${idx}].shape=this.value; liveUpdate();">
            <option value="Tab." ${d.shape==='Tab.'?'selected':''}>Tab.</option>
            <option value="Syr." ${d.shape==='Syr.'?'selected':''}>Syr.</option>
            <option value="Caps." ${d.shape==='Caps.'?'selected':''}>Caps.</option>
            <option value="Sol." ${d.shape==='Sol.'?'selected':''}>Sol.</option>
            <option value="Amp." ${d.shape==='Amp.'?'selected':''}>Amp.</option>
            <option value="Ung." ${d.shape==='Ung.'?'selected':''}>Ung.</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group col-6">
          <label>D.t.d. (Reseptura ko'rsatmasi)</label>
          <input type="text" value="${d.dtd}" placeholder="D.t.d. № 10" oninput="drugs[${idx}].dtd=this.value; liveUpdate();">
        </div>
        <div class="form-group col-6">
          <label>Umumiy miqdori</label>
          <input type="text" value="${d.count}" placeholder="10 tab." oninput="drugs[${idx}].count=this.value; liveUpdate();">
        </div>
      </div>

      <div class="form-group">
        <label>S. (Qabul qilish usuli)</label>
        <input type="text" value="${d.ds}" placeholder="Kuniga 2 mahal 1 tabletkadan..." oninput="drugs[${idx}].ds=this.value; liveUpdate();">
      </div>
    `;
    container.appendChild(card);
  });
}

function addNewDrugCard() {
  drugs.push({ name: '', dose: '', shape: 'Tab.', count: '', dtd: 'D.t.d. № ', ds: '' });
  renderDrugCards();
  liveUpdate();
}

function removeDrug(index) {
  drugs.splice(index, 1);
  renderDrugCards();
  liveUpdate();
}

function duplicateDrug(index) {
  const clone = JSON.parse(JSON.stringify(drugs[index]));
  drugs.splice(index + 1, 0, clone);
  renderDrugCards();
  liveUpdate();
}

function clearAllDrugs() {
  if (confirm("Barcha dorilarni o'chirishga ishonchingiz komilmi?")) {
    drugs = [];
    renderDrugCards();
    liveUpdate();
  }
}

// PRESET PRE-DEFINED CLINICAL CASES
function applyPreset(type) {
  if (type === 'bronchitis') {
    drugs = [
      { name: 'Amoxicillini', dose: '0.5 g', shape: 'Caps.', count: '21 caps', dtd: 'D.t.d. № 21', ds: 'Kuniga 3 mahal 1 kapsuladan, 7 kun.' },
      { name: 'Ambroxoli', dose: '30 mg', shape: 'Tab.', count: '20 tab', dtd: 'D.t.d. № 20', ds: 'Kuniga 3 mahal 1 tabletkadan ovqatdan keyin.' }
    ];
  } else if (type === 'gripp') {
    drugs = [
      { name: 'Paracetamoli', dose: '500 mg', shape: 'Tab.', count: '10 tab', dtd: 'D.t.d. № 10', ds: 'Harorat 38°C dan oshganda 1 tabletka.' },
      { name: 'Acid Ascorbinici', dose: '500 mg', shape: 'Tab.', count: '20 tab', dtd: 'D.t.d. № 20', ds: 'Kuniga 2 mahal 1 tabletkadan.' }
    ];
  } else if (type === 'gastritis') {
    drugs = [
      { name: 'Omeprazoli', dose: '20 mg', shape: 'Caps.', count: '14 caps', dtd: 'D.t.d. № 14', ds: 'Kuniga 1 mahal ertalab ovqatdan 30 daqiqa oldin.' }
    ];
  }
  renderDrugCards();
  liveUpdate();
}

/* ================= LIVE BLANK UPDATER ================= */
function liveUpdate() {
  // Patient Details
  document.getElementById('paper_p_name').innerText = document.getElementById('p_name').value || '—';
  document.getElementById('paper_p_birth').innerText = document.getElementById('p_birth').value || '—';
  document.getElementById('paper_p_age').innerText = document.getElementById('p_age').value || '0';
  document.getElementById('paper_p_gender').innerText = currentGender;
  document.getElementById('paper_p_address').innerText = document.getElementById('p_address').value || '—';
  document.getElementById('paper_p_card').innerText = document.getElementById('p_card').value || '—';

  // Diagnosis
  document.getElementById('paper_p_icd').innerText = document.getElementById('p_icd').value || '—';
  document.getElementById('paper_p_diag').innerText = document.getElementById('p_diag').value || '—';
  document.getElementById('paper_p_allergy').innerText = document.getElementById('p_allergy').value || 'Yo\'q';
  document.getElementById('paper_p_note').innerText = document.getElementById('p_note').value || 'Ko\'rsatma bo\'yicha qabul qilinsin.';

  // Doctor & Clinic
  document.getElementById('paper_doc_name').innerText = doctorProfile.name;
  document.getElementById('paper_doc_spec').innerText = doctorProfile.spec;
  document.getElementById('paper_doc_id').innerText = doctorProfile.id;

  document.getElementById('paper_clinic_name').innerText = clinicProfile.name;
  document.getElementById('paper_clinic_address').innerText = clinicProfile.address;
  document.getElementById('paper_clinic_phone').innerText = clinicProfile.phone;

  // Today Date
  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}.${today.getFullYear()}`;
  document.getElementById('paper_rx_date').innerText = formattedDate;

  // Drugs Render in Paper
  const paperDrugsContainer = document.getElementById('paper_drugs_list');
  paperDrugsContainer.innerHTML = '';

  drugs.forEach((d, idx) => {
    if (d.name.trim() !== '') {
      const item = document.createElement('div');
      item.className = 'rx-drug-item';
      item.innerHTML = `
        <strong>Rp.: #${idx + 1}. ${d.shape} ${d.name} ${d.dose}</strong>
        <div class="rx-drug-sub">
          ${d.dtd !== '-' && d.dtd !== '' ? d.dtd + '<br>' : ''}
          ${d.count ? 'Miqdori: ' + d.count + '<br>' : ''}
          <b>S.</b> ${d.ds}
        </div>
      `;
      paperDrugsContainer.appendChild(item);
    }
  });

  // Stamp Handling
  const stampImgEl = document.getElementById('paper_stamp_img');
  const stampDefaultEl = document.getElementById('paper_stamp_default');
  if (customStampDataURL) {
    stampImgEl.src = customStampDataURL;
    stampImgEl.style.display = 'block';
    if (stampDefaultEl) stampDefaultEl.style.display = 'none';
  } else {
    stampImgEl.style.display = 'none';
    if (stampDefaultEl) stampDefaultEl.style.display = 'block';
  }

  // QR Code Generation for PDF Online Viewing / Verification
  const qrContainer = document.getElementById('paper_qr_code');
  qrContainer.innerHTML = '';
  const rxId = document.getElementById('paper_rx_id').innerText;
  const patientName = encodeURIComponent(document.getElementById('p_name').value || 'bemor');
  
  // Generates direct view link
  const pdfViewUrl = `https://drmed-webapp.vercel.app/verify.html?id=${rxId}&patient=${patientName}`;

  new QRCode(qrContainer, {
    text: pdfViewUrl,
    width: 64,
    height: 64,
    correctLevel: QRCode.CorrectLevel.M
  });
}

/* ================= STAMP IMAGE UPLOAD LOGIC ================= */
function uploadStampImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      customStampDataURL = e.target.result;
      localStorage.setItem('drmed_stamp', customStampDataURL);
      liveUpdate();
    };
    reader.readAsDataURL(file);
  }
}

/* ================= SIGNATURE CANVAS LOGIC ================= */
let canvas, ctx, isDrawing = false;

function initSignatureCanvas() {
  canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  ctx.strokeStyle = "#002b80";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";

  // Mouse Events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  // Touch Events
  canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    startDrawing({ clientX: touch.clientX, clientY: touch.clientY, rect });
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    draw({ clientX: touch.clientX, clientY: touch.clientY, rect });
  });

  canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
  isDrawing = true;
  const rect = e.rect || canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = e.rect || canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
}

function stopDrawing() {
  isDrawing = false;
}

function clearSignatureCanvas() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('paper_sig_img').style.display = 'none';
  document.getElementById('sig_text_fallback').style.display = 'inline-block';
}

function applySignatureToPaper() {
  signatureDataURL = canvas.toDataURL("image/png");
  const imgEl = document.getElementById('paper_sig_img');
  imgEl.src = signatureDataURL;
  imgEl.style.display = 'block';
  document.getElementById('sig_text_fallback').style.display = 'none';
  alert("Imzo blankaga muvaffaqiyatli tushirildi!");
}

/* ================= MODAL CONTROLS ================= */
function openModal(id) {
  document.getElementById(id).classList.add('active');
  if (id === 'historyModal') renderHistoryList();
  if (id === 'icdModal') searchICD10();
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

/* ================= SETTINGS & LOCAL STORAGE ================= */
function saveSettings() {
  doctorProfile.name = document.getElementById('set_doc_name').value;
  doctorProfile.spec = document.getElementById('set_doc_spec').value;
  doctorProfile.id = document.getElementById('set_doc_id').value;

  clinicProfile.name = document.getElementById('set_clinic_name').value;
  clinicProfile.address = document.getElementById('set_clinic_address').value;
  clinicProfile.phone = document.getElementById('set_clinic_phone').value;

  localStorage.setItem('drmed_doctor', JSON.stringify(doctorProfile));
  localStorage.setItem('drmed_clinic', JSON.stringify(clinicProfile));

  liveUpdate();
  closeModal('settingsModal');
  alert("Sozlamalar saqlandi!");
}

function loadSettingsFromStorage() {
  const savedDoc = localStorage.getItem('drmed_doctor');
  const savedClinic = localStorage.getItem('drmed_clinic');
  const savedStamp = localStorage.getItem('drmed_stamp');

  if (savedDoc) doctorProfile = JSON.parse(savedDoc);
  if (savedClinic) clinicProfile = JSON.parse(savedClinic);
  if (savedStamp) customStampDataURL = savedStamp;

  document.getElementById('set_doc_name').value = doctorProfile.name;
  document.getElementById('set_doc_spec').value = doctorProfile.spec;
  document.getElementById('set_doc_id').value = doctorProfile.id;

  document.getElementById('set_clinic_name').value = clinicProfile.name;
  document.getElementById('set_clinic_address').value = clinicProfile.address;
  document.getElementById('set_clinic_phone').value = clinicProfile.phone;
}

/* ================= HISTORY CRUD ================= */
function savePrescriptionToHistory() {
  const patientName = document.getElementById('p_name').value;
  if (!patientName) {
    alert("Bemor ismini kiriting!");
    return;
  }

  const record = {
    id: 'RX-' + Date.now().toString().slice(-6),
    date: new Date().toLocaleDateString('uz-UZ'),
    patientName: patientName,
    diag: document.getElementById('p_diag').value,
    drugs: drugs
  };

  let history = JSON.parse(localStorage.getItem('drmed_history') || '[]');
  history.unshift(record);
  localStorage.setItem('drmed_history', JSON.stringify(history));

  alert("Retsept arxivga saqlandi!");
}

function renderHistoryList() {
  const container = document.getElementById('historyListContainer');
  const history = JSON.parse(localStorage.getItem('drmed_history') || '[]');

  if (history.length === 0) {
    container.innerHTML = '<p class="help-text">Hozircha saqlangan retseptlar mavjud emas.</p>';
    return;
  }

  container.innerHTML = history.map((item, idx) => `
    <div class="history-item">
      <div class="history-info">
        <h4>${item.patientName} (${item.id})</h4>
        <p>${item.date} — ${item.diag}</p>
      </div>
      <button class="sm-btn" onclick="loadFromHistory(${idx})">Yuklash</button>
    </div>
  `).join('');
}

function loadFromHistory(index) {
  const history = JSON.parse(localStorage.getItem('drmed_history') || '[]');
  const item = history[index];
  if (item) {
    document.getElementById('p_name').value = item.patientName;
    document.getElementById('p_diag').value = item.diag;
    drugs = item.drugs;
    renderDrugCards();
    liveUpdate();
    closeModal('historyModal');
    switchStep(3);
  }
}

function clearAllHistory() {
  if (confirm("Butun arxivni o'chirib tashlamoqchimisiz?")) {
    localStorage.removeItem('drmed_history');
    renderHistoryList();
  }
}

/* ================= ICD-10 SEARCH ================= */
function searchICD10() {
  const query = document.getElementById('icdSearchInput').value.toLowerCase();
  const resultsContainer = document.getElementById('icdResultsList');

  const filtered = icd10Data.filter(i => i.code.toLowerCase().includes(query) || i.title.toLowerCase().includes(query));

  resultsContainer.innerHTML = filtered.map(i => `
    <div class="history-item" onclick="selectICD('${i.code}', '${i.title}')" style="cursor:pointer;">
      <div class="history-info">
        <h4>${i.code}</h4>
        <p>${i.title}</p>
      </div>
    </div>
  `).join('');
}

function selectICD(code, title) {
  document.getElementById('p_icd').value = code;
  document.getElementById('p_diag').value = title;
  liveUpdate();
  closeModal('icdModal');
}

/* ================= EXPORT & PRINT ================= */
function exportToPDF() {
  const element = document.getElementById('printablePaper');
  const opt = {
    margin:       [5, 5, 5, 5],
    filename:     `DRMED_Retsept_${document.getElementById('p_name').value || 'bemor'}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      logging: false,
      windowWidth: 800
    },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

function printPrescription() {
  window.print();
}

function shareTelegram() {
  if (tg) {
    tg.sendData(JSON.stringify({
      action: "share_rx",
      patient: document.getElementById('p_name').value,
      rx_id: document.getElementById('paper_rx_id').innerText
    }));
  } else {
    alert("Telegram Mini App rejimi faollashtirilmagan.");
  }
}

function clearPatientForm() {
  document.getElementById('p_name').value = '';
  document.getElementById('p_age').value = '';
  document.getElementById('p_address').value = '';
  document.getElementById('p_phone').value = '';
  liveUpdate();
}

function resetAppDefaults() {
  if (confirm("Dasturni dastlabki holatga qaytarmoqchimisiz? Barcha saqlanmagan ma'lumotlar o'chadi.")) {
    localStorage.clear();
    location.reload();
  }
}
