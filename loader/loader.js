// loader.js - Loader Premium Inteligente 3.0

// Adiciona Font Awesome se não estiver carregado
if (!document.querySelector('link[href*="font-awesome"]')) {
  const faLink = document.createElement('link');
  faLink.rel = 'stylesheet';
  faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
  document.head.appendChild(faLink);
}

// Injeta HTML do loader
const createLoader = () => {
  if (document.getElementById('page-loader')) return;
  const loaderHTML = `
    <div id="page-loader">
      <div class="loader-panel">
        <div class="loader-icon"><i class="fa-solid fa-music"></i></div>
        <p class="loader-text">Carregando...</p>
        <div class="loader-bar"><div class="loader-progress"></div></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('afterbegin', loaderHTML);
};

// Mostra loader
export const showLoader = () => {
  createLoader();
  const loader = document.getElementById('page-loader');
  loader.style.display = 'flex';
  setTimeout(() => loader.style.opacity = '1', 10);
};

// Esconde loader
export const hideLoader = () => {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  loader.style.opacity = '0';
  setTimeout(() => { loader.style.display = 'none'; }, 500);
};

// Controle de carregamento inteligente
let readyPromises = [];
let isWindowLoaded = false;

window.addEventListener('load', () => {
  isWindowLoaded = true;
  checkReady();
});

// Registrar uma promise ou função async
export const pageReady = (promiseOrFunc) => {
  if (typeof promiseOrFunc === 'function') {
    promiseOrFunc = promiseOrFunc();
  }
  if (promiseOrFunc instanceof Promise) {
    readyPromises.push(promiseOrFunc);
    promiseOrFunc.then(() => checkReady());
  } else {
    checkReady();
  }
};

// Verifica se tudo terminou
const checkReady = () => {
  if (!isWindowLoaded) return;
  Promise.all(readyPromises).then(() => hideLoader());
};

// Injeta imediatamente
createLoader();
