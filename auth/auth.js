import { firebaseConfig } from "./firebase/firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// inicializa o firebase com as configurações importadas
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// aguarda o carregamento do documento para associar eventos e manipular elementos
document.addEventListener("DOMContentLoaded", () => {
  // referências dos painéis principais
  const welcome = document.getElementById("welcome-screen");
  const login = document.getElementById("login-form");
  const register = document.getElementById("register-form");

  // botões de navegação entre telas
  const enterBtn = document.getElementById("enter-btn");
  const toRegister = document.getElementById("to-register");
  const backArrow = document.getElementById("back-arrow");

  // áreas de feedback de login e registro
  const feedbackLogin = document.getElementById("feedback-login");
  const feedbackRegister = document.getElementById("feedback-register");

  // botões de ação principais
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const googleBtn = document.getElementById("google-btn");

  // troca entre telas de boas-vindas, login e cadastro
  enterBtn.onclick = () => {
    welcome.classList.add("hidden");
    login.classList.remove("hidden");
  };

  toRegister.onclick = () => {
    login.classList.add("hidden");
    register.classList.remove("hidden");
  };

  backArrow.onclick = () => {
    register.classList.add("hidden");
    login.classList.remove("hidden");
  };

  // função para traduzir mensagens de erro retornadas pelo firebase
  const traduzErro = (codigo) => {
    const erros = {
      "auth/email-already-in-use": "este e-mail já está cadastrado",
      "auth/invalid-email": "o e-mail informado não é válido",
      "auth/weak-password": "a senha deve ter pelo menos 6 caracteres",
      "auth/user-not-found": "usuário não encontrado",
      "auth/wrong-password": "senha incorreta",
      "auth/popup-closed-by-user": "login cancelado pelo usuário",
      "auth/network-request-failed": "falha de conexão com a internet",
    };
    return erros[codigo] || "ocorreu um erro inesperado, tente novamente";
  };

  // lógica de login com e-mail e senha
  loginBtn.onclick = async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
      feedbackLogin.textContent = "por favor, preencha todos os campos";
      feedbackLogin.className = "feedback error";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      feedbackLogin.textContent = "login realizado com sucesso";
      feedbackLogin.className = "feedback success";

      // redireciona o usuário após login bem-sucedido
      setTimeout(() => {
        window.location.href = "/home/home.html";
      }, 1000);

    } catch (err) {
      feedbackLogin.textContent = traduzErro(err.code);
      feedbackLogin.className = "feedback error";
    }
  };

  // lógica de criação de conta
  registerBtn.onclick = async () => {
    const nick = document.getElementById("reg-nick").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    const imgUrl = document.getElementById("reg-img").value.trim();

    if (!nick || !email || !password || !imgUrl) {
      feedbackRegister.textContent = "preencha todos os campos corretamente";
      feedbackRegister.className = "feedback error";
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "usuarios", userCred.user.uid), {
        nickname: nick,
        email,
        imgUrl,
        dataCriacao: serverTimestamp(),
        pontuacaoDiaria: 0,
        musicas: []
      });

      feedbackRegister.textContent = "conta criada com sucesso";
      feedbackRegister.className = "feedback success";

      // volta automaticamente para a tela de login após sucesso
      setTimeout(() => {
        register.classList.add("hidden");
        login.classList.remove("hidden");
      }, 1200);

    } catch (err) {
      feedbackRegister.textContent = traduzErro(err.code);
      feedbackRegister.className = "feedback error";
    }
  };

  // login com conta google
  googleBtn.onclick = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);

      // cria o documento do usuário se ainda não existir no banco
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          nickname: user.displayName || "usuário google",
          email: user.email,
          imgUrl: user.photoURL,
          dataCriacao: serverTimestamp(),
          pontuacaoDiaria: 0,
          musicas: []
        });
      }

      feedbackLogin.textContent = "login com google realizado com sucesso";
      feedbackLogin.className = "feedback success";

      // redireciona após o login google
      setTimeout(() => {
        window.location.href = "/home/home.html";
      }, 1000);

    } catch (err) {
      feedbackLogin.textContent = traduzErro(err.code);
      feedbackLogin.className = "feedback error";
    }
  };
});
