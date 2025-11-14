import { firebaseConfig } from "./firebase/firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Validadores
const validators = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  nickname: (v) => /^[a-zA-Z0-9]{6,15}$/.test(v),
  password: (v) => /^[a-zA-Z0-9]{6,12}$/.test(v)
};

document.addEventListener("DOMContentLoaded", () => {
  const welcome = document.getElementById("welcome-screen");
  const login = document.getElementById("login-form");
  const register = document.getElementById("register-form");

  const enterBtn = document.getElementById("enter-btn");
  const toRegister = document.getElementById("to-register");
  const backArrow = document.getElementById("back-arrow");

  const feedbackLogin = document.getElementById("feedback-login");
  const feedbackRegister = document.getElementById("feedback-register");

  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const googleBtn = document.getElementById("google-btn");

  const inputWrappers = {
    loginEmail: document.getElementById("login-email").parentElement,
    loginPassword: document.getElementById("login-password").parentElement,
    regNick: document.getElementById("reg-nick").parentElement,
    regEmail: document.getElementById("reg-email").parentElement,
    regPassword: document.getElementById("reg-password").parentElement,
    regImg: document.getElementById("reg-img").parentElement
  };

  // Navegação entre telas
  enterBtn.onclick = () => { welcome.classList.add("hidden"); login.classList.remove("hidden"); };
  toRegister.onclick = () => { login.classList.add("hidden"); register.classList.remove("hidden"); };
  backArrow.onclick = () => { register.classList.add("hidden"); login.classList.remove("hidden"); };

  const traduzErro = (c) => ({
    "auth/email-already-in-use":"Este e-mail já está cadastrado",
    "auth/invalid-email":"O e-mail informado não é válido",
    "auth/weak-password":"A senha deve ter entre 6 e 12 caracteres",
    "auth/user-not-found":"Usuário não encontrado",
    "auth/wrong-password":"Senha incorreta",
    "auth/popup-closed-by-user":"Login cancelado pelo usuário",
    "auth/network-request-failed":"Falha de conexão com a internet"
  }[c] || "Ocorreu um erro inesperado, tente novamente");

  const marcarErro = (wrapper,mensagem,feedbackElem) => {
    wrapper.classList.add("error");
    feedbackElem.textContent = mensagem;
    feedbackElem.className = "feedback error";
    setTimeout(()=>wrapper.classList.remove("error"),500);
  };

  // Login
  loginBtn.onclick = async ()=>{
    const email=document.getElementById("login-email").value.trim();
    const password=document.getElementById("login-password").value.trim();
    feedbackLogin.textContent="";
    let valid=true;
    if(!validators.email(email)){ marcarErro(inputWrappers.loginEmail,"E-mail inválido",feedbackLogin); valid=false; }
    if(!validators.password(password)){ marcarErro(inputWrappers.loginPassword,"Senha inválida",feedbackLogin); valid=false; }
    if(!valid) return;
    try{
      await signInWithEmailAndPassword(auth,email,password);
      feedbackLogin.textContent="Login realizado com sucesso";
      feedbackLogin.className="feedback success";
      setTimeout(()=>window.location.href="/home/home.html",1000);
    }catch(err){
      feedbackLogin.textContent=traduzErro(err.code);
      feedbackLogin.className="feedback error";
    }
  };

  // Cadastro
  registerBtn.onclick = async ()=>{
    const nick=document.getElementById("reg-nick").value.trim();
    const email=document.getElementById("reg-email").value.trim();
    const password=document.getElementById("reg-password").value.trim();
    const imgUrl=document.getElementById("reg-img").value.trim();
    feedbackRegister.textContent="";
    let valid=true;
    if(!validators.nickname(nick)){ marcarErro(inputWrappers.regNick,"Nickname inválido (6-15 letras/números)",feedbackRegister); valid=false; }
    if(!validators.email(email)){ marcarErro(inputWrappers.regEmail,"E-mail inválido",feedbackRegister); valid=false; }
    if(!validators.password(password)){ marcarErro(inputWrappers.regPassword,"Senha inválida (6-12 letras/números)",feedbackRegister); valid=false; }
    if(!imgUrl){ marcarErro(inputWrappers.regImg,"Informe a URL da imagem",feedbackRegister); valid=false; }
    if(!valid) return;
    try{
      const userCred=await createUserWithEmailAndPassword(auth,email,password);
      await setDoc(doc(db,"usuarios",userCred.user.uid),{
        nickname:nick,email,imgUrl,dataCriacao:serverTimestamp(),pontuacaoDiaria:0,musicas:[]
      });
      feedbackRegister.textContent="Conta criada com sucesso";
      feedbackRegister.className="feedback success";
      setTimeout(()=>{ register.classList.add("hidden"); login.classList.remove("hidden"); },1200);
    }catch(err){
      feedbackRegister.textContent=traduzErro(err.code);
      feedbackRegister.className="feedback error";
    }
  };

  // Login Google
  googleBtn.onclick = async ()=>{
    try{
      const result=await signInWithPopup(auth,provider);
      const user=result.user;
      const userRef=doc(db,"usuarios",user.uid);
      const userSnap=await getDoc(userRef);
      if(!userSnap.exists()){
        await setDoc(userRef,{ nickname:user.displayName||"Usuário Google", email:user.email, imgUrl:user.photoURL, dataCriacao:serverTimestamp(), pontuacaoDiaria:0, musicas:[] });
      }
      feedbackLogin.textContent="Login com Google realizado com sucesso";
      feedbackLogin.className="feedback success";
      setTimeout(()=>window.location.href="/home/home.html",1000);
    }catch(err){
      feedbackLogin.textContent=traduzErro(err.code);
      feedbackLogin.className="feedback error";
    }
  };
});
