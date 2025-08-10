const escapeHtml = (s="") =>
  s.replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

module.exports = async (req, res) => {
  // Allow simple CORS and OPTIONS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).end();

  try {
    let raw = ""; for await (const c of req) raw += c;

    // Support both JSON and x-www-form-urlencoded
    const ct = (req.headers["content-type"] || "").toLowerCase();
    let email, company;
    if (ct.includes("application/json")) {
      ({ email, company } = JSON.parse(raw || "{}"));
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(raw);
      email = params.get("email");
      company = params.get("company");
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
    const validCompany = typeof company === "string" && company.trim().length >= 2;
    if (!validEmail || !validCompany) {
      return res.status(400).json({ ok:false, error:"date_invalide" });
    }

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
      body: JSON.stringify({ from, to: email, subject: "Acces demo – Free Trial 7 zile", html })
    });

    if (!r.ok) {
      const info = await r.text().catch(()=>"");
      // If the browser did a native form submit, send a simple error page
      const wantsHTML = (req.headers.accept || "").includes("text/html");
      if (wantsHTML) {
        res.statusCode = 502;
        return res.end("Eroare la trimiterea emailului.");
      }
      return res.status(502).json({ ok:false, error:"resend_failed", info: info.slice(0,200) });
    }

    // If it was a native form submit, redirect to thanks.html
    const wantsHTML = (req.headers.accept || "").includes("text/html");
    if (wantsHTML) {
      res.writeHead(303, { Location: "/thanks.html" });
      return res.end();
    }
    return res.status(200).json({ ok:true, next: link });
  } catch (e) {
    // Native form: send simple error page
    const wantsHTML = (req.headers.accept || "").includes("text/html");
    if (wantsHTML) {
      res.statusCode = 500;
      return res.end("Eroare server.");
    }
    return res.status(500).json({ ok:false, error:"server" });
  }
};


