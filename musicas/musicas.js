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

// mostra um aviso rápido na tela
function showToast(msg) {
  const c = document.getElementById("toast-container")
  const t = document.createElement("div")
  t.className = "toast info"
  t.textContent = msg
  c.appendChild(t)
  setTimeout(() => t.remove(), 2500)
}

// formata segundos em minutos:segundos
function formatTime(sec) {
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
  playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`
  clearInterval(progressInterval)
  currentIndex = -1
  document.querySelectorAll(".music-item").forEach(el => el.classList.remove("playing"))
}

// atualiza a barra de progresso e o tempo
function updateProgress() {
  if (!audio.duration) return
  const pct = (audio.currentTime / audio.duration) * 100
  progressBar.style.width = `${pct}%`
  document.getElementById("current-time").textContent = formatTime(audio.currentTime)
  document.getElementById("total-time").textContent = formatTime(audio.duration)
}

// cria um loop para atualizar o progresso enquanto toca
function startProgressLoop() {
  clearInterval(progressInterval)
  progressInterval = setInterval(updateProgress, 300)
}

// destaca visualmente a música atual na lista
function highlightCurrentSong() {
  document.querySelectorAll(".music-item").forEach((li, i) => {
    li.classList.toggle("playing", i === currentIndex)
  })
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
  audio.load()

  currentCover.src = item.capa || DEFAULT_COVER
  currentTitle.textContent = item.titulo
  currentArtist.textContent = item.artista

  audio.play()
    .then(() => {
      playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`
      startProgressLoop()
      showToast(`Tocando: ${item.titulo}`)
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

// toca a próxima música automaticamente ao fim
audio.addEventListener("ended", playNext)
audio.addEventListener("timeupdate", updateProgress)

// cria o modal de confirmação de exclusão
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
      <div class="music-left">
        <img src="${item.capa || DEFAULT_COVER}" alt="Capa">
        <div class="details">
          <h4>${item.titulo}</h4>
          <p>${item.artista}</p>
        </div>
      </div>
      <div class="actions">
        <button class="play"><i class="fas fa-play"></i></button>
        <button class="delete" ${item.fixo ? "disabled" : ""}>
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `
    li.querySelector(".play").addEventListener("click", () => playItemAt(i))
    if (!item.fixo)
      li.querySelector(".delete").addEventListener("click", () => openModal(i))
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

// botões de navegação inferior
document.getElementById("logo-home").onclick = () => window.location.href = "../home/home.html"
document.getElementById("settings-btn").onclick = () => window.location.href = "../config/config.html"
document.getElementById("home-btn").onclick = () => window.location.href = "../home/home.html"
document.getElementById("music-btn").onclick = () => window.location.href = "../musicas/musicas.html"
document.getElementById("profile-btn").onclick = () => window.location.href = "../profile/profile.html"
