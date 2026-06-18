/* ============================================================
   株式会社BASE — script.js  v8 premium-redesign
   ============================================================ */

(function () {
  'use strict';

  /* ── Startup Animation & Skip Button ─────────────────────── */
  const startup     = document.getElementById('startup');
  const skipBtn     = document.getElementById('startupSkip');

  function dismissStartup() {
    if (!startup) return;
    startup.classList.add('fading');
    startup.addEventListener('animationend', () => startup.remove(), { once: true });
    // safety fallback
    setTimeout(() => { if (startup.parentNode) startup.remove(); }, 800);
  }

  if (startup) {
    // Auto-dismiss after full animation (~3.65s)
    setTimeout(dismissStartup, 3700);
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', dismissStartup);
    skipBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismissStartup(); }
    });
  }

  /* ── Hamburger Menu ───────────────────────────────────────── */
  const hamburger  = document.getElementById('hamburger');
  const mobileNav  = document.getElementById('mobileNav');

  function openMobileNav() {
    mobileNav.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'メニューを閉じる');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNav.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'メニューを開く');
    document.body.style.overflow = '';
  }

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      if (mobileNav.classList.contains('open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) closeMobileNav();
    });

    // Close on backdrop click (outside nav links)
    mobileNav.addEventListener('click', (e) => {
      if (e.target === mobileNav) closeMobileNav();
    });
  }

  // Expose close function globally for inline onclick
  window.closeMobileNav = closeMobileNav;

  /* ── Cursor Light ─────────────────────────────────────────── */
  const cursor = document.querySelector('.cursor-light');
  if (cursor) {
    window.addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top  = `${e.clientY}px`;
    }, { passive: true });
  }

  /* ── Scroll Progress Meter ────────────────────────────────── */
  const meterBar = document.querySelector('.scroll-meter span');
  if (meterBar) {
    window.addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      meterBar.style.height = max > 0 ? `${(scrollY / max) * 100}%` : '0%';
    }, { passive: true });
  }

  /* ── Intersection Observer: Scroll Entrance Animations ────── */
  const animTargets = document.querySelectorAll(
    '.mission-grid article, .service-card, .support-panel div, ' +
    '.road-step, .issue-grid button, .line-menu a, .industry-strip span'
  );

  const entranceObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.classList.contains('road-step')) {
          entry.target.classList.add('in-view');
        }
      }
    });
  }, { threshold: 0.16 });

  const visibleStyle = document.createElement('style');
  visibleStyle.textContent = '.visible { opacity: 1 !important; transform: none !important; }';
  document.head.appendChild(visibleStyle);

  animTargets.forEach((el) => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transition = 'opacity .75s ease, transform .75s ease';
    entranceObserver.observe(el);
  });

  /* ── Hero Core Button Ripple ──────────────────────────────── */
  const coreBtn = document.getElementById('coreButton');
  if (coreBtn) {
    coreBtn.addEventListener('click', () => {
      document.querySelectorAll('.system-node').forEach((node, i) => {
        node.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.24)', filter: 'brightness(1.8)' },
            { transform: 'scale(1)' },
          ],
          { duration: 780, delay: i * 95, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
      });
      coreBtn.animate(
        [
          { boxShadow: '0 0 20px #72ecff' },
          { boxShadow: '0 0 120px #72ecff' },
          { boxShadow: '0 0 20px #72ecff' },
        ],
        { duration: 1200 }
      );
    });
  }

  /* ── Scope Toggle (一括支援 / 部分支援) ─────────────────── */
  const scopeStage = document.querySelector('.scope-stage');
  const scopeText  = document.getElementById('scopeText');

  document.querySelectorAll('.scope-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.scope-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const isPart = tab.dataset.mode === 'part';
      scopeStage?.classList.toggle('part', isPart);

      if (scopeText) {
        scopeText.innerHTML = isPart
          ? '<strong>部分支援：</strong>Wi-Fi、防犯、Web、AI活用など、必要な領域だけのご相談にも対応します。'
          : '<strong>一括支援：</strong>開設・改善に必要な領域を、ひとつの相談窓口で整理します。';
      }
    });
  });

  /* ── Issue Grid Button → LINE ─────────────────────────────── */
  document.querySelectorAll('.issue-grid button').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.open('https://lin.ee/z5T92Yn', '_blank', 'noopener');
    });
  });

  /* ── Confetti Burst ───────────────────────────────────────── */
  function burst() {
    const colors = ['#00a8ff', '#72ecff', '#fff', '#c8a030', '#ffd166'];
    for (let i = 0; i < 96; i++) {
      const el = document.createElement('i');
      el.className = 'confetti';
      el.style.left       = `${innerWidth / 2}px`;
      el.style.top        = `${innerHeight * 0.45}px`;
      el.style.background = colors[i % colors.length];
      el.style.setProperty('--x', `${(Math.random() - 0.5) * 820}px`);
      el.style.setProperty('--y', `${Math.random() * 760 - 120}px`);
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2100);
    }
  }

  /* ── Launch Button (Roadmap Final Step) ───────────────────── */
  const launchBtn    = document.getElementById('launchBtn');
  const launchStatus = document.getElementById('launchStatus');

  if (launchBtn && launchStatus) {
    launchBtn.addEventListener('click', () => {
      const steps = ['回線 接続完了', 'POS 起動完了', '防犯 起動完了', 'Web 公開完了', '照明 点灯', '事業所オープン！'];
      let idx = 0;
      launchBtn.disabled = true;
      document.body.classList.add('launching');

      const timer = setInterval(() => {
        launchStatus.textContent = steps[idx++];
        launchStatus.animate(
          [{ opacity: 0.2, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 400 }
        );
        if (idx === steps.length) {
          clearInterval(timer);
          launchBtn.textContent = 'オープン完了';
          document.body.classList.add('launched');
          burst();
          setTimeout(() => {
            document.querySelector('.network')?.scrollIntoView({ behavior: 'smooth' });
          }, 800);
        }
      }, 520);
    });
  }

  /* ── Build Visual: Scroll Stage Sync ─────────────────────── */
  const buildScene  = document.querySelector('.build-scene');
  const buildStatus = [...document.querySelectorAll('.build-status span')];
  const roadSteps   = [...document.querySelectorAll('.road-step')];

  if (buildScene && roadSteps.length) {
    const stageObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = roadSteps.indexOf(entry.target) + 1;
          buildScene.dataset.stage = String(idx);
          buildStatus.forEach((s, i) => s.classList.toggle('active', i < idx));
        }
      });
    }, { threshold: 0.55, rootMargin: '-12% 0px -28%' });

    roadSteps.forEach((s) => stageObs.observe(s));
  }

  /* ── Orb Parallax (rAF throttled) ────────────────────────── */
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      document.documentElement.style.setProperty('--scrollShift', `${(y % 700) * 0.035}px`);
      document.querySelectorAll('.orb').forEach((orb, i) => {
        orb.style.transform = `translate3d(0, ${(y * 0.04 * (i ? -0.7 : 1)).toFixed(1)}px, 0)`;
      });
      ticking = false;
    });
  }, { passive: true });

})();
