/* ============================================
   DE-BRIGHT TALENTED KIDS SCHOOL — main.js
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- PRELOADER ---- */
  window.addEventListener('load', () => {
    const pre = document.getElementById('preloader');
    if (pre) {
      pre.classList.add('loaded');
      setTimeout(() => pre.remove(), 600);
    }
  });

  /* ---- MOBILE MENU ---- */
  const menuBtn = document.getElementById('mobile-menu');
  const navLinks = document.getElementById('nav-menu');
  const menuIcon = menuBtn?.querySelector('i');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      if (menuIcon) {
        menuIcon.classList.toggle('fa-bars');
        menuIcon.classList.toggle('fa-times');
      }
    });
  }

  /* ---- ACTIVE NAV LINK ---- */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  /* ---- BACK TO TOP ---- */
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('show', window.scrollY > 300);
    });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---- FAQ ACCORDION ---- */
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isActive = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-answer').style.maxHeight = null;
        const icon = i.querySelector('.faq-icon');
        if (icon) { icon.classList.replace('fa-minus', 'fa-plus'); }
      });

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        const icon = btn.querySelector('.faq-icon');
        if (icon) { icon.classList.replace('fa-plus', 'fa-minus'); }
      }
    });
  });

  /* ---- ANIMATED COUNTERS ---- */
  const counters = document.querySelectorAll('.count[data-target]');
  if (counters.length) {
    let counted = false;
    const counterSection = document.querySelector('.counter-section');
    const animateCounters = () => {
      if (counted) return;
      if (!counterSection) return;
      const top = counterSection.getBoundingClientRect().top;
      if (top < window.innerHeight - 80) {
        counted = true;
        counters.forEach(el => {
          const target = +el.dataset.target;
          const steps = 80;
          let step = 0;
          const interval = setInterval(() => {
            step++;
            el.textContent = Math.ceil(target * (step / steps)) + '+';
            if (step >= steps) { el.textContent = target + '+'; clearInterval(interval); }
          }, 20);
        });
      }
    };
    window.addEventListener('scroll', animateCounters);
    animateCounters();
  }

  /* ---- TYPEWRITER (index page only) ---- */
  const typeEl = document.querySelector('.typewriter-text');
  if (typeEl) {
    const phrases = ['Confidence', 'Excellence', 'Creativity', 'Leadership', 'Discipline'];
    let pi = 0, ci = 0, deleting = false, speed = 150;
    const type = () => {
      const phrase = phrases[pi];
      typeEl.textContent = deleting
        ? phrase.substring(0, ci - 1)
        : phrase.substring(0, ci + 1);
      deleting ? ci-- : ci++;
      if (!deleting && ci === phrase.length) { deleting = true; speed = 2000; }
      else if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; speed = 500; }
      else { speed = deleting ? 50 : 150; }
      setTimeout(type, speed);
    };
    setTimeout(type, 1000);
  }

  /* ---- BECE COUNTDOWN ---- */
  const timerEl = document.querySelector('.timer');
  if (timerEl) {
    const beceDate = new Date('Jul 06, 2026 08:00:00').getTime();
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      const dist = beceDate - Date.now();
      if (dist < 0) {
        const sec = document.getElementById('countdown-section');
        if (sec) sec.innerHTML = '<h2>B.E.C.E In Progress!</h2>';
        return;
      }
      const d = document.getElementById('days');
      if (d) {
        d.textContent = pad(Math.floor(dist / 86400000));
        document.getElementById('hours').textContent = pad(Math.floor((dist % 86400000) / 3600000));
        document.getElementById('minutes').textContent = pad(Math.floor((dist % 3600000) / 60000));
        document.getElementById('seconds').textContent = pad(Math.floor((dist % 60000) / 1000));
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---- VACANCY POPUP ---- */
  const modal = document.getElementById('vacancy-modal');
  if (modal && !sessionStorage.getItem('vacancyShown')) {
    setTimeout(() => modal.classList.add('show'), 2000);
    const close = () => { modal.classList.remove('show'); sessionStorage.setItem('vacancyShown', '1'); };
    modal.querySelector('.close-modal')?.addEventListener('click', close);
    modal.querySelector('.apply-btn-modal')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  /* ---- APPLICATION FORM (Formspree) ---- */
  const applyForm = document.getElementById('apply-form');
  if (applyForm) {
    applyForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = applyForm.querySelector('.submit-btn');
      const msg = document.getElementById('form-message');
      // Honeypot check
      if (applyForm.querySelector('[name="website_url"]')?.value) return;
      btn.textContent = 'Sending…';
      btn.disabled = true;
      try {
        const res = await fetch(applyForm.action, {
          method: 'POST',
          body: new FormData(applyForm),
          headers: { Accept: 'application/json' }
        });
        if (res.ok) {
          msg.textContent = 'Application submitted successfully! We will contact you soon.';
          msg.className = 'form-message success';
          applyForm.reset();
        } else {
          throw new Error('server');
        }
      } catch {
        msg.textContent = 'Error sending application. Please call us directly.';
        msg.className = 'form-message error';
      }
      btn.textContent = 'Submit Application';
      btn.disabled = false;
    });
  }

  /* ---- CONTACT FORM (Formspree) ---- */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = contactForm.querySelector('.submit-btn');
      const msg = document.getElementById('contact-message');
      btn.textContent = 'Sending…';
      btn.disabled = true;
      try {
        const res = await fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { Accept: 'application/json' }
        });
        if (res.ok) {
          msg.textContent = 'Message sent! We will reply soon.';
          msg.className = 'form-message success';
          contactForm.reset();
        } else { throw new Error(); }
      } catch {
        msg.textContent = 'Could not send. Please email us directly.';
        msg.className = 'form-message error';
      }
      btn.textContent = 'Send Message';
      btn.disabled = false;
    });
  }

  /* ---- DASHBOARD TABS ---- */
  const dockIcons = document.querySelectorAll('.dock [data-view]');
  if (dockIcons.length) {
    dockIcons.forEach(icon => {
      icon.addEventListener('click', () => {
        const target = icon.dataset.view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.dock [data-view]').forEach(i => i.classList.remove('active'));
        document.getElementById(target)?.classList.add('active');
        icon.classList.add('active');
      });
    });
  }

});
