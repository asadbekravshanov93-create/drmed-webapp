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

// DEFAULT DOCTOR & CLINIC SETTINGS
let doctorProfile = {
  name: "Asrorov Asadbek Asliddinovich",
  spec: "Shifokor-Terapevt",
  id: "012345"
};

// UI INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  // Lucide belgilarni yuklash
  if (window.lucide) {
    lucide.createIcons();
  }

  // Shifokor ma'lumotlarini o'rnatish
  const docNameEl = document.getElementById('docName');
  const docSpecEl = document.getElementById('docSpec');
  const docIdEl = document.getElementById('docId');

  if (docNameEl) docNameEl.textContent = doctorProfile.name;
  if (docSpecEl) docSpecEl.textContent = doctorProfile.spec;
  if (docIdEl) docIdEl.textContent = doctorProfile.id;

  const medicationsList = document.getElementById('medicationsList');
  const medTemplate = document.getElementById('medTemplate');
  const addMedBtn = document.getElementById('addMedBtn');
  const recipeForm = document.getElementById('recipeForm');

  // Dori qo'shish funksiyasi
  function addMedicationField() {
    if (!medTemplate || !medicationsList) return;
    
    const clone = medTemplate.content.cloneNode(true);
    const medItem = clone.querySelector('.med-item');
    const removeBtn = clone.querySelector('.remove-med-btn');

    removeBtn.addEventListener('click', () => {
      if (medicationsList.querySelectorAll('.med-item').length > 1) {
        medItem.remove();
      } else {
        alert("Kamida bitta dori kiritilishi shart!");
      }
    });

    medicationsList.appendChild(clone);
    if (window.lucide) lucide.createIcons();
  }

  // Boshlanishida 1 ta dori maydoni yaratish
  if (medicationsList) {
    addMedicationField();
  }

  if (addMedBtn) {
    addMedBtn.addEventListener('click', addMedicationField);
  }

  // Formani yuborish
  if (recipeForm) {
    recipeForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const medItems = document.querySelectorAll('.med-item');
      const medications = [];

      medItems.forEach(item => {
        medications.push({
          name: item.querySelector('.med-name').value,
          dosage: item.querySelector('.med-dosage').value,
          duration: item.querySelector('.med-duration').value
        });
      });

      const payload = {
        doctor: doctorProfile,
        patient: {
          name: document.getElementById('patientName').value,
          age: document.getElementById('patientAge').value,
          gender: document.getElementById('patientGender') ? document.getElementById('patientGender').value : 'Erkak',
          diagnosis: document.getElementById('diagnosis').value
        },
        medications: medications,
        notes: document.getElementById('notes').value,
        timestamp: new Date().toISOString()
      };

      if (tg && tg.sendData) {
        tg.sendData(JSON.stringify(payload));
        tg.close();
      } else {
        console.log('DR.MED WebApp Data:', payload);
        alert('Ma\'lumotlar muvaffaqiyatli tayyorlandi!');
      }
    });
  }
});
