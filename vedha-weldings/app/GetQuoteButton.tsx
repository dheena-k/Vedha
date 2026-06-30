"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";

/* ----------------------------------------------------------------
   TYPES
---------------------------------------------------------------- */
type ServiceKey = "mig" | "tig" | "stick" | "fab";
type Complexity = "simple" | "medium" | "complex";

interface ServiceRate {
  label: string;
  perFoot: number;
}

interface QuoteInput {
  service: ServiceKey;
  lengthFt: string;
  complexity: Complexity;
}

interface QuoteResult {
  labor: number;
  calloutFee: number;
  total: number;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/* ----------------------------------------------------------------
   PRICING RULES — edit these numbers to match your real rates.
   This is the only place you should need to touch for pricing.
---------------------------------------------------------------- */
const SERVICE_RATES: Record<ServiceKey, ServiceRate> = {
  mig: { label: "MIG & Flux-Core", perFoot: 12 },
  tig: { label: "TIG Precision", perFoot: 22 },
  stick: { label: "Stick (SMAW)", perFoot: 14 },
  fab: { label: "Custom Fabrication", perFoot: 18 },
};

const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = {
  simple: 1,
  medium: 1.35,
  complex: 1.8,
};

const CALLOUT_FEE = 75; // flat fee added to every quote

/* ----------------------------------------------------------------
   calculateQuote — pure function, no UI logic inside it.
---------------------------------------------------------------- */
function calculateQuote({ service, lengthFt, complexity }: QuoteInput): QuoteResult {
  const rate = SERVICE_RATES[service].perFoot;
  const multiplier = COMPLEXITY_MULTIPLIER[complexity];
  const labor = rate * Number(lengthFt) * multiplier;
  const total = labor + CALLOUT_FEE;
  return {
    labor: Math.round(labor),
    calloutFee: CALLOUT_FEE,
    total: Math.round(total),
  };
}

function formatCurrency(value: number) {
  return inrFormatter.format(value);
}

/* ----------------------------------------------------------------
   QuoteModal — the popup itself: form, result, download + email.
---------------------------------------------------------------- */
function QuoteModal({ onClose }: { onClose: () => void }) {
  const [service, setService] = useState<ServiceKey>("mig");
  const [lengthFt, setLengthFt] = useState<string>("");
  const [complexity, setComplexity] = useState<Complexity>("simple");
  const [email, setEmail] = useState<string>("");
  const [result, setResult] = useState<QuoteResult | null>(null);

  const handleCalculate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lengthFt || Number(lengthFt) <= 0) return;
    setResult(calculateQuote({ service, lengthFt, complexity }));
  };

  const handleDownload = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Ironbead Welding \u2014 Quote", 20, 20);
    doc.setFontSize(11);
    doc.text(`Service: ${SERVICE_RATES[service].label}`, 20, 40);
    doc.text(`Length: ${lengthFt} ft`, 20, 50);
    doc.text(`Complexity: ${complexity}`, 20, 60);
    doc.text(`Labor: ${formatCurrency(result.labor)}`, 20, 75);
    doc.text(`Call-out fee: ${formatCurrency(result.calloutFee)}`, 20, 85);
    doc.setFontSize(14);
    doc.text(`Total estimate: ${formatCurrency(result.total)}`, 20, 100);
    doc.setFontSize(9);
    doc.text("This is an estimate only. Final price confirmed after site visit.", 20, 120);
    doc.save("ironbead-quote.pdf");
  };

  const handleEmail = () => {
    if (!result) return;
    const subject = encodeURIComponent("Welding Quote Request \u2014 Ironbead");
    const body = encodeURIComponent(
      `Service: ${SERVICE_RATES[service].label}\n` +
        `Length: ${lengthFt} ft\n` +
        `Complexity: ${complexity}\n\n` +
        `Labor: ${formatCurrency(result.labor)}\n` +
        `Call-out fee: ${formatCurrency(result.calloutFee)}\n` +
        `Total estimate: ${formatCurrency(result.total)}\n\n` +
        `(This is an estimate only \u2014 final price confirmed after site visit.)`
    );
    // mailto opens the user's own email app with the message pre-filled.
    // To send automatically without opening their email app, this needs
    // a backend endpoint (e.g. an API route that calls an email service).
    window.location.href = `mailto:${email || ""}?subject=${subject}&body=${body}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={styles.overlay}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} style={styles.closeBtn}>
          ✕
        </button>
        <h2 style={styles.modalTitle}>Get an instant estimate</h2>
        <p style={styles.modalSub}>Answer three questions — well calculate a starting price.</p>

        <form onSubmit={handleCalculate} style={styles.form}>
          <label style={styles.label}>
            Service
            <select
              value={service}
              onChange={(e) => setService(e.target.value as ServiceKey)}
              style={styles.input}
            >
              {(Object.entries(SERVICE_RATES) as [ServiceKey, ServiceRate][]).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Approx. weld length (feet)
            <input
              type="number"
              min="1"
              value={lengthFt}
              onChange={(e) => setLengthFt(e.target.value)}
              placeholder="e.g. 20"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Job complexity
            <select
              value={complexity}
              onChange={(e) => setComplexity(e.target.value as Complexity)}
              style={styles.input}
            >
              <option value="simple">Simple — straight runs, easy access</option>
              <option value="medium">Medium — some fitting/positioning</option>
              <option value="complex">Complex — tight access, heavy fabrication</option>
            </select>
          </label>

          <button type="submit" style={styles.calcBtn}>
            Calculate Quote
          </button>
        </form>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <div style={styles.resultBox}>
                <div style={styles.resultRow}>
                  <span>Labor</span>
                  <span>{formatCurrency(result.labor)}</span>
                </div>
                <div style={styles.resultRow}>
                  <span>Call-out fee</span>
                  <span>{formatCurrency(result.calloutFee)}</span>
                </div>
                <div style={styles.resultTotal}>
                  <span>Estimated total</span>
                  <span>{formatCurrency(result.total)}</span>
                </div>

                <label style={styles.label}>
                  Email this quote to (optional)
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    style={styles.input}
                  />
                </label>

                <div style={styles.actionRow}>
                  <button onClick={handleDownload} style={styles.secondaryBtn}>
                    Download PDF
                  </button>
                  <button onClick={handleEmail} style={styles.calcBtn}>
                    Email Quote
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ----------------------------------------------------------------
   GetQuoteButton — drop this in place of your old <a> tag.
---------------------------------------------------------------- */
export default function GetQuoteButton({ label = "Get a Quote", className }: { label?: string; className?: string }) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className}
        style={className ? undefined : styles.navBtn}
      >
        {label}
      </button>
      <AnimatePresence>{open && <QuoteModal onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

/* ----------------------------------------------------------------
   Styles — typed as React.CSSProperties so TS validates each key.
---------------------------------------------------------------- */
import type { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  navBtn: {
    border: "1px solid #FF5A1F",
    color: "#FF5A1F",
    background: "transparent",
    padding: "10px 20px",
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,10,10,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  modal: {
    background: "#1B1E24",
    borderRadius: 12,
    padding: "40px",
    maxWidth: 460,
    width: "100%",
    position: "relative",
    maxHeight: "90vh",
    overflowY: "auto",
    color: "#F2EFE9",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    background: "transparent",
    border: "none",
    color: "#8B8F94",
    fontSize: 18,
    cursor: "pointer",
  },
  modalTitle: { fontSize: 22, fontWeight: 700, margin: "0 0 6px" },
  modalSub: { color: "#9DA0A5", fontSize: 14, marginBottom: 24 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#C7C9CC", fontWeight: 500 },
  input: {
    background: "#14161A",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    padding: "12px 14px",
    color: "#F2EFE9",
    fontSize: 14,
    outline: "none",
  },
  calcBtn: {
    background: "#FF5A1F",
    color: "#14161A",
    border: "none",
    borderRadius: 6,
    padding: "14px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    marginTop: 4,
  },
  secondaryBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#F2EFE9",
    borderRadius: 6,
    padding: "14px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  resultBox: {
    marginTop: 22,
    paddingTop: 22,
    borderTop: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  resultRow: { display: "flex", justifyContent: "space-between", color: "#9DA0A5", fontSize: 14 },
  resultTotal: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 18,
    fontWeight: 700,
    color: "#FF5A1F",
    padding: "8px 0",
  },
  actionRow: { display: "flex", gap: 10, marginTop: 10 },
};
