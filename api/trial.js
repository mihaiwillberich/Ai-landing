export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    let raw = ""; for await (const c of req) raw += c;
    const { email, company } = JSON.parse(raw || "{}");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !company?.trim())
      return res.status(400).json({ ok:false, error:"date invalide" });

    const html = `<h2>Bun venit, ${company}</h2>
      <p>Acces demo 7 zile:</p>
      <p><a href="https://app.agentai.ro/login?email=${encodeURIComponent(email)}">Intră în aplicație</a></p>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Acces demo – Free Trial 7 zile",
        html
      })
    });
    if (!r.ok) throw new Error("send fail");
    return res.json({ ok:true });
  } catch { return res.status(500).json({ ok:false, error:"server" }); }
}
