// Bail out of motion-heavy effects if user prefers reduced motion
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

// ---- Scroll-triggered fade-in ----
const animObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        animObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll("[data-animate]").forEach((el) => animObserver.observe(el));

// ---- Nav border on scroll ----
const nav = document.querySelector(".nav");
window.addEventListener("scroll", () => {
  const base = isDark() ? "255, 255, 255" : "0, 0, 0";
  nav.style.borderBottomColor = window.scrollY > 100
    ? `rgba(${base}, 0.08)`
    : `rgba(${base}, 0.04)`;
}, { passive: true });

// ---- Animated counters ----
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.counter, 10);
      const suffix = el.dataset.suffix || "";
      const duration = 1500;
      const start = performance.now();

      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        // easeOutExpo
        const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        const current = Math.round(ease * target);
        el.textContent = current + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll("[data-counter]").forEach((el) => counterObserver.observe(el));

// ---- Floating particles (hero canvas) ----
if (!prefersReducedMotion) {
  const canvas = document.getElementById("particles");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let w, h, particles;
    const PARTICLE_COUNT = 50;

    function resize() {
      const hero = canvas.parentElement;
      w = canvas.width = hero.offsetWidth;
      h = canvas.height = hero.offsetHeight;
    }

    function createParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.5 + 0.5,
          dx: (Math.random() - 0.5) * 0.3,
          dy: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.4 + 0.1,
        });
      }
    }

    function drawParticles() {
      ctx.clearRect(0, 0, w, h);
      const dark = isDark();

      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `rgba(139, 92, 246, ${p.opacity})`
          : `rgba(99, 102, 241, ${p.opacity * 0.6})`;
        ctx.fill();
      });

      // Draw lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const lineOpacity = (1 - dist / 120) * 0.12;
            ctx.strokeStyle = dark
              ? `rgba(99, 102, 241, ${lineOpacity})`
              : `rgba(99, 102, 241, ${lineOpacity * 0.5})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(drawParticles);
    }

    resize();
    createParticles();
    drawParticles();
    window.addEventListener("resize", () => { resize(); createParticles(); });
  }
}

// ---- Motion effects (parallax + tilt) ----
if (!prefersReducedMotion) {
  // Parallax on scroll
  const parallaxEls = document.querySelectorAll("[data-parallax]");
  let ticking = false;

  function updateParallax() {
    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.dataset.speed) || 0.1;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const viewCenter = window.innerHeight / 2;
      const offset = (center - viewCenter) * speed;
      el.style.transform = `translateY(${offset}px)`;
    });
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });

  updateParallax();

  // Mouse tilt on cards
  const tiltEls = document.querySelectorAll("[data-tilt]");
  const MAX_TILT = 4;
  const MAX_SHIFT = 6;

  tiltEls.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - y) * MAX_TILT;
      const rotateY = (x - 0.5) * MAX_TILT;
      const shiftX = (x - 0.5) * MAX_SHIFT;
      const shiftY = (y - 0.5) * MAX_SHIFT;
      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate(${shiftX}px, ${shiftY}px)`;
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translate(0px, 0px)";
    });
  });

  // Mouse-reactive glow on feature cards
  document.querySelectorAll(".feature-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  });
}
