// js/firebase-config.js (Versão CORRETA para usar com v8)

// Suas configurações:
export const firebaseConfig = {
    apiKey: "AIzaSyAuT6B1B_0WYosxstbaOSIgVnTJL4NQxPg",
    authDomain: "bardle-febfb.firebaseapp.com",
    projectId: "bardle-febfb",
    storageBucket: "bardle-febfb.firebasestorage.app",
    messagingSenderId: "694232730485",
    appId: "1:694232730485:web:4b68adbaed97468fc8213c"
};

// 1. Inicializa o Firebase (usando a função global 'firebase')
const app = firebase.initializeApp(firebaseConfig);

// 2. Exporta os serviços (auth e db) que os módulos bardle.js e admin.js usam
// Estas chamadas ('app.auth()' e 'app.firestore()') são sintaxe do SDK v8
export const auth = app.auth();
export const db = app.firestore();