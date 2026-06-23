/* ===== CONFIG ===== */
const CONFIG = {
  checkoutUrl: "https://pay.kiwify.com.br/SEU-LINK-AQUI",
  precoNovo: "19,90",
  precoDe: "47,00",
  timerMin: 10
};

/* ===== QUIZ DATA ===== */
const QUESTIONS = [
  { q:"Sua gengiva sangra quando você escova ou usa fio dental?",
    a:[["Sim, com frequência",3],["Às vezes",2],["Nunca",0]],
    flag:"Sangramento gengival — possível gengivite em curso" },
  { q:"Você sente mau hálito que volta mesmo depois de escovar?",
    a:[["Sim, sempre",3],["De vez em quando",2],["Não",0]],
    flag:"Halitose persistente — sinal de proliferação bacteriana" },
  { q:"Sente sensibilidade ou dor ao comer doce, gelado ou quente?",
    a:[["Sim, forte",3],["Leve",1],["Não",0]],
    flag:"Sensibilidade térmica — possível exposição de dentina / cárie ativa" },
  { q:"Tem algum dente escurecido, manchado ou com 'buraco' visível?",
    a:[["Sim",3],["Não tenho certeza",2],["Não",0]],
    flag:"Lesão visível — cárie pode estar atingindo o interior do dente" },
  { q:"Sente dor ao mastigar de um lado específico da boca?",
    a:[["Sim",3],["Às vezes",2],["Não",0]],
    flag:"Dor mastigatória localizada — alerta de comprometimento profundo" },
  { q:"Há quanto tempo você não vai ao dentista?",
    a:[["Mais de 2 anos",3],["Entre 1 e 2 anos",2],["Menos de 1 ano",0]],
    flag:"Sem avaliação profissional recente — risco acumulado" },
  { q:"Você nota tártaro (placa dura) ou a gengiva 'descendo' nos dentes?",
    a:[["Sim",3],["Não sei identificar",1],["Não",0]],
    flag:"Tártaro / retração gengival — sinal de doença periodontal" },
  { q:"Com que frequência você usa fio dental?",
    a:[["Raramente ou nunca",2],["Às vezes",1],["Todo dia",0]],
    flag:"Higiene interdental insuficiente — bactérias entre os dentes" }
];

const MAX = QUESTIONS.reduce((s,q)=>s+Math.max(...q.a.map(o=>o[1])),0);

let qi = 0;
let answers = [];
let screenHistory = [];

// Expose functions to window so they can be called by onclick in HTML
window.startQuiz = startQuiz;
window.answer = answer;
window.goPay = goPay;
window.checkout = checkout;
window.goBack = goBack;

function show(id, isBack = false) {
  const currentActive = document.querySelector('.screen.active');
  
  if (!isBack && currentActive && currentActive.id !== 's-analyze' && currentActive.id !== 's-pix') {
    screenHistory.push(currentActive.id);
  }

  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);

  const btnBack = document.getElementById('globalBack');
  if (btnBack) {
    if (id === 's-intro' || id === 's-analyze' || id === 's-pix') {
      btnBack.style.display = 'none';
    } else {
      btnBack.style.display = 'block';
    }
  }
}

function goBack() {
  const currentActive = document.querySelector('.screen.active');
  if (!currentActive) return;

  if (currentActive.id === 's-quiz' && qi > 0) {
    qi--;
    answers.pop();
    renderQ();
    return;
  }
  
  if (currentActive.id === 's-result') {
    screenHistory.pop(); 
    qi = QUESTIONS.length - 1;
    answers.pop();
    renderQ();
    show('s-quiz', true);
    return;
  }

  if (screenHistory.length > 0) {
    const prevId = screenHistory.pop();
    if (prevId === 's-quiz') {
      qi = QUESTIONS.length - 1;
      renderQ();
    }
    show(prevId, true);
  }
}

function startQuiz() { 
  qi = 0; 
  answers = []; 
  screenHistory = [];
  renderQ(); 
  show('s-quiz'); 
}

function renderQ() {
  const item = QUESTIONS[qi];
  document.getElementById('qnum').textContent = qi + 1;
  const pct = Math.round((qi) / QUESTIONS.length * 100);
  document.getElementById('qpct').textContent = pct + "%";
  document.getElementById('qbar').style.width = pct + "%";
  document.getElementById('qtext').textContent = item.q;
  
  const box = document.getElementById('qopts'); 
  box.innerHTML = "";
  
  item.a.forEach(([label, weight]) => {
    const b = document.createElement('button');
    b.className = 'opt hover-lift'; 
    b.innerHTML = '<span class="mk"></span>' + label;
    b.onclick = () => answer(weight);
    box.appendChild(b);
  });
}

function answer(weight) {
  answers.push({weight, flag: QUESTIONS[qi].flag});
  qi++;
  if(qi < QUESTIONS.length) { 
    renderQ(); 
  } else { 
    runAnalysis(); 
  }
}

/* ===== ANALYSIS ===== */
function runAnalysis() {
  show('s-analyze');
  const steps = [
    "Cruzando seus sintomas…",
    "Calculando índice de risco…",
    "Identificando alertas críticos…",
    "Gerando seu laudo…"
  ];
  let p = 0;
  let si = 0;
  
  const apct = document.getElementById('apct');
  const astep = document.getElementById('astep');
  
  const t = setInterval(() => {
    p += Math.floor(Math.random() * 7) + 3; 
    if(p > 100) p = 100;
    apct.textContent = p + "%";
    
    const ns = Math.min(steps.length - 1, Math.floor(p / 26));
    if(ns !== si) { 
      si = ns; 
      astep.style.opacity = 0; 
      setTimeout(() => {
        astep.textContent = steps[si];
        astep.style.opacity = 1;
      }, 150); 
    }
    
    if(p >= 100) { 
      clearInterval(t); 
      setTimeout(buildResult, 450); 
    }
  }, 120);
}

/* ===== RESULT ===== */
let finalScore = 0;

function buildResult() {
  const raw = answers.reduce((s, a) => s + a.weight, 0);
  finalScore = Math.round(raw / MAX * 100);
  
  // Floor to maintain selected audience
  if(finalScore < 34) finalScore = 34 + Math.floor(Math.random() * 6);

  const tagEl = document.getElementById('rtag');
  let tagTxt, tagBg, tagFg;
  
  if(finalScore >= 60) { 
    tagTxt = "RISCO ALTO"; 
    tagBg = "linear-gradient(135deg, var(--red), #b91c1c)"; 
    tagFg = "#fff"; 
  } else if(finalScore >= 40) { 
    tagTxt = "MODERADO"; 
    tagBg = "linear-gradient(135deg, var(--yellow), var(--amber))"; 
    tagFg = "#0A0A0B"; 
  } else { 
    tagTxt = "ATENÇÃO"; 
    tagBg = "linear-gradient(135deg, var(--yellow), var(--amber))"; 
    tagFg = "#0A0A0B"; 
  }
  
  tagEl.textContent = tagTxt; 
  tagEl.style.background = tagBg; 
  tagEl.style.color = tagFg;

  animateScore('rscore', finalScore);
  
  // Animate the pin
  setTimeout(() => {
    document.getElementById('rpin').style.left = Math.min(96, Math.max(4, finalScore)) + "%";
  }, 100);

  // Generate real flags from answers with weight >= 2
  const detected = answers.filter(a => a.weight >= 2).map(a => a.flag);
  const box = document.getElementById('rflags'); 
  box.innerHTML = "";
  
  const showFlags = detected.slice(0, 3);
  if(showFlags.length === 0) showFlags.push("Fatores de risco identificados no seu padrão de higiene");
  
  showFlags.forEach((f, index) => {
    const d = document.createElement('div'); 
    d.className = 'flag hover-lift';
    d.style.animationDelay = `${index * 0.1}s`;
    d.innerHTML = '<span class="fi">▲</span><p>' + f + '</p>'; 
    box.appendChild(d);
  });

  document.getElementById('payscore').textContent = finalScore + "/100 (" + tagTxt + ")";
  show('s-result');
}

function animateScore(id, target) {
  const el = document.getElementById(id); 
  let n = 0;
  const t = setInterval(() => { 
    n += Math.ceil(target / 22); 
    if(n >= target) {
      n = target;
      clearInterval(t);
    } 
    el.textContent = n; 
  }, 35);
}

/* ===== PAYWALL ===== */
function goPay() { 
  startTimer(); 
  show('s-pay'); 
}

let timerStarted = false;

function startTimer() {
  if(timerStarted) return; 
  timerStarted = true;
  
  let total = CONFIG.timerMin * 60;
  const el = document.getElementById('clock');
  
  const t = setInterval(() => {
    total--; 
    if(total < 0) {
      clearInterval(t);
      return;
    }
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    el.textContent = m + ":" + s;
  }, 1000);
}

// Base URL da API (Usa a variável do Vercel em produção, ou localhost em dev)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Intercept click on offer button to show the form instead of directly going to PIX
document.querySelector('.offer .btn').onclick = (e) => {
  e.preventDefault();
  show('s-checkout-form');
};

// Auto-formatting CPF and Phone
const cpfInput = document.getElementById('clientCpf');
cpfInput.addEventListener('input', function(e) {
  let v = e.target.value.replace(/\D/g,"");
  v = v.replace(/(\d{3})(\d)/,"$1.$2");
  v = v.replace(/(\d{3})(\d)/,"$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/,"$1-$2");
  e.target.value = v;
});

const phoneInput = document.getElementById('clientPhone');
phoneInput.addEventListener('input', function(e) {
  let v = e.target.value.replace(/\D/g,"");
  v = v.replace(/^(\d{2})(\d)/g,"($1) $2");
  v = v.replace(/(\d)(\d{4})$/,"$1-$2");
  e.target.value = v;
});

// Handle form submission
document.getElementById('checkoutForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const clientData = {
    name: document.getElementById('clientName').value,
    cpf: document.getElementById('clientCpf').value,
    email: document.getElementById('clientEmail').value,
    phone: document.getElementById('clientPhone').value
  };

  checkout(clientData);
});

async function checkout(clientData) { 
  // Disable button to prevent double click
  const btn = document.querySelector('#checkoutForm .btn');
  const originalText = btn.textContent;
  btn.innerHTML = '<span class="btn-text">Gerando PIX...</span>';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: clientData })
    });
    
    if (!res.ok) throw new Error("Falha na API");
    
    const data = await res.json();
    
    // Mostra tela do PIX
    show('s-pix');
    
    // Atualiza o QR Code e o Input
    const qrCodeImg = document.getElementById('qrCode');
    const qrLoading = document.getElementById('qrLoading');
    const pixInput = document.getElementById('pixCodeInput');
    
    qrCodeImg.style.display = 'none';
    qrLoading.style.display = 'block';
    
    // Usando API pública para gerar o QR Code
    qrCodeImg.onload = () => {
      qrLoading.style.display = 'none';
      qrCodeImg.style.display = 'block';
    };
    qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.pix_code)}`;
    
    pixInput.value = data.pix_code;
    
    // Iniciar o polling
    startPolling(data.identifier);
    
  } catch (err) {
    console.error(err);
    alert("Erro ao gerar PIX. Tente novamente.");
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

let pollingInterval;

function startPolling(identifier) {
  if (pollingInterval) clearInterval(pollingInterval);
  
  pollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/status/${identifier}`);
      if (!res.ok) return;
      
      const data = await res.json();
      
      if (data.paid) {
        clearInterval(pollingInterval);
        // Redirecionar para o laudo final!
        window.location.href = '/laudo.html';
      }
    } catch (e) {
      console.log("Polling error, retrying...");
    }
  }, 3000);
}

function copyPix() {
  const input = document.getElementById('pixCodeInput');
  input.select();
  input.setSelectionRange(0, 99999); 
  navigator.clipboard.writeText(input.value);
  
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Add event listener to the copy button
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pnew').textContent = CONFIG.precoNovo;
  document.getElementById('pold').textContent = CONFIG.precoDe;
  
  const btnCopy = document.getElementById('btnCopyPix');
  if(btnCopy) btnCopy.addEventListener('click', copyPix);
});
