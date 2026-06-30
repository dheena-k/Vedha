"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";
import GetQuoteButton from "./GetQuoteButton";

/* ----------------------------------------------------------------------- */
/*  Fonts                                                                   */
/* ----------------------------------------------------------------------- */
const display = Oswald({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

/* ----------------------------------------------------------------------- */
/*  Design tokens                                                          */
/*  charcoal #14161A   steel #232730   ember #FF5A1F                       */
/*  spark   #FFC93C    bone  #F2EFE9   slate #8B8F94                       */
/* ----------------------------------------------------------------------- */

const SERVICES = [
  {
    code: "MIG",
    title: "MIG & Flux-Core",
    desc: "High-deposition welds for structural steel, frames, and fabrication runs where speed and consistency matter.",
    spec: "0.030\u20130.045\" wire / up to 1\" plate",
  },
  {
    code: "TIG",
    title: "TIG Precision",
    desc: "Clean, controlled arcs for stainless, aluminum, and anywhere the finish weld is part of the deliverable.",
    spec: "Aluminum / stainless / chromoly",
  },
  {
    code: "STK",
    title: "Stick (SMAW)",
    desc: "Field welding in wind, rust, and rough conditions \u2014 repairs, heavy equipment, and on-site structural work.",
    spec: "Rated for outdoor field service",
  },
  {
    code: "FAB",
    title: "Custom Fabrication",
    desc: "Railings, gates, brackets, trailers, and one-off builds drafted, cut, and welded from your spec or sketch.",
    spec: "Design \u2192 cut \u2192 weld \u2192 finish",
  },
];

const PASSES = [
  {
    n: "Root Pass",
    title: "Walkthrough & Quote",
    desc: "We look at the job \u2014 in person or from photos \u2014 and lay down a fixed quote before any arc is struck.",
  },
  {
    n: "Fill Pass",
    title: "Fit-Up & Fabrication",
    desc: "Material is cut, jigged, and tacked into place. You can review fit-up before final welds go down.",
  },
  {
    n: "Cap Pass",
    title: "Final Weld & Finish",
    desc: "Full welds, grinding, and finish work \u2014 ground flush, painted, or left as a clean structural bead.",
  },
];

const STATS = [
  { value: "14", label: "Years welding" },
  { value: "30+", label: "AWS-cert. positions" },
  { value: "1,200+", label: "Jobs completed" },
];

/* ----------------------------------------------------------------------- */
/*  Ambient spark canvas \u2014 sits behind the hero headline                  */
/* ----------------------------------------------------------------------- */
function SparkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);

    type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number };
    let sparks: Spark[] = [];
    const origin = { x: w * 0.78, y: h * 0.42 };

    const spawn = () => {
      const count = 2;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 2.6;
        sparks.push({
          x: origin.x,
          y: origin.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.4,
          life: 0,
          max: 40 + Math.random() * 50,
        });
      }
      if (sparks.length > 220) sparks = sparks.slice(-220);
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      spawn();
      sparks.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.05; // gravity
        s.life++;
        const t = s.life / s.max;
        const alpha = 1 - t;
        if (alpha <= 0) return;
        const hue = t < 0.5 ? "255,201,60" : "255,90,31";
        ctx.beginPath();
        ctx.fillStyle = `rgba(${hue},${alpha})`;
        ctx.arc(s.x, s.y, 1.4 * (1 - t * 0.6), 0, Math.PI * 2);
        ctx.fill();
      });
      sparks = sparks.filter((s) => s.life < s.max);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      origin.x = w * 0.78;
      origin.y = h * 0.42;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />;
}

/* ----------------------------------------------------------------------- */
/*  Weld-seam divider \u2014 an animated bead that "lays down" on scroll       */
/* ----------------------------------------------------------------------- */
function WeldSeam() {
  return (
    <div className="relative h-24 w-full overflow-hidden bg-[#14161A]">
      <svg viewBox="0 0 1200 96" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <line x1="0" y1="48" x2="1200" y2="48" stroke="#3a3f47" strokeWidth="2" strokeDasharray="2 10" />
        <motion.line
          x1="0"
          y1="48"
          x2="1200"
          y2="48"
          stroke="#FF5A1F"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          style={{ filter: "drop-shadow(0 0 6px #FF5A1F)" }}
        />
      </svg>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/*  Page                                                                    */
/* ----------------------------------------------------------------------- */
export default function WeldingLanding() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [navSolid, setNavSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`${display.variable} ${body.variable} ${mono.variable} bg-[#14161A] text-[#F2EFE9] font-body antialiased`}>
      <style jsx global>{`
        .font-display { font-family: var(--font-display), sans-serif; }
        .font-body { font-family: var(--font-body), sans-serif; }
        .font-mono { font-family: var(--font-mono), monospace; }
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
        }
      `}</style>

      {/* ----------------------------------------------------------- NAV */}
      <header
        className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
          navSolid ? "bg-[#14161A]/90 backdrop-blur border-b border-white/10" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 font-display text-xl tracking-wide">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#FF5A1F]" />
            IRONBEAD&nbsp;<span className="text-[#8B8F94]">WELDING</span>
          </div>
          <nav className="hidden gap-8 font-medium text-sm text-[#8B8F94] md:flex">
            {["Services", "Process", "Work", "Contact"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="transition-colors hover:text-[#F2EFE9]">
                {item}
              </a>
            ))}
          </nav>
        <GetQuoteButton
  label="Request a Quote"
  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-sm bg-[#FF5A1F] px-7 py-4 font-display text-base uppercase tracking-wide text-[#14161A] transition-transform hover:-translate-y-0.5"
/>
        </div>
      </header>

      {/* ----------------------------------------------------------- HERO */}
      <section ref={heroRef} className="relative flex min-h-screen items-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#23272f_0%,_#14161A_60%)]" />
        <SparkCanvas />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
          }}
        />
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-28">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-[#FFC93C]">
            AWS D1.1 Certified &middot; Structural &amp; Custom Welding
          </p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="font-display text-[14vw] leading-[0.92] tracking-tight sm:text-[9vw] md:text-[7vw] lg:text-[6vw]"
          >
            WE LAY DOWN
            <br />
            <span className="text-[#FF5A1F]">BEADS THAT</span>
            <br />
            HOLD.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-8 max-w-md text-lg text-[#C7C9CC]"
          >
            MIG, TIG, and stick welding for fabricators, contractors, and homeowners across the region. Field-ready, shop-precise, quoted straight.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-10 flex flex-wrap items-center gap-5"
          >
            <a
              href="#contact"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-sm bg-[#FF5A1F] px-7 py-4 font-display text-base uppercase tracking-wide text-[#14161A] transition-transform hover:-translate-y-0.5"
            >
              Request a Quote
              <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </a>
            <a href="#work" className="font-mono text-sm text-[#8B8F94] underline-offset-4 hover:text-[#F2EFE9] hover:underline">
              See recent work
            </a>
          </motion.div>

          <div className="mt-20 grid grid-cols-3 gap-6 border-t border-white/10 pt-8 max-w-xl">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl text-[#F2EFE9]">{s.value}</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-wide text-[#8B8F94]">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <WeldSeam />

      {/* ----------------------------------------------------------- SERVICES */}
      <section id="services" className="mx-auto max-w-7xl px-6 py-28">
        <div className="mb-14 flex items-end justify-between gap-6 flex-wrap">
          <h2 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">
            Weld Processes <span className="text-[#8B8F94]">on tap</span>
          </h2>
          <p className="max-w-sm text-[#8B8F94]">Every job calls for a different arc. We run all four, matched to material and finish.</p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10 sm:grid-cols-2">
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.code}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative bg-[#1B1E24] p-8 transition-colors hover:bg-[#20242B]"
            >
              <span className="absolute right-6 top-6 h-2 w-2 rounded-full bg-[#3a3f47] transition-colors group-hover:bg-[#FF5A1F]" />
              <div className="font-mono text-xs tracking-[0.25em] text-[#FF5A1F]">{s.code}</div>
              <h3 className="mt-3 font-display text-2xl uppercase">{s.title}</h3>
              <p className="mt-3 text-sm text-[#9DA0A5]">{s.desc}</p>
              <div className="mt-5 border-t border-white/10 pt-3 font-mono text-[11px] uppercase tracking-wide text-[#6B6F75]">{s.spec}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <WeldSeam />

      {/* ----------------------------------------------------------- PROCESS */}
      <section id="process" className="mx-auto max-w-7xl px-6 py-28">
        <h2 className="mb-14 font-display text-4xl uppercase tracking-tight sm:text-5xl">
          How the job <span className="text-[#FF5A1F]">gets welded</span>
        </h2>

        <div className="relative grid gap-10 md:grid-cols-3">
          <div className="absolute left-0 top-6 hidden h-px w-full bg-gradient-to-r from-transparent via-[#FF5A1F]/50 to-transparent md:block" />
          {PASSES.map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative"
            >
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#8B8F94]">{p.n}</div>
              <h3 className="mt-3 font-display text-2xl">{p.title}</h3>
              <p className="mt-3 text-sm text-[#9DA0A5]">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- CTA / CONTACT */}
      <section id="contact" className="relative overflow-hidden border-t border-white/10 bg-[#1B1E24] py-28">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #FF5A1F 0, transparent 35%)" }}
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#FFC93C]">Free, fixed-price quotes</p>
          <h2 className="mt-4 font-display text-5xl uppercase leading-tight sm:text-6xl">
            Got steel that needs <span className="text-[#FF5A1F]">joining?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[#9DA0A5]">
            Send a photo or a sketch, tell us the material, and we&apos;ll get back to you within one business day with a number.
          </p>
          <form className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="you@email.com"
              className="w-full rounded-sm border border-white/15 bg-[#14161A] px-5 py-4 text-sm text-[#F2EFE9] placeholder-[#6B6F75] outline-none transition-colors focus:border-[#FF5A1F] sm:w-72"
            />
            <button
              type="submit"
              className="rounded-sm bg-[#FF5A1F] px-7 py-4 font-display text-sm uppercase tracking-wide text-[#14161A] transition-transform hover:-translate-y-0.5"
            >
              Get My Quote
            </button>
          </form>
        </div>
      </section>

      {/* ----------------------------------------------------------- FOOTER */}
      <footer className="border-t border-white/10 bg-[#14161A] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 font-mono text-xs text-[#6B6F75] sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Ironbead Welding. All rights reserved.</span>
          <span>AWS D1.1 Certified &middot; Licensed &amp; Insured</span>
        </div>
      </footer>
    </div>
  );
}
