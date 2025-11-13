// importa as configs do firebase e os módulos necessários
import { firebaseConfig } from "/musicas/firebase/firebase-config.js"
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js"
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js"
import { getFirestore, doc, getDoc, updateDoc, arrayRemove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js"

// inicializa o app firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// seleciona os elementos do DOM usados no player e na playlist
const musicListEl = document.getElementById("music-list")
const currentCover = document.getElementById("current-cover")
const currentTitle = document.getElementById("current-title")
const currentArtist = document.getElementById("current-artist")
const progressBar = document.getElementById("progress")
const progressHandle = document.getElementById("progress-handle")
const playPauseBtn = document.getElementById("play-pause")
const nextBtn = document.getElementById("next")
const prevBtn = document.getElementById("prev")
const profileImg = document.getElementById("profile-img")
const progressContainer = document.querySelector(".progress-bar")

// cria variáveis globais
let playlist = []
let currentIndex = -1
let userUid = null
const audio = new Audio()
let progressInterval = null

// Web Audio API (analyser) para visualizador / detecção de picos
let audioCtx = null
let analyser = null
let dataArray = null
let bufferLength = 0
let energyHistory = []      // para detecção de picos
let lastPeakTime = 0
let peakTimestamps = []     // para calcular BPM
let waveDots = []           // elementos do fundo que serão animados

// capa padrão usada quando não há imagem
const DEFAULT_COVER = "https://m.media-amazon.com/images/I/41XnjwqvnYL._UXNaN_FMjpg_QL85_.jpg"

// músicas fixas que sempre aparecem
const placeholders = [
  {
    id: "placeholder1",
    titulo: "Id",
    artista: "Keshi",
    url: "assets/keshi.mp3",
    capa: "https://i1.sndcdn.com/artworks-vydeGd0WgUVQ-0-t500x500.jpg",
    fixo: true
  },
  {
    id: "placeholder2",
    titulo: "e-Asphyxiation",
    artista: "Cafuné",
    url: "assets/cafune.mp3",
    capa: "https://f4.bcbits.com/img/a3615129963_10.jpg",
    fixo: true
  }
]

// verifica se o caminho é uma URL completa
function isFullUrl(url) {
  return /^https?:\/\//i.test(url)
}

// retorna o nome do arquivo sem o caminho completo
function basename(path) {
  return path?.split("/").pop() || ""
}

// monta o caminho da música na pasta sounds
function buildAudioPath(field) {
  if (!field) return ""
  if (isFullUrl(field)) return field
  const name = basename(field)
  return `/sounds/${name}`
}

// mostra um aviso rápido na tela (aparece somente quando chamado)
function showToast(msg) {
  const c = document.getElementById("toast-container")
  c.style.display = "flex"
  const t = document.createElement("div")
  t.className = "toast info"
  t.textContent = msg
  c.appendChild(t)
  // remove após 2.5s; se não houver mais toasts, esconde o container
  setTimeout(() => {
    t.remove()
    if (!c.querySelector(".toast")) c.style.display = "none"
  }, 2500)
}

// formata segundos em minutos:segundos
function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? "0" : ""}${s}`
}

// define o estado inicial (nada tocando)
function setNowPlayingPlaceholder() {
  currentCover.src = DEFAULT_COVER
  currentTitle.textContent = "Nada tocando"
  currentArtist.textContent = "—"
  progressBar.style.width = "0%"
  progressHandle.style.left = `0%`
  playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`
  clearInterval(progressInterval)
  currentIndex = -1
  document.querySelectorAll(".music-item").forEach(el => el.classList.remove("playing"))
  stopAnalyser()
}

// atualiza a barra de progresso e o tempo
function updateProgress() {
  if (!audio.duration || isNaN(audio.duration)) return
  const pct = (audio.currentTime / audio.duration) * 100
  progressBar.style.width = `${pct}%`
  // atualiza posição do handle (limite 0..100)
  progressHandle.style.left = `${Math.min(100, Math.max(0, pct))}%`
  const ct = document.getElementById("current-time")
  const tt = document.getElementById("total-time")
  ct.textContent = formatTime(audio.currentTime)
  tt.textContent = formatTime(audio.duration)
}

// cria um loop para atualizar o progresso enquanto toca
function startProgressLoop() {
  clearInterval(progressInterval)
  progressInterval = setInterval(updateProgress, 200)
}

// destaca visualmente a música atual na lista
function highlightCurrentSong() {
  document.querySelectorAll(".music-item").forEach((li, i) => {
    li.classList.toggle("playing", i === currentIndex)
  })
}

// inicia o analisador WebAudio (apenas 1 vez por sessão)
function startAnalyserIfNeeded() {
  if (audioCtx && analyser) return
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioCtx.createMediaElementSource(audio)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 1024
    bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(bufferLength)
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    // pega referência aos dots do fundo
    waveDots = Array.from(document.querySelectorAll(".now-wave-bg .wave-dot"))
    // inicia loop visual
    requestAnimationFrame(visualLoop)
  } catch (err) {
    console.warn("WebAudio API não disponível:", err)
  }
}

// para o analisador (quando parar a reprodução)
function stopAnalyser() {
  // não destrói o audioCtx para evitar problemas de re-criação (mas limpa arrays)
  energyHistory = []
  peakTimestamps = []
  lastPeakTime = 0
}

// algoritmo simples de detecção de picos / BPM
function processAudioForBeat() {
  if (!analyser || !dataArray) return null
  analyser.getByteFrequencyData(dataArray)
  // calculo de energia (somatória de bandas baixas-médias)
  // escolhemos bandas baixas para batida (0..freqLimit)
  let energy = 0
  const lowFreqLimit = Math.floor(bufferLength * 0.12) // usa ~12% do espectro baixo
  for (let i = 0; i < lowFreqLimit; i++) {
    energy += dataArray[i]
  }
  const timeNow = performance.now()
  // guarda histórico curto
  energyHistory.push({ t: timeNow, e: energy })
  // mantém apenas últimos 3000ms
  while (energyHistory.length && timeNow - energyHistory[0].t > 3000) energyHistory.shift()
  // calcula média
  const avg = energyHistory.reduce((s, x) => s + x.e, 0) / (energyHistory.length || 1)
  // detecção de pico: energy > avg * factor e intervalo mínimo desde último pico
  const thresholdFactor = 1.45 // sensibilidade (ajustável)
  const minIntervalMs = 240    // evita detecções muito próximo (>= ~250ms)
  if (energy > avg * thresholdFactor && (timeNow - lastPeakTime) > minIntervalMs) {
    // pico detectado
    lastPeakTime = timeNow
    peakTimestamps.push(timeNow)
    // manter apenas últimas 12 picos
    if (peakTimestamps.length > 12) peakTimestamps.shift()
    // calcula BPM estimado (média dos intervalos)
    if (peakTimestamps.length >= 2) {
      const intervals = []
      for (let i = 1; i < peakTimestamps.length; i++) {
        intervals.push((peakTimestamps[i] - peakTimestamps[i-1]) / 1000) // s
      }
      const avgInterval = intervals.reduce((s,a) => s+a, 0) / intervals.length
      const bpm = Math.round(60 / avgInterval)
      return { energy, bpm, scale: Math.min(1.6, 0.6 + (energy / (avg || 1)) * 0.6) }
    }
    return { energy, bpm: null, scale: Math.min(1.6, 0.6 + (energy / (avg || 1)) * 0.6) }
  } else {
    // sem pico, retorna energia relativa pra animação contínua
    const scale = Math.min(1.2, 0.6 + (energy / (avg || 1)) * 0.4)
    return { energy, bpm: null, scale }
  }
}

// loop que anima as ondas com base no analisador
function visualLoop() {
  requestAnimationFrame(visualLoop)
  if (!analyser || !dataArray || !waveDots.length) return
  const result = processAudioForBeat()
  if (!result) return
  // usa result.scale para ajustar cada dot (cria variação por índice)
  waveDots.forEach((dot, i) => {
    // variação por índice para aparência orgânica
    const idxFactor = 1 + (i - (waveDots.length/2)) * 0.07
    const s = Math.max(0.4, result.scale * idxFactor)
    dot.style.transform = `scale(${s})`
    // ajustar opacidade com energy
    const op = Math.min(0.35, 0.06 + (result.energy / 1500))
    dot.style.opacity = `${Math.max(0.03, op)}`
  })
  // opcional: se result.bpm detectado, poderíamos exibir algo ou ajustar timing (já usado indiretamente)
}

// toca a música de um índice específico da playlist
function playItemAt(index) {
  const item = playlist[index]
  if (!item) return

  currentIndex = index
  highlightCurrentSong()

  let src = item.url
  if (!isFullUrl(src) && !src.startsWith("assets/")) src = buildAudioPath(src)

  audio.src = src
  audio.crossOrigin = "anonymous" // permite análise de fontes remotas que aceitam CORS
  audio.load()

  currentCover.src = item.capa || DEFAULT_COVER
  currentTitle.textContent = item.titulo
  currentArtist.textContent = item.artista

  audio.play()
    .then(() => {
      playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`
      startProgressLoop()
      showToast(`Tocando: ${item.titulo}`)
      startAnalyserIfNeeded()
      // reinicia histórico pra não carregar picos antigos
      energyHistory = []
      peakTimestamps = []
      lastPeakTime = 0
    })
    .catch(err => {
      console.error("Erro ao tocar:", err)
      showToast("Erro ao reproduzir a música")
      setNowPlayingPlaceholder()
    })
}

// pausa ou continua a reprodução atual
function playPause() {
  if (!audio.src) return
  if (audio.paused) {
    audio.play()
    playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`
  } else {
    audio.pause()
    playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`
  }
}

// toca a próxima música da playlist
function playNext() {
  if (currentIndex < playlist.length - 1) {
    playItemAt(currentIndex + 1)
  } else {
    audio.pause()
    setNowPlayingPlaceholder()
  }
}

// volta uma música na playlist
function playPrev() {
  if (currentIndex > 0) playItemAt(currentIndex - 1)
}

// eventos dos botões principais do player
playPauseBtn.addEventListener("click", playPause)
nextBtn.addEventListener("click", playNext)
prevBtn.addEventListener("click", playPrev)

// permite clicar na barra de progresso para pular partes da música
progressContainer.addEventListener("click", (e) => {
  if (!audio.duration) return
  const rect = progressContainer.getBoundingClientRect()
  const pct = (e.clientX - rect.left) / rect.width
  audio.currentTime = pct * audio.duration
  updateProgress()
})

// atualiza handle também durante arraste do window (garante sincronismo)
window.addEventListener("resize", updateProgress)

// toca a próxima música automaticamente ao fim
audio.addEventListener("ended", playNext)
audio.addEventListener("timeupdate", updateProgress)

// cria o modal de confirmação de exclusão (inicialmente escondido)
const modal = document.createElement("div")
modal.id = "confirm-modal"
modal.innerHTML = `
  <div class="modal-content glass">
    <h3>Remover música?</h3>
    <p>Tem certeza que deseja excluir esta música da sua playlist?</p>
    <div class="modal-buttons">
      <button class="cancel">Cancelar</button>
      <button class="confirm">Excluir</button>
    </div>
  </div>
`
document.body.appendChild(modal)

let pendingDeleteIndex = null

// abre o modal pedindo confirmação
function openModal(index) {
  pendingDeleteIndex = index
  modal.classList.add("active")
}

// fecha o modal sem excluir
function closeModal() {
  pendingDeleteIndex = null
  modal.classList.remove("active")
}

modal.querySelector(".cancel").addEventListener("click", closeModal)
modal.querySelector(".confirm").addEventListener("click", async () => {
  if (pendingDeleteIndex !== null) {
    await confirmDeleteSong(pendingDeleteIndex)
  }
  closeModal()
})

// remove realmente a música do banco e da lista
async function confirmDeleteSong(index) {
  const song = playlist[index]
  if (!song || !userUid || song.fixo) return

  try {
    const userRef = doc(db, "usuarios", userUid)
    await updateDoc(userRef, { musicas: arrayRemove(song.id) })
    playlist.splice(index, 1)
    renderPlaylist()
    showToast("Música removida da playlist")

    if (index === currentIndex) setNowPlayingPlaceholder()
  } catch (err) {
    console.error("Erro ao excluir:", err)
    showToast("Erro ao excluir música")
  }
}

// desenha a lista de músicas na tela
function renderPlaylist() {
  musicListEl.innerHTML = ""
  playlist.forEach((item, i) => {
    const li = document.createElement("li")
    li.className = "music-item"
    li.innerHTML = `
      <div class="music-left" style="display:flex;align-items:center;gap:10px;">
        <img src="${item.capa || DEFAULT_COVER}" alt="Capa" width="50" height="50" style="border-radius:10px;object-fit:cover;">
        <div class="details">
          <h4>${item.titulo}</h4>
          <p>${item.artista}</p>
        </div>
      </div>
      <div class="actions">
        <button class="play" title="Tocar"></button>
        <button class="delete" ${item.fixo ? "disabled" : ""} title="Excluir">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `
    // clique no botão "play"
li.querySelector(".play").addEventListener("click", (e) => {
  e.stopPropagation() // impede duplicação do clique
  playItemAt(i)
})

// clique no botão "excluir"
if (!item.fixo)
  li.querySelector(".delete").addEventListener("click", (e) => {
    e.stopPropagation()
    openModal(i)
  })

// NOVO: clique em qualquer parte do item toca a música
li.addEventListener("click", () => {
  playItemAt(i)
})

    musicListEl.appendChild(li)
  })
  highlightCurrentSong()
}

// carrega dados do usuário e suas músicas do firebase
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "../auth/auth.html")
  userUid = user.uid
  profileImg.src = user.photoURL || "../assets/user-placeholder.jpg"

  playlist = [...placeholders]

  try {
    const userRef = doc(db, "usuarios", userUid)
    const snap = await getDoc(userRef)
    const userSongs = snap.exists() ? (snap.data().musicas || []) : []

    for (const id of userSongs) {
      const songDoc = await getDoc(doc(db, "musicas", id))
      if (songDoc.exists()) {
        const d = songDoc.data()
        playlist.push({
          id,
          titulo: d.titulo || id,
          artista: d.artista || "—",
          url: buildAudioPath(d.url_audio_local || ""),
          capa: d.url_capa_imagem || DEFAULT_COVER,
          fixo: false
        })
      }
    }
  } catch (err) {
    console.error("Erro ao carregar playlist:", err)
  }

  renderPlaylist()
  setNowPlayingPlaceholder()
})

// cria e injeta o container das ondas BPM
const nowPlayingSection = document.querySelector(".now-playing")
const bpmWaves = document.createElement("div")
bpmWaves.className = "bpm-waves"
nowPlayingSection.appendChild(bpmWaves)

// função que analisa BPM usando Web Audio API
async function detectBPM(audioElement) {
  const audioCtx = new AudioContext()
  const src = audioCtx.createMediaElementSource(audioElement)
  const analyser = audioCtx.createAnalyser()
  src.connect(analyser)
  analyser.connect(audioCtx.destination)
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  let bpmEstimate = 100
  function estimate() {
    analyser.getByteFrequencyData(dataArray)
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength
    bpmEstimate = Math.max(60, Math.min(160, avg / 2))
  }
  setInterval(estimate, 2000)
  return () => bpmEstimate
}

// cria ondas pulsantes com base no BPM detectado
let getBPM = null
let bpmInterval = null
async function startBpmWaves() {
  getBPM = await detectBPM(audio)
  clearInterval(bpmInterval)
  bpmInterval = setInterval(() => {
    const bpm = getBPM()
    const span = document.createElement("span")
    const size = Math.random() * 150 + 100
    span.style.width = `${size}px`
    span.style.height = `${size}px`
    span.style.left = `${Math.random() * 80 + 10}%`
    span.style.top = `${Math.random() * 80 + 10}%`
    span.style.animationDuration = `${60 / bpm}s`
    bpmWaves.appendChild(span)
    setTimeout(() => span.remove(), 2000)
  }, 60000 / 8 / 100) // ajusta densidade das ondas
}

// ao tocar música, ativa as ondas BPM
audio.addEventListener("play", () => {
  startBpmWaves()
})

// ao pausar, para as ondas
audio.addEventListener("pause", () => {
  clearInterval(bpmInterval)
})


// botões de navegação inferior
document.getElementById("logo-home").onclick = () => window.location.href = "../home/home.html"
document.getElementById("settings-btn").onclick = () => window.location.href = "../config/config.html"
document.getElementById("home-btn").onclick = () => window.location.href = "../home/home.html"
document.getElementById("music-btn").onclick = () => window.location.href = "../musicas/musicas.html"
document.getElementById("profile-btn").onclick = () => window.location.href = "../profile/profile.html"
