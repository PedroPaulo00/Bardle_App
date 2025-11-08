import { firebaseConfig } from "/config/firebase/firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// inicializa o app Firebase e autenticação
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  const toastContainer = document.getElementById("toast-container");

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ======== Navegação ========
  const logoArea = document.querySelector(".logo-area");
  const homeBtn = document.getElementById("home-btn");
  const musicBtn = document.getElementById("music-btn");
  const profileBtn = document.getElementById("profile-btn");

  logoArea.addEventListener("click", () => window.location.href = "../home/home.html");
  homeBtn.addEventListener("click", () => window.location.href = "../home/home.html");
  musicBtn.addEventListener("click", () => window.location.href = "../musicas/musicas.html");
  profileBtn.addEventListener("click", () => window.location.href = "../profile/profile.html");

  // ======== Engrenagem destacada ========
  const settingsBtn = document.querySelector(".settings-btn");
  if (settingsBtn) settingsBtn.classList.add("active");

  // ======== Mostra imagem do usuário logado ========
  const profileIcon = document.getElementById("profile-icon");
  onAuthStateChanged(auth, (user) => {
    if (user && user.photoURL) {
      profileIcon.src = user.photoURL;
    } else {
      profileIcon.src = "../musicas/assets/placeholder_cover.jpg";
    }
  });

  // ======== Interação dos toggles ========
  const toggles = document.querySelectorAll('.config-section input[type="checkbox"]');
  toggles.forEach(el => {
    el.addEventListener('change', () => {
      const labelText = el.parentElement.textContent.trim();
      showToast(`Opção "${labelText}" alterada (simulado)`);
    });
  });

  // ======== Formulário de suporte ========
  const supportForm = document.getElementById("support-form");
  supportForm.addEventListener("submit", e => {
    e.preventDefault();
    const subject = document.getElementById("support-subject").value.trim();
    const message = document.getElementById("support-message").value.trim();
    if (!subject || !message) return;
    showToast(`Mensagem enviada! Assunto: "${subject}"`);
    supportForm.reset();
  });
});
