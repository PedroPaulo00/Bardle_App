import { firebaseConfig } from "/home/firebase/firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  const welcomeMsg = document.getElementById("welcome-msg");
  const dailyScore = document.getElementById("daily-score");
  const rankingList = document.getElementById("ranking-list");
  const profileImg = document.getElementById("profile-img");
  const profileImgSection = document.getElementById("profile-img-section");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "../auth/auth.html";
      return;
    }

    const userRef = doc(db, "usuarios", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const dados = userSnap.data();
      welcomeMsg.textContent = `Olá, ${dados.nickname || "Usuário"}!`;
      dailyScore.textContent = `Sua pontuação de hoje: ${dados.pontuacaoDiaria || 0} 🎯`;

      // Carrega imagem do usuário da internet
      const imgUrl = dados.imgUrl || "../assets/user-placeholder.jpg";
      profileImg.src = imgUrl;
      profileImg.onerror = () => profileImg.src = "../assets/user-placeholder.jpg";
      profileImgSection.src = imgUrl;
      profileImgSection.onerror = () => profileImgSection.src = "../assets/user-placeholder.jpg";

      atualizarRanking(dados);
    }
  });

  function atualizarRanking(usuario) {
    const rankingBase = [
      { nome: "MelodyMaster", pts: 180 },
      { nome: "TuneTitan", pts: 150 },
      { nome: "HarmonyHero", pts: 130 },
      { nome: "LyricLord", pts: 110 },
      { nome: "BeatBoss", pts: 90 }
    ];

    const player = { nome: usuario.nickname, pts: usuario.pontuacaoDiaria || 0 };
    rankingBase.push(player);
    rankingBase.sort((a,b) => b.pts - a.pts);
    const top5 = rankingBase.slice(0,5);

    rankingList.innerHTML = top5.map((u,i) =>
      `<li><span>${i+1}º</span> ${u.nome} — ${u.pts} pts</li>`
    ).join("");
  }

  // Navegação
  document.getElementById("logo-home").onclick = () => window.location.href = "./home.html";
  document.getElementById("settings-btn").onclick = () => window.location.href = "../config/config.html";
  document.getElementById("play-btn").onclick = () => window.location.href = "../game/game.html";
  document.getElementById("music-btn").onclick = () => window.location.href = "../musicas/musicas.html";
  document.getElementById("profile-btn").onclick = () => window.location.href = "../profile/profile.html";
});
