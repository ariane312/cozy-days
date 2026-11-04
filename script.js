'use strict';

/* =========================================================
   cozy days — cardápio de entretenimento
   - O cardápio vem do arquivo menu.json (editável pelo GitHub).
   - Alterações feitas no site ficam no navegador até você baixar
     o menu.json novo e enviar para o repositório.
   - Timers e marcações de "feito" ficam só neste navegador.
   ========================================================= */

/* ---------- configurações fáceis de mudar ---------- */
const ARQUIVO_AUDIO = 'assets/notificacao.mp3';
const ARQUIVO_MENU = 'menu.json';

/* ---------- chaves do localStorage ---------- */
const LS_MENU = 'cozy.menu.v1';
const LS_FEITOS = 'cozy.feitos.v1';
const LS_TIMERS = 'cozy.timers.v1';
const LS_SOM = 'cozy.som.v1';

/* ---------- utilidades ---------- */
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const reduzMov = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ler(chave, padrao) {
  try {
    const v = localStorage.getItem(chave);
    return v ? JSON.parse(v) : padrao;
  } catch { return padrao; }
}
function gravar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem espaço ou bloqueado */ }
}

function hash(str) {
  let x = 5381;
  for (let i = 0; i < str.length; i++) x = ((x << 5) + x + str.charCodeAt(i)) >>> 0;
  return x.toString(36);
}

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return hh ? `${hh}:${p(mm)}:${p(ss)}` : `${p(mm)}:${p(ss)}`;
}

function lerMin(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1440) : undefined;
}

/* ---------- criação de elementos (sem innerHTML com dados do usuário) ---------- */
function el(tag, props = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) {
    if (f == null || f === false) continue;
    e.append(f.nodeType ? f : document.createTextNode(String(f)));
  }
  return e;
}

/* ---------- ícones (Lucide, traço arredondado) ---------- */
const svg = (p) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" focusable="false">${p}</svg>`;

const ICONES = {
  coffee: svg('<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>'),
  play: svg('<polygon points="6 3 20 12 6 21 6 3"/>'),
  pause: svg('<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>'),
  reiniciar: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
  lixo: svg('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>'),
  mais: svg('<path d="M5 12h14"/><path d="M12 5v14"/>'),
  lapis: svg('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  x: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  baixar: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
  atualizar: svg('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
  som: svg('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'),
  mudo: svg('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>'),
  dado: svg('<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>'),
  opcoes: svg('<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'),
  timer: svg('<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>'),
};

function ico(nome) {
  const s = document.createElement('span');
  s.className = 'ico';
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONES[nome] || '';
  return s;
}

function btnIcone(nome, rotulo, onclick, extra = '', tipo = 'button') {
  return el('button', {
    type: tipo, class: ('btn-icone ' + extra).trim(), title: rotulo, 'aria-label': rotulo, onclick,
  }, ico(nome));
}

/* ---------- avisos na tela ---------- */
function toast(msg, ms = 4500) {
  const t = el('div', { class: 'toast' }, msg);
  $('#toasts').append(t);
  setTimeout(() => {
    t.classList.add('saindo');
    setTimeout(() => t.remove(), 350);
  }, ms);
}

function confirmar(msg, rotulo = 'excluir') {
  return new Promise((resolve) => {
    const d = $('#dlg');
    $('#dlg-msg').textContent = msg;
    $('#dlg-ok').textContent = rotulo;
    d.returnValue = '';
    d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
    d.showModal();
  });
}

/* =========================================================
   CARDÁPIO
   ========================================================= */
let menu = { versao: 1, grupos: [] };
let remotoObj = null;     // última versão lida do menu.json do site
let remoteStr = null;     // idem, em texto canônico (para comparar)
let baseStr = null;       // versão do GitHub em que as alterações locais se baseiam
let editado = false;      // há alterações locais ainda não enviadas ao GitHub?
let falhaRemoto = false;
let ultimaBusca = 0;
let edicao = null;        // { tipo: 'grupo' | 'item', id }
let focoNovoItem = null;  // id do grupo cujo campo "nova refeição" recebe foco
let feitos = ler(LS_FEITOS, {});

function idUnico(base, usados) {
  let id = base;
  let n = 2;
  while (usados.has(id)) id = `${base}-${n++}`;
  usados.add(id);
  return id;
}

// Deixa o menu num formato certinho; ids que faltam no JSON são criados
// a partir do texto (assim você pode editar o arquivo sem se preocupar com ids).
function normalizar(d) {
  const usadosG = new Set();
  const usadosI = new Set();
  const grupos = Array.isArray(d && d.grupos) ? d.grupos : [];
  return {
    versao: 1,
    grupos: grupos.map((g) => {
      const titulo = String((g && g.titulo) ?? '').trim() || 'sem título';
      const itens = Array.isArray(g && g.itens) ? g.itens : [];
      return {
        id: idUnico(g && g.id ? String(g.id) : 'g' + hash(titulo), usadosG),
        titulo,
        itens: itens.map((i) => {
          const texto = String((i && i.texto) ?? '').trim() || 'sem nome';
          const o = {
            id: idUnico(i && i.id ? String(i.id) : 'i' + hash(titulo + '|' + texto), usadosI),
            texto,
          };
          const m = lerMin(i && i.minutos);
          if (m) o.minutos = m;
          return o;
        }),
      };
    }),
  };
}

const canon = (d) => JSON.stringify(normalizar(d));

async function buscarRemoto() {
  try {
    const r = await fetch(`${ARQUIVO_MENU}?v=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return normalizar(await r.json());
  } catch { return null; }
}

async function carregarMenu(primeira = false) {
  ultimaBusca = Date.now();
  const antes = canon(menu);
  const remoto = await buscarRemoto();
  remotoObj = remoto;
  remoteStr = remoto ? canon(remoto) : null;
  falhaRemoto = !remoto;
  const salvo = ler(LS_MENU, null);

  if (salvo && salvo.editado && salvo.data) {
    menu = normalizar(salvo.data);
    baseStr = salvo.base ?? null;
    if (remoteStr !== null && canon(menu) === remoteStr) {
      // o que estava só no navegador já foi enviado ao GitHub
      editado = false;
      baseStr = remoteStr;
      gravar(LS_MENU, { base: baseStr, data: menu, editado: false });
    } else {
      editado = true;
    }
  } else if (remoto) {
    menu = normalizar(remoto);
    baseStr = remoteStr;
    editado = false;
    gravar(LS_MENU, { base: baseStr, data: menu, editado: false });
  } else if (salvo && salvo.data) {
    menu = normalizar(salvo.data);
    baseStr = salvo.base ?? null;
    editado = false;
  }

  if (primeira || canon(menu) !== antes) {
    edicao = null;
    renderMenu();
  }
  renderSync();
}

function persistir() {
  const igual = remoteStr !== null && canon(menu) === remoteStr;
  editado = !igual;
  if (igual) baseStr = remoteStr;
  gravar(LS_MENU, { base: baseStr, data: menu, editado });
  renderSync();
}

function baixarMenu() {
  const blob = new Blob([JSON.stringify(menu, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: 'menu.json' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('menu.json baixado! Substitua o arquivo no repositório para sincronizar os outros aparelhos.', 7000);
}

async function descartarLocal() {
  if (remotoObj === null) {
    toast('Não consegui acessar o menu.json do GitHub agora. Tente de novo em instantes.');
    return;
  }
  const ok = await confirmar('Descartar as alterações feitas neste navegador e voltar para a versão do GitHub?', 'descartar');
  if (!ok) return;
  menu = normalizar(remotoObj);
  baseStr = remoteStr;
  editado = false;
  edicao = null;
  gravar(LS_MENU, { base: baseStr, data: menu, editado: false });
  renderMenu();
  renderSync();
}

function renderSync() {
  const conflito = editado && remoteStr !== null && baseStr !== remoteStr;
  const ponto = $('#ponto-sync');
  const status = $('#sync-status');

  let texto;
  let tipo = null;
  if (editado) {
    tipo = conflito ? 'alerta' : 'normal';
    texto = conflito
      ? 'O menu.json no GitHub mudou depois das suas alterações neste navegador. Se você enviar o seu, ele substitui o do GitHub.'
      : 'Você tem alterações salvas só neste navegador. Para levá-las aos outros aparelhos, baixe o menu.json e envie para o repositório.';
  } else if (falhaRemoto) {
    tipo = 'info';
    texto = 'Não consegui ler o menu.json (se abriu o arquivo direto no computador, use um servidor local ou o endereço do github.io). Mostrando o que está salvo neste navegador.';
  } else {
    texto = 'Cardápio igual ao menu.json do GitHub.';
  }

  ponto.hidden = tipo === null;
  if (tipo) ponto.dataset.tipo = tipo; else delete ponto.dataset.tipo;
  status.textContent = texto;
  $('#btn-descartar').disabled = !editado;

  const rotulo = tipo === 'alerta' ? 'Sincronização do cardápio (atenção: o GitHub mudou)'
    : editado ? 'Sincronização do cardápio (alterações locais)' : 'Sincronização do cardápio';
  $('#btn-mais').title = rotulo;
  $('#btn-mais').setAttribute('aria-label', rotulo);
}

/* ---------- menu de sincronização (cabeçalho) ---------- */
function abrirMenuSync() {
  const p = $('#painel-mais');
  const b = $('#btn-mais');
  p.hidden = false;
  const r = b.getBoundingClientRect();
  const w = p.offsetWidth;
  const esquerda = Math.min(Math.max(12, r.right - w), window.innerWidth - w - 12);
  p.style.left = `${esquerda}px`;
  p.style.top = `${r.bottom + 8}px`;
  b.setAttribute('aria-expanded', 'true');
}

function fecharMenuSync(devolverFoco = false) {
  const p = $('#painel-mais');
  if (p.hidden) return;
  p.hidden = true;
  $('#btn-mais').setAttribute('aria-expanded', 'false');
  if (devolverFoco) $('#btn-mais').focus();
}

/* ---------- marcações de "feito" (só neste navegador) ---------- */
function alternarFeito(id, li, botao) {
  if (feitos[id]) delete feitos[id]; else feitos[id] = true;
  gravar(LS_FEITOS, feitos);
  li.classList.toggle('feito', !!feitos[id]);
  botao.setAttribute('aria-pressed', String(!!feitos[id]));
}

/* ---------- renderização do cardápio ---------- */
function renderMenu() {
  const c = $('#grupos');
  c.replaceChildren();
  if (!menu.grupos.length) {
    c.append(el('div', { class: 'vazio' },
      ico('coffee'),
      el('p', {}, 'Seu menu ainda está vazio.'),
      el('p', { class: 'suave' }, 'Crie o primeiro grupo acima, por exemplo "leituras" ou "podcasts".')));
    return;
  }
  menu.grupos.forEach((g, i) => c.append(cartaGrupo(g, i)));

  const f = $('[data-foco]');
  if (f) { f.focus(); if (f.select) f.select(); }
  if (focoNovoItem) {
    const campo = [...document.querySelectorAll('[data-novo]')].find((x) => x.dataset.novo === focoNovoItem);
    if (campo) campo.focus();
    focoNovoItem = null;
  }
}

function cartaGrupo(g, i) {
  const editando = edicao && edicao.tipo === 'grupo' && edicao.id === g.id;
  const topo = editando
    ? formEdicaoGrupo(g)
    : el('div', { class: 'grupo-topo' },
        el('h3', { class: 'grupo-titulo' }, g.titulo),
        btnIcone('lapis', 'editar nome do grupo', () => { edicao = { tipo: 'grupo', id: g.id }; renderMenu(); }),
        btnIcone('lixo', 'excluir grupo', () => excluirGrupo(g)));

  const lista = el('ul', { class: 'itens' }, g.itens.map((it) => linhaItem(g, it)));
  if (!g.itens.length) lista.append(el('li', { class: 'vazio-grupo' }, 'nenhuma refeição ainda'));

  return el('section', { class: 'grupo', dataset: { cor: i % 5 } }, topo, lista, formNovoItem(g));
}

function cancelarEdicao() { edicao = null; renderMenu(); }

function formEdicaoGrupo(g) {
  const inp = el('input', {
    type: 'text', value: g.titulo, maxlength: 60, required: true,
    'aria-label': 'nome do grupo', 'data-foco': true,
  });
  return el('form', {
    class: 'grupo-topo editando',
    onsubmit: (e) => {
      e.preventDefault();
      const v = inp.value.trim();
      if (!v) return;
      g.titulo = v;
      edicao = null;
      persistir();
      renderMenu();
    },
    onkeydown: (e) => { if (e.key === 'Escape') cancelarEdicao(); },
  }, inp,
    btnIcone('check', 'salvar', null, '', 'submit'),
    btnIcone('x', 'cancelar', cancelarEdicao));
}

function linhaItem(g, it) {
  if (edicao && edicao.tipo === 'item' && edicao.id === it.id) return formEdicaoItem(it);
  const feito = !!feitos[it.id];
  const marca = el('button', {
    type: 'button', class: 'marca-feito', 'aria-pressed': String(feito),
    title: 'marcar como feito', 'aria-label': 'marcar como feito',
    onclick: () => alternarFeito(it.id, li, marca),
  }, ico('check'));
  const li = el('li', { class: 'item' + (feito ? ' feito' : ''), dataset: { id: it.id } },
    marca,
    el('div', { class: 'item-corpo' },
      el('span', { class: 'item-texto' }, it.texto),
      it.minutos ? el('span', { class: 'badge-min' }, `${it.minutos} min`) : null),
    el('div', { class: 'item-acoes' },
      it.minutos ? btnIcone('play', `iniciar timer de ${it.minutos} minutos`, () => iniciarDeItem(it)) : null,
      btnIcone('lapis', 'editar', () => { edicao = { tipo: 'item', id: it.id }; renderMenu(); }),
      btnIcone('lixo', 'excluir', () => excluirItem(g, it))));
  return li;
}

function formEdicaoItem(it) {
  const txt = el('input', {
    type: 'text', value: it.texto, maxlength: 120, required: true,
    'aria-label': 'texto da refeição', 'data-foco': true,
  });
  const min = el('input', {
    type: 'number', min: 1, max: 1440, value: it.minutos ?? '', placeholder: 'min',
    'aria-label': 'duração em minutos (opcional)',
  });
  return el('li', { class: 'item editando' },
    el('form', {
      class: 'form-item',
      onsubmit: (e) => {
        e.preventDefault();
        const v = txt.value.trim();
        if (!v) return;
        it.texto = v;
        const m = lerMin(min.value);
        if (m) it.minutos = m; else delete it.minutos;
        edicao = null;
        persistir();
        renderMenu();
      },
      onkeydown: (e) => { if (e.key === 'Escape') cancelarEdicao(); },
    }, txt,
      el('div', { class: 'form-item-linha' }, min,
        el('div', { class: 'item-acoes' },
          btnIcone('check', 'salvar', null, '', 'submit'),
          btnIcone('x', 'cancelar', cancelarEdicao)))));
}

function formNovoItem(g) {
  const txt = el('input', {
    type: 'text', maxlength: 120, placeholder: 'nova refeição…',
    'aria-label': `nova refeição em ${g.titulo}`, dataset: { novo: g.id },
  });
  const min = el('input', {
    type: 'number', min: 1, max: 1440, placeholder: 'min',
    'aria-label': 'duração em minutos (opcional)',
  });
  return el('form', {
    class: 'novo-item',
    onsubmit: (e) => {
      e.preventDefault();
      const v = txt.value.trim();
      if (!v) return;
      const item = { id: uid(), texto: v };
      const m = lerMin(min.value);
      if (m) item.minutos = m;
      g.itens.push(item);
      focoNovoItem = g.id;
      persistir();
      renderMenu();
    },
  }, txt, min, btnIcone('mais', 'adicionar refeição', null, '', 'submit'));
}

/* ---------- ações do cardápio ---------- */
function adicionarGrupo(titulo) {
  menu.grupos.push({ id: uid(), titulo, itens: [] });
  persistir();
  renderMenu();
}

async function excluirGrupo(g) {
  const n = g.itens.length;
  const msg = n
    ? `Excluir o grupo "${g.titulo}" e as ${n} refeições dele?`
    : `Excluir o grupo "${g.titulo}"?`;
  if (!(await confirmar(msg))) return;
  g.itens.forEach((it) => delete feitos[it.id]);
  gravar(LS_FEITOS, feitos);
  menu.grupos = menu.grupos.filter((x) => x !== g);
  persistir();
  renderMenu();
}

async function excluirItem(g, it) {
  if (!(await confirmar(`Excluir "${it.texto}"?`))) return;
  delete feitos[it.id];
  gravar(LS_FEITOS, feitos);
  g.itens = g.itens.filter((x) => x !== it);
  persistir();
  renderMenu();
}

function limparMarcados() {
  feitos = {};
  gravar(LS_FEITOS, feitos);
  renderMenu();
  toast('Tudo desmarcado — cardápio fresquinho de novo.');
}

function surpreender() {
  const pool = [];
  menu.grupos.forEach((g) => g.itens.forEach((it) => { if (!feitos[it.id]) pool.push({ g, it }); }));
  if (!pool.length) {
    toast(menu.grupos.length
      ? 'Você já saboreou tudo! Use "limpar marcados" para recomeçar.'
      : 'O cardápio está vazio — que tal criar o primeiro grupo?');
    return;
  }
  const { g, it } = pool[Math.floor(Math.random() * pool.length)];
  const li = [...document.querySelectorAll('.item')].find((x) => x.dataset.id === it.id);
  if (li) {
    li.scrollIntoView({ behavior: reduzMov ? 'auto' : 'smooth', block: 'center' });
    li.classList.remove('destaque');
    void li.offsetWidth;
    li.classList.add('destaque');
  }
  toast(`Que tal: ${it.texto}? (${g.titulo})`, 6500);
}

/* =========================================================
   SOM E NOTIFICAÇÕES
   ========================================================= */
let somLigado = ler(LS_SOM, true) !== false;
const audio = new Audio(ARQUIVO_AUDIO);
audio.preload = 'auto';

function bipe() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.85);
    setTimeout(() => ctx.close(), 1200);
  } catch { /* sem áudio disponível */ }
}

// Se o arquivo de áudio ainda não existir, toca um bip suave no lugar.
function tocar(volume = 1) {
  if (!somLigado) return;
  try {
    audio.volume = volume;
    audio.currentTime = 0;
    const p = audio.play();
    if (p && p.catch) p.catch(bipe);
  } catch { bipe(); }
}

function atualizarBotaoSom() {
  const b = $('#btn-som');
  const rotulo = somLigado ? 'Som ligado' : 'Som desligado';
  b.setAttribute('aria-pressed', String(somLigado));
  b.setAttribute('aria-label', rotulo);
  b.title = rotulo;
  const i = b.querySelector('.ico');
  if (i) i.innerHTML = ICONES[somLigado ? 'som' : 'mudo'];
}

let avisouBloqueio = false;

async function pedirPermissao() {
  if (!('Notification' in window)) return 'indisponivel';
  if (Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch { /* ignora */ }
  }
  return Notification.permission;
}

async function mostrarNotificacao(titulo, corpo, tag) {
  const opcoes = { body: corpo, tag, silent: true }; // o som é o nosso, não o do sistema
  try {
    new Notification(titulo, opcoes);
    return true;
  } catch {
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) { await reg.showNotification(titulo, opcoes); return true; }
    } catch { /* ignora */ }
  }
  return false;
}

// `pedir` só deve ser true dentro de um clique (o navegador exige).
async function avisar(titulo, corpo, tag, pedir = false) {
  if (!('Notification' in window)) return false;
  const perm = pedir ? await pedirPermissao() : Notification.permission;
  if (perm === 'denied' && !avisouBloqueio) {
    avisouBloqueio = true;
    toast('As notificações estão bloqueadas neste navegador; vou avisar aqui na página.', 6500);
  }
  return perm === 'granted' ? mostrarNotificacao(titulo, corpo, tag) : false;
}

/* =========================================================
   TIMERS (100% locais)
   status: 'parado' | 'rodando' | 'pausado' | 'concluido'
   ========================================================= */
const STATUS_OK = ['parado', 'rodando', 'pausado', 'concluido'];
let timers = [];
const refs = new Map(); // id do timer -> { tempo, preench }

function timerValido(t) {
  return t && typeof t.id === 'string' && Number.isFinite(t.total) && t.total > 0
    && STATUS_OK.includes(t.status) && Number.isFinite(t.restante)
    && (t.status !== 'rodando' || Number.isFinite(t.fim));
}

const salvarTimers = () => gravar(LS_TIMERS, timers);

function restanteAgora(t) {
  return t.status === 'rodando' ? Math.max(0, t.fim - Date.now()) : t.restante;
}

function recuperarTimers() {
  timers = ler(LS_TIMERS, []).filter(timerValido);
  const agora = Date.now();
  const terminados = [];
  for (const t of timers) {
    if (t.status === 'rodando' && t.fim <= agora) {
      t.status = 'concluido';
      t.restante = 0;
      t.fim = null;
      terminados.push(t.label);
    }
  }
  if (terminados.length) {
    salvarTimers();
    setTimeout(() => toast(`Terminou enquanto você estava fora: ${terminados.join(', ')}`, 8000), 600);
  }
}

function novoTimer(label, minutos, iniciar) {
  const total = Math.round(minutos * 60000);
  const t = {
    id: uid(),
    label: label || `timer de ${minutos} min`,
    total,
    restante: total,
    fim: null,
    status: 'parado',
  };
  timers.unshift(t);
  salvarTimers();
  renderTimers();
  if (iniciar) alternarPlay(t);
  return t;
}

function iniciarDeItem(it) {
  novoTimer(it.texto, it.minutos, true);
}

async function alternarPlay(t) {
  if (t.status === 'rodando') { pausar(t); return; }
  const retomando = t.status === 'pausado';
  if (t.status === 'concluido') t.restante = t.total;
  t.fim = Date.now() + t.restante;
  t.status = 'rodando';
  salvarTimers();
  renderTimers();
  tick();
  tocar(0.6);
  const corpo = retomando
    ? `"${t.label}" retomado — faltam ${fmt(t.restante)}`
    : `"${t.label}" começou — ${fmt(t.total)}`;
  const ok = await avisar('cozy days', corpo, 'ini-' + t.id, true);
  if (!ok) toast(corpo);
}

function pausar(t) {
  t.restante = Math.max(0, t.fim - Date.now());
  t.fim = null;
  t.status = 'pausado';
  salvarTimers();
  renderTimers();
  tick();
}

function reiniciarTimer(t) {
  t.restante = t.total;
  t.fim = null;
  t.status = 'parado';
  salvarTimers();
  renderTimers();
  tick();
}

async function excluirTimer(t) {
  if (t.status === 'rodando' || t.status === 'pausado') {
    if (!(await confirmar(`Excluir o timer "${t.label}"?`))) return;
  }
  timers = timers.filter((x) => x !== t);
  salvarTimers();
  renderTimers();
  tick();
}

function concluir(t) {
  t.status = 'concluido';
  t.restante = 0;
  t.fim = null;
  salvarTimers();
  renderTimers();
  tocar(1);
  avisar('cozy days', `"${t.label}" terminou. Hora de uma pausa gostosa!`, 'fim-' + t.id);
  toast(`"${t.label}" terminou. Hora de uma pausa gostosa!`, 9000);
}

const ROTULO_ESTADO = { parado: 'pronto', rodando: 'em andamento', pausado: 'pausado', concluido: 'concluído' };

function cartaTimer(t) {
  const rest = restanteAgora(t);
  const pct = t.status === 'concluido' ? 100 : Math.min(100, Math.max(0, (1 - rest / t.total) * 100));
  const tempo = el('div', { class: 'tempo', role: 'timer' }, fmt(rest));
  const preench = el('span', { class: 'barra-preench', style: `width:${pct}%` });
  refs.set(t.id, { tempo, preench });

  const rodando = t.status === 'rodando';
  const rotuloPlay = rodando ? 'pausar' : t.status === 'pausado' ? 'retomar' : t.status === 'concluido' ? 'começar de novo' : 'iniciar';

  return el('article', { class: 'timer', dataset: { estado: t.status } },
    el('div', { class: 'timer-topo' },
      el('h3', { class: 'timer-nome' }, t.label),
      el('span', { class: 'selo' }, ROTULO_ESTADO[t.status])),
    tempo,
    el('div', { class: 'barra', 'aria-hidden': 'true' }, preench),
    el('div', { class: 'timer-acoes' },
      btnIcone(rodando ? 'pause' : 'play', rotuloPlay, () => alternarPlay(t), 'btn-play'),
      btnIcone('reiniciar', 'reiniciar', () => reiniciarTimer(t)),
      btnIcone('lixo', 'excluir timer', () => excluirTimer(t))));
}

function renderTimers() {
  const c = $('#lista-timers');
  c.replaceChildren();
  refs.clear();
  if (!timers.length) {
    c.append(el('p', { class: 'suave vazio-timers' },
      'Nenhum timer por aqui. Crie um acima ou use o botão de play de uma refeição que tenha duração.'));
    return;
  }
  timers.forEach((t) => c.append(cartaTimer(t)));
}

// Um único relógio atualiza todos os timers (custa quase nada de memória ou processamento).
function tick() {
  const agora = Date.now();
  let menor = null;
  for (const t of [...timers]) {
    if (t.status !== 'rodando') continue;
    const rest = t.fim - agora;
    if (rest <= 0) { concluir(t); continue; }
    const r = refs.get(t.id);
    if (r) {
      r.tempo.textContent = fmt(rest);
      r.preench.style.width = `${Math.min(100, (1 - rest / t.total) * 100)}%`;
    }
    if (menor === null || rest < menor) menor = rest;
  }
  document.title = menor === null ? 'cozy days' : `${fmt(menor)} · cozy days`;
}

// Um Web Worker não é "freado" quando a aba fica em segundo plano,
// então o timer termina na hora certa mesmo com você em outra aba.
function iniciarRelogio(cb) {
  try {
    const url = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},500)'], { type: 'text/javascript' }));
    const w = new Worker(url);
    w.onmessage = cb;
    return;
  } catch { /* cai no plano B */ }
  setInterval(cb, 500);
}

/* =========================================================
   INÍCIO
   ========================================================= */
function saudacao() {
  const h = new Date().getHours();
  const s = h < 5 ? 'boa madrugada' : h < 12 ? 'bom dia' : h < 18 ? 'boa tarde' : 'boa noite';
  $('#saudacao').textContent = `${s} · o que vai ser servido agora?`;
}

function ligarEventos() {
  $('#form-grupo').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('#grupo-nome');
    const v = inp.value.trim();
    if (!v) return;
    adicionarGrupo(v);
    inp.value = '';
    inp.focus();
  });

  $('#form-timer').addEventListener('submit', (e) => {
    e.preventDefault();
    const m = lerMin($('#timer-min').value);
    if (!m) { toast('Escolha quantos minutos o timer deve ter.'); return; }
    novoTimer($('#timer-nome').value.trim(), m, false);
    $('#timer-nome').value = '';
  });

  document.querySelectorAll('.chip').forEach((c) =>
    c.addEventListener('click', () => { $('#timer-min').value = c.dataset.min; }));

  $('#btn-surpresa').addEventListener('click', surpreender);
  $('#btn-limpar').addEventListener('click', limparMarcados);

  $('#btn-som').addEventListener('click', () => {
    somLigado = !somLigado;
    gravar(LS_SOM, somLigado);
    atualizarBotaoSom();
    if (somLigado) tocar(0.6);
  });

  $('#btn-mais').addEventListener('click', (e) => {
    e.stopPropagation();
    if ($('#painel-mais').hidden) abrirMenuSync(); else fecharMenuSync();
  });
  $('#btn-baixar').addEventListener('click', () => { fecharMenuSync(); baixarMenu(); });
  $('#btn-descartar').addEventListener('click', () => { fecharMenuSync(); descartarLocal(); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#painel-mais')) fecharMenuSync();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenuSync(true); });
  window.addEventListener('resize', () => fecharMenuSync());
  window.addEventListener('scroll', () => fecharMenuSync(), { passive: true });

  $('#btn-sync').addEventListener('click', async () => {
    await carregarMenu();
    toast(editado
      ? 'Você tem alterações locais que ainda não foram enviadas ao GitHub.'
      : falhaRemoto ? 'Não consegui acessar o menu.json agora.' : 'Cardápio atualizado.');
  });

  // ao voltar para a aba, busca o menu.json de novo (se não houver nada em edição)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    tick();
    if (!editado && !edicao && Date.now() - ultimaBusca > 30000) carregarMenu();
  });
}

async function iniciar() {
  document.querySelectorAll('[data-icon]').forEach((e) => e.prepend(ico(e.dataset.icon)));
  saudacao();
  ligarEventos();
  atualizarBotaoSom();
  recuperarTimers();
  renderTimers();
  tick();
  iniciarRelogio(tick);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  await carregarMenu(true);
}

iniciar();
