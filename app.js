const QUESTIONS = [
  {
    id: "L", stage: "L단계",
    situation: "소개받은 고객 첫 만남. 인사를 끝내고 본격적으로 대화를 시작하려 한다.",
    text: "이런 상황에서 나는",
    options: [
      { label: "보험 얘기를 꺼낼 때 쓰는 멘트가 잡혀있다", value: 1 },
      { label: "상황 봐서 하는데 매번 어떻게 시작할지 고민된다", value: 2 },
      { label: "첫 마디를 어떻게 꺼내야 할지 늘 어렵다", value: 3 },
    ],
  },
  {
    id: "I", stage: "I단계",
    situation: "본격적으로 보험 얘기를 시작해 니즈환기 하고 고객의 개인정보를 요청하려 한다.",
    text: "이런 상황에서 나는",
    options: [
      { label: "고객 상황을 파악하고 개인정보까지 받아내는 흐름이 잡혀있다", value: 1 },
      { label: "상황에 맞춰 진행하는 편이지만 가끔 고민될 때가 있다", value: 2 },
      { label: "이 흐름에서 개인정보 요청하는 게 늘 어렵다", value: 3 },
    ],
  },
  {
    id: "N", stage: "N단계",
    situation: "다음 방문때 고객에게 제안서를 보여주기로 했다. 40대 여성 기혼, 월 7만원 한도.",
    text: "이런 상황에서 나는",
    options: [
      { label: "담보 설계할 때 어떤 담보부터 선택할지 순서가 잡혀있다", value: 1 },
      { label: "고객 상황에 맞춰 구성하는 편이지만 솔직히 고민될 때가 있다", value: 2 },
      { label: "어떤 담보를 넣고 어떤 담보를 빼야 할지 고민될 때가 많다", value: 3 },
    ],
  },
  {
    id: "K", stage: "K단계",
    situation: "설명도 잘 듣고 긍정적이던 고객이 클로징 단계에서 조금 더 고민해보겠다고 한다.",
    text: "이런 상황에서 나는",
    options: [
      { label: "고객의 결정을 끌어내는 흐름이 잡혀있다", value: 1 },
      { label: "어떻게 결정을 이끌어 낼지 막힐 때가 가끔 있다", value: 2 },
      { label: "고객이 부담가질까봐 알겠습니다 하고 기다리는 편이다", value: 3 },
    ],
  },
];

const Q5 = {
  stage: "교육 목표",
  text: "오늘 교육에서 가장 얻어가고 싶은 것은?",
  options: [
    { label: "고객 관심을 끄는 첫 마디", value: "L", stage: "L단계" },
    { label: "고객 상황 파악하고 개인정보 받는 방법", value: "I", stage: "I단계" },
    { label: "담보 우선순위 결정 기준", value: "N", stage: "N단계" },
    { label: "망설이는 고객 클로징 방법", value: "K", stage: "K단계" },
  ],
};

const RESULTS = {
  L: { stage: "L단계", label: "후킹", color: "#3B5BDB",
    message: "딱 한 줄의 질문으로 고객을\n집중시킬 수 있습니다.\n오늘 그 첫 문장을 가져가세요." },
  I: { stage: "I단계", label: "진단", color: "#0CA678",
    message: "고객 스스로 부족함을 느끼게 하는\n방법이 있습니다.\n오늘 그 분석법을 가져가세요." },
  N: { stage: "N단계", label: "설계", color: "#E8470A",
    message: "설계할 때 담보 우선순위\n결정 방법이 궁금하신가요?\n오늘 그 기준을 가져가세요." },
  K: { stage: "K단계", label: "클로징", color: "#C92A2A",
    message: "어렵게 클로징까지 왔는데\n포기할 순 없죠.\n오늘 클로징 주도권을 배워보세요." },
};

// ★ Google Apps Script 웹앱 URL (배포 후 여기에 붙여넣기)
const GAS_URL = "https://script.google.com/macros/s/AKfycbxILNgceUt4O34MhiazLNliGE4O90ePGODQsg0jJ-jrVHpCgXpXlHgzVH7vIXRgbedUhA/exec";

const ADMIN_EMP_ID = "8089446";
const STAGE_COLORS = { L: "#3B5BDB", I: "#0CA678", N: "#E8470A", K: "#C92A2A" };
const TOTAL_STEPS = QUESTIONS.length + 1;

let state = {
  screen: "input", branch: "", empId: "", isAdmin: false,
  step: 0, answers: [], q5selected: [], resultKey: null,
  adminData: [], adminLoading: false, adminError: false,
};

function saveResponse(data) {
  // localStorage 백업 (오프라인용)
  try { localStorage.setItem("link_resp_" + Date.now(), JSON.stringify(data)); } catch(e) {}
  // Google Sheets 전송
  if (GAS_URL) {
    fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data),
    }).catch(() => {});
  }
}
function loadAll() {
  const items = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("link_resp_")) {
        const v = localStorage.getItem(k);
        if (v) items.push(JSON.parse(v));
      }
    }
  } catch(e) {}
  return items;
}

function getWeakStages(answers) {
  const w = new Set();
  if (answers[0] === 2 || answers[0] === 3) w.add("L");
  if (answers[1] === 2 || answers[1] === 3) w.add("I");
  if (answers[2] === 2 || answers[2] === 3) w.add("N");
  if (answers[3] === 2 || answers[3] === 3) w.add("K");
  return w;
}

function getResultKey(answers, q5selected) {
  const weak = getWeakStages(answers);
  if (q5selected.length > 0) {
    for (const s of q5selected) {
      if (weak.has(s)) return { key: s, aware: true };
    }
    return { key: q5selected[0], aware: "strong" };
  }
  const order = ["L","I","N","K"];
  for (const s of order) { if (weak.has(s)) return { key: s, aware: false }; }
  return { key: "L", aware: "all_good" };
}

function fetchAdminData() {
  state.adminLoading = true;
  state.adminError = false;
  if (GAS_URL) {
    const cbName = "_gasCallback_" + Date.now();
    const script = document.createElement("script");
    window[cbName] = function(json) {
      state.adminData = (json.data || []);
      state.adminLoading = false;
      render();
      delete window[cbName];
      script.remove();
    };
    script.onerror = function() {
      state.adminData = loadAll();
      state.adminLoading = false;
      state.adminError = true;
      render();
      delete window[cbName];
      script.remove();
    };
    script.src = GAS_URL + "?callback=" + cbName;
    document.body.appendChild(script);
  } else {
    state.adminData = loadAll();
    state.adminLoading = false;
  }
}

function checkAdmin() {
  if (new URLSearchParams(window.location.search).has("admin")) {
    state.screen = "admin";
    state.isAdmin = true;
    fetchAdminData();
  }
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

// 카드 플립 전환
function navigate(newScreen, stepFn, isBack) {
  const app = document.getElementById("app");
  const current = app.firstChild;
  if (current) {
    current.classList.add(isBack ? "flip-out-back" : "flip-out");
    setTimeout(() => {
      if (stepFn) stepFn();
      state.screen = newScreen;
      state._navBack = isBack;
      render();
    }, 180);
  } else {
    if (stepFn) stepFn();
    state.screen = newScreen;
    render();
  }
}

function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const scr = buildScreen();
  app.appendChild(scr);
  scr.classList.add(state._navBack ? "flip-in-back" : "flip-in");
  state._navBack = false;
}

function buildScreen() {
  switch (state.screen) {
    case "main":   return buildMain();
    case "input":  return buildInput();
    case "quiz":   return buildQuiz();
    case "result": return buildResult();
    case "admin":  return buildAdmin();
    default:       return buildMain();
  }
}

// ── 메인 ──────────────────────────────────────────────
function buildMain() {
  const screen = el("div", "screen center");

  const title = el("div", "main-title", "L<span>·</span>I<span>·</span>N<span>·</span>K");
  screen.appendChild(title);

  screen.appendChild(el("h1", "", "지금 나에게 부족한<br>단계가 어딘지 아시나요?"));
  screen.appendChild(el("p", "sub", "5가지 질문으로<br>성장 포인트를 찾아보세요."));

  // 스텝 인디케이터
  const ind = el("div", "step-indicator");
  ["L","I","N","K"].forEach((s, i) => {
    const dot = el("div", "step-dot");
    dot.title = s + "단계";
    ind.appendChild(dot);
    if (i < 3) ind.appendChild(el("div", "step-line"));
  });
  screen.appendChild(ind);

  const btn = el("button", "btn-primary", "진단 시작하기 →");
  btn.onclick = () => navigate("quiz", () => { state.step=0; state.answers=[]; state.q5selected=[]; });
  screen.appendChild(btn);

  if (state.isAdmin) {
    const adminBtn = el("button", "btn-secondary", "관리자 대시보드");
    adminBtn.style.cssText = "margin-top:16px;max-width:280px;";
    adminBtn.onclick = () => navigate("admin", fetchAdminData);
    screen.appendChild(adminBtn);
  }

  return screen;
}

// ── 입력 (첫 화면) ──────────────────────────────────────
function buildInput() {
  const screen = el("div", "screen");

  const title = el("div", "main-title", "L<span>·</span>I<span>·</span>N<span>·</span>K");
  title.style.textAlign = "center";
  screen.appendChild(title);

  screen.appendChild(el("h2", "", "정보를 입력해주세요"));
  const sub = el("p", "", "진단을 시작하기 위해 정보를 입력해주세요.");
  sub.style.cssText = "font-size:16px;color:#8B95A5;margin:10px 0 36px;line-height:1.6";
  screen.appendChild(sub);

  const f1 = el("div", "field");
  f1.innerHTML = "<label>지점명</label>";
  const inp1 = document.createElement("input");
  inp1.type="text"; inp1.placeholder="예) 은계지점"; inp1.value=state.branch;
  inp1.oninput = e => state.branch = e.target.value;
  f1.appendChild(inp1); screen.appendChild(f1);

  const f2 = el("div", "field");
  f2.innerHTML = "<label>사번 (숫자 7자리)</label>";
  const inp2 = document.createElement("input");
  inp2.type="tel"; inp2.placeholder="예) 1234567"; inp2.value=state.empId; inp2.maxLength=7;
  inp2.oninput = e => state.empId = e.target.value.replace(/\D/g,"").slice(0,7);
  f2.appendChild(inp2); screen.appendChild(f2);

  const err = el("p","error",""); err.style.display="none"; screen.appendChild(err);

  const btn = el("button","btn-full","다음 →");
  btn.style.marginTop="28px";
  btn.onclick = () => {
    if (!state.branch.trim()) { err.textContent="지점명을 입력해주세요."; err.style.display="block"; return; }
    if (!/^\d{7}$/.test(state.empId)) { err.textContent="사번은 숫자 7자리로 입력해주세요."; err.style.display="block"; return; }
    state.isAdmin = (state.empId === ADMIN_EMP_ID);
    navigate("main");
  };
  screen.appendChild(btn);
  return screen;
}

// ── 퀴즈 ──────────────────────────────────────────────
function buildQuiz() {
  const isQ5 = state.step === QUESTIONS.length;
  const screen = el("div","screen");

  // 진행바
  const progress = ((state.step+1)/TOTAL_STEPS)*100;
  const stageLabel = isQ5 ? Q5.stage : QUESTIONS[state.step].stage;
  const pw = el("div","progress-wrap");
  pw.innerHTML = `
    <div class="progress-meta">
      <span class="progress-num">${state.step+1} / ${TOTAL_STEPS}</span>
      <span class="progress-stage">${stageLabel}</span>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>`;
  screen.appendChild(pw);

  // 스텝 인디케이터
  const ind = el("div","step-indicator");
  ind.style.marginBottom = "28px";
  ["L","I","N","K","✓"].forEach((s, i) => {
    const dot = el("div","step-dot");
    if (i < state.step) dot.classList.add("done");
    else if (i === state.step) dot.classList.add("active");
    ind.appendChild(dot);
    if (i < 4) {
      const line = el("div","step-line");
      if (i < state.step) line.classList.add("done");
      ind.appendChild(line);
    }
  });
  screen.appendChild(ind);

  if (isQ5) {
    screen.appendChild(el("div","q-text", Q5.text));
    screen.appendChild(el("p","multi-hint","복수 선택 가능"));
    const optList = el("div","option-list");
    Q5.options.forEach((opt, idx) => {
      const btn = el("button","option-btn");
      const num = el("div","option-num", opt.stage);
      num.style.cssText = "font-size:11px;width:auto;padding:0 8px;border-radius:20px;min-width:auto;height:24px;";
      btn.appendChild(num);
      btn.appendChild(document.createTextNode(opt.label));
      if (state.q5selected.includes(opt.value)) btn.classList.add("selected");
      btn.onclick = () => {
        if (state.q5selected.includes(opt.value)) {
          state.q5selected = state.q5selected.filter(v=>v!==opt.value);
          btn.classList.remove("selected");
        } else {
          state.q5selected.push(opt.value);
          btn.classList.add("selected");
        }
      };
      optList.appendChild(btn);
    });
    screen.appendChild(optList);
    const done = el("button","btn-full","완료");
    done.style.marginTop="24px";
    done.onclick = () => {
      const { key } = getResultKey(state.answers, state.q5selected);
      state.resultKey = key;
      saveResponse({ branch:state.branch, empId:state.empId, answers:state.answers, q5:state.q5selected, result:key, timestamp:new Date().toISOString() });
      navigate("result");
    };
    screen.appendChild(done);
  } else {
    const q = QUESTIONS[state.step];
    screen.appendChild(el("div","situation-box", q.situation));
    screen.appendChild(el("div","q-text", q.text));
    const optList = el("div","option-list");
    q.options.forEach((opt, idx) => {
      const btn = el("button","option-btn");
      const num = el("div","option-num", idx+1);
      btn.appendChild(num);
      btn.appendChild(document.createTextNode(opt.label));
      btn.onclick = () => {
        const newA = [...state.answers];
        newA[state.step] = opt.value;
        state.answers = newA;
        navigate("quiz", () => state.step++);
      };
      optList.appendChild(btn);
    });
    screen.appendChild(optList);
  }

  const back = el("button","btn-back","← 이전");
  back.style.marginTop="20px";
  back.onclick = () => {
    if (state.step === 0) navigate("main", null, true);
    else navigate("quiz", () => state.step--, true);
  };
  screen.appendChild(back);
  return screen;
}

// ── 결과 ──────────────────────────────────────────────
function buildResult() {
  const { key, aware } = getResultKey(state.answers, state.q5selected);
  const r = RESULTS[key];
  const weak = getWeakStages(state.answers);
  const screen = el("div","screen");

  const header = el("div","result-header");
  header.innerHTML = `<div class="result-eyebrow">LINK 진단 결과</div><h2>오늘 집중할 구간</h2>`;
  screen.appendChild(header);

  const card = el("div","result-card");
  const badge = el("div","result-stage-badge", `${r.stage} · ${r.label}`);
  badge.style.background = r.color;
  card.appendChild(badge);
  card.appendChild(el("p","result-msg", r.message.replace(/\n/g,"<br>")));

  if (aware === true && weak.size > 1) {
    card.appendChild(el("p","result-sub","진단 결과도 같은 단계가 약하게 나왔어요.\n오늘 확실히 채워가세요."));
  } else if (aware === false) {
    card.appendChild(el("p","result-sub","오늘 교육에서 이 구간을 집중해서 들어보세요."));
  } else if (aware === "strong") {
    card.appendChild(el("p","result-sub","진단 결과는 양호합니다.\n더 잘하고 싶으신 부분을 오늘 깊이 배워가세요."));
  } else if (aware === "all_good") {
    card.appendChild(el("p","result-sub","전 단계가 양호합니다.\n오늘 교육으로 더욱 완성도를 높여가세요."));
  }
  screen.appendChild(card);

  const summary = el("div","stage-summary");
  summary.innerHTML = '<div class="summary-title">가장 집중해야 할 단계는?</div>';
  const boxes = el("div","stage-boxes");
  ["L","I","N","K"].forEach(s => {
    const isMain = s === key;
    const box = el("div","stage-box");
    const circle = el("div", isMain ? "stage-circle main" : "stage-circle");
    circle.style.background = isMain ? r.color : "#F5F5F7";
    const span = el("span","",s);
    span.style.color = isMain ? "#fff" : "#8B95A5";
    circle.appendChild(span);
    box.appendChild(circle);
    const label = el("div","stage-label", isMain ? "최우선" : "");
    label.style.color = r.color;
    box.appendChild(label);
    boxes.appendChild(box);
  });
  summary.appendChild(boxes);
  screen.appendChild(summary);

  const btn = el("button","btn-secondary","다시 설문 참여하기");
  btn.onclick = () => navigate("input", () => {
    state.branch=""; state.empId=""; state.answers=[];
    state.q5selected=[]; state.step=0; state.resultKey=null; state.isAdmin=false;
  });
  screen.appendChild(btn);
  return screen;
}

// ── 관리자 ──────────────────────────────────────────────
function buildAdmin() {
  const screen = el("div","screen");
  const header = el("div","admin-header");

  // 로딩 중
  if (state.adminLoading) {
    header.innerHTML = `
      <div>
        <div style="font-size:12px;font-weight:800;color:#8B95A5;letter-spacing:3px">ADMIN</div>
        <h2 style="font-size:24px;margin-top:4px">진단 현황</h2>
      </div>`;
    screen.appendChild(header);
    const lw = el("div","loading-wrap");
    lw.innerHTML = '<div class="spinner"></div><div class="loading-text">데이터 불러오는 중…</div>';
    screen.appendChild(lw);
    return screen;
  }

  const data = state.adminData;
  const total = data.length;
  const counts = {L:0,I:0,N:0,K:0};
  data.forEach(d => { if (counts[d.result]!==undefined) counts[d.result]++; });
  const maxCount = Math.max(...Object.values(counts), 1);

  header.innerHTML = `
    <div>
      <div style="font-size:12px;font-weight:800;color:#8B95A5;letter-spacing:3px">ADMIN</div>
      <h2 style="font-size:24px;margin-top:4px">진단 현황</h2>
    </div>
    <div style="text-align:right">
      <div class="admin-total">${total}</div>
      <div class="admin-total-label">총 응답</div>
    </div>`;
  screen.appendChild(header);

  if (state.adminError) {
    screen.appendChild(el("div","error-banner","서버 연결 실패 — 로컬 데이터를 표시합니다."));
  }
  if (!GAS_URL) {
    screen.appendChild(el("div","error-banner","GAS_URL 미설정 — 로컬 데이터만 표시됩니다."));
  }

  const chart = el("div","chart-card");
  chart.innerHTML = '<div class="chart-title">단계별 병목 분포</div>';
  ["L","I","N","K"].forEach(s => {
    const count = counts[s];
    const pct = total ? Math.round(count/total*100) : 0;
    const barW = total ? Math.round(count/maxCount*100) : 0;
    const row = el("div","bar-row");
    row.innerHTML = `
      <div class="bar-meta">
        <span class="bar-label">${s}단계</span>
        <span class="bar-count">${count}명 (${pct}%)</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${barW}%;background:${STAGE_COLORS[s]}"></div></div>`;
    chart.appendChild(row);
  });
  screen.appendChild(chart);

  const csvBtn = el("button","btn-csv","CSV 다운로드");
  csvBtn.onclick = () => {
    const hdr = "timestamp,branch,empId,Q1,Q2,Q3,Q4,Q5,result\n";
    const rows = data.map(d=>`${d.timestamp},${d.branch},${d.empId},${(d.answers||[]).join(",")},${(d.q5||[]).join("|")},${d.result}`).join("\n");
    const blob = new Blob(["\uFEFF"+hdr+rows],{type:"text/csv;charset=utf-8;"});
    const a = document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download="LINK_진단결과.csv"; a.click();
  };
  screen.appendChild(csvBtn);

  const refreshBtn = el("button","btn-refresh","새로고침");
  refreshBtn.onclick = () => { fetchAdminData(); render(); };
  screen.appendChild(refreshBtn);

  const backBtn = el("button","btn-back","← 메인으로");
  backBtn.style.marginTop="20px";
  backBtn.onclick = () => navigate("main", null, true);
  screen.appendChild(backBtn);
  return screen;
}

checkAdmin();
render();
