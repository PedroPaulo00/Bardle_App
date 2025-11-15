import { firebaseConfig } from "/home/firebase/firebase-config.js"; //AQUI!! Config Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js"; //AQUI!! Inicialização Firebase
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js"; //AQUI!! Auth Firebase
import { getFirestore, doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js"; //AQUI!! Firestore Firebase

// Inicializa Firebase
const app = initializeApp(firebaseConfig); //AQUI!! Inicializa App Firebase
const auth = getAuth(app); //AQUI!! Auth
const db = getFirestore(app); //AQUI!! Firestore

document.addEventListener("DOMContentLoaded", () => { //AQUI!! Espera DOM carregado
  const welcomeMsg = document.getElementById("welcome-msg"); //AQUI!! Elemento mensagem de boas-vindas
  const dailyScore = document.getElementById("daily-score"); //AQUI!! Elemento pontuação diária
  const rankingList = document.getElementById("ranking-list"); //AQUI!! Elemento lista ranking
  const profileImg = document.getElementById("profile-img"); //AQUI!! Elemento imagem do perfil
  const profileImgSection = document.getElementById("profile-img-section"); //AQUI!! Elemento imagem em outra seção

  onAuthStateChanged(auth, async (user) => { //AQUI!! Monitoramento do login
    if (!user) {
      window.location.href = "../auth/auth.html"; //AQUI!! Redireciona se não logado
      return;
    }

    const userRef = doc(db, "usuarios", user.uid); //AQUI!! Referência do usuário no Firestore
    const userSnap = await getDoc(userRef); //AQUI!! Busca dados do usuário

    if (userSnap.exists()) { //AQUI!! Verifica se usuário existe
      const dados = userSnap.data(); //AQUI!! Dados do usuário
      welcomeMsg.textContent = `Olá, ${dados.nickname || "Usuário"}!`; //AQUI!! Atualiza mensagem
      dailyScore.textContent = `Sua pontuação de hoje: ${dados.pontuacaoDiaria || 0}`; //AQUI!! Atualiza pontuação

      // Carrega imagem do usuário da internet
      const imgUrl = dados.imgUrl || "../assets/user-placeholder.jpg"; //AQUI!! URL da imagem
      profileImg.src = imgUrl; //AQUI!! Aplica imagem
      profileImg.onerror = () => profileImg.src = "../assets/user-placeholder.jpg"; //AQUI!! Fallback se erro
      profileImgSection.src = imgUrl; //AQUI!! Aplica em outra seção
      profileImgSection.onerror = () => profileImgSection.src = "../assets/user-placeholder.jpg"; //AQUI!! Fallback

      atualizarRanking(dados); //AQUI!! Atualiza ranking
    }
  });

  function atualizarRanking(usuario) { //AQUI!! Função ranking
    const rankingBase = [ //AQUI!! Lista inicial ranking
      { nome: "NicoNiner9", pts: 180 },
      { nome: "21P", pts: 150 },
      { nome: "Ned17", pts: 130 },
      { nome: "TJoseph", pts: 110 },
      { nome: "DunDunDun", pts: 90 }
    ];

    const player = { nome: usuario.nickname, pts: usuario.pontuacaoDiaria || 0 }; //AQUI!! Dados do usuário
    rankingBase.push(player); //AQUI!! Adiciona usuário
    rankingBase.sort((a, b) => b.pts - a.pts); //AQUI!! Ordena ranking
    const top5 = rankingBase.slice(0, 5); //AQUI!! Pega top 5

    rankingList.innerHTML = top5 //AQUI!! Renderiza ranking
      .map((u, i) => {
        const isUser = u.nome === usuario.nickname; //AQUI!! Destaca usuário
        const color = isUser ? "style='color: #00ff62; font-weight: bold;'" : ""; //AQUI!! Estilo do usuário
        return `<li ${color}><span>${i + 1}º</span> ${u.nome} — ${u.pts} pts</li>`; //AQUI!! Item ranking
      })
      .join("");
  }

  // Navegação
  document.getElementById("logo-home").onclick = () => window.location.href = "./home.html"; //AQUI!! Botão logo
  document.getElementById("settings-btn").onclick = () => window.location.href = "../config/config.html"; //AQUI!! Botão configurações
  document.getElementById("play-btn").onclick = () => window.location.href = "../game/game.html"; //AQUI!! Botão jogar
  document.getElementById("music-btn").onclick = () => window.location.href = "../musicas/musicas.html"; //AQUI!! Botão músicas
  document.getElementById("profile-btn").onclick = () => window.location.href = "../profile/profile.html"; //AQUI!! Botão perfil
}); //AQUI!! Fim DOMContentLoaded
