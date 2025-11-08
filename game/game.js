// =============================
// game.js — Tela de jogo Bardle
// =============================

import { firebaseConfig } from "/game/firebase/firebase-config.js";
import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// =============================
//  INICIALIZAÇÃO FIREBASE
// =============================
// inicializa o app firebase e obtém instâncias do firestore e auth
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =============================
//  ELEMENTOS PRINCIPAIS
// =============================
// captura todos os elementos do DOM usados na tela do jogo
const coverImg = document.getElementById("cover-img");
const artistImg = document.getElementById("artist-img");
const artistName = document.getElementById("artist-name");
const trackTitle = document.getElementById("track-title");
const progressFill = document.getElementById("music-progress-fill");
const timerEl = document.getElementById("timer");
const optionsContainer = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");
const nextRoundBtn = document.getElementById("next-round-btn");
const addToPlaylistBtn = document.getElementById("add-to-playlist-btn");
const finalModal = document.getElementById("final-modal");
const finalScoreEl = document.getElementById("final-score");
const playAgainBtn = document.getElementById("play-again-btn");
const goHomeBtn = document.getElementById("go-home-btn");
const roundStrip = document.getElementById("round-strip");
const roundIndicator = document.getElementById("round-indicator");

// variáveis de estado do jogo
let musicas = [];
let rodadaAtual = 0;
let pontuacoes = [];
let acertos = 0;
let erros = 0;
let currentAudio = null;
let musicDuration = 0;
let progressInterval = null;

// =============================
//  FUNÇÕES AUXILIARES
// =============================

// exibe uma notificação simples (toast) na tela
function showToast(msg) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.classList.add("toast");
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// atualiza os indicadores de rodada (as bolinhas do topo)
function updateRoundIndicators() {
  const pills = document.querySelectorAll(".round-pill");
  pills.forEach((p, i) => {
    p.className = "round-pill";
    if (i < rodadaAtual) {
      p.classList.add(pontuacoes[i] > 0 ? "correct" : "wrong");
    } else if (i === rodadaAtual) {
      p.classList.add("active");
    }
  });
  roundIndicator.textContent = `Rodada ${rodadaAtual + 1} / 10`;
}

// =============================
//  CARREGAR MÚSICAS
// =============================
// busca todas as músicas no firestore e define a primeira rodada com a música "joji1"
async function carregarMusicas() {
  const snapshot = await getDocs(collection(db, "musicas"));
  let todasMusicas = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // encontra a música joji1 e separa as outras
  const primeira = todasMusicas.find(m => m.id === "joji1");
  const restantes = todasMusicas.filter(m => m.id !== "joji1");

  // embaralha as restantes
  for (let i = restantes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [restantes[i], restantes[j]] = [restantes[j], restantes[i]];
  }

  // junta joji1 + 9 aleatórias (ou menos se não tiver tantas)
  musicas = [primeira, ...restantes.slice(0, 9)].filter(Boolean);

  if (musicas.length === 0) {
    showToast("Nenhuma música encontrada no banco!");
    return;
  }

  iniciarJogo();
}

// =============================
//  INICIAR JOGO
// =============================
// reinicia as variáveis do jogo e cria os indicadores de rodada
function iniciarJogo() {
  rodadaAtual = 0;
  pontuacoes = [];
  acertos = 0;
  erros = 0;

  // cria os indicadores de rodada
  roundStrip.innerHTML = "";
  for (let i = 0; i < 10; i++) {
    const pill = document.createElement("div");
    pill.classList.add("round-pill");
    roundStrip.appendChild(pill);
  }

  iniciarRodada();
}

// =============================
//  INICIAR RODADA
// =============================
// define a música atual e prepara o áudio e as opções
function iniciarRodada() {
  if (rodadaAtual >= musicas.length) return finalizarJogo();

  feedbackEl.classList.add("hidden");
  nextRoundBtn.classList.add("hidden");
  addToPlaylistBtn.classList.add("hidden");
  updateRoundIndicators();

  const musica = musicas[rodadaAtual];
  coverImg.src = musica.url_capa_imagem || "https://via.placeholder.com/400";
  artistImg.src = musica.url_imagem_artista || "https://via.placeholder.com/200";
  artistName.textContent = musica.artista;
  trackTitle.textContent = "";

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  // caminho ajustado para pasta sounds fora de /game
  currentAudio = new Audio(`../sounds/${musica.url_audio_local.split("/").pop()}`);
  currentAudio.load();

  currentAudio.addEventListener("loadedmetadata", () => {
    musicDuration = currentAudio.duration;
    iniciarContagem(musica);
    currentAudio.play();
    atualizarProgresso();
  });
}

// =============================
//  CONTAGEM REGRESSIVA
// =============================
// controla o tempo da rodada e finaliza caso o tempo acabe
function iniciarContagem(musica) {
  let tempoRestante = Math.floor(musicDuration);
  const warningThreshold = Math.floor(musicDuration * 0.25);

  timerEl.textContent = `${tempoRestante}s`;
  timerEl.classList.remove("warning");

  const interval = setInterval(() => {
    tempoRestante--;
    timerEl.textContent = `${tempoRestante}s`;

    if (tempoRestante <= warningThreshold) {
      timerEl.classList.add("warning");
    }

    if (tempoRestante <= 0) {
      clearInterval(interval);
      finalizarRodada(false, musica, true);
    }
  }, 1000);

  gerarOpcoes(musica, interval);
}

// =============================
//  GERAR OPÇÕES
// =============================
// cria os quatro botões de resposta e trata os cliques
function gerarOpcoes(musica, interval) {
  const todas = [...musica.respostas_incorretas, musica.titulo];
  const embaralhadas = todas.sort(() => Math.random() - 0.5);

  optionsContainer.innerHTML = "";
  embaralhadas.forEach(opcao => {
    const btn = document.createElement("button");
    btn.classList.add("option-btn");
    btn.textContent = opcao;

    btn.addEventListener("click", () => {
      clearInterval(interval);
      const tempoUsado = musicDuration - parseInt(timerEl.textContent);
      const pontuacaoRodada = opcao === musica.titulo
        ? Math.max(0, Math.floor(musicDuration - tempoUsado))
        : 0;

      finalizarRodada(opcao === musica.titulo, musica, false, pontuacaoRodada, btn);
    });

    optionsContainer.appendChild(btn);
  });
}

// =============================
//  ATUALIZAR BARRA DE PROGRESSO
// =============================
// atualiza a barra de progresso conforme o áudio toca
function atualizarProgresso() {
  if (progressInterval) clearInterval(progressInterval);

  progressInterval = setInterval(() => {
    if (currentAudio && musicDuration > 0) {
      const progresso = (currentAudio.currentTime / musicDuration) * 100;
      progressFill.style.width = `${Math.min(progresso, 100)}%`;
    }
  }, 200);
}

// =============================
//  FINALIZAR RODADA
// =============================
// mostra feedback de acerto, erro ou tempo esgotado e habilita botões de próxima rodada e playlist
function finalizarRodada(acertou, musica, tempoEsgotado = false, pontuacaoRodada = 0, btnSelecionado = null) {
  const botoes = document.querySelectorAll(".option-btn");
  botoes.forEach(btn => btn.classList.add("disabled"));

  botoes.forEach(btn => {
    if (btn.textContent === musica.titulo) btn.classList.add("correct");
    else if (btn === btnSelecionado && !acertou) btn.classList.add("wrong");
    else btn.classList.add("disabled");
  });

  if (tempoEsgotado) {
    feedbackEl.textContent = "⏰ Tempo esgotado!";
    feedbackEl.className = "feedback timeout";
    erros++;
  } else if (acertou) {
    feedbackEl.textContent = "✅ Você acertou!";
    feedbackEl.className = "feedback correct";
    acertos++;
  } else {
    feedbackEl.textContent = "❌ Você errou!";
    feedbackEl.className = "feedback wrong";
    erros++;
  }

  feedbackEl.classList.remove("hidden");
  pontuacoes.push(pontuacaoRodada);

  updateRoundIndicators();

  nextRoundBtn.classList.remove("hidden");
  addToPlaylistBtn.classList.remove("hidden");

  nextRoundBtn.onclick = () => {
    rodadaAtual++;
    iniciarRodada();
  };

  addToPlaylistBtn.onclick = () => adicionarMusicaPlaylist(musica.id);
}

// =============================
//  ADICIONAR À PLAYLIST
// =============================
// adiciona a música atual à playlist do usuário no firestore
async function adicionarMusicaPlaylist(idMusica) {
  const user = auth.currentUser;
  if (!user) {
    showToast("Faça login para salvar na playlist!");
    return;
  }

  const userRef = doc(db, "usuarios", user.uid);
  await updateDoc(userRef, {
    musicas: arrayUnion(idMusica)
  });

  showToast("🎵 Música adicionada à sua playlist!");
}

// =============================
//  FINALIZAR JOGO
// =============================
// calcula a pontuação total, exibe o resumo e salva no banco se o usuário estiver logado
async function finalizarJogo() {
  const total = pontuacoes.reduce((a, b) => a + b, 0);
  finalScoreEl.textContent = `Pontuação total: ${total}\nAcertos: ${acertos}\nErros: ${erros}`;
  finalModal.classList.remove("hidden");

  const user = auth.currentUser;
  if (user) {
    const userRef = doc(db, "usuarios", user.uid);
    await setDoc(
      userRef,
      { pontuacaoDiaria: total },
      { merge: true }
    );
  }

  playAgainBtn.onclick = () => {
    finalModal.classList.add("hidden");
    iniciarJogo();
  };

  goHomeBtn.onclick = () => {
    window.location.href = "/home/home.html";
  };
}

// =============================
//  INÍCIO
// =============================
// inicia o carregamento das músicas quando o usuário está autenticado
onAuthStateChanged(auth, () => {
  carregarMusicas();
});
