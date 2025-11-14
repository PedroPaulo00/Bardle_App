// =============================
// game.js — Tela de jogo Bardle (ATUALIZADO + OVERLAY GLASS)
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
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =============================
//  ELEMENTOS PRINCIPAIS
// =============================
const coverImg = document.getElementById("cover-img");
const artistImg = document.getElementById("artist-img");
const artistName = document.getElementById("artist-name");
const trackTitle = document.getElementById("track-title");
const progressFill = document.getElementById("music-progress-fill");
const musicProgress = document.querySelector(".music-progress");
const musicProgressWrapper = document.querySelector(".music-progress-wrapper");
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

// =============================
//  OVERLAY "TOQUE PARA COMEÇAR"
// =============================
const startOverlay = document.createElement("div");
startOverlay.id = "start-overlay";
startOverlay.innerHTML = `
  <div class="glass-panel">
    <h2>CERTIFIQUE-SE DE AUMENTAR O VOLUME OU COLOCAR FONES DE OUVIDO!!</h2>
    <h2>Pronto?</h2>
    <button id="start-btn">COMEÇAR</button>
  </div>
`;
document.body.appendChild(startOverlay);

// estilo inline para o overlay
const style = document.createElement("style");
style.textContent = `
#start-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  backdrop-filter: blur(10px);
  background: rgba(0, 0, 0, 0.4);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.glass-panel {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 20px;
  padding: 40px 60px;
  text-align: center;
  box-shadow: 0 0 25px rgba(255,255,255,0.2);
  color: white;
  backdrop-filter: blur(15px);
}
.glass-panel h2 {
  font-size: 1.4rem;
  margin-bottom: 20px;
}
#start-btn {
  padding: 12px 32px;
  border: none;
  border-radius: 30px;
  background: linear-gradient(90deg, rgb(0,255,255), rgb(81,255,0));
  color: black;
  font-weight: bold;
  cursor: pointer;
  font-size: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
#start-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(0,255,255,0.7);
}
`;
document.head.appendChild(style);

// ao clicar, remove overlay e inicia o jogo
document.getElementById("start-btn").addEventListener("click", () => {
  startOverlay.classList.add("fade-out");
  startOverlay.style.transition = "opacity 0.5s ease";
  startOverlay.style.opacity = "0";
  setTimeout(() => startOverlay.remove(), 500);
  carregarMusicas(); // inicia tudo
});

// =============================
//  VARIÁVEIS DE ESTADO
// =============================
let screenFlashOverlay = null;
let fireworksCanvas = null;
let progressTimeEl = null;
let progressKnob = null;
let musicas = [];
let rodadaAtual = 0;
let pontuacoes = [];
let acertos = 0;
let erros = 0;
let currentAudio = null;
let musicDuration = 0;
let progressInterval = null;
let gradientMoveInterval = null;

// =============================
//  FUNÇÕES AUXILIARES
// =============================

function showToast(msg) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.classList.add("toast");
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

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

function ensureScreenFlashOverlay() {
  if (!screenFlashOverlay) {
    screenFlashOverlay = document.createElement("div");
    screenFlashOverlay.style.position = "fixed";
    screenFlashOverlay.style.top = 0;
    screenFlashOverlay.style.left = 0;
    screenFlashOverlay.style.width = "100%";
    screenFlashOverlay.style.height = "100%";
    screenFlashOverlay.style.pointerEvents = "none";
    screenFlashOverlay.style.zIndex = 9999;
    screenFlashOverlay.style.background = "rgba(255,0,0,0)";
    screenFlashOverlay.style.transition = "background 0.2s linear";
    document.body.appendChild(screenFlashOverlay);
  }
  return screenFlashOverlay;
}

async function flashRedTwice() {
  const overlay = ensureScreenFlashOverlay();
  const sleep = ms => new Promise(res => setTimeout(res, ms));
  for (let i = 0; i < 2; i++) {
    overlay.style.transition = "background 0.15s linear";
    overlay.style.background = "rgba(255,0,0,0.45)";
    await sleep(700);
    overlay.style.transition = "background 0.15s linear";
    overlay.style.background = "rgba(255,0,0,0)";
    await sleep(150);
  }
}

function createFireworks(duration = 2000) {
  if (fireworksCanvas) {
    fireworksCanvas.remove();
    fireworksCanvas = null;
  }
  const c = document.createElement("canvas");
  c.style.position = "fixed";
  c.style.left = 0;
  c.style.top = 0;
  c.style.width = "100%";
  c.style.height = "100%";
  c.style.pointerEvents = "none";
  c.style.zIndex = 10000;
  document.body.appendChild(c);
  fireworksCanvas = c;
  const ctx = c.getContext("2d");
  function resizeCanvas() {
    c.width = innerWidth * devicePixelRatio;
    c.height = innerHeight * devicePixelRatio;
    c.style.width = innerWidth + "px";
    c.style.height = innerHeight + "px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  const particles = [];
  const rand = (a,b) => a + Math.random() * (b-a);
  const bursts = Math.max(3, Math.floor(innerWidth / 300));
  for (let b = 0; b < bursts; b++) {
    const cx = rand(0.15,0.85) * innerWidth;
    const cy = rand(0.15,0.45) * innerHeight;
    const count = Math.floor(rand(20,40));
    const hue = Math.floor(rand(0,360));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(1, 6);
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(600, 1200),
        age: 0, size: rand(1.5, 3.5), hue,
      });
    }
  }
  let last = performance.now();
  let running = true;
  function frame(now) {
    if (!running) return;
    const dt = now - last;
    last = now;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for (let i = particles.length -1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        particles.splice(i,1);
        continue;
      }
      p.vy += 0.02 * (dt/16);
      p.x += p.vx * (dt/16);
      p.y += p.vy * (dt/16);
      const alpha = 1 - (p.age / p.life);
      ctx.beginPath();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `hsla(${p.hue}, 95%, 60%, ${alpha})`;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fill();
    }
    if (particles.length > 0) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setTimeout(() => {
    running = false;
    window.removeEventListener("resize", resizeCanvas);
    if (fireworksCanvas) {
      fireworksCanvas.remove();
      fireworksCanvas = null;
    }
  }, duration);
}

/* ===== BOTÃO: ripple e animação contínua ===== */
function attachButtonEffects(btn) {
  // prevenir múltiplas attachs
  if (btn.dataset.effectAttached) return;
  btn.dataset.effectAttached = "1";

  // ripple on click
  btn.addEventListener("click", function (e) {
    // ripple
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.style.position = "absolute";
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    ripple.style.transform = "translate(-50%,-50%)";
    ripple.style.width = ripple.style.height = "8px";
    ripple.style.borderRadius = "50%";
    ripple.style.opacity = "0.8";
    ripple.style.pointerEvents = "none";
    ripple.style.background = "rgba(255,255,255,0.6)";
    ripple.style.transition = "width 500ms ease, height 500ms ease, opacity 500ms ease";
    ripple.className = "btn-ripple";
    btn.appendChild(ripple);

    requestAnimationFrame(() => {
      ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) * 1.6 + "px";
      ripple.style.opacity = "0";
    });

    setTimeout(() => {
      ripple.remove();
    }, 600);
  });

  // adicionar leve animação contínua (transform subtle) via classe
  btn.classList.add("btn-animated");
}

/* ===== PROGRESSO: melhora visual (knob + tempo + movimento do gradiente) ===== */
function ensureProgressExtras() {
  if (!progressTimeEl) {
    progressTimeEl = document.createElement("div");
    progressTimeEl.id = "progress-time";
    progressTimeEl.style.width = "100%";
    progressTimeEl.style.display = "flex";
    progressTimeEl.style.justifyContent = "space-between";
    progressTimeEl.style.fontSize = "0.85rem";
    progressTimeEl.style.marginTop = "6px";
    musicProgressWrapper.appendChild(progressTimeEl);

    const left = document.createElement("span");
    left.id = "progress-time-left";
    left.textContent = "0:00";
    const right = document.createElement("span");
    right.id = "progress-time-right";
    right.textContent = "0:00";
    progressTimeEl.appendChild(left);
    progressTimeEl.appendChild(right);
  }

  if (!progressKnob) {
    progressKnob = document.createElement("div");
    progressKnob.id = "progress-knob";
    progressKnob.style.position = "absolute";
    progressKnob.style.top = "-6px";
    progressKnob.style.left = "0%";
    progressKnob.style.width = "14px";
    progressKnob.style.height = "14px";
    progressKnob.style.borderRadius = "50%";
    progressKnob.style.transform = "translateX(-50%)";
    progressKnob.style.boxShadow = "0 0 10px rgba(0,200,255,0.6)";
    progressKnob.style.background = "#ffffff";
    progressKnob.style.transition = "left 0.2s linear";
    // garante que o container seja position:relative
    musicProgress.style.position = "relative";
    musicProgress.appendChild(progressKnob);
  }

  // start moving gradient background for progressFill
  if (!gradientMoveInterval) {
    let pos = 0;
    gradientMoveInterval = setInterval(() => {
      pos = (pos + 1) % 360;
      // usa backgroundPosition para dar sensação de movimento
      progressFill.style.background = `linear-gradient(90deg, hsl(${(200+pos)%360} 95% 60%), hsl(${(230+pos)%360} 95% 50%))`;
    }, 120);
  }
}

/* ===== ATUALIZA PROGRESSO (chamada pelo setInterval) ===== */
function atualizarProgresso() {
  // limpa qualquer intervalo anterior
  if (progressInterval) clearInterval(progressInterval);

  ensureProgressExtras();

  // atualiza a cada 150ms para suavidade
  progressInterval = setInterval(() => {
    if (currentAudio && musicDuration > 0) {
      const progresso = (currentAudio.currentTime / musicDuration) * 100;
      const percent = Math.min(progresso, 100);
      progressFill.style.width = `${percent}%`;
      if (progressKnob) progressKnob.style.left = `${percent}%`;

      // atualizar tempos exibidos
      const leftEl = document.getElementById("progress-time-left");
      const rightEl = document.getElementById("progress-time-right");
      const secs = Math.floor(currentAudio.currentTime) || 0;
      const rem = Math.floor(musicDuration - secs) || 0;
      const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
      if (leftEl) leftEl.textContent = fmt(secs);
      if (rightEl) rightEl.textContent = fmt(Math.floor(musicDuration));
    }
  }, 150);
}

// limpa extras de UI de progresso (quando reinicia rodada)
function cleanupProgressExtras() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  if (gradientMoveInterval) {
    clearInterval(gradientMoveInterval);
    gradientMoveInterval = null;
  }
  if (progressKnob) {
    progressKnob.remove();
    progressKnob = null;
  }
  if (progressTimeEl) {
    progressTimeEl.remove();
    progressTimeEl = null;
  }
  // reset fill
  if (progressFill) progressFill.style.width = "0%";
}

// =============================
//  CARREGAR MÚSICAS
// =============================
async function carregarMusicas() {
  const snapshot = await getDocs(collection(db, "musicas"));
  let todasMusicas = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const primeira = todasMusicas.find(m => m.id === "joji1");
  const restantes = todasMusicas.filter(m => m.id !== "joji1");

  for (let i = restantes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [restantes[i], restantes[j]] = [restantes[j], restantes[i]];
  }

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

  // limpar efeitos anteriores
  cleanupProgressExtras();

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  // caminho ajustado para pasta sounds fora de /game
  currentAudio = new Audio(`../sounds/${musica.url_audio_local.split("/").pop()}`);
  currentAudio.load();

  currentAudio.addEventListener("loadedmetadata", () => {
    musicDuration = currentAudio.duration || 0;
    iniciarContagem(musica);
    currentAudio.play().catch(() => {});
    atualizarProgresso();
  });
}

// =============================
//  CONTAGEM REGRESSIVA
// =============================
function iniciarContagem(musica) {
  let tempoRestante = Math.floor(musicDuration);
  const warningThreshold = Math.floor(musicDuration * 0.25);

  timerEl.textContent = `+${tempoRestante} pts.`;
  timerEl.classList.remove("warning");

  const interval = setInterval(() => {
    tempoRestante--;
    timerEl.textContent = `+${tempoRestante} pts.`;

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
function gerarOpcoes(musica, interval) {
  const todas = [...musica.respostas_incorretas, musica.titulo];
  const embaralhadas = todas.sort(() => Math.random() - 0.5);

  optionsContainer.innerHTML = "";
  embaralhadas.forEach(opcao => {
    const btn = document.createElement("button");
    btn.classList.add("option-btn");
    btn.textContent = opcao;
    btn.style.position = "relative"; // para ripple absoluto
    btn.style.overflow = "hidden";
    // attach effects (ripple & subtle animation)
    attachButtonEffects(btn);

    btn.addEventListener("click", (ev) => {
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
//  FINALIZAR RODADA
// =============================
async function finalizarRodada(acertou, musica, tempoEsgotado = false, pontuacaoRodada = 0, btnSelecionado = null) {
  const botoes = document.querySelectorAll(".option-btn");

  // desabilita todos os botões no clique
  botoes.forEach(btn => btn.classList.add("disabled"));

  // marcações visuais
  botoes.forEach(btn => {
    if (btn.textContent === musica.titulo) {
      btn.classList.add("correct"); // verde com brilho
    } else if (btn === btnSelecionado && !acertou) {
      btn.classList.add("wrong"); // vermelho com brilho
    } else {
      btn.classList.add("disabled-gray"); // cinza
    }
  });

  // FEEDBACKS
  if (tempoEsgotado) {
    feedbackEl.textContent = "⏰ Tempo esgotado!";
    feedbackEl.className = "feedback timeout";
    erros++;
    flashRedTwice(); // efeito erro
  } else if (acertou) {
    feedbackEl.textContent = "✅ Você acertou!";
    feedbackEl.className = "feedback correct";
    acertos++;
    createFireworks(2000); // fogos por 2s
  } else {
    feedbackEl.textContent = "❌ Você errou!";
    feedbackEl.className = "feedback wrong";
    erros++;
    flashRedTwice();
  }

  feedbackEl.classList.remove("hidden");

  pontuacoes.push(pontuacaoRodada);
  updateRoundIndicators();

  nextRoundBtn.classList.remove("hidden");
  addToPlaylistBtn.classList.remove("hidden");

  nextRoundBtn.onclick = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    cleanupProgressExtras();
    rodadaAtual++;
    iniciarRodada();
  };

  addToPlaylistBtn.onclick = () => adicionarMusicaPlaylist(musica.id);
}


// =============================
//  ADICIONAR À PLAYLIST
// =============================
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
async function finalizarJogo() {
  const total = pontuacoes.reduce((a, b) => a + b, 0);

  // usa innerHTML para exibir cada item em linha separada
  finalScoreEl.innerHTML = `
    <strong>Pontuação total:</strong> ${total}<br>
    <strong>Acertos:</strong> ${acertos}<br>
    <strong>Erros:</strong> ${erros}
  `;

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
// só inicia o Firebase e espera clique do botão COMEÇAR
onAuthStateChanged(auth, () => {
  // nada aqui — inicia após clique no overlay
});
