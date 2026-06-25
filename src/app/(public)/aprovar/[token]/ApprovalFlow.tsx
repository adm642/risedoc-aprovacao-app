"use client";

import { useEffect, useRef, useState } from "react";
import type { ApprovalData, ApprovalPost } from "@/lib/public-approval";
import { identifyReviewer, submitFeedback } from "./actions";

const REVIEWER_KEY = "risedoc_reviewer";

const CATEGORIES = [
  "Texto / legenda",
  "Imagem ou vídeo",
  "Formato",
  "Dados não preenchidos",
  "Identidade da marca",
];

type Status = null | "approved" | "changes";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ApprovalFlow({
  token,
  data,
}: {
  token: string;
  data: ApprovalData;
}) {
  const posts = data.posts;
  const [step, setStep] = useState<
    "loading" | "welcome" | "welcomeback" | "identify" | "review" | "done"
  >("loading");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState<{ name: string; email: string } | null>(null);
  const [reviewerId, setReviewerId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Reconhece o revisor neste dispositivo (lembrado de uma visita anterior).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(REVIEWER_KEY);
      if (raw) {
        const r = JSON.parse(raw);
        if (r?.name && r?.email) {
          setSaved({ name: r.name, email: r.email });
          setName(r.name);
          setEmail(r.email);
          setStep("welcomeback");
          return;
        }
      }
    } catch {
      // localStorage indisponível (modo privado) — segue o fluxo normal
    }
    setStep("welcome");
  }, []);

  function rememberReviewer(n: string, e: string) {
    try {
      localStorage.setItem(REVIEWER_KEY, JSON.stringify({ name: n, email: e }));
    } catch {
      // ignore
    }
  }

  const firstName = (saved?.name ?? name).trim().split(/\s+/)[0] || "você";

  const [cur, setCur] = useState(0);
  const [slide, setSlide] = useState(0);
  const [resp, setResp] = useState<Status[]>(posts.map(() => null));
  const [marks, setMarks] = useState<number[][]>(posts.map(() => []));

  const [modal, setModal] = useState<null | "changes" | "approve">(null);
  const [cats, setCats] = useState<string[]>([]);
  const [slideSel, setSlideSel] = useState<number[]>([]);
  const [comment, setComment] = useState("");

  const post: ApprovalPost | undefined = posts[cur];
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgs = (post?.media ?? []).filter((m) => m.type === "image");
  const video = (post?.media ?? []).find((m) => m.type === "video");
  const isReel = post?.format === "reels" || !!video;
  const slideCount = imgs.length > 0 ? imgs.length : post?.slides.length ?? 1;
  const isCarousel = slideCount > 1;

  async function continueIdentify() {
    setErr("");
    setBusy(true);
    const res = await identifyReviewer({ token, name, email });
    setBusy(false);
    if ("error" in res) return setErr(res.error);
    rememberReviewer(name, email);
    setReviewerId(res.reviewerId);
    setStep("review");
  }

  async function continueAsSaved() {
    if (!saved) return;
    setErr("");
    setBusy(true);
    const res = await identifyReviewer({ token, name: saved.name, email: saved.email });
    setBusy(false);
    if ("error" in res) return setErr(res.error);
    setReviewerId(res.reviewerId);
    setStep("review");
  }

  function notMe() {
    try {
      localStorage.removeItem(REVIEWER_KEY);
    } catch {
      // ignore
    }
    setSaved(null);
    setName("");
    setEmail("");
    setStep("identify");
  }

  function openModal(mode: "changes" | "approve") {
    setErr("");
    if (mode === "changes") {
      setCats([]);
      setComment("");
      setSlideSel(isCarousel ? [slide] : []);
    }
    setModal(mode);
  }

  function nextPending(from: Status[]) {
    return from.findIndex((s) => s === null);
  }

  async function persist(type: "approved" | "change_request") {
    if (!reviewerId) return { error: "Sessão expirada." };
    return submitFeedback({
      token,
      reviewerId,
      postId: post!.id,
      type,
      categories: type === "change_request" ? cats : [],
      slideIndexes: type === "change_request" ? slideSel : [],
      videoTimestamps: type === "change_request" ? marks[cur] : [],
      comment: type === "change_request" ? comment : undefined,
    });
  }

  async function confirmApprove() {
    setBusy(true);
    const res = await persist("approved");
    setBusy(false);
    if ("error" in res) return setErr(res.error);
    finish("approved");
  }

  async function saveChanges() {
    setBusy(true);
    const res = await persist("change_request");
    setBusy(false);
    if ("error" in res) return setErr(res.error);
    finish("changes");
  }

  function finish(status: Status) {
    const updated = [...resp];
    updated[cur] = status;
    setResp(updated);
    setModal(null);
    const next = nextPending(updated);
    if (next === -1) {
      setStep("done");
    } else {
      setTimeout(() => {
        setCur(next);
        setSlide(0);
      }, 250);
    }
  }

  async function approveAll() {
    setBusy(true);
    const updated = [...resp];
    for (let i = 0; i < posts.length; i++) {
      if (updated[i] !== null) continue;
      if (!reviewerId) break;
      await submitFeedback({
        token,
        reviewerId,
        postId: posts[i].id,
        type: "approved",
        categories: [],
        slideIndexes: [],
        videoTimestamps: [],
      });
      updated[i] = "approved";
    }
    setResp(updated);
    setBusy(false);
    setStep("done");
  }

  function addMarkSeconds(sec: number) {
    setMarks((m) => {
      const copy = m.map((x) => [...x]);
      if (!copy[cur].includes(sec)) {
        copy[cur].push(sec);
        copy[cur].sort((a, b) => a - b);
      }
      return copy;
    });
  }
  function addMarkRatio(ratio: number) {
    if (!post?.duration) return;
    addMarkSeconds(Math.round(ratio * post.duration));
  }

  function removeMark(idx: number) {
    setMarks((m) => {
      const copy = m.map((x) => [...x]);
      copy[cur].splice(idx, 1);
      return copy;
    });
  }

  const approvedCount = resp.filter((s) => s === "approved").length;
  const changesCount = resp.filter((s) => s === "changes").length;
  const s = post?.slides[slide];

  return (
    <div className="ap-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="app">
        <div className="topbar">
          <span className="brand">
            <span className="eq sm">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="bn">{data.agencyName}</span>
          </span>
          <span className="meta">
            {step === "review"
              ? `Post ${cur + 1} de ${posts.length}`
              : data.groupName}
          </span>
        </div>

        {/* LOADING */}
        {step === "loading" && (
          <section className="center">
            <span className="eq lg">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </section>
        )}

        {/* WELCOME BACK — reconhecido neste dispositivo */}
        {step === "welcomeback" && saved && (
          <section className="center">
            <span className="eq lg">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="eyebrow" style={{ marginTop: 18 }}>
              Que bom te ver de novo
            </span>
            <h1 className="title">{firstName}, é você?</h1>
            <p className="lede">
              Você tem {posts.length} post(s) para revisar. Confirma que é você
              pra continuar.
            </p>
            {err && <p className="err">{err}</p>}
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: 26 }}
              disabled={busy}
              onClick={continueAsSaved}
            >
              {busy ? "..." : `Sim, sou ${firstName} →`}
            </button>
            <button className="secbtn" onClick={notMe}>
              Não sou {firstName} / sou outra pessoa
            </button>
          </section>
        )}

        {/* WELCOME */}
        {step === "welcome" && (
          <section className="center">
            <span className="eq lg">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="eyebrow" style={{ marginTop: 18 }}>
              Olá!
            </span>
            <h1 className="title">
              Você recebeu {posts.length} posts para revisar
            </h1>
            <p className="lede">
              Dá uma olhada em cada um e diz o que aprovar ou o que ajustar. Leva
              uns 2 minutos.
            </p>
            <span className="pill">
              <b>{posts.length}</b> posts aguardando você
            </span>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: 28 }}
              onClick={() => setStep("identify")}
            >
              Vamos lá →
            </button>
          </section>
        )}

        {/* IDENTIFY */}
        {step === "identify" && (
          <section className="pad">
            <span className="eyebrow">Antes de começar</span>
            <h1 className="title sm">Quem está revisando?</h1>
            <p className="lede">
              Só pra registrar quem aprovou cada post. Fica entre você e a equipe.
            </p>
            <div className="field">
              <label>Seu nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
              />
            </div>
            {err && <p className="err">{err}</p>}
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: 22 }}
              disabled={busy}
              onClick={continueIdentify}
            >
              {busy ? "..." : "Continuar"}
            </button>
          </section>
        )}

        {/* REVIEW */}
        {step === "review" && post && (
          <>
            <div className="progress">
              {posts.map((p, i) => (
                <button
                  key={p.id}
                  className={`thumb ${i === cur ? "current" : ""}`}
                  data-state={resp[i] ?? "none"}
                  style={{ background: p.slides[0].bg, color: "#fff" }}
                  onClick={() => {
                    setCur(i);
                    setSlide(0);
                  }}
                >
                  {i + 1}
                  <span className="dot"></span>
                </button>
              ))}
            </div>

            <div className="body">
              <div className="nettabs">
                <button className="nettab active">Instagram · {post.format === "reels" ? "Reels" : "Feed"}</button>
              </div>

              <div className="preview">
                <div className="ighead">
                  <span className="ava">{data.agencyName.charAt(0)}</span>
                  <span className="iguser">
                    @cliente<small>{post.kicker}</small>
                  </span>
                  <span className="more">⋯</span>
                </div>
                <div className={`media ${isReel ? "reel" : ""}`} style={{ background: video || imgs.length > 0 ? "#000" : s?.bg }}>
                  {video ? (
                    <video ref={videoRef} src={video.url} controls playsInline className="vid" />
                  ) : imgs.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgs[Math.min(slide, imgs.length - 1)].url} alt="" className="img" />
                  ) : (
                    <>
                      {isReel && <span className="reelbadge">▶ Reels</span>}
                      <div className="kicker">{post.kicker}</div>
                      <h3>{s?.h}</h3>
                      {s?.p && <p>{s.p}</p>}
                    </>
                  )}
                  {isCarousel && (
                    <>
                      <button className="arrow left" onClick={() => setSlide((slide - 1 + slideCount) % slideCount)}>‹</button>
                      <button className="arrow right" onClick={() => setSlide((slide + 1) % slideCount)}>›</button>
                      <div className="dots">
                        {Array.from({ length: slideCount }).map((_, i) => (
                          <i key={i} className={i === slide ? "on" : ""}></i>
                        ))}
                      </div>
                    </>
                  )}
                  {isReel && !video && post.duration && (
                    <div className="scrub">
                      <div className="hint">⏱ Toque na linha do tempo para marcar onde ajustar</div>
                      <div
                        className="track"
                        onClick={(e) => {
                          const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          addMarkRatio(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
                        }}
                      >
                        <div className="bar"></div>
                        {marks[cur].map((sec, i) => (
                          <div
                            key={i}
                            className="pin"
                            style={{ left: `${(sec / post.duration!) * 100}%` }}
                            data-t={fmt(sec)}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              removeMark(i);
                            }}
                          ></div>
                        ))}
                      </div>
                      <div className="dur">0:00 / {fmt(post.duration)}</div>
                    </div>
                  )}
                </div>
                {video && (
                  <div className="vidmark">
                    <button
                      onClick={() => {
                        const v = videoRef.current;
                        if (v) addMarkSeconds(Math.round(v.currentTime));
                      }}
                    >
                      ⏱ Marcar este momento para ajuste
                    </button>
                    <span className="vidhint">
                      Dê play, pause no ponto exato e toque para marcar
                    </span>
                  </div>
                )}
                <div className="igactions">
                  <span>♡</span>
                  <span>💬</span>
                  <span>↪</span>
                  <span className="right">🔖</span>
                </div>
                <div className="cap">
                  <b>@cliente</b> {post.caption}
                </div>
              </div>

              <div className="info">
                {post.suggestedAt && (
                  <div className="line">
                    <span className="ic">📅</span> Sugerido para{" "}
                    <b>
                      {new Date(post.suggestedAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </b>
                  </div>
                )}
                <div className="line">
                  <span className="ic">📐</span> Formato{" "}
                  <b>
                    {isReel ? "Reels" : isCarousel ? `Carrossel (${post.slides.length} imagens)` : "Imagem única"}
                  </b>
                </div>
              </div>

              {isReel && marks[cur].length > 0 && (
                <div className="marks">
                  <div className="mt">⏱ Momentos marcados para ajuste</div>
                  <div className="mchips">
                    {marks[cur].map((sec, i) => (
                      <span key={i} className="mchip">
                        ⏱ {fmt(sec)}
                        <button onClick={() => removeMark(i)}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="all">
                <button onClick={approveAll} disabled={busy}>
                  Está tudo certo? Aprovar todos de uma vez
                </button>
              </div>
            </div>

            <div className="actionbar">
              {resp[cur] === "approved" && <span className="stag approved">✓ Você aprovou</span>}
              {resp[cur] === "changes" && <span className="stag changes">✏ Ajuste solicitado</span>}
              <button className="btn btn-changes" onClick={() => openModal("changes")}>
                ✏ Pedir ajuste
              </button>
              <button className="btn btn-primary" onClick={() => openModal("approve")}>
                ✓ Aprovar
              </button>
            </div>
          </>
        )}

        {/* DONE */}
        {step === "done" && (
          <section className="center">
            <div className="doneill">
              <span className="check">✓</span>
            </div>
            <span className="eyebrow">Revisão enviada</span>
            <h1 className="title sm">Prontinho, obrigada!</h1>
            <p className="lede">
              A equipe da {data.agencyName} já recebeu suas respostas e vai cuidar
              dos ajustes. Você não precisa fazer mais nada.
            </p>
            <div className="summary">
              <div className="scard ok">
                <div className="n">{approvedCount}</div>
                <small>Aprovados</small>
              </div>
              <div className="scard ch">
                <div className="n">{changesCount}</div>
                <small>Ajustes</small>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* MODAL */}
      {modal && post && (
        <div className="scrim" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="seg">
              <button className={modal === "changes" ? "on changes" : ""} onClick={() => setModal("changes")}>
                ✏ Pedir ajuste
              </button>
              <button className={modal === "approve" ? "on approve" : ""} onClick={() => setModal("approve")}>
                ✓ Aprovar
              </button>
            </div>

            {modal === "changes" && (
              <>
                <h2>O que você quer ajustar?</h2>
                <p className="sub">Marque o tipo e descreva. Quanto mais específico, mais rápido a gente resolve.</p>

                {isCarousel && (
                  <div className="ctx">
                    <div className="ctxl">
                      Qual imagem precisa de ajuste? <span className="badge">Carrossel</span>
                    </div>
                    <div className="sslct">
                      {Array.from({ length: slideCount }).map((_, i) => {
                        const on = slideSel.includes(i);
                        return (
                          <button
                            key={i}
                            className="sopt"
                            aria-pressed={on}
                            onClick={() =>
                              setSlideSel((prev) =>
                                prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
                              )
                            }
                          >
                            <span
                              className="mini"
                              style={{ background: imgs.length > 0 ? "#000" : post.slides[i]?.bg ?? "#009E8E" }}
                            >
                              {imgs.length > 0 ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={imgs[i].url} alt="" className="miniimg" />
                              ) : (
                                i + 1
                              )}
                              <span className="tick">✓</span>
                            </span>
                            <span className="lbl">Imagem {i + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isReel && (
                  <div className="ctx">
                    <div className="ctxl">
                      Momentos do vídeo a ajustar <span className="badge">Reels</span>
                    </div>
                    {marks[cur].length ? (
                      <div className="mchips">
                        {marks[cur].map((sec, i) => (
                          <span key={i} className="mchip">
                            ⏱ {fmt(sec)}
                            <button onClick={() => removeMark(i)}>✕</button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="hinttext">
                        Feche e <b>toque na linha do tempo do vídeo</b> para marcar o segundo exato do ajuste.
                      </div>
                    )}
                  </div>
                )}

                <div className="chips">
                  {CATEGORIES.map((c) => {
                    const on = cats.includes(c);
                    return (
                      <button
                        key={c}
                        className="chip"
                        aria-pressed={on}
                        onClick={() =>
                          setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
                        }
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ex.: troca 'rugas' por 'linhas de expressão'. O resto está ótimo, pode manter."
                />
                {err && <p className="err">{err}</p>}
                <div className="macts">
                  <button className="btn btn-ghost" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary" disabled={busy} onClick={saveChanges}>
                    {busy ? "..." : "Salvar pedido"}
                  </button>
                </div>
              </>
            )}

            {modal === "approve" && (
              <div className="confirm">
                <div className="doneill sm">
                  <span className="check">✓</span>
                </div>
                <div className="big">Aprovar este post?</div>
                <p>Ele fica liberado para publicação. Você ainda pode revisar antes de enviar tudo.</p>
                {err && <p className="err">{err}</p>}
                <div className="macts">
                  <button className="btn btn-ghost" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary" disabled={busy} onClick={confirmApprove}>
                    {busy ? "..." : "Sim, aprovar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.ap-wrap{--ground:#F5F5F0;--surface:#fff;--text:#1C1C1E;--muted:rgba(28,28,30,.58);--line:#E6E6DF;--accent:#009E8E;--accent-h:#00B5A3;--accent-p:#007A6D;--warning:#F59E0B;--warning-ink:#b4730a;--success:#16A34A;font-family:"Sora",system-ui,-apple-system,sans-serif;color:var(--text);display:flex;justify-content:center;min-height:100vh;background:radial-gradient(120% 90% at 50% -10%,rgba(0,158,142,.10),transparent 60%),var(--ground)}
.ap-wrap *{box-sizing:border-box}
.ap-wrap .app{width:100%;max-width:440px;background:var(--surface);min-height:100vh;display:flex;flex-direction:column;position:relative;box-shadow:0 0 0 1px var(--line)}
@media(min-width:480px){.ap-wrap{padding:28px 16px;align-items:flex-start}.ap-wrap .app{min-height:auto;border-radius:24px;overflow:hidden}}
.ap-wrap .eq{display:inline-flex;flex-direction:column;gap:3px}.ap-wrap .eq span{display:block;width:22px;height:4px;border-radius:2px;background:var(--accent)}
.ap-wrap .eq.sm span{width:15px;height:3px}.ap-wrap .eq.lg span{width:40px;height:7px;gap:6px}
.ap-wrap .topbar{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid var(--line)}
.ap-wrap .brand{display:flex;align-items:center;gap:9px}.ap-wrap .bn{font-weight:700;font-size:17px;letter-spacing:-.02em}
.ap-wrap .meta{margin-left:auto;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.ap-wrap .center{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:40px 30px}
.ap-wrap .pad{padding:36px 26px 30px;display:flex;flex-direction:column;flex:1}
.ap-wrap .eyebrow{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--accent)}
.ap-wrap .title{font-weight:700;font-size:27px;line-height:1.13;letter-spacing:-.02em;margin:14px 0 0}.ap-wrap .title.sm{font-size:23px}
.ap-wrap .lede{font-size:15px;line-height:1.55;color:var(--muted);margin:12px 0 0;max-width:32ch}
.ap-wrap .pill{display:inline-flex;align-items:baseline;gap:7px;margin-top:22px;padding:9px 16px;background:rgba(0,158,142,.10);color:var(--accent-p);border-radius:999px;font-size:14px;font-weight:600}.ap-wrap .pill b{font-size:19px}
.ap-wrap .btn{font:inherit;font-size:15px;font-weight:600;border:none;border-radius:10px;cursor:pointer;padding:13px 20px;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:background .15s}
.ap-wrap .btn:active{transform:translateY(1px)}.ap-wrap .btn:disabled{opacity:.5;cursor:not-allowed}
.ap-wrap .btn-primary{background:var(--accent);color:#fff}.ap-wrap .btn-primary:hover{background:var(--accent-h)}
.ap-wrap .btn-ghost{background:#fff;color:var(--text);border:1.5px solid var(--line)}
.ap-wrap .btn-lg{padding:15px 24px;font-size:16px}
.ap-wrap .field{text-align:left;margin-top:18px}.ap-wrap .field label{display:block;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:7px}
.ap-wrap .field input{width:100%;font:inherit;font-size:15px;padding:13px 14px;border:1.5px solid var(--line);border-radius:10px;background:var(--ground)}
.ap-wrap .field input:focus{outline:none;border-color:var(--accent);background:#fff}
.ap-wrap .err{color:#DC2626;font-size:13px;margin-top:12px}
.ap-wrap .secbtn{background:none;border:none;color:var(--muted);font:inherit;font-size:13px;cursor:pointer;margin-top:14px;text-decoration:underline}
.ap-wrap .secbtn:hover{color:var(--text)}
.ap-wrap .progress{display:flex;gap:9px;padding:14px 18px;overflow-x:auto;border-bottom:1px solid var(--line)}.ap-wrap .progress::-webkit-scrollbar{display:none}
.ap-wrap .thumb{flex:0 0 auto;width:44px;height:44px;border-radius:6px;border:2px solid var(--line);cursor:pointer;position:relative;display:grid;place-items:center;font-size:13px;font-weight:700}
.ap-wrap .thumb.current{border-color:var(--accent);box-shadow:0 0 0 2px rgba(0,158,142,.25)}
.ap-wrap .thumb .dot{position:absolute;top:-5px;right:-5px;width:15px;height:15px;border-radius:50%;border:2px solid #fff;background:var(--line)}
.ap-wrap .thumb[data-state=approved] .dot{background:var(--success)}.ap-wrap .thumb[data-state=changes] .dot{background:var(--warning)}
.ap-wrap .body{flex:1;overflow-y:auto;padding-bottom:92px}
.ap-wrap .nettabs{display:flex;gap:6px;padding:14px 18px 4px}
.ap-wrap .nettab{font-size:12px;font-weight:600;padding:7px 12px;border-radius:999px;border:1.5px solid var(--accent);background:rgba(0,158,142,.07);color:var(--accent-p)}
.ap-wrap .preview{margin:12px 18px 0;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.ap-wrap .ighead{display:flex;align-items:center;gap:10px;padding:11px 13px}
.ap-wrap .ava{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-p));display:grid;place-items:center;color:#fff;font-weight:700;font-size:14px}
.ap-wrap .iguser{font-size:13px;font-weight:600;line-height:1.2}.ap-wrap .iguser small{display:block;font-weight:400;color:var(--muted);font-size:11px}
.ap-wrap .more{margin-left:auto;color:var(--muted)}
.ap-wrap .media{position:relative;aspect-ratio:4/5;display:flex;flex-direction:column;justify-content:flex-end;padding:22px;color:#fff;overflow:hidden}
.ap-wrap .media.reel{aspect-ratio:9/16}
.ap-wrap .media .img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ap-wrap .media .vid{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
.ap-wrap .vidmark{margin:10px 18px 0;display:flex;flex-direction:column;gap:5px}
.ap-wrap .vidmark button{background:rgba(245,158,11,.12);border:1.5px solid var(--warning);color:var(--warning-ink);font:inherit;font-size:14px;font-weight:600;padding:12px;border-radius:10px;cursor:pointer}
.ap-wrap .vidhint{font-size:11px;color:var(--muted);text-align:center}
.ap-wrap .miniimg{width:100%;height:100%;object-fit:cover}
.ap-wrap .media .kicker{font-size:11px;text-transform:uppercase;letter-spacing:.12em;opacity:.9;margin-bottom:auto}
.ap-wrap .media h3{font-size:24px;line-height:1.1;margin:0;text-shadow:0 2px 14px rgba(0,0,0,.35)}
.ap-wrap .media p{font-size:13px;margin:8px 0 0;opacity:.92;text-shadow:0 1px 8px rgba(0,0,0,.4)}
.ap-wrap .reelbadge{position:absolute;top:12px;right:12px;background:rgba(0,0,0,.5);font-size:11px;padding:4px 9px;border-radius:999px;z-index:4}
.ap-wrap .arrow{position:absolute;top:45%;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.85);border:none;cursor:pointer;font-size:15px;color:var(--text);z-index:4}.ap-wrap .arrow.left{left:10px}.ap-wrap .arrow.right{right:10px}
.ap-wrap .dots{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:5px;z-index:3}.ap-wrap .dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.5)}.ap-wrap .dots i.on{background:#fff}
.ap-wrap .scrub{position:absolute;left:0;right:0;bottom:0;padding:10px 14px 14px;background:linear-gradient(to top,rgba(0,0,0,.55),transparent);z-index:5}
.ap-wrap .scrub .hint{font-size:11px;opacity:.92;margin-bottom:8px;text-shadow:0 1px 6px rgba(0,0,0,.5)}
.ap-wrap .track{position:relative;height:22px;display:flex;align-items:center;cursor:pointer}
.ap-wrap .track .bar{position:absolute;left:0;right:0;height:4px;border-radius:2px;background:rgba(255,255,255,.35)}
.ap-wrap .pin{position:absolute;top:50%;transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;background:var(--warning);border:2px solid #fff;cursor:pointer;z-index:6}
.ap-wrap .pin::after{content:attr(data-t);position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:var(--warning-ink);color:#fff;font-size:10px;font-weight:600;padding:2px 6px;border-radius:5px;white-space:nowrap}
.ap-wrap .dur{font-size:11px;margin-top:4px;text-align:right;opacity:.85}
.ap-wrap .igactions{display:flex;gap:16px;padding:10px 13px 4px;font-size:18px}.ap-wrap .igactions .right{margin-left:auto}
.ap-wrap .cap{padding:4px 13px 14px;font-size:13px;line-height:1.55;white-space:pre-line}.ap-wrap .cap b{font-weight:600}
.ap-wrap .info{margin:14px 18px 0;display:grid;gap:9px}.ap-wrap .line{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--muted)}.ap-wrap .line b{color:var(--text);font-weight:600}.ap-wrap .ic{color:var(--accent)}
.ap-wrap .marks{margin:12px 18px 0;padding:11px 13px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.08);border-radius:10px}
.ap-wrap .mt{font-size:12px;font-weight:600;color:var(--warning-ink)}
.ap-wrap .mchips{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
.ap-wrap .mchip{font-size:12px;font-weight:600;padding:5px 8px 5px 10px;border-radius:999px;background:#fff;border:1.5px solid var(--warning);color:var(--warning-ink);display:inline-flex;align-items:center;gap:6px}
.ap-wrap .mchip button{border:none;background:none;color:var(--warning-ink);cursor:pointer;font-size:13px;line-height:1;padding:0}
.ap-wrap .all{text-align:center;padding:14px}.ap-wrap .all button{background:none;border:none;color:var(--accent-p);font:inherit;font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline}
.ap-wrap .actionbar{position:absolute;bottom:0;left:0;right:0;display:flex;gap:11px;padding:14px 18px;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-top:1px solid var(--line)}
.ap-wrap .actionbar .btn{flex:1}
.ap-wrap .btn-changes{background:#fff;color:var(--warning-ink);border:1.5px solid var(--warning)}
.ap-wrap .stag{position:absolute;top:-30px;left:18px;font-size:12px;font-weight:600;padding:5px 11px;border-radius:999px;display:inline-flex;align-items:center;gap:6px}
.ap-wrap .stag.approved{background:rgba(22,163,74,.12);color:var(--success)}.ap-wrap .stag.changes{background:rgba(245,158,11,.14);color:var(--warning-ink)}
.ap-wrap .doneill{width:70px;height:70px;border-radius:50%;background:rgba(22,163,74,.12);display:grid;place-items:center;margin:0 auto 6px}.ap-wrap .doneill.sm{width:54px;height:54px}
.ap-wrap .doneill .check{width:34px;height:34px;border-radius:50%;background:var(--success);display:grid;place-items:center;color:#fff;font-size:18px}.ap-wrap .doneill.sm .check{width:28px;height:28px;font-size:15px}
.ap-wrap .summary{display:flex;gap:10px;margin-top:24px;width:100%}
.ap-wrap .scard{flex:1;border:1px solid var(--line);border-radius:10px;padding:14px;text-align:center}.ap-wrap .scard .n{font-size:26px;font-weight:700}.ap-wrap .scard.ok .n{color:var(--success)}.ap-wrap .scard.ch .n{color:var(--warning)}.ap-wrap .scard small{font-size:11px;color:var(--muted);text-transform:uppercase}
.ap-wrap .scrim{position:fixed;inset:0;background:rgba(28,28,30,.5);display:flex;align-items:flex-end;justify-content:center;z-index:50;padding:0}
@media(min-width:480px){.ap-wrap .scrim{align-items:center;padding:16px}}
.ap-wrap .modal{width:100%;max-width:440px;background:#fff;border-radius:18px 18px 0 0;padding:22px;max-height:92vh;overflow-y:auto}
@media(min-width:480px){.ap-wrap .modal{border-radius:18px}}
.ap-wrap .seg{display:flex;padding:4px;background:var(--ground);border-radius:10px;margin-bottom:18px}
.ap-wrap .seg button{flex:1;border:none;background:none;font:inherit;font-size:14px;font-weight:600;padding:9px;border-radius:7px;cursor:pointer;color:var(--muted)}
.ap-wrap .seg button.on{background:#fff;color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.08)}.ap-wrap .seg button.on.approve{color:var(--success)}.ap-wrap .seg button.on.changes{color:var(--warning-ink)}
.ap-wrap .modal h2{font-size:19px;margin:0 0 4px}.ap-wrap .sub{font-size:13px;color:var(--muted);margin:0 0 16px}
.ap-wrap .ctx{margin:0 0 16px;padding:13px;border:1px solid var(--line);border-radius:10px;background:var(--ground)}
.ap-wrap .ctxl{font-size:12px;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:7px}
.ap-wrap .badge{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent-p);background:rgba(0,158,142,.12);padding:2px 7px;border-radius:999px}
.ap-wrap .sslct{display:flex;gap:9px;flex-wrap:wrap}
.ap-wrap .sopt{width:56px;cursor:pointer;border:2px solid var(--line);border-radius:6px;overflow:hidden;background:#fff;padding:0}
.ap-wrap .sopt .mini{height:56px;display:grid;place-items:center;color:#fff;font-weight:700;font-size:15px;position:relative}
.ap-wrap .sopt .lbl{font-size:10px;padding:3px 0;color:var(--muted)}
.ap-wrap .sopt[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 2px rgba(0,158,142,.25)}
.ap-wrap .sopt[aria-pressed=true] .lbl{color:var(--accent-p);font-weight:700}
.ap-wrap .sopt .tick{position:absolute;top:4px;right:4px;width:16px;height:16px;border-radius:50%;background:var(--accent);font-size:10px;display:none;place-items:center}
.ap-wrap .sopt[aria-pressed=true] .tick{display:grid}
.ap-wrap .hinttext{font-size:12px;color:var(--muted);line-height:1.5}.ap-wrap .hinttext b{color:var(--warning-ink)}
.ap-wrap .chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.ap-wrap .chip{font:inherit;font-size:13px;font-weight:500;padding:8px 13px;border-radius:999px;border:1.5px solid var(--line);background:#fff;cursor:pointer}
.ap-wrap .chip[aria-pressed=true]{background:rgba(0,158,142,.10);border-color:var(--accent);color:var(--accent-p)}
.ap-wrap textarea{width:100%;font:inherit;font-size:14px;line-height:1.5;padding:12px 13px;border:1.5px solid var(--line);border-radius:10px;background:var(--ground);resize:vertical;min-height:88px}
.ap-wrap textarea:focus{outline:none;border-color:var(--accent);background:#fff}
.ap-wrap .macts{display:flex;gap:11px;margin-top:18px}.ap-wrap .macts .btn{flex:1}
.ap-wrap .confirm{text-align:center}.ap-wrap .confirm .big{font-size:19px;font-weight:700;margin:6px 0 4px}.ap-wrap .confirm p{font-size:13px;color:var(--muted);margin:0}
`;
