(function(){
  'use strict';

  /* ==========================================================================
     0 · política de movimento
     Um único lugar decide o que anima: preferência do sistema, largura e toque.
     Todo o resto pergunta aqui em vez de chamar matchMedia por conta própria.
     ========================================================================== */
  const mq = {
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)'),
    wide:    window.matchMedia('(min-width:1024px)'),
    touch:   window.matchMedia('(hover: none)')
  };
  const motion = {
    get reduced(){ return mq.reduced.matches; },
    get wide(){ return mq.wide.matches; },
    get touch(){ return mq.touch.matches; }
  };

  /* ==========================================================================
     1 · relógio único
     Um requestAnimationFrame para a página inteira. Quem precisa de quadro se
     inscreve; o laço só existe enquanto houver inscrito.
     ========================================================================== */
  const ticker = (function(){
    const subs = new Set();
    let raf = 0;
    function loop(t){
      raf = 0;
      Array.from(subs).forEach(function(fn){ fn(t); });
      if (subs.size) raf = requestAnimationFrame(loop);
    }
    return {
      add: function(fn){
        if (subs.has(fn)) return;
        subs.add(fn);
        if (!raf) raf = requestAnimationFrame(loop);
      },
      remove: function(fn){ subs.delete(fn); }
    };
  })();

  // interpolação finita sobre o mesmo relógio: onStep recebe 0..1
  function tween(dur, onStep){
    const t0 = performance.now();
    function step(t){
      const k = Math.min(1, (t - t0) / dur);
      onStep(k);
      if (k >= 1) ticker.remove(step);
    }
    ticker.add(step);
  }

  /* ==========================================================================
     2 · fábricas de IntersectionObserver
     ========================================================================== */
  // dispara uma vez e para de observar
  function onEnterOnce(el, fn, opts){
    const io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        fn(en.target);
      });
    }, opts);
    io.observe(el);
    return io;
  }

  // entra e sai: dois callbacks, reversível
  function onView(el, enter, leave, opts){
    const io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) enter(en.target, en);
        else if (leave) leave(en.target, en);
      });
    }, opts);
    io.observe(el);
    return io;
  }

  // contador: anima do zero até data-count
  function countUp(el){
    const to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || '0', 10);
    const fmt = function(v){ return v.toFixed(dec).replace('.', ','); };
    if (motion.reduced){ el.textContent = fmt(to); return; }
    tween(1400, function(k){
      const e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(to * e);
    });
  }

  /* observador compartilhado do padrão .anx: as dobras 02, 03 e 04 usam o mesmo
     gatilho, então usam também o mesmo observer. */
  const anxObs = motion.reduced ? null : new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      const el = en.target;
      if (en.isIntersecting){
        el.classList.add('is-in');
        el.classList.remove('is-past');
        el.querySelectorAll('[data-count]').forEach(countUp);
      } else {
        el.classList.remove('is-in');
        el.classList.toggle('is-past', en.boundingClientRect.top < 0);
      }
    });
  }, { threshold:.12, rootMargin:'0px 0px -6% 0px' });

  function revealFx(root, selector){
    const els = root.querySelectorAll(selector);
    if (!anxObs){
      els.forEach(function(el){ el.classList.add('is-in'); });
      root.querySelectorAll('[data-count]').forEach(countUp);
      return;
    }
    els.forEach(function(el){ anxObs.observe(el); });
  }

  /* ==========================================================================
     3 · ações declaradas no HTML (data-action / data-ripple)
     Uma escuta delegada no documento substitui os onclick inline.
     ========================================================================== */
  /* Camadas que tomam a tela (modal e drawer): quem abre guarda o elemento que
     tinha o foco, o foco entra na camada, o Tab circula lá dentro e, ao fechar,
     volta para onde estava. Sem isso o teclado continua andando pela página
     atrás do scrim. */
  const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let layerOpen = null;   // o elemento da camada aberta
  let lastFocus = null;   // para onde o foco volta

  function focusablesIn(el){
    return Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function(n){
      return n.offsetWidth || n.offsetHeight || n.getClientRects().length;
    });
  }
  function openLayer(el, first){
    layerOpen = el;
    lastFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    const target = first || focusablesIn(el)[0];
    if (target) target.focus();
  }
  function closeLayer(el){
    if (layerOpen !== el) return;
    layerOpen = null;
    document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }

  function openModal(){
    const m = document.getElementById('modal');
    if (!m) return;
    closeDrawer();            // o drawer também tem um botão que abre o modal
    m.classList.add('is-open');
    openLayer(m, document.getElementById('modal-card'));
  }
  function closeModal(){
    const m = document.getElementById('modal');
    if (!m) return;
    m.classList.remove('is-open');
    closeLayer(m);
  }

  let toastTimer;
  function toast(msg){
    const el = document.getElementById('toast');
    const txt = document.getElementById('toast-msg');
    if (!el || !txt) return;
    txt.textContent = msg;
    el.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.classList.remove('is-open'); }, 3200);
  }

  function ripple(e, el){
    if (motion.reduced) return;
    const r = el.getBoundingClientRect();
    const span = document.createElement('span');
    const size = Math.max(r.width, r.height);
    span.className = 'ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (e.clientX - r.left - size/2) + 'px';
    span.style.top = (e.clientY - r.top - size/2) + 'px';
    el.appendChild(span);
    setTimeout(function(){ span.remove(); }, 700);
  }

  const actions = {
    'modal-open':  openModal,
    'modal-close': closeModal,
    'reservar':    function(){ closeModal(); toast('Reserva registrada'); }
  };

  document.addEventListener('click', function(e){
    const rip = e.target.closest('[data-ripple]');
    if (rip) ripple(e, rip);
    const host = e.target.closest('[data-action]');
    if (!host) return;
    const fn = actions[host.dataset.action];
    if (fn){ e.preventDefault(); fn(host, e); }
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape'){
      closeModal();
      closeDrawer();
      return;
    }
    if (e.key !== 'Tab' || !layerOpen) return;
    const list = focusablesIn(layerOpen);
    if (!list.length) return;
    // -1 é o caso do #modal-card, que recebe o foco mas não entra na lista
    const i = list.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0){
      e.preventDefault(); list[list.length - 1].focus();
    } else if (!e.shiftKey && i === list.length - 1){
      e.preventDefault(); list[0].focus();
    }
  });

  /* ==========================================================================
     4 · lanterna / glow
     ========================================================================== */
  function paintFlashlight(e, card){
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    card.style.setProperty('--mouse-x', x + 'px');
    card.style.setProperty('--mouse-y', y + 'px');
    card.style.setProperty('--x', x + 'px');
    card.style.setProperty('--y', y + 'px');
  }
  if (!motion.touch){
    document.addEventListener('mousemove', function(e){
      document.querySelectorAll('.glow-card, .flashlight-card').forEach(function(card){
        const r = card.getBoundingClientRect();
        if (e.clientX < r.left - 60 || e.clientX > r.right + 60 || e.clientY < r.top - 60 || e.clientY > r.bottom + 60) return;
        paintFlashlight(e, card);
      });
    }, { passive:true });
  }

  /* ==========================================================================
     5 · surgimento geral (.reveal / .animate-in / .clip-enter)
     ========================================================================== */
  const observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('active', 'reveal-active');
      el.querySelectorAll(':scope > .clip-enter').forEach(function(c){ c.classList.add('active'); });

      // stagger dos filhos
      el.querySelectorAll(':scope > .reveal, :scope > .animate-in').forEach(function(child, i){
        setTimeout(function(){ child.classList.add('active'); }, i * 100);
      });
      // o lettering em contorno se pinta ao entrar
      el.querySelectorAll('.text-transparent-stroke:not(#paint-target)').forEach(function(t, i){
        setTimeout(function(){ t.classList.add('is-painted'); }, 400 + i * 150);
      });
      // linhas conectoras
      el.querySelectorAll('.conn').forEach(function(p, i){
        setTimeout(function(){ p.classList.add('is-drawn'); }, 600 + i * 200);
      });
      observer.unobserve(el);
    });
  }, { threshold:.1, rootMargin:'0px 0px -60px 0px' });

  document.querySelectorAll('.reveal, .animate-in, .text-reveal-wrapper, section, footer')
    .forEach(function(el){ observer.observe(el); });
  // .clip-enter nasce com clip-path zerado: o Chrome o vê com área 0 e nunca dispara, então observa o pai
  document.querySelectorAll('.clip-enter').forEach(function(el){ observer.observe(el.parentElement); });

  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* ==========================================================================
     6 · abertura da hero: o pincel pinta a headline
     ========================================================================== */
  onReady(function(){
    const title = document.getElementById('hero-title');
    const line  = title ? title.querySelector('.paint-line') : null;
    const paint = document.getElementById('paint-target');
    if (!title) return;
    setTimeout(function(){ title.classList.add('reveal-active', 'active'); }, 200);
    if (motion.reduced){ if (paint) paint.classList.add('is-painted'); return; }
    setTimeout(function(){
      if (line) line.classList.add('is-sweeping');
      setTimeout(function(){ if (paint) paint.classList.add('is-painted'); }, 260);
    }, 1300);
  });

  /* ==========================================================================
     7 · progresso de leitura + parallax da hero
     O scroll só marca sujeira; quem pinta é o relógio compartilhado.
     ========================================================================== */
  const bar = document.getElementById('scroll-progress');
  function paintScroll(){
    const y = window.scrollY;
    if (bar){
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
    if (!motion.reduced){
      const title = document.getElementById('hero-title');
      if (title && y < window.innerHeight) title.style.transform = 'translateY(' + (y * 0.1) + 'px)';
    }
  }
  // o tick se remove sozinho: uma pintura por quadro, por mais scroll que chegue
  function paintScrollTick(){ ticker.remove(paintScrollTick); paintScroll(); }
  window.addEventListener('scroll', function(){ ticker.add(paintScrollTick); }, { passive:true });
  paintScroll();

  /* ==========================================================================
     8 · tilt do palco do vídeo e botões magnéticos
     ========================================================================== */
  /* o painel não persegue o cursor: ele é puxado por ele. O mousemove só move
     o alvo, e um lerp no relógio da página aproxima o painel do alvo um pouco
     a cada quadro — o mesmo efeito de um quickTo do GSAP, sem transição que
     reinicia a cada evento.

     O movimento é deslocamento, não rotação. Medido no Chrome: qualquer
     rotateX/rotateY faz o compositor rasterizar a camada em resolução menor e
     reamostrá-la, e o vídeo dentro dela perde 75% da definição enquanto o
     cursor estiver no palco. O ângulo não muda nada — basta a rotação existir.
     Deslocar não rasteriza, então a profundidade vem do paralaxe: o chip de
     vidro anda mais que o painel, e é essa diferença que o olho lê como
     relevo. */
  const stage = document.getElementById('stage');
  const stageInner = document.getElementById('stage-inner');
  const stageChip = stageInner && stageInner.querySelector('.chip');

  if (stage && stageInner && !motion.reduced){
    const PAINEL = 7;    // px no canto
    const CHIP   = 17;   // px no canto: anda mais, por estar "à frente"
    const PUXA   = .045; // quanto do caminho até o alvo ele anda por quadro
    let alvoX = 0, alvoY = 0, atualX = 0, atualY = 0, parado = true;

    /* o deslocamento encosta na grade de pixels da tela. Um valor quebrado
       (3,15px) cai entre dois pixels e o compositor interpola o painel inteiro,
       o que embaça o vídeo quase tanto quanto a rotação embaçava. */
    const grade = window.devicePixelRatio || 1;
    function trava(v){ return Math.round(v * grade) / grade; }

    function tiltFrame(){
      atualX += (alvoX - atualX) * PUXA;
      atualY += (alvoY - atualY) * PUXA;

      if (Math.abs(alvoX - atualX) < .004 && Math.abs(alvoY - atualY) < .004){
        atualX = alvoX; atualY = alvoY;
        ticker.remove(tiltFrame);
        parado = true;
      }

      // em repouso a transform sai de cena: sem camada promovida, sem custo
      if (parado && atualX === 0 && atualY === 0){
        stageInner.style.transform = '';
        stageInner.style.willChange = '';
        if (stageChip) stageChip.style.transform = '';
        return;
      }

      stageInner.style.transform =
        'translate3d(' + trava(atualX * PAINEL) + 'px,' + trava(atualY * PAINEL) + 'px,0)';
      if (stageChip) stageChip.style.transform =
        'translate3d(' + trava(atualX * CHIP) + 'px,' + trava(atualY * CHIP) + 'px,0)';
    }

    function acorda(){
      if (!parado) return;
      parado = false;
      stageInner.style.willChange = 'transform';
      ticker.add(tiltFrame);
    }

    stage.addEventListener('mousemove', function(e){
      const r = stage.getBoundingClientRect();
      alvoX = (e.clientX - r.left) / r.width - .5;
      alvoY = (e.clientY - r.top) / r.height - .5;
      acorda();
    }, { passive:true });

    stage.addEventListener('mouseleave', function(){ alvoX = 0; alvoY = 0; acorda(); });
  }

  document.querySelectorAll('.magnetic').forEach(function(btn){
    btn.addEventListener('mousemove', function(e){
      if (motion.reduced) return;
      const r = btn.getBoundingClientRect();
      btn.style.transform = 'translate(' + ((e.clientX - r.left - r.width/2) * .18) + 'px,' + ((e.clientY - r.top - r.height/2) * .28) + 'px)';
    }, { passive:true });
    btn.addEventListener('mouseleave', function(){ btn.style.transform = ''; });
  });

  /* ==========================================================================
     10 · vídeo da hero
     O arquivo só é baixado quando a dobra chega perto da tela (preload="none").
     ========================================================================== */
  const video = document.getElementById('hero-video');
  const vBtn  = document.getElementById('video-toggle');
  const vIcon = document.getElementById('video-toggle-icon');

  function paintToggle(){
    if (!vBtn || !vIcon) return;
    const playing = video && !video.paused;
    vIcon.querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    vBtn.setAttribute('data-tip', playing ? 'Pausar' : 'Tocar');
    vBtn.setAttribute('aria-label', playing ? 'Pausar o vídeo' : 'Tocar o vídeo');
  }
  function playVideo(){
    if (!video) return;
    if (video.dataset.loaded !== '1'){
      video.dataset.loaded = '1';
      video.preload = 'auto';
      video.load();
    }
    const p = video.play();
    if (p && p.catch) p.catch(function(){ /* autoplay barrado: fica no pôster */ });
  }

  if (video){
    // quem pediu menos movimento fica no pôster até clicar em tocar
    if (!motion.reduced){
      onView(video,
        function(){ if (video.dataset.paused !== '1') playVideo(); },
        function(){ if (video.dataset.paused !== '1') video.pause(); },
        { threshold:.15, rootMargin:'200px 0px' });
    }
    video.addEventListener('play', paintToggle);
    video.addEventListener('pause', paintToggle);
    paintToggle();
    // o Chrome pausa vídeo em aba oculta: ao voltar, retoma (se não houver pausa manual)
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState !== 'visible' || motion.reduced) return;
      if (video.dataset.paused === '1' || video.dataset.loaded !== '1') return;
      playVideo();
    });
  }
  if (vBtn && video){
    vBtn.addEventListener('click', function(){
      if (video.paused){ video.dataset.paused = '0'; playVideo(); }
      else { video.dataset.paused = '1'; video.pause(); }
    });
  }

  /* ==========================================================================
     11 · drawer
     ========================================================================== */
  const drawer = document.getElementById('drawer');
  const menuBtn = document.getElementById('menu-btn');
  function closeDrawer(){
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('inert', '');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    closeLayer(drawer);
  }
  if (menuBtn && drawer){
    menuBtn.addEventListener('click', function(){
      drawer.classList.add('is-open');
      drawer.removeAttribute('inert');
      menuBtn.setAttribute('aria-expanded', 'true');
      openLayer(drawer, document.getElementById('drawer-close'));
    });
    const dClose = document.getElementById('drawer-close');
    const dScrim = document.getElementById('drawer-scrim');
    if (dClose) dClose.addEventListener('click', closeDrawer);
    if (dScrim) dScrim.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeDrawer); });
  }

  /* ==========================================================================
     12 · dobra 02 · anatomia
     ========================================================================== */
  const anat = document.getElementById('anatomia');
  if (anat){
    const grid   = document.getElementById('anat-grid');
    const brush  = document.getElementById('anat-brush');
    const lens   = document.getElementById('anat-lens');
    const svg    = grid.querySelector('.anat-lines');
    const notes  = Array.prototype.slice.call(grid.querySelectorAll('.anat-note'));
    const spots  = Array.prototype.slice.call(grid.querySelectorAll('.hs'));
    const TOUR   = 4400;
    const NS     = 'http://www.w3.org/2000/svg';

    // uma linha por nota; pathLength=1 deixa o traço "desenhável" com qualquer comprimento
    const lines = {};
    notes.forEach(function(note, i){
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('class', 'anat-line');
      p.setAttribute('pathLength', '1');
      p.style.setProperty('--i', i);
      svg.appendChild(p);
      lines[note.dataset.hs] = p;
    });

    function drawLines(){
      if (!motion.wide) return;
      const box = svg.getBoundingClientRect();
      notes.forEach(function(note){
        const a = note.querySelector('.anat-anchor').getBoundingClientRect();
        const h = grid.querySelector('.hs[data-hs="' + note.dataset.hs + '"]').getBoundingClientRect();
        const ax = a.left + a.width / 2 - box.left, ay = a.top + a.height / 2 - box.top;
        const hx = h.left + h.width / 2 - box.left, hy = h.top + h.height / 2 - box.top;
        const mx = ax + (hx - ax) * .42;
        lines[note.dataset.hs].setAttribute('d', 'M' + ax + ' ' + ay + ' H' + mx + ' L' + hx + ' ' + hy);
      });
    }

    revealFx(anat, '.anx, .anx-mask, [data-anx-group]');

    // ponto ativo: nota, hotspot, linha e lupa andam juntos
    let active = 0;
    function placeLens(n){
      const spot = grid.querySelector('.hs[data-hs="' + n + '"]');
      if (!spot || !lens){ return; }
      const bw = brush.offsetWidth, bh = brush.offsetHeight, Z = 3, L = 136;
      const x = parseFloat(spot.style.getPropertyValue('--x')) / 100;
      const y = parseFloat(spot.style.getPropertyValue('--y')) / 100;
      const side = n % 2 ? 1 : -1;               // ímpar: nota à esquerda → lupa à direita
      const img = brush.querySelector('img');
      lens.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
      lens.style.backgroundSize = (bw * Z) + 'px ' + (bh * Z) + 'px';
      lens.style.backgroundPosition = (L / 2 - x * bw * Z) + 'px ' + (L / 2 - y * bh * Z) + 'px';
      lens.style.left = (x * bw + side * (bw * .5 + 96)) + 'px';
      lens.style.top  = Math.max(L / 2, y * bh) + 'px';
      lens.classList.add('is-on');
    }
    function setActive(n){
      active = n;
      grid.classList.toggle('has-active', n > 0);
      notes.forEach(function(el){ el.classList.toggle('is-active', +el.dataset.hs === n); });
      spots.forEach(function(el){ el.classList.toggle('is-active', +el.dataset.hs === n); });
      Object.keys(lines).forEach(function(k){ lines[k].classList.toggle('is-active', +k === n); });
      if (n && motion.wide) placeLens(n); else if (lens) lens.classList.remove('is-on');
    }

    // tour automático enquanto a dobra está na tela e ninguém está explorando
    let tourTimer = null, userHold = false;
    function tourNext(){ setActive(active % 6 + 1); }
    function startTour(){
      if (motion.reduced || userHold || tourTimer || !motion.wide) return;
      grid.classList.add('is-auto');
      grid.style.setProperty('--tour', TOUR + 'ms');
      tourNext();
      tourTimer = setInterval(tourNext, TOUR);
    }
    function stopTour(){ clearInterval(tourTimer); tourTimer = null; grid.classList.remove('is-auto'); }

    function hold(n){ userHold = true; stopTour(); setActive(n); }

    // uma escuta delegada por grade cobre as seis notas e os seis hotspots
    function nOf(target){
      const el = target && target.closest ? target.closest('[data-hs]') : null;
      return el ? +el.dataset.hs : 0;
    }
    ['mouseenter', 'click'].forEach(function(type){
      grid.addEventListener(type, function(e){
        const n = nOf(e.target);
        if (n) hold(n);
      }, true);
    });
    grid.addEventListener('focusin', function(e){
      const n = nOf(e.target);
      if (n) hold(n);
    });
    grid.addEventListener('mouseleave', function(){
      userHold = false;
      setTimeout(function(){ if (!userHold && grid.classList.contains('is-in')) startTour(); }, 1200);
    });

    // laço de quadro só enquanto a dobra está visível: scroll → --p, linhas seguem o pincel
    function anatFrame(){
      const r = anat.getBoundingClientRect(), vh = window.innerHeight;
      if (!motion.reduced){
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        anat.style.setProperty('--p', p.toFixed(4));
      }
      drawLines();
    }
    onView(anat,
      function(){ ticker.add(anatFrame); },
      function(){ ticker.remove(anatFrame); });

    // o tour liga quando o diagrama entra e desliga quando sai
    onView(grid,
      function(){ startTour(); },
      function(){ stopTour(); setActive(0); },
      { threshold:.35 });

    mq.wide.addEventListener('change', function(){ setActive(active); });
    window.addEventListener('resize', function(){ if (active) placeLens(active); }, { passive:true });
  }

  /* ==========================================================================
     13 · dobra 03 · ritual
     ========================================================================== */
  const rit = document.getElementById('ritual');
  if (rit){
    const cards = Array.prototype.slice.call(rit.querySelectorAll('.rit-card'));
    const rows  = Array.prototype.slice.call(rit.querySelectorAll('.rit-row'));

    revealFx(rit, '.anx, .anx-mask');

    // toca o gesto do zero: tira a classe, força o reflow, devolve
    function play(card){
      if (!card || motion.reduced) return;
      card.classList.remove('play');
      void card.offsetWidth;
      card.classList.add('play');
    }
    function link(step, on){
      const row = rows[step - 1];
      if (row) row.classList.toggle('is-on', on);
    }

    cards.forEach(function(card, i){
      const step = parseInt(card.dataset.step, 10);
      // primeira exibição: cada quadro toca ao entrar, escalonado
      onEnterOnce(card, function(){
        setTimeout(function(){ play(card); }, 380 + i * 220);
      }, { threshold:.4 });

      card.addEventListener('mouseenter', function(){ play(card); link(step, true); });
      card.addEventListener('mouseleave', function(){ link(step, false); });
      card.addEventListener('mousemove', function(e){
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }, { passive:true });

      const btn = card.querySelector('.rit-replay');
      if (btn) btn.addEventListener('click', function(e){ e.preventDefault(); play(card); });
    });

    // a tabela e os quadros são a mesma coisa vista de dois lados
    rows.forEach(function(row){
      const card = cards[parseInt(row.dataset.step, 10) - 1];
      row.addEventListener('mouseenter', function(){
        play(card);
        row.classList.add('is-on');
        if (card) card.classList.add('is-hot');
      });
      row.addEventListener('mouseleave', function(){
        row.classList.remove('is-on');
        if (card) card.classList.remove('is-hot');
      });
    });
  }

  /* ==========================================================================
     14 · dobra 04 · o fecho
     ========================================================================== */
  const fin = document.getElementById('fecho');
  if (fin){
    revealFx(fin, '.anx, .anx-mask');

    if (motion.reduced){
      fin.classList.add('is-seen');
    } else {
      // a costura de luz corta o topo da dobra assim que ela encosta na tela
      onEnterOnce(fin, function(){ fin.classList.add('is-seen'); },
        { threshold:0, rootMargin:'0px 0px -12% 0px' });
    }

    // a placa: o número sobe até a próxima peça e a luz atravessa a gravação
    const plate = fin.querySelector('.fin-plate');
    const count = document.getElementById('fin-count');
    const NEXT  = 147;
    const pad   = function(n){ return String(n).padStart(3, '0'); };
    const num   = fin.querySelector('.fin-num');

    function shine(){
      if (!num || motion.reduced) return;
      num.classList.remove('shine');
      void num.offsetWidth;
      num.classList.add('shine');
    }
    function roll(){
      if (!count) return;
      if (motion.reduced){ count.textContent = pad(NEXT); return; }
      tween(1500, function(k){
        count.textContent = pad(Math.round(NEXT * (1 - Math.pow(1 - k, 3))));
      });
    }

    if (plate){
      if (motion.reduced){ plate.classList.add('is-lit'); roll(); }
      else {
        onEnterOnce(plate, function(){
          plate.classList.add('is-lit');
          roll();
          setTimeout(shine, 420);
        }, { threshold:.35 });

        plate.addEventListener('mouseenter', shine);
        plate.addEventListener('mousemove', function(e){
          const r = plate.getBoundingClientRect();
          plate.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
          plate.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
        }, { passive:true });
      }
    }

    /* a peça exposta: a luz corre por ela uma vez, e depois a cada passada do
       cursor. O deslocamento vertical é pequeno de propósito — parallax em
       cima de uma foto de produto vende profundidade até uns 12 px; mais que
       isso e a peça descola da sombra. */
    const peca  = fin.querySelector('.fin-piece');
    const gloss = peca && peca.querySelector('.fin-gloss');

    if (peca && !motion.reduced){
      function acende(){
        peca.classList.remove('is-lit');
        void peca.offsetWidth;
        peca.classList.add('is-lit');
      }
      onEnterOnce(peca, acende, { threshold:.4 });
      if (!motion.touch) peca.addEventListener('mouseenter', acende);

      // o parallax só roda enquanto a cena está na tela
      function pecaFrame(){
        const r = peca.getBoundingClientRect();
        const k = 1 - (r.top + r.height / 2) / window.innerHeight;  // -1 embaixo, 1 em cima
        peca.style.setProperty('--fy', (k * 12).toFixed(1) + 'px');
      }
      onView(peca,
        function(){ ticker.add(pecaFrame); },
        function(){ ticker.remove(pecaFrame); },
        { threshold:0, rootMargin:'20% 0px 20% 0px' });
    } else if (gloss){
      gloss.remove();
    }
  }

  /* ==========================================================================
     15 · trilha de pó do cursor
     Desenha no mesmo relógio e para quando a aba sai de vista.
     ========================================================================== */
  const canvas = document.getElementById('dust-canvas');
  if (canvas && !motion.reduced && !motion.touch){
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize, { passive:true });
    window.addEventListener('mousemove', function(e){
      for (let i = 0; i < 2; i++){
        particles.push({
          x: e.clientX + (Math.random() - .5) * 10,
          y: e.clientY + (Math.random() - .5) * 10,
          r: Math.random() * 2.4 + .6,
          vx: (Math.random() - .5) * .3,
          vy: -Math.random() * .35 - .05,
          life: 1
        });
      }
      if (particles.length > 220) particles = particles.slice(-220);
    }, { passive:true });

    function dustFrame(){
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const glow = getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() || '234,215,209';
      particles = particles.filter(function(p){
        p.x += p.vx; p.y += p.vy; p.life -= .016;
        if (p.life <= 0) return false;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + glow + ',' + (p.life * .5) + ')';
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
    }
    ticker.add(dustFrame);
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'visible') ticker.add(dustFrame);
      else ticker.remove(dustFrame);
    });
  }

  /* ==========================================================================
     16 · o tom da dobra e o indicador do menu
     Uma fita fina no meio da tela decide qual dobra está sendo lida. O JS só
     escreve data-dobra no <html> e move o indicador: as cores moram no CSS.
     ========================================================================== */
  const dobras = Array.from(document.querySelectorAll('.shell section[id]'));
  const ind    = document.getElementById('nav-ind');
  const elos   = Array.from(document.querySelectorAll('.nav-rail .link-ghost'));
  let dobraAtual = '';

  function moveIndicador(alvo){
    if (!ind) return;
    if (!alvo || !alvo.offsetWidth){ ind.classList.remove('is-on'); return; }
    ind.style.left  = alvo.offsetLeft + 'px';
    ind.style.width = alvo.offsetWidth + 'px';
    ind.classList.add('is-on');
  }

  function marcaDobra(id){
    if (id === dobraAtual) return;
    dobraAtual = id;
    document.documentElement.dataset.dobra = id;
    let alvo = null;
    elos.forEach(function(a){
      const meu = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-current', meu);
      if (meu) alvo = a;
    });
    moveIndicador(alvo);
  }

  if (dobras.length){
    marcaDobra(dobras[0].id);
    const tomObs = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (en.isIntersecting) marcaDobra(en.target.id); });
    }, { rootMargin:'-45% 0px -45% 0px' });
    dobras.forEach(function(sec){ tomObs.observe(sec); });
    window.addEventListener('resize', function(){
      moveIndicador(elos.filter(function(a){ return a.classList.contains('is-current'); })[0]);
    }, { passive:true });
  }
})();
