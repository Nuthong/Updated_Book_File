/* minna-typing 2026-11 — โหมดพิมพ์ให้หน้าแบบทดสอบคำศัพท์ Minna no Nihongo (ใช้ร่วมกันทุกบท)
   ต้องโหลดหลังสคริปต์หลักของหน้า (ใช้ QUESTIONS, mode, render, renderNavGrid ของหน้า)
   คำศัพท์อ่านจาก QUESTIONS: 「คานะ ［คันจิ］」 ใน prompt, คำอ่าน = subs[0], ความหมาย = subs[1] */
(function(){
  if(typeof QUESTIONS === "undefined" || !document.querySelector(".mode-toggle")) return;

  // ---------- คำศัพท์ ----------
  const MAC = {"ā":"a","ī":"i","ū":"u","ē":"e","ō":"o"};
  const VOCAB = QUESTIONS.map((q, i)=>{
    const m = /「([^」［\s]+)\s*(?:［([^］]+)］)?」/.exec(q.prompt) || [];
    return { i, kana: m[1] || "", kanji: m[2] || "", romaji: q.subs[0].correctAnswer, meaning: q.subs[1].correctAnswer, chapter: q.chapter || "" };
  }).filter(v=>v.kana);
  const isKatakana = s => /[゠-ヿ]/.test(s);
  // คำตอบที่แสดง: ไม่มีขีดบน — คาตาคานะใช้สระซ้ำ (nooto), ฮิรางานะใช้ ou/uu ตามการพิมพ์คานะ (techou, sou)
  function display(v){
    const kata = isKatakana(v.kana);
    return v.romaji.replace(/[āīūēō]/g, c => kata ? MAC[c]+MAC[c] : ({ "ō":"ou", "ū":"uu", "ā":"aa", "ē":"ee", "ī":"ii" })[c]).replace(/\s+/g, " ");
  }
  // ตัวสะกดที่รับ: สระยาวแบบ o/oo/ou, Hepburn หรือ Kunrei (si, ti, tu, hu, zi, sya…), n หรือ m หน้า b/p/m
  function accepted(v){
    let forms = [""];
    for(const ch of v.romaji.replace(/\s+/g, "")){
      if(MAC[ch]){
        const b = MAC[ch], alts = [b, b+b]; if(ch==="ō") alts.push("ou"); if(ch==="ē") alts.push("ei");
        forms = forms.flatMap(f => alts.map(a => f+a));
      } else forms = forms.map(f => f+ch);
    }
    const out = new Set();
    const kunrei = s => s.replace(/sh([auo])/g,"sy$1").replace(/ch([auo])/g,"ty$1").replace(/j([auo])/g,"zy$1")
                         .replace(/shi/g,"si").replace(/chi/g,"ti").replace(/tsu/g,"tu").replace(/fu/g,"hu").replace(/ji/g,"zi");
    forms.forEach(f=>{ [f, kunrei(f)].forEach(g=>{ out.add(g); out.add(g.replace(/n(?=[bpm])/g,"m")); }); });
    return out;
  }
  const norm = s => String(s||"").normalize("NFKC").toLowerCase().replace(/[āīūēō]/g, c=>MAC[c]).replace(/[^a-z]/g, "");

  // ---------- UI ----------
  const css = document.createElement("style");
  css.textContent = `
.mt-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--ds-r-lg,16px);padding:28px 20px 24px;display:flex;flex-direction:column;align-items:center;gap:14px;box-shadow:var(--ds-sh-1);margin-bottom:16px;}
.mt-stats{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;font-size:.9rem;color:var(--text-soft);}
.mt-stats b{color:var(--text);}
.mt-chap{font-size:.82rem;color:var(--text-soft);}
.mt-q{font-size:3rem;font-weight:700;line-height:1.2;text-align:center;color:var(--text);overflow-wrap:anywhere;}
.mt-q.th{font-size:2rem;}
.mt-q small{display:block;margin-top:8px;font-size:1rem;font-weight:500;line-height:1.4;color:var(--text-soft);}
.mt-form{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;width:100%;max-width:440px;}
.mt-form label{width:100%;text-align:center;font-weight:600;}
.mt-input{flex:1 1 200px;min-width:0;font-family:'JetBrains Mono',monospace;font-size:1.4rem;text-align:center;padding:10px 12px;border:2px solid var(--border);border-radius:10px;background:var(--panel);color:var(--text);}
.mt-input.ok{border-color:var(--correct);background:var(--correct-soft);}
.mt-input.bad{border-color:var(--incorrect);background:var(--incorrect-soft);}
.mt-btn{border:none;background:var(--navy);color:#fff;padding:10px 18px;min-height:44px;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.95rem;}
.mt-btn.secondary{background:var(--panel);color:var(--text);border:1.5px solid var(--border);}
:root[data-theme="dark"] .mt-btn:not(.secondary){background:var(--flag,#C9A24B);color:#14202E;}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .mt-btn:not(.secondary){background:var(--flag,#C9A24B);color:#14202E;}}
.mt-fb{min-height:1.5em;font-weight:700;text-align:center;}
.mt-fb.ok{color:var(--correct);} .mt-fb.bad{color:var(--incorrect);}
.mt-detail{width:100%;max-width:460px;border-left:3px solid var(--incorrect);background:var(--incorrect-soft);border-radius:8px;padding:10px 14px;line-height:1.8;}
.mt-help{font-size:.82rem;color:var(--text-soft);text-align:center;max-width:470px;line-height:1.6;}
.mt-sum{text-align:center;line-height:1.9;}
.mt-sum .wl{font-size:1.15rem;}
.mt-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}`;
  document.head.appendChild(css);

  const toggle = document.querySelector(".mode-toggle");
  const MODES = { typeJp: "พิมพ์: ญี่ปุ่น → อักษรอังกฤษ", typeTh: "พิมพ์: ไทย → อักษรอังกฤษ" };
  const btns = {};
  Object.entries(MODES).forEach(([id, label])=>{
    const b = document.createElement("button");
    b.type = "button"; b.id = "btn_" + id; b.textContent = label;
    b.addEventListener("click", ()=>{
      document.querySelectorAll(".mode-toggle button").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      mode = id; st.pos = 0; st.res = {}; st.streak = 0; st.only = null; build(); paint();
    });
    toggle.appendChild(b); btns[id] = b;
  });
  ["btnExerciseMode","btnAnswerMode"].forEach(id=>{
    const b = document.getElementById(id);
    if(b) b.addEventListener("click", ()=>{ Object.values(btns).forEach(x=>x.classList.remove("active")); });
  });

  const st = { pos: 0, res: {}, streak: 0, best: 0, only: null };
  let list = [], answered = false, timer = null;
  function build(){
    list = VOCAB.slice();
    if(st.only) list = list.filter(v => st.only.has(v.i));
    const ord = (document.getElementById("orderSelect") || {}).value;
    if(ord === "shuffle"){ for(let k=list.length-1;k>0;k--){ const j=Math.floor(Math.random()*(k+1)); [list[k],list[j]]=[list[j],list[k]]; } }
  }
  const esc = s => String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  function counts(){ let ok=0, bad=0; list.forEach(v=>{ if(st.res[v.i]==="ok") ok++; else if(st.res[v.i]==="bad") bad++; }); return {ok, bad}; }
  function nav(){
    const g = document.getElementById("navGrid"); if(!g) return;
    g.innerHTML = "";
    list.forEach((v, p)=>{
      const c = document.createElement("div");
      c.className = "nav-cell" + (st.res[v.i]==="ok" ? " correct" : st.res[v.i]==="bad" ? " incorrect" : "") + (p===st.pos ? " current" : "");
      c.textContent = p+1; c.setAttribute("role","button"); c.tabIndex = 0;
      c.setAttribute("aria-label", "คำที่ "+(p+1));
      const go = ()=>{ st.pos = p; paint(); };
      c.onclick = go; c.onkeydown = e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } };
      g.appendChild(c);
    });
    const n = counts();
    const sb = document.getElementById("scoreBox"), stx = document.getElementById("scoreText");
    if(sb && stx){ sb.style.display = "block"; stx.textContent = n.ok + "/" + list.length; }
    const rb = document.getElementById("reviewBox"); if(rb) rb.style.display = "none";
  }
  function paint(){
    clearTimeout(timer);
    const main = document.getElementById("mainArea");
    main.innerHTML = "";
    const card = document.createElement("div"); card.className = "mt-card";
    const n = counts();
    if(st.pos >= list.length){
      const wrong = list.filter(v => st.res[v.i]==="bad");
      card.innerHTML = '<div class="mt-sum"><h2 style="margin:0 0 4px">จบชุดแล้ว</h2><div>ถูก <b>'+n.ok+'</b> จาก '+list.length+' คำ · ต่อเนื่องสูงสุด <b>'+st.best+'</b> คำ</div>'
        + (wrong.length ? '<div style="margin-top:8px">คำที่ยังพิมพ์ผิด</div><div class="wl">'+wrong.map(v=>'<span lang="ja">'+esc(v.kana)+'</span> ('+esc(display(v))+')').join(" · ")+'</div>' : '<div style="margin-top:8px">ถูกทุกคำ 🎉</div>')
        + '</div><div class="mt-actions">'
        + (wrong.length ? '<button class="mt-btn" id="mtWrong">ฝึกเฉพาะคำที่ผิด ('+wrong.length+')</button>' : '')
        + '<button class="mt-btn'+(wrong.length?' secondary':'')+'" id="mtAgain">เริ่มชุดใหม่</button></div>';
      main.appendChild(card);
      const w = document.getElementById("mtWrong");
      if(w) w.onclick = ()=>{ st.only = new Set(wrong.map(v=>v.i)); st.pos = 0; st.streak = 0; wrong.forEach(v=>{ delete st.res[v.i]; }); build(); paint(); };
      document.getElementById("mtAgain").onclick = ()=>{ st.only = null; st.res = {}; st.pos = 0; st.streak = 0; build(); paint(); };
      (w || document.getElementById("mtAgain")).focus();
      nav(); return;
    }
    const v = list[st.pos];
    answered = false;
    const jp = mode === "typeJp";
    const word = '<span lang="ja">'+esc(v.kana)+'</span>' + (v.kanji ? ' <span lang="ja">［'+esc(v.kanji)+'］</span>' : '');
    card.innerHTML =
        '<div class="mt-stats"><span>คำที่ <b>'+(st.pos+1)+'</b> / '+list.length+'</span><span>ถูก <b>'+n.ok+'</b></span><span>ผิด <b>'+n.bad+'</b></span><span>ต่อเนื่อง <b>'+st.streak+'</b></span></div>'
      + (jp ? '<div class="mt-chap">'+esc(v.chapter)+'</div>' : '')   // ในโหมดไทย ชื่อหมวดบอกใบ้คำตอบ จึงซ่อนไว้จนตอบ
      + (jp ? '<div class="mt-q">'+word+'</div>' : '<div class="mt-q th">'+esc(v.meaning)+'<small>คำนี้ภาษาญี่ปุ่นคืออะไร</small></div>')
      + '<form class="mt-form" id="mtForm" autocomplete="off"><label for="mtInput">'
      + (jp ? 'พิมพ์คำอ่านเป็นอักษรอังกฤษ (โรมันจิ)' : 'พิมพ์คำภาษาญี่ปุ่นเป็นอักษรอังกฤษ (โรมันจิ)') + '</label>'
      + '<input id="mtInput" class="mt-input" type="text" inputmode="latin" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40" placeholder="เช่น hon">'
      + '<button class="mt-btn" type="submit" id="mtSubmit">ตรวจ</button>'
      + '<button class="mt-btn secondary" type="button" id="mtSkip">ไม่รู้ / ดูคำตอบ</button></form>'
      + '<div class="mt-fb" id="mtFb" role="status" aria-live="polite"></div><div id="mtDetail"></div>'
      + '<div class="mt-help">กด Enter เพื่อตรวจ · ไม่ต้องใส่ขีดบนสระยาว: พิมพ์ nooto หรือ noto ก็ได้ (ノート), techou (てちょう) · เว้นวรรคหรือไม่ก็ได้ · shi/si, chi/ti, tsu/tu, fu/hu, ji/zi นับว่าถูกทั้งคู่</div>';
    main.appendChild(card);
    const input = document.getElementById("mtInput");
    document.getElementById("mtForm").addEventListener("submit", e=>{ e.preventDefault(); answered ? next() : check(v, input.value, false); });
    document.getElementById("mtSkip").onclick = ()=>{ answered ? next() : check(v, "", true); };
    input.focus({preventScroll: true});
    card.scrollIntoView({block: "nearest"});
    nav();
  }
  function check(v, value, gaveUp){
    const fb = document.getElementById("mtFb");
    const x = norm(value);
    if(!gaveUp && !x){ fb.className = "mt-fb"; fb.textContent = "พิมพ์คำตอบก่อนกดตรวจ"; return; }
    const ok = !gaveUp && accepted(v).has(x);
    answered = true;
    st.res[v.i] = ok ? "ok" : "bad";
    if(ok){ st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
    const input = document.getElementById("mtInput");
    input.readOnly = true; input.classList.add(ok ? "ok" : "bad");
    const ans = display(v);
    const full = '<span lang="ja">'+esc(v.kana)+'</span>' + (v.kanji ? ' <span lang="ja">［'+esc(v.kanji)+'］</span>' : '') + ' = <b>'+esc(ans)+'</b> = '+esc(v.meaning);
    document.getElementById("mtSkip").style.display = "none";
    if(ok){
      fb.className = "mt-fb ok"; fb.innerHTML = "✓ ถูกต้อง — " + full;
      document.getElementById("mtSubmit").textContent = "ถัดไป";
      timer = setTimeout(next, 1200);
    } else {
      fb.className = "mt-fb bad"; fb.textContent = (gaveUp ? "คำตอบ: " : "✗ ยังไม่ถูก — คำตอบคือ ") + ans;
      document.getElementById("mtDetail").innerHTML = '<div class="mt-detail">'+(gaveUp ? '' : '<div>คุณพิมพ์: <code>'+esc(value)+'</code></div>')
        + '<div>'+full+'</div><div style="font-size:.85rem;color:var(--text-soft)">'+esc(v.chapter)+'</div></div>';
      const s = document.getElementById("mtSubmit"); s.textContent = "ถัดไป (Enter)"; s.focus();
    }
    nav();
  }
  function next(){ clearTimeout(timer); st.pos++; paint(); }

  // ให้ render() ของหน้า (เปลี่ยนลำดับ/ทำใหม่ทั้งชุด) ทำงานกับโหมดพิมพ์ด้วย
  const baseRender = render;
  render = function(){ if(mode === "typeJp" || mode === "typeTh"){ build(); paint(); } else baseRender(); };
  const reset = document.getElementById("resetAllBtn");
  // ในโหมดพิมพ์ ปุ่ม "ทำใหม่ทั้งชุด" ล้างเฉพาะผลการพิมพ์ ไม่แตะคำตอบของแบบฝึกหัด
  if(reset) reset.addEventListener("click", e=>{
    if(mode !== "typeJp" && mode !== "typeTh") return;
    e.stopImmediatePropagation();
    st.pos = 0; st.res = {}; st.streak = 0; st.only = null; build(); paint();
  }, true);
  window.__minnaTyping = { VOCAB, accepted, display, norm };
})();
