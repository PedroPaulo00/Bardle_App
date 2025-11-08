// importa a configuração do firebase do arquivo local
import { firebaseConfig } from "/profile/firebase/firebase-config.js"

// importa os módulos principais do firebase necessários para o app
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js"
import {
  getAuth,
  onAuthStateChanged,
  updatePassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js"
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js"

// ===== Inicialização Firebase =====
// inicializa o app firebase com as configurações importadas
const app = initializeApp(firebaseConfig)
// inicializa a autenticação do firebase
const auth = getAuth(app)
// inicializa o banco de dados firestore
const db = getFirestore(app)

// ===== Elementos DOM =====
// captura os principais elementos do html usados na tela de perfil
const userPhoto = document.getElementById("user-photo")
const userName = document.getElementById("user-name")
const userEmail = document.getElementById("user-email")
const newName = document.getElementById("new-name")
const newPhoto = document.getElementById("new-photo")
const newPassword = document.getElementById("new-password")
const saveBtn = document.getElementById("save-changes")
const logoutBtn = document.getElementById("logout")
const modal = document.getElementById("logout-modal")
const confirmLogout = document.getElementById("confirm-logout")
const cancelLogout = document.getElementById("cancel-logout")
const profileIcon = document.getElementById("profile-icon")

// avatar padrão usado caso o usuário não tenha imagem cadastrada
const DEFAULT_AVATAR = "https://m.media-amazon.com/images/I/41XnjwqvnYL._UXNaN_FMjpg_QL85_.jpg"

// ===== Carregar usuário =====
// escuta o estado de autenticação do firebase e carrega os dados do usuário logado
onAuthStateChanged(auth, async (user) => {
  // se não houver usuário logado, redireciona para a tela de login
  if (!user) {
    window.location.href = "../auth/login.html"
    return
  }

  try {
    // busca os dados do usuário no firestore
    const userRef = doc(db, "usuarios", user.uid)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      // se o documento do usuário existir, preenche os dados na interface
      const data = userSnap.data()
      userName.textContent = data.nickname || "Usuário"
      userEmail.textContent = data.email || user.email
      const imgUrl = data.imgUrl && data.imgUrl.trim() ? data.imgUrl : DEFAULT_AVATAR
      userPhoto.src = imgUrl
      profileIcon.src = imgUrl
    } else {
      // se não existir registro no firestore, usa dados básicos do auth
      userPhoto.src = DEFAULT_AVATAR
      profileIcon.src = DEFAULT_AVATAR
      userName.textContent = user.displayName || "Usuário"
      userEmail.textContent = user.email
    }
  } catch (err) {
    // captura erros ao buscar ou carregar dados do usuário
    console.error("Erro ao carregar dados do usuário:", err)
    alert("Erro ao carregar dados do usuário")
  }
})

// ===== Salvar alterações =====
// escuta o clique no botão de salvar e aplica atualizações no firestore
saveBtn.addEventListener("click", async () => {
  const user = auth.currentUser
  if (!user) return

  const updates = {}
  // adiciona os campos modificados ao objeto de atualização
  if (newName.value.trim()) updates.nickname = newName.value.trim()
  if (newPhoto.value.trim()) updates.imgUrl = newPhoto.value.trim()

  try {
    // atualiza a senha se for válida (mínimo de 6 caracteres)
    if (newPassword.value.length >= 6) {
      await updatePassword(user, newPassword.value)
    }

    // aplica as alterações no firestore se houver algo para atualizar
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, "usuarios", user.uid), updates)
    }

    alert("Alterações salvas com sucesso!")
    location.reload()
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err)
    alert("Erro ao salvar alterações. Verifique se você está logado recentemente.")
  }
})

// ===== Logout =====
// mostra o modal de confirmação ao clicar no botão de sair
logoutBtn.addEventListener("click", () => modal.classList.remove("hidden"))
// cancela o logout e fecha o modal
cancelLogout.addEventListener("click", () => modal.classList.add("hidden"))
// confirma o logout e encerra a sessão do usuário
confirmLogout.addEventListener("click", async () => {
  await signOut(auth)
  window.location.href = "../auth/auth.html"
})

// ===== Navegação Top-Bar / Bottom-Nav =====
// mantém a navegação consistente com as outras telas do app
document.querySelector(".logo-area").addEventListener("click", () => window.location.href = "../home/home.html")
document.querySelector(".settings-btn").addEventListener("click", () => window.location.href = "../config/config.html")

document.querySelector(".bottom-nav button:nth-child(1)").addEventListener("click", () => window.location.href = "../home/home.html")
document.querySelector(".bottom-nav button:nth-child(2)").addEventListener("click", () => window.location.href = "../musicas/musicas.html")
document.querySelector("#profile-btn").addEventListener("click", () => window.location.href = "../profile/profile.html")
