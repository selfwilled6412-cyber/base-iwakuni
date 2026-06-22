/* ============================================================
   BASE Security Map — security.js
   セキュリティページ専用JS（既存script.jsとは独立）
   ============================================================ */
(function () {
  'use strict';

  /* ── ハンバーガーメニュー ─────────────────────────────── */
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');

  function openMobileNav() {
    if (!mobileNav || !hamburger) return;
    mobileNav.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'メニューを閉じる');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    if (!mobileNav || !hamburger) return;
    mobileNav.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'メニューを開く');
    document.body.style.overflow = '';
  }

  window.closeMobileNav = closeMobileNav;

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.contains('open') ? closeMobileNav() : openMobileNav();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) closeMobileNav();
    });
    mobileNav.addEventListener('click', (e) => {
      if (e.target === mobileNav) closeMobileNav();
    });
  }

  /* ── スクロールメーター ──────────────────────────────── */
  const meterBar = document.querySelector('.scroll-meter span');
  if (meterBar) {
    window.addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      meterBar.style.height = max > 0 ? `${(scrollY / max) * 100}%` : '0%';
    }, { passive: true });
  }

  /* ── カーソルライト ──────────────────────────────────── */
  const cursor = document.querySelector('.cursor-light');
  if (cursor) {
    window.addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top  = `${e.clientY}px`;
    }, { passive: true });
  }

  /* ── スクロール入場アニメ ────────────────────────────── */
  const animEls = document.querySelectorAll('.sec-anim');
  if (animEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // stagger delay based on index within parent
          const siblings = [...entry.target.parentElement.querySelectorAll('.sec-anim')];
          const idx = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = `${idx * 0.08}s`;
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    animEls.forEach((el) => observer.observe(el));
  }

  /* ── インタラクティブチェックリスト ─────────────────── */
  const checkItems = document.querySelectorAll('.sec-check-item');
  const scoreNum   = document.querySelector('.score-num');
  const scoreMsg   = document.querySelector('.score-msg');

  const messages = [
    'まずは現状を把握することから始めましょう。',
    '少しずつ整理が進んでいます。',
    'いい状態です。残りも確認してみましょう。',
    'だいぶ整っています。あと少しです！',
    'しっかり整備されています。',
    '優れた状態です！ぜひBASEにご相談ください。',
    'ほぼ完璧です。BASEと一緒にさらに磨きましょう。',
    '万全の体制です！LINEでご報告ください😊',
  ];

  function updateScore() {
    if (!scoreNum) return;
    const checked = document.querySelectorAll('.sec-check-item.checked').length;
    scoreNum.textContent = `${checked} / ${checkItems.length}`;
    if (scoreMsg) scoreMsg.textContent = messages[Math.min(checked, messages.length - 1)];
  }

  checkItems.forEach((item) => {
    item.setAttribute('role', 'checkbox');
    item.setAttribute('aria-checked', 'false');
    item.setAttribute('tabindex', '0');

    function toggle() {
      item.classList.toggle('checked');
      const box = item.querySelector('.sec-check-box');
      if (box) box.textContent = item.classList.contains('checked') ? '✓' : '';
      item.setAttribute('aria-checked', item.classList.contains('checked') ? 'true' : 'false');
      updateScore();
    }

    item.addEventListener('click', toggle);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  updateScore();

})();
