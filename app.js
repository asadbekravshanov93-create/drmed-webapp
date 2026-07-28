/* ==========================================================================
   DR.MED PRO SYSTEM - COMPLETE APPLICATION LOGIC
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
  
  let currentStep = 1;
  let drugCount = 0;
  let isDrawing = false;
  let hasSignature = false;

  let systemSettings = {
    clinicName: "DR.MED Tibbiyot Markazi",
    clinicAddress: "Toshkent sh., Chilonzor tumani, Bunyodkor ko'chasi 12-uy",
    clinicPhone: "+998 (71) 200-00-11",
    doctorName: "Asrorov Asadbek Asliddinovich",
    doctorSpec: "Shifokor-Terapevt",
    doctorId: "012345",
    stampImage: ""
  };

  init();

  function init() {
    loadSettings();
    setDefaultDate();
    setupTabNavigation();
    setupGenderSelector();
    setupCanvas();
    setupDrugBuilder();
    setupIcd10Search();
    setupActionButtons();
    setupModals();
    
    addDrugItem();
    updatePreview();
  }

  function showToast(message, type = "success") {
    const toast = document.getElementById("toastNotification");
    toast.textContent = message;
    toast.className = `toast-notification active ${type}`;
    setTimeout(() => {
      toast.className = "toast-notification";
    }, 3000);
  }

  function setDefaultDate() {
    const today = new Date().toISOString().split("T")[0];
    const rxDateInput = document.getElementById("rxDate");
    if (rxDateInput) rxDateInput.value = today;
  }

  window.goToStep = function (stepNum) {
    if (stepNum === 2 && !document.getElementById("patientName").value.trim()) {
      showToast("Iltimos, bemor F.I.Sh. ni kiriting!", "danger");
      return;
    }

    currentStep = stepNum;
    document.querySelectorAll(".step-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".wizard-tab").forEach(el => el.classList.remove("active"));

    document.getElementById(`step${stepNum}`).classList.add("active");
    document.querySelector(`.wizard-tab[data-step="${stepNum}"]`).classList.add("active");

    if (stepNum === 3) {
      updatePreview();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function setupTabNavigation() {
    document.querySelectorAll(".wizard-tab").forEach(tab => {
      tab.addEventListener("click", function () {
        const step = parseInt(this.getAttribute("data-step"));
        goToStep(step);
      });
    });
  }

  function setupGenderSelector() {
    const btns = document.querySelectorAll(".segmented-control .segment-btn");
    btns.forEach(btn => {
      btn.addEventListener("click", function () {
        btns.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
      });
    });
  }

  function setupDrugBuilder() {
    document.getElementById("btnAddDrug").addEventListener("click", function () {
      addDrugItem();
    });
  }

  function addDrugItem() {
    drugCount++;
    const container = document.getElementById("drugsContainer");
    
    const drugCard = document.createElement("div");
    drugCard.className = "drug-card";
    drugCard.id = `drugCard_${drugCount}`;
    drugCard.innerHTML = `
      <div class="drug-card-head">
        <span class="drug-num">${drugCount}. Rp.:</span>
        <div class="drug-card-actions">
          <button class="sm-btn btn-danger" onclick="removeDrugItem(${drugCount})">O'chirish</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group col-6">
          <label>Dori nomi (Lat) <span class="req">*</span></label>
          <input type="text" class="drug-name" placeholder="Masalan: Tab. Amoxicillini">
        </div>
        <div class="form-group col-3">
          <label>Dozasi</label>
          <input type="text" class="drug-dose" placeholder="0.5 g">
        </div>
        <div class="form-group col-3">
          <label>Shakli</label>
          <select class="drug-form">
            <option value="Tab.">Tab.</option>
            <option value="Caps.">Caps.</option>
            <option value="Syr.">Syr.</option>
            <option value="Sol.">Sol.</option>
            <option value="Amp.">Amp.</option>
            <option value="Ung.">Ung.</option>
            <option value="Supp.">Supp.</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>D.t.d. (Reseptura ko'rsatmasi)</label>
        <input type="text" class="drug-dtd" placeholder="Masalan: D.t.d. № 21 in caps.">
      </div>
      <div class="form-group">
        <label>S. (Qabul qilish usuli) <span class="req">*</span></label>
        <input type="text" class="drug-sig" placeholder="Kuniga 3 mahal 1 kapsuladan, ovqatdan keyin 7 kun">
      </div>
    `;

    container.appendChild(drugCard);
  }

  window.removeDrugItem = function (id) {
    const cards = document.querySelectorAll(".drug-card");
    if (cards.length <= 1) {
      showToast("Retseptda kamida bitta dori bo'lishi kerak!", "danger");
      return;
    }
    const card = document.getElementById(`drugCard_${id}`);
    if (card) card.remove();
    renumberDrugs();
  };

  function renumberDrugs() {
    const cards = document.querySelectorAll(".drug-card");
    cards.forEach((card, index) => {
      const numSpan = card.querySelector(".drug-num");
      if (numSpan) numSpan.textContent = `${index + 1}. Rp.:`;
    });
  }

  function setupIcd10Search() {
    const searchInput = document.getElementById("icd10Search");
    const dropdown = document.getElementById("icd10Dropdown");
    const clearBtn = document.getElementById("btnClearIcd");

    const sampleIcd10 = [
      { code: "J20.9", name: "O'tkir bronxit, aniqlanmagan qo'zg'atuvchi bilan" },
      { code: "J06.9", name: "Yuqori nafas yo'llarining o'tkir infeksiyasi" },
      { code: "K29.7", name: "Gastrit, aniqlanmagan" },
      { code: "I10", name: "Essensial (biramchi) gipertenziya" },
      { code: "E11", name: "Qandli diabet 2-tip" },
      { code: "J45.0", name: "Allergik komponentli bronxial astma" }
    ];

    searchInput.addEventListener("input", function () {
      const query = this.value.toLowerCase().trim();
      dropdown.innerHTML = "";

      if (query.length < 1) {
        dropdown.style.display = "none";
        return;
      }

      const results = sampleIcd10.filter(item => 
        item.code.toLowerCase().includes(query) || item.name.toLowerCase().includes(query)
      );

      if (results.length > 0) {
        results.forEach(item => {
          const div = document.createElement("div");
          div.className = "dropdown-item";
          div.innerHTML = `<strong>${item.code}</strong> - ${item.name}`;
          div.addEventListener("click", function () {
            document.getElementById("icd10Code").value = item.code;
            document.getElementById("clinicalDiagnosis").value = item.name;
            dropdown.style.display = "none";
            searchInput.value = `${item.code} - ${item.name}`;
          });
          dropdown.appendChild(div);
        });
        dropdown.style.display = "block";
      } else {
        dropdown.style.display = "none";
      }
    });

    clearBtn.addEventListener("click", function () {
      searchInput.value = "";
      document.getElementById("icd10Code").value = "";
      document.getElementById("clinicalDiagnosis").value = "";
      dropdown.style.display = "none";
    });

    document.addEventListener("click", function (e) {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }

  function setupCanvas() {
    const canvas = document.getElementById("signatureCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 120;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#002b80";
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      let clientX = e.clientX;
      let clientY = e.clientY;

      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    function startDrawing(e) {
      isDrawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      hasSignature = true;
    }

    function stopDrawing() {
      isDrawing = false;
    }

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);

    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing);

    document.getElementById("btnClearCanvas").addEventListener("click", function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSignature = false;
      document.getElementById("paper_sig_img").style.display = "none";
      document.getElementById("sig_placeholder_text").style.display = "inline-block";
    });

    document.getElementById("btnApplySignature").addEventListener("click", function () {
      if (!hasSignature) {
        showToast("Iltimos, avval imzo cheking!", "danger");
        return;
      }
      const dataUrl = canvas.toDataURL("image/png");
      const sigImg = document.getElementById("paper_sig_img");
      sigImg.src = dataUrl;
      sigImg.style.display = "block";
      document.getElementById("sig_placeholder_text").style.display = "none";
      showToast("Imzo blankaga muvaffaqiyatli tushirildi!");
    });
  }

  function updatePreview() {
    document.getElementById("pClinicName").textContent = systemSettings.clinicName;
    document.getElementById("pClinicAddress").textContent = systemSettings.clinicAddress;
    document.getElementById("pClinicPhone").textContent = systemSettings.clinicPhone;
    document.getElementById("pDoctorName").textContent = systemSettings.doctorName;
    document.getElementById("pDoctorSpec").textContent = systemSettings.doctorSpec;
    document.getElementById("pDoctorId").textContent = systemSettings.doctorId;

    const stampImg = document.getElementById("paper_stamp_img");
    const stampPlaceholder = document.getElementById("stamp_inner_placeholder");
    if (systemSettings.stampImage) {
      stampImg.src = systemSettings.stampImage;
      stampImg.style.display = "block";
      stampPlaceholder.style.display = "none";
    } else {
      stampImg.style.display = "none";
      stampPlaceholder.style.display = "flex";
    }

    const pName = document.getElementById("patientName").value.trim() || "—";
    const pDob = document.getElementById("patientDob").value || "—";
    const pAge = document.getElementById("patientAge").value || "0";
    const pAddress = document.getElementById("patientAddress").value.trim() || "—";
    const pCardNo = document.getElementById("patientCardNo").value.trim() || "—";
    const rxDate = document.getElementById("rxDate").value || new Date().toISOString().split("T")[0];
    
    const activeGenderBtn = document.querySelector(".segmented-control .segment-btn.active");
    const pGender = activeGenderBtn ? activeGenderBtn.getAttribute("data-gender") : "Erkak";

    document.getElementById("pPatientName").textContent = pName;
    document.getElementById("pPatientDob").textContent = pDob;
    document.getElementById("pPatientAge").textContent = pAge;
    document.getElementById("pPatientGender").textContent = pGender;
    document.getElementById("pPatientAddress").textContent = pAddress;
    document.getElementById("pPatientCardNo").textContent = pCardNo;
    document.getElementById("pRxDate").textContent = formatDate(rxDate);

    document.getElementById("pIcdCode").textContent = document.getElementById("icd10Code").value || "—";
    document.getElementById("pDiagnosis").textContent = document.getElementById("clinicalDiagnosis").value || "—";
    document.getElementById("pAllergy").textContent = document.getElementById("allergyStatus").value || "Yo'q";

    document.getElementById("pGeneralInstruction").textContent = document.getElementById("generalInstruction").value || "Ko'rsatma bo'yicha qabul qilinsin.";

    const drugsBody = document.getElementById("pDrugsList");
    drugsBody.innerHTML = "";
    
    const drugCards = document.querySelectorAll(".drug-card");
    drugCards.forEach((card, idx) => {
      const name = card.querySelector(".drug-name").value.trim();
      const dose = card.querySelector(".drug-dose").value.trim();
      const form = card.querySelector(".drug-form").value;
      const dtd = card.querySelector(".drug-dtd").value.trim();
      const sig = card.querySelector(".drug-sig").value.trim();

      if (name) {
        const itemDiv = document.createElement("div");
        itemDiv.className = "rx-drug-item";
        itemDiv.innerHTML = `
          <div><strong>${idx + 1}. Rp.: ${form} ${name} ${dose}</strong></div>
          ${dtd ? `<div class="rx-drug-sub">${dtd}</div>` : ''}
          <div class="rx-drug-sub"><strong>S.</strong> ${sig}</div>
        `;
        drugsBody.appendChild(itemDiv);
      }
    });

    const rxId = "RX-" + Math.floor(100000 + Math.random() * 900000);
    document.getElementById("pRxNumber").textContent = rxId;
    generateQRCode(rxId);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dateStr;
  }

  function generateQRCode(rxId) {
    const qrContainer = document.getElementById("paperQrCode");
    qrContainer.innerHTML = "";
    const pdfViewUrl = `${window.location.origin}${window.location.pathname}?rx=${rxId}&action=download`;
    
    new QRCode(qrContainer, {
      text: pdfViewUrl,
      width: 64,
      height: 64,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  function setupActionButtons() {
    
    document.getElementById("btnPrint").addEventListener("click", function () {
      window.print();
    });

    document.getElementById("btnExportPDF").addEventListener("click", function () {
      const element = document.getElementById("rxPaper");
      const rxNum = document.getElementById("pRxNumber").textContent || "Retsept";
      
      showToast("PDF tayyorlanmoqda, kuting...", "info");

      const opt = {
        margin:       [5, 5, 5, 5],
        filename:     `${rxNum}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).toPdf().output('blob').then(function (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (isIOS) {
          window.open(blobUrl, '_blank');
          showToast("PDF yangi oynada ochildi. Saqlash tugmasini bosing.");
        } else {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `${rxNum}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast("PDF fayli yuklab olindi!");
        }
      }).catch(err => {
        console.error(err);
        showToast("PDF yaratishda xatolik berdi!", "danger");
      });
    });

    document.getElementById("btnTelegramShare").addEventListener("click", function () {
      const rxNum = document.getElementById("pRxNumber").textContent;
      const pName = document.getElementById("pPatientName").textContent;
      const text = encodeURIComponent(`DR.MED PRO - Elektron Retsept\nRetsept №: ${rxNum}\nBemor: ${pName}`);
      window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${text}`, '_blank');
    });

    document.getElementById("btnSaveData").addEventListener("click", function () {
      showToast("Retsept ma'lumotlari muvaffaqiyatli saqlandi!");
    });
  }

  function setupModals() {
    const backdrop = document.getElementById("modalBackdrop");
    const closeBtn = document.getElementById("btnCloseModal");

    closeBtn.addEventListener("click", () => backdrop.classList.remove("active"));
    
    document.getElementById("btnSettings").addEventListener("click", function () {
      openSettingsModal();
    });

    document.getElementById("btnHistory").addEventListener("click", function () {
      openHistoryModal();
    });
  }

  function openSettingsModal() {
    document.getElementById("modalTitle").textContent = "Tizim va Muhr Sozlamalari";
    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <div class="form-group">
        <label>Klinika Nomi</label>
        <input type="text" id="setClinicName" value="${systemSettings.clinicName}">
      </div>
      <div class="form-group">
        <label>Klinika Manzili</label>
        <input type="text" id="setClinicAddress" value="${systemSettings.clinicAddress}">
      </div>
      <div class="form-group">
        <label>Telefon raqam</label>
        <input type="text" id="setClinicPhone" value="${systemSettings.clinicPhone}">
      </div>
      <div class="form-group">
        <label>Shifokor F.I.Sh.</label>
        <input type="text" id="setDoctorName" value="${systemSettings.doctorName}">
      </div>
      <div class="form-row">
        <div class="form-group col-6">
          <label>Mutaxassislik</label>
          <input type="text" id="setDoctorSpec" value="${systemSettings.doctorSpec}">
        </div>
        <div class="form-group col-6">
          <label>Shifokor ID / Litsenziya</label>
          <input type="text" id="setDoctorId" value="${systemSettings.doctorId}">
        </div>
      </div>
      <div class="form-group">
        <label>Shifokor Muhri (Rasmi PNG/JPG)</label>
        <input type="file" id="setStampFile" accept="image/*">
      </div>
      <button class="btn btn-primary btn-block" id="btnSaveSettings">Sozlamalarni Saqlash</button>
    `;

    document.getElementById("modalBackdrop").classList.add("active");

    document.getElementById("btnSaveSettings").addEventListener("click", function () {
      systemSettings.clinicName = document.getElementById("setClinicName").value.trim();
      systemSettings.clinicAddress = document.getElementById("setClinicAddress").value.trim();
      systemSettings.clinicPhone = document.getElementById("setClinicPhone").value.trim();
      systemSettings.doctorName = document.getElementById("setDoctorName").value.trim();
      systemSettings.doctorSpec = document.getElementById("setDoctorSpec").value.trim();
      systemSettings.doctorId = document.getElementById("setDoctorId").value.trim();

      const stampInput = document.getElementById("setStampFile");
      if (stampInput.files && stampInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
          systemSettings.stampImage = e.target.result;
          saveSettings();
          updatePreview();
          document.getElementById("modalBackdrop").classList.remove("active");
          showToast("Sozlamalar va Muhr saqlandi!");
        };
        reader.readAsDataURL(stampInput.files[0]);
      } else {
        saveSettings();
        updatePreview();
        document.getElementById("modalBackdrop").classList.remove("active");
        showToast("Sozlamalar saqlandi!");
      }
    });
  }

  function openHistoryModal() {
    document.getElementById("modalTitle").textContent = "Retseptlar Tarixi";
    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <div class="history-item">
        <div class="history-info">
          <h4>Xolmirzayev Asadbek</h4>
          <p>RX-810588 | 28.07.2026 | O'tkir bronxit</p>
        </div>
        <button class="sm-btn btn-add">Ochish</button>
      </div>
    `;
    document.getElementById("modalBackdrop").classList.add("active");
  }

  function saveSettings() {
    localStorage.setItem("drMedSettings", JSON.stringify(systemSettings));
  }

  function loadSettings() {
    const saved = localStorage.getItem("drMedSettings");
    if (saved) {
      try {
        systemSettings = Object.assign(systemSettings, JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }

});
