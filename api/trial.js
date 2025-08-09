export default async function handler(req, res) {
  // CORS simplu (în caz că servești din alt host)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).end();

  try {
    let raw = ""; for await (const c of req) raw += c;
    const { email, company } = JSON.parse(raw || "{}");

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
    const validCompany = typeof company === "string" && company.trim().length >= 2;
    if (!validEmail || !validCompany)
      return res.status(400).json({ ok:false, error:"date_invalide" });

    // Link provizoriu cu precompletare email
    const base = (process.env.WELCOME_URL || "https://ai-landing.vercel.app").replace(/\/$/,"");
    const link = `${base}/welcome?email=${encodeURIComponent(email)}`;

    const from = process.env.FROM_EMAIL || "onboarding@resend.dev";
    const html = `
      <h2>Bun venit, ${escapeHtml(company)}</h2>
      <p>Acces demo 7 zile:</p>
      <p><a href="${link}">Intră în aplicație</a></p>
    `;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Acces demo – Free Trial 7 zile",
        html
      })
    });

    if (!r.ok) {
      const info = await r.text().catch(()=>"");
      return res.status(502).json({ ok:false, error:"resend_failed", info: info.slice(0,200) });
    }

    return res.status(200).json({ ok:true, next: link });
  } catch {
    return res.status(500).json({ ok:false, error:"server" });
  }
}

function escapeHtml(s=""){
  return s.replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
}

