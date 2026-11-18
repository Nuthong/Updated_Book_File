/* quiz-sets 2026-11 — โหมดชุดสุ่มสำหรับหน้าแบบทดสอบ: "เน้นเร็ว" (สุ่ม N ข้อ กระจายตามบท) และ "ละเอียด" (ครบทุกข้อ สลับลำดับ)
   - ทุกครั้งที่เริ่มชุดใหม่ ข้อที่เคยเจอน้อยที่สุดได้ก่อน และข้อจากชุดที่แล้วถูกเลื่อนไปท้าย จึงไม่ค่อยเจอข้อเดิมติดกัน
   - ตำแหน่งตัวเลือกของแต่ละข้อสลับใหม่ทุกชุด
   - ต้องโหลดหลังสคริปต์หลักของหน้า (ใช้ QUESTIONS, displayIndexes, order, render, userAnswers, checked, confidence,
     practice, saveProgress, questionScore, renderReviewBox, chapterOrder, shuffleArray, PROGRESS_KEY ของหน้า)
   - ตั้งจำนวนข้อของโหมดเร็วด้วย <script src="quiz-sets.js" data-quick="25"> */
(function(){
  if(typeof QUESTIONS === "undefined" || !document.getElementById("mainArea")) return;
  const N = QUESTIONS.length;
  const me = document.currentScript;
  const QUICK = Math.max(1, Math.min(parseInt((me && me.dataset.quick) || "25", 10) || 25, N));
  const KEY = "eab-sets:" + PROGRESS_KEY;
  const ORIG = QUESTIONS.map(q => q.subs.map(s => Array.isArray(s.options) ? s.options.slice() : null));

  // ---------- สถานะ (เก็บในเบราว์เซอร์นี้) ----------
  let st = { v: 1, kind: null, set: null, opt: null, seen: {}, last: [], round: 0 };
  try{
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    if(d && d.v === 1) st = Object.assign(st, d);
  }catch(e){}
  const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){} };
  const isIdx = a => Array.isArray(a) && a.every(i => Number.isInteger(i) && i >= 0 && i < N);
  const isPerm = (p, n) => Array.isArray(p) && p.length === n && isIdx(p) && new Set(p).size === n;
  if(!isIdx(st.set) || !st.set.length){ st.kind = null; st.set = null; st.opt = null; }
  if(!st.seen || typeof st.seen !== "object") st.seen = {};
  if(!isIdx(st.last)) st.last = [];

  function applyOptionOrder(){
    QUESTIONS.forEach((q, i) => q.subs.forEach((s, si) => {
      const base = ORIG[i][si]; if(!base) return;
      const p = st.opt && st.opt[i] && st.opt[i][si];
      s.options = isPerm(p, base.length) ? p.map(k => base[k]) : base.slice();
    }));
  }

  // ---------- เลือกข้อ ----------
  const chapterOf = i => (QUESTIONS[i].chapter || "").trim();
  function pickQuick(){
    const groups = {};
    QUESTIONS.forEach((q, i) => { (groups[chapterOf(i)] = groups[chapterOf(i)] || []).push(i); });
    const names = Object.keys(groups);
    // โควตาต่อบทตามสัดส่วน (largest remainder) ให้ชุดสั้นยังครอบคลุมทุกบท
    const raw = names.map(n => groups[n].length * QUICK / N);
    const quota = raw.map(Math.floor);
    let left = QUICK - quota.reduce((a, b) => a + b, 0);
    names.map((n, k) => [raw[k] - quota[k] + Math.random() * 1e-6, k]).sort((a, b) => b[0] - a[0])
         .forEach(([, k]) => { if(left > 0 && quota[k] < groups[names[k]].length){ quota[k]++; left--; } });
    const last = new Set(st.last), out = [];
    names.forEach((n, k) => {
      const ranked = groups[n].map(i => [st.seen[i] || 0, last.has(i) ? 1 : 0, Math.random(), i])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
      ranked.slice(0, quota[k]).forEach(r => out.push(r[3]));
    });
    return shuffleArray(out);
  }
  function pickFull(){
    // ละเอียด: ครบทุกข้อ สลับลำดับ แต่ไม่ให้ข้อต้นชุดซ้ำกับข้อต้นชุดที่แล้ว
    const prevHead = new Set((st.last || []).slice(0, 10));
    const all = shuffleArray(QUESTIONS.map((q, i) => i));
    return all.filter(i => !prevHead.has(i)).concat(all.filter(i => prevHead.has(i)));
  }

  function hasWork(){
    return Object.keys(checked).length > 0 || Object.keys(userAnswers).some(k => userAnswers[k] !== "" && userAnswers[k] != null);
  }
  function startSet(kind){
    if(hasWork() && !confirm("เริ่มชุดใหม่จะล้างคำตอบของชุดนี้ ต้องการเริ่มชุดใหม่ไหม?")) return;
    const set = kind === "quick" ? pickQuick() : pickFull();
    st.kind = kind; st.set = set; st.round = (st.round || 0) + 1; st.last = set.slice();
    set.forEach(i => { st.seen[i] = (st.seen[i] || 0) + 1; });
    st.opt = QUESTIONS.map((q, i) => q.subs.map((s, si) => ORIG[i][si] ? shuffleArray(ORIG[i][si].map((o, k) => k)) : null));
    save();
    userAnswers = {}; checked = {}; confidence = {};
    if(typeof practice !== "undefined") practice = {};
    saveProgress();
    if(typeof resetTimer === "function") resetTimer();
    applyOptionOrder();
    const sel = document.getElementById("orderSelect"); if(sel) sel.value = "original";
    order = "original";
    displayIndexes = set.slice();
    render();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    status.focus({ preventScroll: true });
  }

  // ---------- แผงเลือกโหมด ----------
  const css = document.createElement("style");
  css.textContent = `
.qs-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--ds-r-lg,16px);padding:18px 18px 14px;margin-bottom:16px;box-shadow:var(--ds-sh-1);}
.qs-title{font-weight:700;color:var(--heading,var(--text));margin:0 0 10px;font-size:1.02rem;}
.qs-btns{display:flex;flex-wrap:wrap;gap:10px;}
.qs-btns button{flex:1 1 200px;min-height:48px;padding:10px 14px;border-radius:var(--ds-r,12px);border:1.5px solid var(--accent2);background:var(--panel);color:var(--accent2-text,var(--text));font:inherit;font-weight:700;cursor:pointer;text-align:left;line-height:1.35;}
.qs-btns button small{display:block;font-weight:500;color:var(--text-soft);font-size:.82rem;margin-top:2px;}
.qs-btns button[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);}
.qs-btns button:hover{background:var(--accent-soft);}
.qs-status{margin:12px 0 0;font-size:.92rem;color:var(--text);}
.qs-status:focus{outline:none;}
.qs-note{margin:6px 0 0;font-size:.82rem;color:var(--text-soft);line-height:1.55;}
.sub-item select{width:100%;max-width:100%;white-space:normal;text-overflow:ellipsis;}
@media print{.qs-card{display:none;}}`;
  document.head.appendChild(css);

  const panel = document.createElement("section");
  panel.className = "qs-card";
  panel.setAttribute("aria-label", "เลือกโหมดทำข้อสอบ");
  panel.innerHTML =
    '<h2 class="qs-title">เลือกโหมดทำข้อสอบ</h2>' +
    '<div class="qs-btns">' +
      '<button type="button" data-kind="quick" aria-pressed="false">⚡ เน้นเร็ว · ' + QUICK + ' ข้อ<small>สุ่มกระจายทุกบท เน้นข้อที่ยังไม่ค่อยได้ทำ</small></button>' +
      '<button type="button" data-kind="full" aria-pressed="false">📚 ละเอียด · ' + N + ' ข้อ<small>ครบทุกข้อ สลับลำดับใหม่ทุกครั้ง</small></button>' +
    '</div>' +
    '<p class="qs-status" tabindex="-1" aria-live="polite"></p>' +
    '<p class="qs-note">กดปุ่มเมื่อไรก็สุ่มชุดใหม่ ข้อที่เพิ่งทำในชุดก่อนจะถูกเลื่อนไปหลัง และตำแหน่งตัวเลือกจะสลับใหม่ จึงจำตำแหน่งคำตอบไม่ได้ · ประวัติเก็บในเบราว์เซอร์นี้เท่านั้น</p>';
  const status = panel.querySelector(".qs-status");
  panel.querySelectorAll("button[data-kind]").forEach(b => b.addEventListener("click", () => startSet(b.dataset.kind)));

  function paintPanel(){
    panel.querySelectorAll("button[data-kind]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.kind === st.kind)));
    const covered = QUESTIONS.filter((q, i) => (st.seen[i] || 0) > 0).length;
    const done = displayIndexes.filter(i => checked[i]).length;
    if(!st.kind) status.innerHTML = 'ตอนนี้แสดงครบ <b>' + N + ' ข้อ</b> ตามลำดับต้นฉบับ กดเลือกโหมดด้านบนเพื่อเริ่มชุดสุ่ม';
    else status.innerHTML = 'ชุดปัจจุบัน: <b>' + (st.kind === "quick" ? "เน้นเร็ว" : "ละเอียด") + ' ' + displayIndexes.length + ' ข้อ</b> (ชุดที่ ' + st.round + ')' +
      ' · ตรวจแล้ว ' + done + '/' + displayIndexes.length + ' ข้อ · เคยสุ่มเจอแล้ว ' + covered + '/' + N + ' ข้อ';
  }

  // ---------- ผูกกับหน้าเดิม ----------
  const baseRender = render;
  render = function(){
    baseRender();
    const main = document.getElementById("mainArea");
    main.insertBefore(panel, main.firstChild);
    paintPanel();
  };
  // คะแนนนับเฉพาะข้อในชุดปัจจุบัน
  updateScore = function(){
    let c = 0;
    displayIndexes.forEach(i => { c += questionScore(i); });
    document.getElementById("scoreText").textContent = fmtScore(c) + "/" + displayIndexes.length;
    document.getElementById("scoreBox").style.display = "block";
    document.getElementById("retryWrongBtn").disabled = !displayIndexes.some(i => checked[i] && !isFullyCorrect(i));
    renderReviewBox();
    paintPanel();
  };
  // การเรียงลำดับทำภายในชุดปัจจุบัน
  const sel = document.getElementById("orderSelect");
  if(sel){
    const o = sel.querySelector('option[value="original"]');
    sel.onchange = e => {
      order = e.target.value;
      const base = st.kind ? st.set.slice() : QUESTIONS.map((q, i) => i);
      const inSet = new Set(base);
      displayIndexes = order === "shuffle" ? shuffleArray(base) : order === "chapter" ? chapterOrder().filter(i => inSet.has(i)) : base;
      render();
    };
    if(o && st.kind) o.textContent = "เรียงตามชุดที่สุ่ม";
    panel.addEventListener("click", () => { if(o && st.kind) o.textContent = "เรียงตามชุดที่สุ่ม"; });
  }

  // คืนสถานะชุดเดิมเมื่อเปิดหน้าใหม่
  applyOptionOrder();
  if(st.kind){ order = "original"; displayIndexes = st.set.slice(); }
  render();
})();
