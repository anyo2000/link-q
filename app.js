/* ============================================================
   LINK 컨설팅 진단 v2 — app.js
   ============================================================ */

// ─── Constants ──────────────────────────────────────────────

var QUESTIONS = [
  { stage: "L", text: "첫 만남에서 보험 얘기를 자연스럽게 꺼내는 것" },
  { stage: "L", text: '고객이 "보험 됐어요"로 막을 때 대화를 이어가는 것' },
  { stage: "I", text: "고객이 자기 보험에 문제가 있다고 느끼게 하는 것" },
  { stage: "I", text: "자연스럽게 개인정보(인증번호)를 확보하는 것" },
  { stage: "N", text: "한정된 예산에서 어떤 담보부터 넣을지 판단하는 것" },
  { stage: "N", text: "보험료 부담 느끼는 고객에게 플랜을 제시하는 것" },
  { stage: "K", text: '"생각해볼게요" 하는 고객의 결정을 이끄는 것' },
  { stage: "K", text: '"비싸요" "나중에요" 같은 거절에 대응하는 것' },
];

var STAGES = [
  { id: "L", name: "L단계", label: "연결", color: "#3B5BDB" },
  { id: "I", name: "I단계", label: "진단", color: "#0CA678" },
  { id: "N", name: "N단계", label: "설계", color: "#E8470A" },
  { id: "K", name: "K단계", label: "해결", color: "#C92A2A" },
];

var SCALE_LABELS = ["전혀 어렵지 않다", "대체로 괜찮다", "보통이다", "좀 어렵다", "매우 어렵다"];

var TIMEPOINTS = {
  pre:      { id: "pre",      title: "교육 전 진단",      sub: "지금 나에게 어려운 단계를\n확인해보세요." },
  post:     { id: "post",     title: "교육 후 진단",      sub: "교육을 마치고\n체감 변화를 확인합니다." },
  followup: { id: "followup", title: "현장 활용도 체크",  sub: "현장에서 적용해본 경험을\n점검합니다." },
};

var BONUS_APPLIED_OPTIONS = [
  { id: "hooking", label: "후킹 화법 (첫 마디 꺼내기)" },
  { id: "analysis", label: "간편분석지 활용" },
  { id: "priority", label: "우선순위 기반 설계" },
  { id: "closing", label: "클로징 화법" },
];

var GAS_URL = "https://script.google.com/macros/s/AKfycbzhkQyGbLI67jGRjJnZLx90df7i5-cQ8-E1VHvVtusjShE6IbqnOoXx06sgEMdNoZapFQ/exec";

var ADMIN_IDS = ["1234567"];

var STAGE_COLORS = { L: "#3B5BDB", I: "#0CA678", N: "#E8470A", K: "#C92A2A" };

var RESULT_MESSAGES = {
  L: "고객과의 첫 만남에서\n대화의 물꼬를 트는 것이\n가장 큰 과제입니다.\n후킹 기법에 집중해보세요.",
  I: "고객이 스스로 문제를 느끼게\n만드는 과정이 핵심입니다.\n진단 기법에 집중해보세요.",
  N: "한정된 예산 안에서\n최적의 설계를 하는 것이\n가장 큰 과제입니다.\n우선순위 기준을 가져가세요.",
  K: "거의 다 왔는데\n마지막 결정을 이끌어내는 것이\n가장 큰 과제입니다.\n클로징 화법을 집중해서 배워보세요.",
};

// 시점별 결과 타이틀
var RESULT_TITLES = {
  pre: "오늘 집중해서 들을 단계",
  post: "앞으로 더 연습할 단계",
  followup: "현장에서 아직 어려운 단계",
};

// ─── State ──────────────────────────────────────────────────

var state = {
  screen: "input",
  mode: "fp",
  loading: false,
  error: null,
  // FP
  empId: "",
  branch: "",
  fpName: "",
  timepoint: "",
  step: 0,
  answers: new Array(8).fill(0),
  bonusStage: "",
  bonusApplied: [],
  bonusReaction: "",
  comment: "",
  // Admin
  adminTab: "overview",
  adminData: null,
  adminBranch: null,
  adminFP: null,
  // Manager
  managerBranch: "",
  managerData: null,
  managerFP: null,
  // Charts
  _charts: {},
  _navBack: false,
};

// ─── Utilities ──────────────────────────────────────────────

function el(tag, cls, html) {
  var node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined && html !== null) node.innerHTML = html;
  return node;
}

function navigate(newScreen, stepFn, isBack) {
  var app = document.getElementById("app");
  var current = app.firstElementChild;
  if (!current) {
    if (stepFn) stepFn();
    state.screen = newScreen;
    state._navBack = !!isBack;
    render();
    return;
  }
  current.classList.remove("flip-in", "flip-in-back");
  current.classList.add(isBack ? "flip-out-back" : "flip-out");
  setTimeout(function() {
    if (stepFn) stepFn();
    state.screen = newScreen;
    state._navBack = !!isBack;
    render();
  }, 180);
}

// ─── JSONP & POST ───────────────────────────────────────────

function jsonpFetch(action, params, callback) {
  if (!GAS_URL) { callback({ error: "GAS_URL 미설정" }); return; }
  var cbName = "_cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  var url = GAS_URL + "?callback=" + cbName + "&action=" + action;
  if (params) {
    Object.keys(params).forEach(function(k) {
      url += "&" + k + "=" + encodeURIComponent(params[k]);
    });
  }
  var script = document.createElement("script");
  window[cbName] = function(data) {
    callback(data);
    delete window[cbName];
    script.remove();
  };
  script.onerror = function() {
    callback({ error: "서버 연결 실패" });
    delete window[cbName];
    script.remove();
  };
  script.src = url;
  document.body.appendChild(script);
}

function postData(data) {
  try { localStorage.setItem("link_v2_" + Date.now(), JSON.stringify(data)); } catch(e) {}
  if (!GAS_URL) return;
  // GET 방식으로 저장 (GAS POST 리다이렉트 문제 회피)
  jsonpFetch("save", { data: JSON.stringify(data) }, function() {});
}

// ─── Helpers ────────────────────────────────────────────────

// 동점이면 L→I→N→K 순서로 앞단계 우선 (프로세스 앞단부터 잡아야 함)
// 반환: { primary: "L", tied: ["L", "K"] } — tied는 동점인 단계들
function getWeakestStage(answers) {
  var avgs = [];
  for (var i = 0; i < 4; i++) {
    var a = answers[i * 2] || 0;
    var b = answers[i * 2 + 1] || 0;
    avgs.push({ id: STAGES[i].id, avg: (a + b) / 2 });
  }
  var maxAvg = Math.max.apply(null, avgs.map(function(x) { return x.avg; }));
  var tied = avgs.filter(function(x) { return x.avg === maxAvg; }).map(function(x) { return x.id; });
  // L→I→N→K 순서로 첫 번째가 primary
  return { primary: tied[0], tied: tied };
}

function getStageAvgs(answers) {
  var result = {};
  for (var i = 0; i < 4; i++) {
    var a = answers[i * 2] || 0;
    var b = answers[i * 2 + 1] || 0;
    result[STAGES[i].id] = (a + b) / 2;
  }
  return result;
}

function stageInfo(id) {
  for (var i = 0; i < STAGES.length; i++) {
    if (STAGES[i].id === id) return STAGES[i];
  }
  return STAGES[0];
}

// ─── Render Engine ──────────────────────────────────────────

function render() {
  Object.keys(state._charts).forEach(function(id) {
    try { state._charts[id].destroy(); } catch(e) {}
  });
  state._charts = {};

  var app = document.getElementById("app");
  app.innerHTML = "";
  var scr = buildScreen();
  app.appendChild(scr);
  scr.classList.add(state._navBack ? "flip-in-back" : "flip-in");
  state._navBack = false;
  requestAnimationFrame(function() {
    requestAnimationFrame(renderCharts);
  });
}

function buildScreen() {
  switch (state.screen) {
    case "cover": return buildCover();
    case "input": return buildInput();
    case "quiz": return buildQuiz();
    case "bonus": return buildBonus();
    case "result": return buildResult();
    case "adminLogin": return buildAdminLogin();
    case "adminBranchSearch": return buildAdminBranchSearch();
    case "admin": return buildAdmin();
    case "adminBranchDetail": return buildAdminBranchDetail();
    case "adminFPDetail": return buildAdminFPDetail();
    case "managerLogin": return buildManagerLogin();
    case "manager": return buildManager();
    case "managerFP": return buildManagerFP();
    default: return buildInput();
  }
}

// ─── Screen: Cover (표지) ───────────────────────────────────

function buildCover() {
  var tp = TIMEPOINTS[state.timepoint] || TIMEPOINTS.pre;
  var wrap = el("div", "screen center");

  var title = el("div", "main-title", "L<span>·</span>I<span>·</span>N<span>·</span>K");
  wrap.appendChild(title);

  var h = el("h1", null, tp.title);
  wrap.appendChild(h);

  var sub = el("p", "sub", tp.sub.replace(/\n/g, "<br>"));
  wrap.appendChild(sub);

  // 스텝 인디케이터
  var ind = el("div", "step-indicator");
  ["L","I","N","K"].forEach(function(s, i) {
    var dot = el("div", "step-dot");
    dot.title = s + "단계";
    ind.appendChild(dot);
    if (i < 3) ind.appendChild(el("div", "step-line"));
  });
  wrap.appendChild(ind);

  var btn = el("button", "btn-primary", "진단 시작하기 →");
  btn.addEventListener("click", function() { navigate("input"); });
  wrap.appendChild(btn);

  return wrap;
}

// ─── Screen: Input ──────────────────────────────────────────

function buildInput() {
  var tp = TIMEPOINTS[state.timepoint] || TIMEPOINTS.pre;
  var wrap = el("div", "screen");

  var back = el("button", "btn-back", "← 이전");
  back.addEventListener("click", function() { navigate("cover", null, true); });
  wrap.appendChild(back);

  var badge = el("div", "progress-stage", tp.title);
  badge.style.cssText = "display:inline-block;margin-bottom:20px;";
  wrap.appendChild(badge);

  wrap.appendChild(el("h2", null, "정보를 입력해주세요"));
  var sub = el("p", null, "진단을 시작하기 위해 정보를 입력해주세요.");
  sub.style.cssText = "font-size:16px;color:#8B95A5;margin:10px 0 32px;line-height:1.6";
  wrap.appendChild(sub);

  var fieldBranch = el("div", "field");
  fieldBranch.innerHTML = "<label>지점명</label>";
  var inputBranch = el("input");
  inputBranch.type = "text";
  inputBranch.placeholder = "예) 한화지점";
  inputBranch.setAttribute("autocomplete", "off");
  inputBranch.setAttribute("name", "link-branch-" + Date.now());
  inputBranch.value = state.branch;
  inputBranch.addEventListener("input", function(e) { state.branch = e.target.value.trim(); });
  fieldBranch.appendChild(inputBranch);
  wrap.appendChild(fieldBranch);

  var fieldEmp = el("div", "field");
  fieldEmp.innerHTML = "<label>사번 (숫자 7자리)</label>";
  var inputEmp = el("input");
  inputEmp.type = "tel";
  inputEmp.placeholder = "예) 1234567";
  inputEmp.maxLength = 7;
  inputEmp.setAttribute("autocomplete", "off");
  inputEmp.setAttribute("name", "link-emp-" + Date.now());
  inputEmp.value = state.empId;
  inputEmp.addEventListener("input", function(e) { state.empId = e.target.value.replace(/\D/g, "").slice(0, 7); });
  fieldEmp.appendChild(inputEmp);
  wrap.appendChild(fieldEmp);

  var fieldName = el("div", "field");
  fieldName.innerHTML = "<label>이름</label>";
  var inputName = el("input");
  inputName.type = "text";
  inputName.setAttribute("autocomplete", "off");
  inputName.setAttribute("name", "link-name-" + Date.now());
  inputName.value = state.fpName;
  inputName.addEventListener("input", function(e) { state.fpName = e.target.value.trim(); });
  fieldName.appendChild(inputName);
  wrap.appendChild(fieldName);

  var errDiv = el("div", "error");
  errDiv.id = "input-error";
  if (state.error) errDiv.textContent = state.error;
  wrap.appendChild(errDiv);

  var btn = el("button", "btn-full", "다음 →");
  btn.style.marginTop = "28px";
  btn.addEventListener("click", function() {
    // 관리자 사번이면 지점명 무시하고 바로 관리자 검색 화면으로
    if (ADMIN_IDS.indexOf(state.empId) !== -1) {
      state.error = null;
      state.mode = "admin";
      gotoAdminSearch();
      return;
    }
    if (!state.branch) {
      state.error = "지점명을 입력하세요";
      document.getElementById("input-error").textContent = state.error;
      return;
    }
    if (!/^\d{7}$/.test(state.empId)) {
      state.error = "사번은 숫자 7자리로 입력하세요";
      document.getElementById("input-error").textContent = state.error;
      return;
    }
    if (!state.fpName) {
      state.error = "이름을 입력하세요";
      document.getElementById("input-error").textContent = state.error;
      return;
    }
    state.error = null;
    navigate("quiz");
  });
  wrap.appendChild(btn);

  return wrap;
}

// ─── (buildTimepoint 제거 — URL 파라미터 ?t=pre/post/followup 로 시점 결정) ───

// ─── Screen: Quiz ───────────────────────────────────────────

function buildQuiz() {
  var wrap = el("div", "screen");
  var step = state.step; // 0~7 (문항 하나씩)
  var q = QUESTIONS[step];
  var stgIdx = Math.floor(step / 2);
  var stg = STAGES[stgIdx];

  // Back button
  var back = el("button", "btn-back", "← 이전");
  back.addEventListener("click", function() {
    if (state.step > 0) {
      navigate("quiz", function() { state.step--; }, true);
    } else {
      navigate("input", null, true);
    }
  });
  wrap.appendChild(back);

  // Progress bar
  var pw = el("div", "progress-wrap");
  var pm = el("div", "progress-meta");
  pm.innerHTML = '<span class="progress-num">' + (step + 1) + ' / 8</span>';
  var badge = el("span", "progress-stage", stg.name + " · " + stg.label);
  badge.style.color = stg.color;
  badge.style.background = stg.color + "14";
  pm.appendChild(badge);
  pw.appendChild(pm);
  var pt = el("div", "progress-track");
  var pf = el("div", "progress-fill");
  pf.style.width = ((step + 1) / 8 * 100) + "%";
  pt.appendChild(pf);
  pw.appendChild(pt);
  wrap.appendChild(pw);

  // Step indicator dots (L I N K)
  var indicator = el("div", "step-indicator");
  for (var si = 0; si < 4; si++) {
    if (si > 0) {
      var line = el("div", "step-line" + (si <= stgIdx ? " done" : ""));
      indicator.appendChild(line);
    }
    var dot = el("div", "step-dot" + (si === stgIdx ? " active" : (si < stgIdx ? " done" : "")));
    indicator.appendChild(dot);
  }
  wrap.appendChild(indicator);

  // Question text
  var qText = el("div", "q-text", q.text);
  wrap.appendChild(qText);

  // 세로 선택지 (5개, 풀너비)
  var optList = el("div", "option-list");
  for (var v = 1; v <= 5; v++) {
    (function(val) {
      var btn = el("button", "option-btn" + (state.answers[step] === val ? " selected" : ""));
      var num = el("div", "option-num", String(val));
      btn.appendChild(num);
      btn.appendChild(document.createTextNode(SCALE_LABELS[val - 1]));
      btn.addEventListener("click", function() {
        state.answers[step] = val;
        // 선택 후 자동 진행 (짧은 딜레이)
        var allBtns = optList.querySelectorAll(".option-btn");
        for (var s = 0; s < allBtns.length; s++) allBtns[s].classList.remove("selected");
        btn.classList.add("selected");
        setTimeout(function() {
          if (step < 7) {
            navigate("quiz", function() { state.step++; });
          } else {
            // 마지막 문항
            if (state.timepoint === "pre") {
              submitResponse();
              navigate("result");
            } else {
              navigate("bonus");
            }
          }
        }, 250);
      });
      optList.appendChild(btn);
    })(v);
  }
  wrap.appendChild(optList);

  return wrap;
}

// ─── Screen: Bonus ──────────────────────────────────────────

function buildBonus() {
  var wrap = el("div", "screen");

  var back = el("button", "btn-back", "← 이전");
  back.addEventListener("click", function() {
    navigate("quiz", function() { state.step = 7; }, true);
  });
  wrap.appendChild(back);

  if (state.timepoint === "post") {
    // Post-education bonus
    var h = el("h2", null, "교육 피드백");
    wrap.appendChild(h);

    var sec1 = el("div", "bonus-section");
    var label1 = el("div", "q-text", "가장 도움된 단계는?");
    label1.style.fontSize = "18px";
    sec1.appendChild(label1);

    var opts = el("div", "option-list");
    STAGES.forEach(function(stg) {
      var btn = el("button", "option-btn" + (state.bonusStage === stg.id ? " selected" : ""));
      btn.innerHTML = '<span class="option-num" style="background:' + stg.color + ';color:#fff">' + stg.id + '</span>' + stg.name + " · " + stg.label;
      btn.addEventListener("click", function() {
        state.bonusStage = stg.id;
        var siblings = opts.querySelectorAll(".option-btn");
        for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove("selected");
        btn.classList.add("selected");
      });
      opts.appendChild(btn);
    });
    sec1.appendChild(opts);
    wrap.appendChild(sec1);

    var sec2 = el("div", "bonus-section");
    var label2 = el("div", "q-text", "오늘 교육에서 가장 인상 깊었던 것은?");
    label2.style.fontSize = "18px";
    sec2.appendChild(label2);

    var ta = el("textarea", "field");
    ta.placeholder = "자유롭게 적어주세요 (선택)";
    ta.style.cssText = "width:100%;padding:16px 18px;border:2px solid #E5E7EB;border-radius:12px;font-size:16px;font-family:inherit;min-height:100px;outline:none;resize:vertical;";
    ta.value = state.comment;
    ta.addEventListener("input", function(e) { state.comment = e.target.value; });
    sec2.appendChild(ta);
    wrap.appendChild(sec2);

  } else if (state.timepoint === "followup") {
    // Follow-up bonus
    var h = el("h2", null, "현장 적용 피드백");
    wrap.appendChild(h);

    var sec1 = el("div", "bonus-section");
    var label1 = el("div", "q-text", "현장에서 활용해본 것은?");
    label1.style.fontSize = "18px";
    sec1.appendChild(label1);

    var checkOpts = el("div", "option-list");
    BONUS_APPLIED_OPTIONS.forEach(function(opt) {
      var isChecked = state.bonusApplied.indexOf(opt.id) !== -1;
      var btn = el("button", "checkbox-btn" + (isChecked ? " checked" : ""), opt.label);
      btn.addEventListener("click", function() {
        var idx = state.bonusApplied.indexOf(opt.id);
        if (idx === -1) {
          state.bonusApplied.push(opt.id);
          btn.classList.add("checked");
        } else {
          state.bonusApplied.splice(idx, 1);
          btn.classList.remove("checked");
        }
      });
      checkOpts.appendChild(btn);
    });
    sec1.appendChild(checkOpts);
    wrap.appendChild(sec1);

    var sec2 = el("div", "bonus-section");
    var label2 = el("div", "q-text", "활용했을 때 고객 반응은?");
    label2.style.fontSize = "18px";
    sec2.appendChild(label2);

    var reactionOpts = el("div", "option-list");
    var reactions = ["긍정적", "보통", "별로"];
    reactions.forEach(function(r) {
      var btn = el("button", "option-btn" + (state.bonusReaction === r ? " selected" : ""), r);
      btn.addEventListener("click", function() {
        state.bonusReaction = r;
        var siblings = reactionOpts.querySelectorAll(".option-btn");
        for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove("selected");
        btn.classList.add("selected");
      });
      reactionOpts.appendChild(btn);
    });
    sec2.appendChild(reactionOpts);
    wrap.appendChild(sec2);

    var sec3 = el("div", "bonus-section");
    var label3 = el("div", "q-text", "현장에서 적용해보니 어땠나요?");
    label3.style.fontSize = "18px";
    sec3.appendChild(label3);

    var ta = el("textarea", "field");
    ta.placeholder = "자유롭게 적어주세요 (선택)";
    ta.style.cssText = "width:100%;padding:16px 18px;border:2px solid #E5E7EB;border-radius:12px;font-size:16px;font-family:inherit;min-height:100px;outline:none;resize:vertical;";
    ta.value = state.comment;
    ta.addEventListener("input", function(e) { state.comment = e.target.value; });
    sec3.appendChild(ta);
    wrap.appendChild(sec3);
  }

  var spacer = el("div");
  spacer.style.flex = "1";
  spacer.style.minHeight = "24px";
  wrap.appendChild(spacer);

  var completeBtn = el("button", "btn-full", "완료");
  completeBtn.addEventListener("click", function() {
    submitResponse();
    navigate("result");
  });
  wrap.appendChild(completeBtn);

  return wrap;
}

// ─── Submit Response ────────────────────────────────────────

function submitResponse() {
  var data = {
    action: "submit",
    branch: state.branch,
    empId: state.empId,
    name: state.fpName,
    timepoint: state.timepoint,
    answers: state.answers.slice(),
    bonusStage: state.bonusStage,
    bonusApplied: state.bonusApplied.slice(),
    bonusReaction: state.bonusReaction,
    comment: state.comment,
    timestamp: new Date().toISOString(),
  };
  postData(data);
}

// ─── Screen: Result ─────────────────────────────────────────

function buildResult() {
  var wrap = el("div", "screen");
  var tp = TIMEPOINTS[state.timepoint] || TIMEPOINTS.pre;
  var resultTitle = RESULT_TITLES[state.timepoint] || RESULT_TITLES.pre;

  var header = el("div", "result-header");
  var eyebrow = el("div", "result-eyebrow", "LINK 진단 결과");
  header.appendChild(eyebrow);
  var h2 = el("h2", null, resultTitle);
  header.appendChild(h2);
  wrap.appendChild(header);

  // Radar chart
  var chartCard = el("div", "chart-card");
  var chartContainer = el("div", "chart-container");
  var canvas = el("canvas");
  canvas.id = "result-radar";
  chartContainer.appendChild(canvas);
  chartCard.appendChild(chartContainer);
  wrap.appendChild(chartCard);

  // Weakest stage (동점 처리)
  var result = getWeakestStage(state.answers);
  var wStage = stageInfo(result.primary);
  var msg = RESULT_MESSAGES[result.primary];

  var card = el("div", "result-card");
  card.style.borderTop = "4px solid " + wStage.color;

  // 주 결과 뱃지
  var badge = el("div", "result-stage-badge");
  badge.style.background = wStage.color;
  badge.textContent = wStage.name + " · " + wStage.label;
  card.appendChild(badge);

  var msgDiv = el("div", "result-msg", msg.replace(/\n/g, "<br>"));
  card.appendChild(msgDiv);

  // 동점인 단계가 2개 이상이면 안내
  if (result.tied.length > 1) {
    var tiedNames = result.tied.map(function(id) { return stageInfo(id).name; }).join(", ");
    var tiedMsg = el("p", "result-sub",
      tiedNames + " 모두 보완이 필요합니다.<br>" +
      "LINK 프로세스 순서에 따라<br><strong>" + wStage.name + "</strong>부터 집중해보세요.");
    card.appendChild(tiedMsg);
  }

  wrap.appendChild(card);

  // Stage summary boxes
  var summary = el("div", "stage-summary");
  var sumTitle = el("div", "summary-title", "단계별 체감 점수");
  summary.appendChild(sumTitle);

  var boxes = el("div", "stage-boxes");
  var avgs = getStageAvgs(state.answers);
  STAGES.forEach(function(stg) {
    var isPrimary = stg.id === result.primary;
    var isTied = result.tied.indexOf(stg.id) >= 0;
    var box = el("div", "stage-box");
    var circle = el("div", "stage-circle" + (isPrimary ? " main" : ""));
    circle.style.background = isPrimary ? stg.color : (isTied ? stg.color + "40" : stg.color + "15");
    var circleLabel = el("span");
    circleLabel.textContent = avgs[stg.id].toFixed(1);
    circleLabel.style.color = isPrimary ? "#fff" : stg.color;
    circle.appendChild(circleLabel);
    box.appendChild(circle);

    var label = el("div", "stage-label");
    label.style.color = stg.color;
    label.textContent = stg.name;
    if (isPrimary) label.textContent += " ★";
    box.appendChild(label);
    boxes.appendChild(box);
  });
  summary.appendChild(boxes);
  wrap.appendChild(summary);

  // Retry button
  var btn = el("button", "btn-secondary", "다시 진단하기");
  btn.addEventListener("click", function() {
    state.answers = new Array(8).fill(0);
    state.step = 0;
    state.bonusStage = "";
    state.bonusApplied = [];
    state.bonusReaction = "";
    state.comment = "";
    state.empId = "";
    state.branch = "";
    state.error = null;
    navigate("cover", null, true);
  });
  wrap.appendChild(btn);

  return wrap;
}

// ─── Screen: Admin Login ────────────────────────────────────

function buildAdminLogin() {
  var wrap = el("div", "screen center");

  var h = el("h1", null, "관리자 로그인");
  wrap.appendChild(h);

  var sub = el("p", "sub", "관리자 사번을 입력하세요");
  wrap.appendChild(sub);

  var field = el("div", "field");
  field.innerHTML = '<label>사번</label>';
  var input = el("input");
  input.type = "tel";
  input.placeholder = "사번을 입력하세요";
  input.value = state.empId;
  input.addEventListener("input", function(e) { state.empId = e.target.value.trim(); });
  field.appendChild(input);
  wrap.appendChild(field);

  var errDiv = el("div", "error");
  errDiv.id = "admin-error";
  if (state.error) errDiv.textContent = state.error;
  wrap.appendChild(errDiv);

  var btn = el("button", "btn-full", "로그인");
  btn.addEventListener("click", function() {
    if (ADMIN_IDS.indexOf(state.empId) === -1) {
      state.error = "관리자 권한이 없는 사번입니다";
      document.getElementById("admin-error").textContent = state.error;
      return;
    }
    gotoAdminSearch();
  });
  wrap.appendChild(btn);

  return wrap;
}

function gotoAdminSearch() {
  state.error = null;
  state.adminData = null;
  state.loading = true;
  navigate("adminBranchSearch");
  fetchAdminData();
}

// ─── Screen: Admin Branch Search ────────────────────────────

function buildAdminBranchSearch() {
  var wrap = el("div", "screen");

  // 상단: 로그아웃(처음으로) + 전체보기 토글
  var topbar = el("div", "search-topbar");
  var logout = el("button", "btn-back", "← 처음으로");
  logout.addEventListener("click", function() {
    state.mode = "fp";
    state.empId = "";
    state.branch = "";
    state.adminData = null;
    state.timepoint = "pre";
    navigate("cover", null, true);
  });
  topbar.appendChild(logout);

  var allBtn = el("button", "btn-mini", "전체 통계 →");
  allBtn.addEventListener("click", function() {
    state.adminTab = "overview";
    navigate("admin");
  });
  topbar.appendChild(allBtn);
  wrap.appendChild(topbar);

  // Header
  var header = el("div", "report-header");
  header.innerHTML = '<div class="report-eyebrow">LINK 관리자</div>'
    + '<div class="report-title">지점 검색</div>';
  wrap.appendChild(header);

  if (state.loading) {
    var lw = el("div", "loading-wrap");
    lw.innerHTML = '<div class="spinner"></div><div class="loading-text">데이터 불러오는 중...</div>';
    wrap.appendChild(lw);
    return wrap;
  }

  if (state.error) {
    var eb = el("div", "error-banner", "데이터 로드 실패: " + state.error);
    wrap.appendChild(eb);
  }

  var data = state.adminData || { responses: [] };
  var responses = data.responses || [];

  // 지점별 그룹화 (정규화된 키로 합치기)
  var branchMap = {};
  responses.forEach(function(r) {
    if (!r.branch) return;
    var key = normalizeBranch(r.branch);
    if (!branchMap[key]) {
      branchMap[key] = { key: key, originals: {}, fps: {}, pre: 0, post: 0, followup: 0 };
    }
    branchMap[key].originals[r.branch] = true;
    branchMap[key].fps[r.empId] = true;
    if (r.timepoint === "pre") branchMap[key].pre++;
    else if (r.timepoint === "post") branchMap[key].post++;
    else if (r.timepoint === "followup") branchMap[key].followup++;
  });
  var allBranches = Object.keys(branchMap).map(function(k) {
    var b = branchMap[k];
    var originals = Object.keys(b.originals);
    return {
      name: pickBranchDisplayName(originals),
      key: k,
      originals: originals,
      fpCount: Object.keys(b.fps).length,
      raw: b
    };
  }).sort(function(a, b) { return b.fpCount - a.fpCount; });

  // 검색 입력
  var searchBox = el("div", "search-box");
  var input = el("input", "search-input");
  input.type = "text";
  input.placeholder = "지점명을 입력하세요 (예: 한화)";
  input.value = state._adminSearch || "";
  input.autofocus = true;
  searchBox.appendChild(input);
  wrap.appendChild(searchBox);

  // 결과 리스트
  var listWrap = el("div", "search-list");
  wrap.appendChild(listWrap);

  function renderList() {
    listWrap.innerHTML = "";
    var q = (input.value || "").trim().toLowerCase();
    state._adminSearch = input.value;

    var filtered = q
      ? allBranches.filter(function(b) { return b.name.toLowerCase().indexOf(q) >= 0; })
      : allBranches;

    if (allBranches.length === 0) {
      var empty = el("div", "search-empty", "응답 데이터가 없습니다");
      listWrap.appendChild(empty);
      return;
    }

    if (filtered.length === 0) {
      var noResult = el("div", "search-empty", '"' + input.value + '"에 해당하는 지점이 없습니다');
      listWrap.appendChild(noResult);
      return;
    }

    if (!q) {
      var head = el("div", "search-list-head", "전체 지점 (" + allBranches.length + "개)");
      listWrap.appendChild(head);
    }

    filtered.forEach(function(b) {
      var item = el("div", "search-item");
      var name = el("div", "search-item-name");
      // 검색어 하이라이트
      if (q) {
        var i = b.name.toLowerCase().indexOf(q);
        name.innerHTML = b.name.substring(0, i)
          + '<mark>' + b.name.substring(i, i + q.length) + '</mark>'
          + b.name.substring(i + q.length);
      } else {
        name.textContent = b.name;
      }
      var meta = el("div", "search-item-meta");
      meta.innerHTML = 'FP <b>' + b.fpCount + '명</b> · 교육 전 ' + b.raw.pre + ' / 직후 ' + b.raw.post + ' / 추후 ' + b.raw.followup;
      item.appendChild(name);
      item.appendChild(meta);
      item.addEventListener("click", function() {
        state.adminBranch = { name: b.name, key: b.key, originals: b.originals };
        navigate("adminBranchDetail");
      });
      listWrap.appendChild(item);
    });
  }

  input.addEventListener("input", renderList);
  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      var q = (input.value || "").trim().toLowerCase();
      var filtered = allBranches.filter(function(b) { return b.name.toLowerCase().indexOf(q) >= 0; });
      if (filtered.length > 0) {
        var f0 = filtered[0];
        state.adminBranch = { name: f0.name, key: f0.key, originals: f0.originals };
        navigate("adminBranchDetail");
      }
    }
  });

  renderList();
  return wrap;
}

// ─── Fetch Admin Data ───────────────────────────────────────

function fetchAdminData() {
  // export 엔드포인트로 raw responses 받아와서 클라이언트에서 집계
  jsonpFetch("export", null, function(data) {
    state.loading = false;
    if (data && data.data) {
      var rows = data.data || [];
      var responses = rows.map(function(r) {
        return {
          timestamp: r.timestamp,
          empId: String(r.empId),
          branch: r.branch,
          name: r.name || "",
          timepoint: r.timepoint,
          answers: [
            Number(r.Q1) || 0, Number(r.Q2) || 0, Number(r.Q3) || 0, Number(r.Q4) || 0,
            Number(r.Q5) || 0, Number(r.Q6) || 0, Number(r.Q7) || 0, Number(r.Q8) || 0
          ],
          bonusStage: r.bonusStage || "",
          bonusApplied: r.bonusApplied ? String(r.bonusApplied).split("|").filter(Boolean) : [],
          bonusReaction: r.bonusReaction || "",
          comment: r.comment || "",
          grade: r.grade || "",
          tenure: r.tenure || "",
          channel: r.channel || ""
        };
      });
      // 중복 제거: (empId + timepoint) 조합별로 timestamp 가장 최신 1건만 사용
      responses = dedupeLatestPerEmpTimepoint(responses);
      state.adminData = { responses: responses, master: [], branches: [] };
    } else {
      state.adminData = { responses: [], master: [], branches: [] };
      state.error = data ? data.error : "데이터 로드 실패";
    }
    render();
  });
}

// (empId, timepoint) 조합별로 timestamp 가장 최신 응답 1건만 남김
function dedupeLatestPerEmpTimepoint(responses) {
  var latest = {};
  responses.forEach(function(r) {
    var key = r.empId + "|" + r.timepoint;
    var t = new Date(r.timestamp).getTime() || 0;
    if (!latest[key] || t > latest[key]._t) {
      r._t = t;
      latest[key] = r;
    }
  });
  return Object.keys(latest).map(function(k) {
    var r = latest[k];
    delete r._t;
    return r;
  });
}

// ─── Screen: Admin ──────────────────────────────────────────

function buildAdmin() {
  var wrap = el("div", "screen");

  var back = el("button", "btn-back", "← 지점 검색");
  back.addEventListener("click", function() {
    gotoAdminSearch();
  });
  wrap.appendChild(back);

  // Header
  var header = el("div", "admin-header");
  var left = el("div");
  left.innerHTML = '<h2>ADMIN</h2><div style="font-size:14px;color:#8B95A5;margin-top:4px">진단 현황 대시보드</div>';

  var right = el("div");
  var total = state.adminData && state.adminData.responses ? state.adminData.responses.length : 0;
  right.innerHTML = '<div class="admin-total">' + total + '</div><div class="admin-total-label">전체 응답</div>';
  right.style.textAlign = "right";

  header.appendChild(left);
  header.appendChild(right);
  wrap.appendChild(header);

  // Tab bar
  var tabs = el("div", "tab-bar");
  var tabList = [
    { id: "overview", label: "전체현황" },
    { id: "branch", label: "지점별" },
    { id: "group", label: "그룹분석" },
    { id: "data", label: "데이터관리" },
  ];
  tabList.forEach(function(t) {
    var tab = el("button", "tab-item" + (state.adminTab === t.id ? " active" : ""), t.label);
    tab.addEventListener("click", function() {
      state.adminTab = t.id;
      render();
    });
    tabs.appendChild(tab);
  });
  wrap.appendChild(tabs);

  // Loading
  if (state.loading) {
    var lw = el("div", "loading-wrap");
    lw.innerHTML = '<div class="spinner"></div><div class="loading-text">데이터 불러오는 중...</div>';
    wrap.appendChild(lw);
    return wrap;
  }

  // Error
  if (state.error) {
    var eb = el("div", "error-banner", state.error);
    wrap.appendChild(eb);
  }

  // Tab content
  switch (state.adminTab) {
    case "overview": buildAdminOverview(wrap); break;
    case "branch": buildAdminBranch(wrap); break;
    case "group": buildAdminGroup(wrap); break;
    case "data": buildAdminData(wrap); break;
  }

  return wrap;
}

// ─── Admin: Overview ────────────────────────────────────────

function buildAdminOverview(wrap) {
  var data = state.adminData || { responses: [] };
  var responses = data.responses || [];

  // 고유 FP / 시점별 카운트
  var fpSet = {};
  var preFpSet = {}, postFpSet = {}, fuFpSet = {};
  responses.forEach(function(r) {
    fpSet[r.empId] = true;
    if (r.timepoint === "pre") preFpSet[r.empId] = true;
    else if (r.timepoint === "post") postFpSet[r.empId] = true;
    else if (r.timepoint === "followup") fuFpSet[r.empId] = true;
  });
  var totalFPs = Object.keys(fpSet).length;
  var preCnt = Object.keys(preFpSet).length;
  var postCnt = Object.keys(postFpSet).length;
  var fuCnt = Object.keys(fuFpSet).length;

  // 지점 수 (정규화 기준)
  var branchKeys = {};
  responses.forEach(function(r) { if (r.branch) branchKeys[normalizeBranch(r.branch)] = true; });
  var branchCount = Object.keys(branchKeys).length;

  // 참여 현황 카드
  var partCard = el("div", "chart-card");
  partCard.appendChild(el("div", "section-title", "전체 참여 현황"));
  var stats = el("div", "stat-grid");
  [
    { num: branchCount, label: "참여 지점", color: "#1C2B5E" },
    { num: totalFPs,   label: "전체 FP",   color: "#1C2B5E" },
    { num: preCnt,     label: "교육 전",    color: "#3B5BDB" },
    { num: postCnt,    label: "교육 직후",  color: "#0CA678" },
  ].forEach(function(s) {
    var box = el("div", "stat-box");
    var n = el("div", "stat-num", String(s.num));
    n.style.color = s.color;
    box.appendChild(n);
    box.appendChild(el("div", "stat-label", s.label));
    stats.appendChild(box);
  });
  partCard.appendChild(stats);
  // 추가: 진행률 바
  var prog = el("div");
  prog.style.marginTop = "20px";
  [
    { label: "교육 전",  count: preCnt,  color: "#3B5BDB" },
    { label: "직후",     count: postCnt, color: "#0CA678" },
    { label: "3~4주 후", count: fuCnt,   color: "#E8470A" },
  ].forEach(function(p) {
    var pct = totalFPs > 0 ? Math.round(p.count / totalFPs * 100) : 0;
    var row = el("div", "bar-row");
    var meta = el("div", "bar-meta");
    meta.innerHTML = '<span class="bar-label">' + p.label + '</span>'
      + '<span class="bar-count" style="color:' + p.color + ';font-weight:700">' + pct + '%</span>';
    row.appendChild(meta);
    var track = el("div", "bar-track");
    var fill = el("div", "bar-fill");
    fill.style.cssText = "width:" + pct + "%;background:" + p.color;
    track.appendChild(fill);
    row.appendChild(track);
    prog.appendChild(row);
  });
  partCard.appendChild(prog);
  wrap.appendChild(partCard);

  // 점수 범례
  var legendCard = el("div", "chart-card");
  legendCard.appendChild(buildScaleLegend());
  wrap.appendChild(legendCard);

  // 단계별 막대그래프 (시점 비교)
  var chartCard = el("div", "chart-card");
  chartCard.appendChild(el("div", "section-title", "전체 단계별 난이도 변화"));
  var container = el("div", "chart-container");
  container.style.cssText = "position:relative;height:280px;";
  var canvas = el("canvas");
  canvas.id = "admin-radar";
  container.appendChild(canvas);
  chartCard.appendChild(container);
  wrap.appendChild(chartCard);

  // Bonus stats
  var postResponses = responses.filter(function(r) { return r.timepoint === "post" && r.bonusStage; });
  if (postResponses.length > 0) {
    var bonusCard = el("div", "chart-card");
    bonusCard.innerHTML = '<div class="chart-title">가장 도움된 단계</div>';
    var bonusContainer = el("div", "chart-container");
    var bonusCanvas = el("canvas");
    bonusCanvas.id = "admin-bonus-doughnut";
    bonusContainer.appendChild(bonusCanvas);
    bonusCard.appendChild(bonusContainer);
    wrap.appendChild(bonusCard);
  }

  var fuResponses = responses.filter(function(r) { return r.timepoint === "followup" && r.bonusApplied && r.bonusApplied.length > 0; });
  if (fuResponses.length > 0) {
    var appliedCard = el("div", "chart-card");
    appliedCard.innerHTML = '<div class="chart-title">현장 활용 항목</div>';
    var appliedContainer = el("div", "chart-container");
    var appliedCanvas = el("canvas");
    appliedCanvas.id = "admin-applied-bar";
    appliedContainer.appendChild(appliedCanvas);
    appliedCard.appendChild(appliedContainer);
    wrap.appendChild(appliedCard);
  }
}

// ─── Admin: Branch ──────────────────────────────────────────

function buildAdminBranch(wrap) {
  var data = state.adminData || { responses: [] };
  var responses = data.responses || [];

  // Group by branch
  var branchMap = {};
  responses.forEach(function(r) {
    if (!r.branch) return;
    if (!branchMap[r.branch]) branchMap[r.branch] = { name: r.branch, fps: {}, pre: [], post: [], followup: [] };
    branchMap[r.branch].fps[r.empId] = true;
    if (r.timepoint === "pre") branchMap[r.branch].pre.push(r);
    else if (r.timepoint === "post") branchMap[r.branch].post.push(r);
    else if (r.timepoint === "followup") branchMap[r.branch].followup.push(r);
  });

  var table = el("table", "data-table");
  table.innerHTML = '<thead><tr><th>지점명</th><th>FP수</th><th>교육전</th><th>직후</th><th>추후</th></tr></thead>';
  var tbody = el("tbody");

  Object.keys(branchMap).forEach(function(bName) {
    var b = branchMap[bName];
    var tr = el("tr");
    tr.style.cursor = "pointer";
    tr.innerHTML = '<td>' + bName + '</td><td>' + Object.keys(b.fps).length + '</td><td>' + b.pre.length + '</td><td>' + b.post.length + '</td><td>' + b.followup.length + '</td>';
    tr.addEventListener("click", function() {
      state.adminBranch = b;
      navigate("adminBranchDetail");
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);

  if (Object.keys(branchMap).length === 0) {
    var empty = el("div", "loading-wrap");
    empty.innerHTML = '<div class="loading-text">응답 데이터가 없습니다</div>';
    wrap.appendChild(empty);
  }
}

// ─── Screen: Admin Branch Detail ────────────────────────────

// 지점명 정규화: 한양/한양지점/한양SFP → 같은 그룹으로 인식
function normalizeBranch(name) {
  if (!name) return "";
  return String(name)
    .replace(/\s+/g, "")           // 공백 제거
    .replace(/(SFP지점|SFP|sfp|지점|동|점)$/i, "") // 끝의 SFP지점/SFP/지점/동/점 제거
    .toLowerCase();
}

// 그룹의 대표 표시명: SFP 접미사가 하나라도 있으면 "○○SFP", 아니면 "○○지점"
function pickBranchDisplayName(names) {
  // 정규화 후 base 추출
  var base = null;
  var hasSfp = false;
  names.forEach(function(n) {
    var clean = String(n).replace(/\s+/g, "");
    if (/sfp/i.test(clean)) hasSfp = true;
    var b = clean.replace(/(SFP지점|SFP|sfp|지점|동|점)$/i, "");
    if (!base || b.length > base.length) base = b;
  });
  return base + (hasSfp ? "SFP지점" : "지점");
}

function difficultyLabel(score) {
  if (score >= 4.5) return { label: "매우어려움", color: "#C92A2A" };
  if (score >= 3.5) return { label: "어려움",     color: "#E8470A" };
  if (score >= 2.5) return { label: "보통",       color: "#FAB005" };
  if (score >= 1.5) return { label: "수월",       color: "#0CA678" };
  return                  { label: "매우수월",    color: "#0CA678" };
}

function avgStageScore(fps, tp) {
  var sums = { L: 0, I: 0, N: 0, K: 0 };
  var cnt = 0;
  fps.forEach(function(f) {
    var r = f[tp];
    if (!r || !r.answers) return;
    var s = getStageAvgs(r.answers);
    sums.L += s.L; sums.I += s.I; sums.N += s.N; sums.K += s.K;
    cnt++;
  });
  if (cnt === 0) return null;
  return { L: sums.L / cnt, I: sums.I / cnt, N: sums.N / cnt, K: sums.K / cnt, count: cnt };
}

function totalAvg(s) { return (s.L + s.I + s.N + s.K) / 4; }

function buildAdminBranchDetail() {
  var wrap = el("div", "screen");
  var b = state.adminBranch;
  var data = state.adminData || { responses: [] };
  var bKey = b.key || normalizeBranch(b.name);
  var allResp = (data.responses || []).filter(function(r) { return normalizeBranch(r.branch) === bKey; });

  // Group by FP
  var fpMap = {};
  allResp.forEach(function(r) {
    if (!fpMap[r.empId]) fpMap[r.empId] = { empId: r.empId, name: r.name || r.empId, pre: null, post: null, followup: null };
    fpMap[r.empId][r.timepoint] = r;
    if (r.name) fpMap[r.empId].name = r.name;
  });
  var fps = Object.keys(fpMap).map(function(k) { return fpMap[k]; });
  var totalFPs = fps.length;
  var preCnt  = fps.filter(function(f) { return f.pre;      }).length;
  var postCnt = fps.filter(function(f) { return f.post;     }).length;
  var fuCnt   = fps.filter(function(f) { return f.followup; }).length;

  // Back
  var back = el("button", "btn-back", "← 지점 검색");
  back.addEventListener("click", function() {
    gotoAdminSearch();
  });
  wrap.appendChild(back);

  // Report header
  var header = el("div", "report-header");
  header.innerHTML = '<div class="report-eyebrow">LINK 교육 효과 분석</div>'
    + '<div class="report-title">' + b.name + ' 종합 리포트</div>';
  wrap.appendChild(header);

  // ── 참여 현황 ────────────────────────────────────────
  var partCard = el("div", "chart-card");
  partCard.appendChild(el("div", "section-title", "참여 현황"));
  var stats = el("div", "stat-grid");
  [
    { num: totalFPs, label: "전체 FP", color: "#1C2B5E" },
    { num: preCnt,   label: "교육 전",  color: "#3B5BDB" },
    { num: postCnt,  label: "교육 직후", color: "#0CA678" },
    { num: fuCnt,    label: "3~4주 후", color: "#E8470A" },
  ].forEach(function(s) {
    var box = el("div", "stat-box");
    var n = el("div", "stat-num", String(s.num));
    n.style.color = s.color;
    box.appendChild(n);
    box.appendChild(el("div", "stat-label", s.label));
    stats.appendChild(box);
  });
  partCard.appendChild(stats);

  var prog = el("div");
  prog.style.marginTop = "20px";
  [
    { label: "교육 전",  count: preCnt,  color: "#3B5BDB" },
    { label: "직후",     count: postCnt, color: "#0CA678" },
    { label: "3~4주 후", count: fuCnt,   color: "#E8470A" },
  ].forEach(function(p) {
    var pct = totalFPs > 0 ? Math.round(p.count / totalFPs * 100) : 0;
    var row = el("div", "bar-row");
    var meta = el("div", "bar-meta");
    meta.innerHTML = '<span class="bar-label">' + p.label + '</span>'
      + '<span class="bar-count" style="color:' + p.color + ';font-weight:700">' + pct + '%</span>';
    row.appendChild(meta);
    var track = el("div", "bar-track");
    var fill = el("div", "bar-fill");
    fill.style.cssText = "width:" + pct + "%;background:" + p.color;
    track.appendChild(fill);
    row.appendChild(track);
    prog.appendChild(row);
  });
  partCard.appendChild(prog);
  wrap.appendChild(partCard);

  // ── 지점 단계별 역량 변화 (Bar) ────────────────────
  var barCard = el("div", "chart-card");
  barCard.appendChild(el("div", "section-title", "지점 단계별 난이도 변화"));
  var bContainer = el("div", "chart-container");
  bContainer.style.cssText = "position:relative;height:280px;";
  var bCanvas = el("canvas");
  bCanvas.id = "branch-bar";
  bContainer.appendChild(bCanvas);
  barCard.appendChild(bContainer);
  wrap.appendChild(barCard);

  // ── 전체 평균 계산 (지점 비교용) ─────────────────────
  var allData = state.adminData || { responses: [] };
  var allPreResp = (allData.responses || []).filter(function(r) { return r.timepoint === "pre"; });
  var allAvgs = null;
  if (allPreResp.length > 0) {
    var allSums = { L: 0, I: 0, N: 0, K: 0 }, allCnt = 0;
    // FP별로 묶어서 평균
    var allFpMap = {};
    allPreResp.forEach(function(r) {
      if (!allFpMap[r.empId]) allFpMap[r.empId] = r;
    });
    Object.keys(allFpMap).forEach(function(eid) {
      var r = allFpMap[eid];
      var s = getStageAvgs(r.answers);
      allSums.L += s.L; allSums.I += s.I; allSums.N += s.N; allSums.K += s.K;
      allCnt++;
    });
    if (allCnt > 0) allAvgs = { L: allSums.L / allCnt, I: allSums.I / allCnt, N: allSums.N / allCnt, K: allSums.K / allCnt };
  }

  // ── 1차 진단 결과 ────────────────────────────────────
  var preFps = fps.filter(function(f) { return f.pre; });
  if (preFps.length > 0) wrap.appendChild(buildPreReport(b, preFps, allAvgs));

  // ── 2차 진단 결과 ────────────────────────────────────
  var bothFps = fps.filter(function(f) { return f.pre && f.post; });
  if (bothFps.length > 0) wrap.appendChild(buildPostReport(bothFps));

  // ── 3차 진단 결과 ────────────────────────────────────
  var allFps = fps.filter(function(f) { return f.pre && f.post && f.followup; });
  if (allFps.length > 0) wrap.appendChild(buildFollowupReport(allFps));

  // ── FP 그룹 분류 ─────────────────────────────────────
  if (allFps.length > 0) wrap.appendChild(buildFpGroups(allFps));

  // ── FP 개별 목록 ─────────────────────────────────────
  var listCard = el("div", "chart-card");
  listCard.appendChild(el("div", "section-title", "개별 FP"));
  var table = el("table", "data-table");
  table.innerHTML = '<thead><tr><th>이름</th><th>사번</th><th>진행</th></tr></thead>';
  var tbody = el("tbody");
  fps.forEach(function(fp) {
    var tr = el("tr");
    tr.style.cursor = "pointer";
    var dots = (fp.pre ? "●" : "○") + " " + (fp.post ? "●" : "○") + " " + (fp.followup ? "●" : "○");
    var displayName = fp.name && fp.name !== fp.empId ? fp.name : '(이름 미입력)';
    tr.innerHTML = '<td><b>' + displayName + '</b></td><td style="color:#9CA3AF">' + fp.empId + '</td><td class="fp-dots">' + dots + '</td>';
    tr.addEventListener("click", function() {
      state.adminFP = { empId: fp.empId, name: fp.name, branch: b.name };
      fetchFPDetail(fp.empId, function() {
        navigate("adminFPDetail");
      });
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listCard.appendChild(table);
  wrap.appendChild(listCard);

  return wrap;
}

// ─── Branch Report Sub-sections ─────────────────────────────

function buildScaleLegend() {
  var legend = el("div", "scale-legend");
  legend.innerHTML = '<div class="scale-legend-title">FP가 느끼는 난이도</div>'
    + '<div class="scale-legend-bar">'
    +   '<span class="scale-num" style="color:#0CA678">1</span>'
    +   '<span class="scale-label">쉬움</span>'
    +   '<div class="scale-gradient"></div>'
    +   '<span class="scale-label">어려움</span>'
    +   '<span class="scale-num" style="color:#C92A2A">5</span>'
    + '</div>'
    + '<div class="scale-legend-hint">점수가 <b>높을수록</b> 어렵게 느낀다는 뜻입니다</div>';
  return legend;
}

function buildPreReport(b, preFps, allAvgs) {
  var card = el("div", "chart-card report-section");
  var head = el("div", "report-step-head");
  head.innerHTML = '<span class="step-num" style="background:#3B5BDB">1</span>'
    + '<span class="step-title">1차 진단 결과</span>'
    + '<span class="step-tag" style="background:#3B5BDB14;color:#3B5BDB">교육 전</span>';
  card.appendChild(head);

  var avgs = avgStageScore(preFps, "pre");
  var hardestStg = STAGES.reduce(function(best, s) { return avgs[s.id] > avgs[best.id] ? s : best; });
  var easiestStg = STAGES.reduce(function(best, s) { return avgs[s.id] < avgs[best.id] ? s : best; });

  // 어렵다(4~5점) 데이터 준비
  var hardCount = { L: 0, I: 0, N: 0, K: 0 };
  var hardTotal = { L: 0, I: 0, N: 0, K: 0 };
  var hardFpNames = { L: [], I: [], N: [], K: [] };
  preFps.forEach(function(f) {
    var sa = getStageAvgs(f.pre.answers);
    STAGES.forEach(function(stg) {
      hardTotal[stg.id]++;
      if (sa[stg.id] >= 4) {
        hardCount[stg.id]++;
        hardFpNames[stg.id].push(f.name || f.empId);
      }
    });
  });

  // 최약점 데이터 준비
  var weakCount = { L: 0, I: 0, N: 0, K: 0 };
  preFps.forEach(function(f) {
    var w = getWeakestStage(f.pre.answers);
    weakCount[w.primary]++;
  });
  var topWeakStg = STAGES.reduce(function(best, s) { return weakCount[s.id] > weakCount[best.id] ? s : best; });

  // ════════════════════════════════════════════════════
  // ① 우리 지점 진단 — 한 줄 핵심
  // ════════════════════════════════════════════════════
  var diagBox = el("div", "insight-box");
  var diagHtml = '<div class="insight-title">우리 지점 진단</div>'
    + '<div class="insight-line" style="font-size:20px;line-height:1.6">'
    +   '우리 지점은 <span style="color:' + hardestStg.color + ';font-weight:800;font-size:24px">'
    +     hardestStg.id + '(' + hardestStg.label + ') 단계</span>를 가장 어려워합니다.'
    + '</div>';
  if (allAvgs) {
    var THRESHOLD = 0.3;
    var highStgs = [];
    var lowStgs = [];
    STAGES.forEach(function(stg) {
      var diff = avgs[stg.id] - allAvgs[stg.id];
      if (diff >= THRESHOLD) highStgs.push({ stg: stg, diff: diff });
      if (diff <= -THRESHOLD) lowStgs.push({ stg: stg, diff: Math.abs(diff) });
    });
    if (highStgs.length > 0) {
      highStgs.sort(function(a, b) { return b.diff - a.diff; });
      diagHtml += '<div class="insight-line">'
        + '전체 평균보다 특히 어려워하는 단계: '
        + highStgs.map(function(h) {
          return '<b style="color:' + h.stg.color + '">' + h.stg.id + '(' + h.stg.label + ')</b> +' + h.diff.toFixed(1);
        }).join(', ')
        + '</div>';
    }
    if (lowStgs.length > 0) {
      lowStgs.sort(function(a, b) { return b.diff - a.diff; });
      diagHtml += '<div class="insight-line">'
        + '전체 평균보다 자신있는 단계: '
        + lowStgs.map(function(l) {
          return '<b style="color:' + l.stg.color + '">' + l.stg.id + '(' + l.stg.label + ')</b> -' + l.diff.toFixed(1);
        }).join(', ')
        + '</div>';
    }
  }
  diagBox.innerHTML = diagHtml;
  card.appendChild(diagBox);

  // ════════════════════════════════════════════════════
  // ② 단계별 난이도 — 해석 → 도표
  // ════════════════════════════════════════════════════
  card.appendChild(buildScaleLegend());

  // 해석 먼저
  var avgInterpret = el("div", "report-note");
  avgInterpret.innerHTML = preFps.length + '명의 FP가 각 단계를 얼마나 어렵게 느끼는지 평균 점수입니다. '
    + '<b style="color:' + hardestStg.color + '">' + hardestStg.id + '(' + hardestStg.label + ')</b>가 '
    + '<b>' + avgs[hardestStg.id].toFixed(1) + '점</b>으로 가장 높고, '
    + '<b style="color:' + easiestStg.color + '">' + easiestStg.id + '(' + easiestStg.label + ')</b>가 '
    + '<b>' + avgs[easiestStg.id].toFixed(1) + '점</b>으로 가장 낮습니다.';
  card.appendChild(avgInterpret);

  card.appendChild(el("div", "subsection-title", "단계별 난이도 (지점 평균)"));
  STAGES.forEach(function(stg) {
    var score = avgs[stg.id];
    var diff = difficultyLabel(score);
    var row = el("div", "score-row");
    var meta = el("div", "score-meta");
    meta.innerHTML = '<span class="score-label" style="color:' + stg.color + '">' + stg.id + ' ' + stg.label + '</span>'
      + '<span class="score-value-wrap">'
      +   '<span class="score-num" style="color:' + diff.color + '">' + score.toFixed(1) + '</span>'
      +   '<span class="score-tag" style="color:' + diff.color + '">' + diff.label + '</span>'
      + '</span>';
    row.appendChild(meta);
    var track = el("div", "score-track");
    var fill = el("div", "score-fill");
    var barPct = Math.max(0, Math.min(100, (score - 2) / 2 * 100));
    fill.style.cssText = "width:" + barPct + "%;background:" + diff.color;
    track.appendChild(fill);
    row.appendChild(track);
    card.appendChild(row);
  });

  // ════════════════════════════════════════════════════
  // ③ 코칭 우선순위 — 해석 → 도표 → FP 이름
  // ════════════════════════════════════════════════════
  var coachPriority = STAGES.map(function(stg) {
    var hc = hardCount[stg.id];
    var pct = hardTotal[stg.id] > 0 ? Math.round(hc / hardTotal[stg.id] * 100) : 0;
    return { stg: stg, count: hc, pct: pct, fpNames: hardFpNames[stg.id] };
  }).sort(function(a, b) { return b.count - a.count; });

  var topCoach = coachPriority[0];

  // 해석
  var coachInterpret = el("div", "report-note");
  coachInterpret.style.marginTop = "32px";
  coachInterpret.innerHTML = '4~5점(어렵다)을 고른 FP 수입니다. '
    + '<b style="color:' + topCoach.stg.color + '">' + topCoach.stg.id + '(' + topCoach.stg.label + ')</b> 단계에서 '
    + preFps.length + '명 중 <b>' + topCoach.count + '명(' + topCoach.pct + '%)</b>이 어려움을 느끼고 있어 코칭 1순위입니다.';
  card.appendChild(coachInterpret);

  card.appendChild(el("div", "subsection-title", "코칭 우선순위"));
  var rank = 0;
  coachPriority.forEach(function(cp) {
    if (cp.count === 0) return;
    rank++;

    // 도표 행
    var pct = cp.pct;
    var isTop = rank === 1;
    var row = el("div", "score-row");
    var meta = el("div", "score-meta");
    meta.innerHTML = '<span class="score-label" style="color:' + cp.stg.color + '">'
      + rank + '순위 ' + cp.stg.id + ' ' + cp.stg.label + '</span>'
      + '<span class="score-value-wrap">'
      +   '<span class="score-num" style="color:' + cp.stg.color + '">' + cp.count + '<span style="font-size:16px">명</span></span>'
      +   '<span class="score-tag" style="color:' + cp.stg.color + '">' + pct + '%' + (isTop ? ' · 최다' : '') + '</span>'
      + '</span>';
    row.appendChild(meta);
    var track = el("div", "score-track");
    var fill = el("div", "score-fill");
    fill.style.cssText = "width:" + pct + "%;background:" + cp.stg.color + (isTop ? '' : '66');
    track.appendChild(fill);
    row.appendChild(track);
    card.appendChild(row);

    // FP 이름 리스트
    if (cp.fpNames.length > 0) {
      var names = el("div");
      names.style.cssText = "font-size:14px;color:#9CA3AF;padding:4px 0 12px 0";
      names.textContent = "해당 FP: " + cp.fpNames.join(", ");
      card.appendChild(names);
    }
  });

  // ════════════════════════════════════════════════════
  // ④ FP별 최약점 — 해석 → 도표
  // ════════════════════════════════════════════════════
  var weakInterpret = el("div", "report-note");
  weakInterpret.style.marginTop = "32px";
  var topWeakPct = preFps.length > 0 ? Math.round(weakCount[topWeakStg.id] / preFps.length * 100) : 0;
  weakInterpret.innerHTML = '각 FP에게 4단계 중 가장 어려운 1개를 물었을 때의 분포입니다. '
    + '<b style="color:' + topWeakStg.color + '">' + topWeakStg.id + '(' + topWeakStg.label + ')</b>를 꼽은 FP가 '
    + '<b>' + weakCount[topWeakStg.id] + '명(' + topWeakPct + '%)</b>으로 가장 많습니다.';
  card.appendChild(weakInterpret);

  card.appendChild(el("div", "subsection-title", "FP별 최약점 분포"));
  var maxCount = Math.max(weakCount.L, weakCount.I, weakCount.N, weakCount.K);
  STAGES.forEach(function(stg) {
    var c = weakCount[stg.id];
    var pct = preFps.length > 0 ? Math.round(c / preFps.length * 100) : 0;
    var isMax = c === maxCount && c > 0;
    var row = el("div", "score-row");
    var meta = el("div", "score-meta");
    meta.innerHTML = '<span class="score-label" style="color:' + stg.color + '">' + stg.id + ' ' + stg.label + '</span>'
      + '<span class="score-value-wrap">'
      +   '<span class="score-num" style="color:' + stg.color + '">' + c + '<span style="font-size:16px">명</span></span>'
      +   '<span class="score-tag" style="color:' + stg.color + '">' + pct + '%' + (isMax ? ' · 최다' : '') + '</span>'
      + '</span>';
    row.appendChild(meta);
    var track = el("div", "score-track");
    var fill = el("div", "score-fill");
    fill.style.cssText = "width:" + pct + "%;background:" + stg.color + (isMax ? '' : '66');
    track.appendChild(fill);
    row.appendChild(track);
    card.appendChild(row);
  });

  // ════════════════════════════════════════════════════
  // ⑤ 집중 케어 필요 FP
  // ════════════════════════════════════════════════════
  var dangerFps = [];
  preFps.forEach(function(f) {
    var sa = getStageAvgs(f.pre.answers);
    var allHard = STAGES.every(function(stg) { return sa[stg.id] >= 4; });
    if (allHard) dangerFps.push(f.name || f.empId);
  });
  if (dangerFps.length > 0) {
    var dangerInterpret = el("div", "report-note");
    dangerInterpret.style.marginTop = "32px";
    dangerInterpret.innerHTML = '아래 FP는 <b>모든 단계에서 4~5점</b>을 선택했습니다. 특정 단계가 아니라 전반적인 케어가 필요합니다.';
    card.appendChild(dangerInterpret);

    card.appendChild(el("div", "subsection-title", "집중 케어 필요 FP"));
    var dangerList = el("div");
    dangerList.style.cssText = "font-size:17px;font-weight:700;color:#1C2B5E;padding:8px 0";
    dangerList.textContent = dangerFps.join(", ");
    card.appendChild(dangerList);
  }

  return card;
}

function buildPostReport(bothFps) {
  var card = el("div", "chart-card report-section");
  var head = el("div", "report-step-head");
  head.innerHTML = '<span class="step-num" style="background:#0CA678">2</span>'
    + '<span class="step-title">2차 진단 결과</span>'
    + '<span class="step-tag" style="background:#0CA67814;color:#0CA678">교육 직후</span>';
  card.appendChild(head);

  card.appendChild(el("div", "report-note", "교육 전후 난이도 변화 — 막대가 짧아졌을수록 쉽게 느낀다는 뜻"));

  var preAvg  = avgStageScore(bothFps, "pre");
  var postAvg = avgStageScore(bothFps, "post");

  card.appendChild(el("div", "subsection-title", "단계별 변화 (교육 전 → 직후)"));
  STAGES.forEach(function(stg) {
    var preS = preAvg[stg.id];
    var postS = postAvg[stg.id];
    var diff = preS - postS;
    var preLbl = difficultyLabel(preS);
    var postLbl = difficultyLabel(postS);

    // 이 단계에서 어렵다고 느끼던 인원 (점수 ≥ 3) → 개선된 인원 (점수 ≤ 2.5)
    var hardBefore = 0, easedAfter = 0;
    bothFps.forEach(function(f) {
      var pVal = getStageAvgs(f.pre.answers)[stg.id];
      var qVal = getStageAvgs(f.post.answers)[stg.id];
      if (pVal >= 3) {
        hardBefore++;
        if (qVal <= 2.5) easedAfter++;
      }
    });
    var easedPct = hardBefore > 0 ? Math.round(easedAfter / hardBefore * 100) : 0;

    var box = el("div", "compare-box");
    var head = el("div", "compare-head");
    head.innerHTML = '<span class="compare-stage" style="color:' + stg.color + '">' + stg.id + ' ' + stg.label + '</span>'
      + '<span class="compare-delta" style="color:' + (diff > 0.1 ? "#0CA678" : "#9CA3AF") + '">'
      + (diff > 0.1 ? '▼ ' + diff.toFixed(1) + ' 개선' : (diff < -0.1 ? '▲ ' + Math.abs(diff).toFixed(1) + ' 상승' : '변화 없음'))
      + '</span>';
    box.appendChild(head);

    // Pre 막대
    var preRow = el("div", "compare-row");
    preRow.innerHTML = '<span class="compare-tp">교육 전</span>';
    var preTrack = el("div", "compare-track");
    var preFill = el("div", "compare-fill");
    preFill.style.cssText = "width:" + Math.max(0, Math.min(100, (preS - 2) / 2 * 100)) + "%;background:" + preLbl.color + ";opacity:0.55";
    preTrack.appendChild(preFill);
    preRow.appendChild(preTrack);
    var preVal = el("span", "compare-val");
    preVal.innerHTML = '<b>' + preS.toFixed(1) + '</b>';
    preVal.style.color = preLbl.color;
    preRow.appendChild(preVal);
    box.appendChild(preRow);

    // Post 막대
    var postRow = el("div", "compare-row");
    postRow.innerHTML = '<span class="compare-tp">직후</span>';
    var postTrack = el("div", "compare-track");
    var postFill = el("div", "compare-fill");
    postFill.style.cssText = "width:" + Math.max(0, Math.min(100, (postS - 2) / 2 * 100)) + "%;background:" + postLbl.color;
    postTrack.appendChild(postFill);
    postRow.appendChild(postTrack);
    var postVal = el("span", "compare-val");
    postVal.innerHTML = '<b>' + postS.toFixed(1) + '</b>';
    postVal.style.color = postLbl.color;
    postRow.appendChild(postVal);
    box.appendChild(postRow);

    // 인원 변화 강조
    if (hardBefore > 0) {
      var story = el("div", "compare-story");
      if (easedAfter > 0) {
        story.innerHTML = '어렵게 느끼던 <b>' + hardBefore + '명</b> 중 '
          + '<b style="color:#0CA678">' + easedAfter + '명(' + easedPct + '%)</b>'
          + '이 쉽게 느낀다고 응답';
      } else {
        story.innerHTML = '어렵게 느끼던 <b>' + hardBefore + '명</b>이 여전히 어려워합니다';
        story.style.color = "#C92A2A";
      }
      box.appendChild(story);
    } else {
      var story2 = el("div", "compare-story");
      story2.innerHTML = '교육 전부터 어려워하는 FP가 없던 단계입니다';
      story2.style.color = "#9CA3AF";
      box.appendChild(story2);
    }

    card.appendChild(box);
  });

  // 전체 평균 (참고용 작은 한 줄)
  var preTotal  = totalAvg(preAvg);
  var postTotal = totalAvg(postAvg);
  var summaryLine = el("div", "total-summary-line");
  summaryLine.innerHTML = '참고: 전체 평균 ' + preTotal.toFixed(1) + ' → ' + postTotal.toFixed(1);
  card.appendChild(summaryLine);

  // 개선 현황 split bar
  card.appendChild(el("div", "subsection-title", "FP 개선 현황"));
  var improvedN = 0;
  bothFps.forEach(function(f) {
    var p = totalAvg(getStageAvgs(f.pre.answers));
    var q = totalAvg(getStageAvgs(f.post.answers));
    if (q < p) improvedN++;
  });
  var notImprovedN = bothFps.length - improvedN;
  var iPct = bothFps.length > 0 ? improvedN / bothFps.length * 100 : 0;

  var splitBar = el("div", "split-bar");
  splitBar.innerHTML = '<div class="split-bar-improved" style="width:' + iPct + '%"></div>'
    + '<div class="split-bar-not" style="width:' + (100 - iPct) + '%"></div>';
  card.appendChild(splitBar);
  var splitLegend = el("div", "split-legend");
  splitLegend.innerHTML = '<span style="color:#0CA678">●</span> 개선 ' + improvedN + '명 (' + Math.round(iPct) + '%) &nbsp;&nbsp; <span style="color:#C92A2A">●</span> 미개선 ' + notImprovedN + '명 (' + (100 - Math.round(iPct)) + '%)';
  card.appendChild(splitLegend);

  // 자동 해석 — 단계별 인원 변화 중심
  var stageStories = STAGES.map(function(stg) {
    var hb = 0, ea = 0;
    bothFps.forEach(function(f) {
      var pVal = getStageAvgs(f.pre.answers)[stg.id];
      var qVal = getStageAvgs(f.post.answers)[stg.id];
      if (pVal >= 3) { hb++; if (qVal <= 2.5) ea++; }
    });
    return { stg: stg, hardBefore: hb, eased: ea };
  });
  // 가장 큰 변화 단계
  var topImpact = stageStories.reduce(function(best, s) {
    return s.eased > best.eased ? s : best;
  });
  // 가장 적은 변화 단계 (어려운 사람 있는데 개선 못 된 단계)
  var stuck = stageStories
    .filter(function(s) { return s.hardBefore > 0; })
    .reduce(function(worst, s) {
      var wRate = worst ? worst.eased / worst.hardBefore : 1;
      var sRate = s.eased / s.hardBefore;
      return sRate < wRate ? s : worst;
    }, null);

  // 교육 효과 해석
  var insight = el("div", "insight-box");
  var html = '<div class="insight-title">교육 효과 분석</div>';

  // 교육 효과가 가장 좋은 단계
  var bestEffect = stageStories
    .filter(function(s) { return s.hardBefore > 0; })
    .reduce(function(best, s) {
      var bRate = best ? best.eased / best.hardBefore : -1;
      var sRate = s.eased / s.hardBefore;
      return sRate > bRate ? s : best;
    }, null);

  if (bestEffect && bestEffect.eased > 0) {
    var effectPct = Math.round(bestEffect.eased / bestEffect.hardBefore * 100);
    html += '<div class="insight-line">'
      + '<b style="color:#0CA678">교육 효과가 가장 좋은 단계</b><br>'
      + '<span style="color:' + bestEffect.stg.color + ';font-weight:800;font-size:18px">'
      + bestEffect.stg.id + '(' + bestEffect.stg.label + ')</span> — '
      + '개선율 <b style="font-size:20px;color:#0CA678">' + effectPct + '%</b><br>'
      + '<span style="font-size:14px;color:#6B7280">어렵게 느끼던 ' + bestEffect.hardBefore + '명 중 ' + bestEffect.eased + '명이 쉬워졌습니다</span>'
      + '</div>';
  }
  if (stuck && stuck.eased < stuck.hardBefore) {
    var stuckRemain = stuck.hardBefore - stuck.eased;
    // 아직 어려운 FP 이름 목록
    var stillHardNames = [];
    bothFps.forEach(function(f) {
      var pVal = getStageAvgs(f.pre.answers)[stuck.stg.id];
      var qVal = getStageAvgs(f.post.answers)[stuck.stg.id];
      if (pVal >= 3 && qVal > 2.5) stillHardNames.push(f.name || f.empId);
    });
    html += '<div class="insight-line">'
      + '<b>추가 코칭이 필요한 단계</b><br>'
      + '<span style="color:' + stuck.stg.color + ';font-weight:800;font-size:18px">'
      + stuck.stg.id + '(' + stuck.stg.label + ')</span> — '
      + '아직 <b style="font-size:20px">' + stuckRemain + '명</b>이 어려워합니다<br>'
      + (stillHardNames.length > 0
        ? '<span style="font-size:14px;color:#6B7280">해당 FP: ' + stillHardNames.join(', ') + '</span>'
        : '')
      + '</div>';
  }
  if (!bestEffect || bestEffect.eased === 0) {
    html += '<div class="insight-line">' + bothFps.length + '명 중 <b>' + improvedN + '명</b>이 전체적으로 개선을 보였습니다.</div>';
  }
  insight.innerHTML = html;
  card.appendChild(insight);

  return card;
}

function buildFollowupReport(allFps) {
  var card = el("div", "chart-card report-section");
  var head = el("div", "report-step-head");
  head.innerHTML = '<span class="step-num" style="background:#E8470A">3</span>'
    + '<span class="step-title">3차 진단 결과</span>'
    + '<span class="step-tag" style="background:#E8470A14;color:#E8470A">3~4주 후</span>';
  card.appendChild(head);

  card.appendChild(el("div", "report-note", "현장 정착도 — 직후 효과가 3~4주 후에도 유지되는지 확인"));

  var postAvg = avgStageScore(allFps, "post");
  var fuAvg   = avgStageScore(allFps, "followup");

  card.appendChild(el("div", "subsection-title", "단계별 정착도 (직후 → 3~4주 후)"));
  STAGES.forEach(function(stg) {
    var postS = postAvg[stg.id];
    var fuS = fuAvg[stg.id];
    var diff = fuS - postS;
    var postLbl = difficultyLabel(postS);
    var fuLbl = difficultyLabel(fuS);

    // 직후 쉽게 느끼던 사람 중 다시 어려워진 사람
    var easyAfter = 0, reboundN = 0;
    allFps.forEach(function(f) {
      var p = getStageAvgs(f.post.answers)[stg.id];
      var q = getStageAvgs(f.followup.answers)[stg.id];
      if (p <= 2.5) {
        easyAfter++;
        if (q >= 3) reboundN++;
      }
    });

    var box = el("div", "compare-box");
    var head = el("div", "compare-head");
    var rebound = diff > 0.3;
    head.innerHTML = '<span class="compare-stage" style="color:' + stg.color + '">' + stg.id + ' ' + stg.label + '</span>'
      + '<span class="compare-delta" style="color:' + (rebound ? "#C92A2A" : "#0CA678") + '">'
      + (rebound ? '▲ ' + diff.toFixed(1) + ' 반등' : '유지')
      + '</span>';
    box.appendChild(head);

    var postRow = el("div", "compare-row");
    postRow.innerHTML = '<span class="compare-tp">직후</span>';
    var postTrack = el("div", "compare-track");
    var postFill = el("div", "compare-fill");
    postFill.style.cssText = "width:" + Math.max(0, Math.min(100, (postS - 2) / 2 * 100)) + "%;background:" + postLbl.color + ";opacity:0.55";
    postTrack.appendChild(postFill);
    postRow.appendChild(postTrack);
    var postVal = el("span", "compare-val");
    postVal.innerHTML = '<b>' + postS.toFixed(1) + '</b>';
    postVal.style.color = postLbl.color;
    postRow.appendChild(postVal);
    box.appendChild(postRow);

    var fuRow = el("div", "compare-row");
    fuRow.innerHTML = '<span class="compare-tp">3~4주 후</span>';
    var fuTrack = el("div", "compare-track");
    var fuFill = el("div", "compare-fill");
    fuFill.style.cssText = "width:" + Math.max(0, Math.min(100, (fuS - 2) / 2 * 100)) + "%;background:" + fuLbl.color;
    fuTrack.appendChild(fuFill);
    fuRow.appendChild(fuTrack);
    var fuVal = el("span", "compare-val");
    fuVal.innerHTML = '<b>' + fuS.toFixed(1) + '</b>';
    fuVal.style.color = fuLbl.color;
    fuRow.appendChild(fuVal);
    box.appendChild(fuRow);

    if (easyAfter > 0) {
      var story = el("div", "compare-story");
      if (reboundN > 0) {
        story.innerHTML = '직후 쉽게 느끼던 <b>' + easyAfter + '명</b> 중 '
          + '<b style="color:#C92A2A">' + reboundN + '명</b>이 현장에서 다시 어려움을 느낍니다';
      } else {
        story.innerHTML = '직후 쉽게 느끼던 <b>' + easyAfter + '명</b> 모두 현장에서도 잘 유지하고 있습니다';
        story.style.color = "#0CA678";
      }
      box.appendChild(story);
    }

    card.appendChild(box);
  });

  // 단계별 반등 인원 집계
  var reboundStories = STAGES.map(function(stg) {
    var ea = 0, rb = 0;
    allFps.forEach(function(f) {
      var p = getStageAvgs(f.post.answers)[stg.id];
      var q = getStageAvgs(f.followup.answers)[stg.id];
      if (p <= 2.5) { ea++; if (q >= 3) rb++; }
    });
    return { stg: stg, easyAfter: ea, rebound: rb };
  });
  var worstRebound = reboundStories.reduce(function(w, s) {
    return s.rebound > w.rebound ? s : w;
  });
  var bestStable = reboundStories
    .filter(function(s) { return s.easyAfter > 0; })
    .reduce(function(b, s) {
      var br = b ? b.rebound / b.easyAfter : 999;
      var sr = s.rebound / s.easyAfter;
      return sr < br ? s : b;
    }, null);

  var insight = el("div", "insight-box");
  var html = '<div class="insight-title">📊 핵심 요약</div>';
  if (worstRebound.rebound > 0) {
    html += '<div class="insight-line">'
      + '<b>⚠️ 가장 큰 반등</b><br>'
      + '<span style="color:' + worstRebound.stg.color + ';font-weight:800">' + worstRebound.stg.id + '단계(' + worstRebound.stg.label + ')</span><br>'
      + '직후 쉽게 느끼던 <b>' + worstRebound.easyAfter + '명</b> 중<br>'
      + '<b style="font-size:22px;color:#C92A2A">' + worstRebound.rebound + '명</b>이 현장에서 다시 어려워합니다'
      + '</div>';
  }
  if (bestStable && bestStable.rebound === 0 && bestStable.easyAfter > 0) {
    html += '<div class="insight-line">'
      + '<b>✅ 잘 정착</b><br>'
      + '<span style="color:' + bestStable.stg.color + ';font-weight:800">' + bestStable.stg.id + '단계(' + bestStable.stg.label + ')</span><br>'
      + '직후 쉽게 느끼던 <b>' + bestStable.easyAfter + '명</b> 모두<br>'
      + '현장에서 <b style="color:#0CA678">잘 유지</b>하고 있습니다'
      + '</div>';
  }
  if (html === '<div class="insight-title">📊 핵심 요약</div>') {
    html += '<div class="insight-line">3~4주 후에도 큰 변화 없이 유지되고 있습니다.</div>';
  }
  insight.innerHTML = html;
  card.appendChild(insight);

  return card;
}

function buildFpGroups(allFps) {
  var improved = [], needCoaching = [];
  allFps.forEach(function(f) {
    var preT  = totalAvg(getStageAvgs(f.pre.answers));
    var postT = totalAvg(getStageAvgs(f.post.answers));
    var fuT   = totalAvg(getStageAvgs(f.followup.answers));
    var weak  = getWeakestStage(f.pre.answers);
    var entry = {
      name: f.name, empId: f.empId, weakStage: weak.primary,
      preT: preT, postT: postT, fuT: fuT
    };
    if (fuT >= 2.8 && fuT >= preT - 0.3) {
      needCoaching.push(entry);
    } else if (postT < preT && fuT <= postT + 0.5) {
      improved.push(entry);
    }
  });

  var card = el("div", "chart-card report-section");
  var grid = el("div", "fp-group-grid");

  // 개선 우수
  var goodCard = el("div", "fp-group");
  var goodHead = el("div", "fp-group-head");
  goodHead.innerHTML = '<span style="color:#0CA678">●</span> <b>개선 우수</b><span class="fp-group-count">' + improved.length + '명</span>';
  goodCard.appendChild(goodHead);
  goodCard.appendChild(el("div", "fp-group-sub", "교육 효과가 현장에서도 유지되고 있습니다"));
  improved.forEach(function(e) {
    var stg = stageInfo(e.weakStage);
    var item = el("div", "fp-card");
    var displayName = e.name && e.name !== e.empId ? e.name : '(이름 미입력)';
    item.innerHTML = '<div class="fp-card-head"><span class="fp-card-name">' + displayName + '</span><span class="fp-dots-mini">●●●</span></div>'
      + '<div class="fp-tag" style="background:' + stg.color + '14;color:' + stg.color + '">약점: ' + stg.id + '단계</div>'
      + '<div class="fp-card-score">' + e.preT.toFixed(1) + ' → ' + e.postT.toFixed(1) + ' → ' + e.fuT.toFixed(1) + ' (유지)</div>';
    goodCard.appendChild(item);
  });
  if (improved.length === 0) goodCard.appendChild(el("div", "fp-empty", "해당 없음"));
  grid.appendChild(goodCard);

  // 추가 코칭 필요
  var badCard = el("div", "fp-group");
  var badHead = el("div", "fp-group-head");
  badHead.innerHTML = '<span style="color:#C92A2A">●</span> <b>추가 코칭 필요</b><span class="fp-group-count">' + needCoaching.length + '명</span>';
  badCard.appendChild(badHead);
  badCard.appendChild(el("div", "fp-group-sub", "교육 후에도 어려움이 지속되어 개별 코칭이 필요합니다"));
  needCoaching.forEach(function(e) {
    var stg = stageInfo(e.weakStage);
    var item = el("div", "fp-card");
    var changeLbl = e.fuT > e.postT + 0.3 ? "반등" : "변화 없음";
    var displayName = e.name && e.name !== e.empId ? e.name : '(이름 미입력)';
    item.innerHTML = '<div class="fp-card-head"><span class="fp-card-name">' + displayName + '</span><span class="fp-dots-mini">●●○</span></div>'
      + '<div class="fp-tag" style="background:' + stg.color + '14;color:' + stg.color + '">약점: ' + stg.id + '단계</div>'
      + '<div class="fp-card-score">' + e.preT.toFixed(1) + ' → ' + e.postT.toFixed(1) + ' → ' + e.fuT.toFixed(1) + ' (' + changeLbl + ')</div>';
    badCard.appendChild(item);
  });
  if (needCoaching.length === 0) badCard.appendChild(el("div", "fp-empty", "해당 없음"));
  grid.appendChild(badCard);

  card.appendChild(grid);
  return card;
}

function fetchFPDetail(empId, callback) {
  // Try to get from existing data first
  var data = state.adminData || { responses: [] };
  var responses = data.responses || [];
  var fpResponses = responses.filter(function(r) { return r.empId === empId; });

  if (fpResponses.length > 0) {
    state.adminFP = state.adminFP || {};
    state.adminFP.responses = fpResponses;
    if (callback) callback();
    return;
  }

  // Fetch from server
  jsonpFetch("getFPDetail", { empId: empId }, function(result) {
    state.adminFP = state.adminFP || {};
    state.adminFP.responses = (result && result.responses) ? result.responses : [];
    if (callback) callback();
  });
}

// ─── Screen: Admin FP Detail ────────────────────────────────

function buildAdminFPDetail() {
  return buildFPDetailScreen("admin");
}

function buildFPDetailScreen(mode) {
  var wrap = el("div", "screen");
  var fp = mode === "admin" ? state.adminFP : state.managerFP;

  var back = el("button", "btn-back", mode === "admin" ? "← 지점 상세" : "← 목록으로");
  back.addEventListener("click", function() {
    if (mode === "admin") {
      navigate("adminBranchDetail", null, true);
    } else {
      navigate("manager", null, true);
    }
  });
  wrap.appendChild(back);

  // FP info
  var info = el("div", "chart-card");
  var displayName = fp.name && fp.name !== fp.empId ? fp.name : '(이름 미입력)';
  var infoHtml = '<div style="font-size:28px;font-weight:900;color:#1C2B5E;margin-bottom:6px">' + displayName + '</div>';
  if (fp.branch) infoHtml += '<div style="font-size:15px;color:#6B7280;margin-bottom:4px">' + fp.branch + '</div>';
  infoHtml += '<div style="font-size:13px;color:#9CA3AF">사번 ' + (fp.empId || "") + '</div>';
  // Master data fields
  if (fp.grade) infoHtml += '<div style="font-size:13px;color:#8B95A5;margin-top:8px">성적단: ' + fp.grade + ' | 차월: ' + (fp.tenure || '-') + ' | 채널: ' + (fp.channel || '-') + '</div>';
  info.innerHTML = infoHtml;
  wrap.appendChild(info);

  // Radar chart
  var chartCard = el("div", "chart-card");
  chartCard.innerHTML = '<div class="chart-title">시점별 진단 결과</div>';
  var container = el("div", "chart-container");
  var canvas = el("canvas");
  canvas.id = "fp-radar";
  container.appendChild(canvas);
  chartCard.appendChild(container);
  wrap.appendChild(chartCard);

  // Score table
  var responses = fp.responses || [];
  var preR = null, postR = null, fuR = null;
  responses.forEach(function(r) {
    if (r.timepoint === "pre") preR = r;
    else if (r.timepoint === "post") postR = r;
    else if (r.timepoint === "followup") fuR = r;
  });

  var scoreCard = el("div", "chart-card");
  scoreCard.innerHTML = '<div class="chart-title">문항별 점수</div>';
  var scoreTable = el("table", "data-table");
  var sHead = '<thead><tr><th>문항</th><th>교육전</th><th>직후</th><th>추후</th></tr></thead>';
  scoreTable.innerHTML = sHead;
  var sTbody = el("tbody");
  for (var qi = 0; qi < 8; qi++) {
    var tr = el("tr");
    var preVal = preR && preR.answers ? preR.answers[qi] : "-";
    var postVal = postR && postR.answers ? postR.answers[qi] : "-";
    var fuVal = fuR && fuR.answers ? fuR.answers[qi] : "-";
    tr.innerHTML = '<td>Q' + (qi + 1) + ' (' + QUESTIONS[qi].stage + ')</td><td>' + preVal + '</td><td>' + postVal + '</td><td>' + fuVal + '</td>';
    sTbody.appendChild(tr);
  }
  scoreTable.appendChild(sTbody);
  scoreCard.appendChild(scoreTable);
  wrap.appendChild(scoreCard);

  // Comments
  var comments = [];
  responses.forEach(function(r) {
    if (r.comment) comments.push({ tp: r.timepoint, text: r.comment });
  });
  if (comments.length > 0) {
    var cCard = el("div", "chart-card");
    cCard.innerHTML = '<div class="chart-title">코멘트</div>';
    comments.forEach(function(c) {
      var tpLabel = c.tp === "pre" ? "교육 전" : (c.tp === "post" ? "교육 직후" : "3~4주 후");
      var cDiv = el("div");
      cDiv.style.cssText = "margin-bottom:12px;padding:12px;background:#F5F5F7;border-radius:8px;";
      cDiv.innerHTML = '<div style="font-size:12px;font-weight:700;color:#8B95A5;margin-bottom:4px">' + tpLabel + '</div><div style="font-size:15px;color:#374151;line-height:1.6">' + c.text + '</div>';
      cCard.appendChild(cDiv);
    });
    wrap.appendChild(cCard);
  }

  // Coaching points
  if (preR && preR.answers) {
    var coachCard = el("div", "coaching-card");
    coachCard.innerHTML = '<div class="chart-title">코칭 포인트</div>';

    var preAvgs = getStageAvgs(preR.answers);
    // Weakest = highest score (most difficult)
    var weakestResult = getWeakestStage(preR.answers);
    var weakest = weakestResult.primary;
    var coachItem1 = el("div", "coaching-item");
    coachItem1.innerHTML = '<strong>가장 어려워하는 단계:</strong> ' + stageInfo(weakest).name + ' · ' + stageInfo(weakest).label;
    coachCard.appendChild(coachItem1);

    // Most improved (biggest drop pre→post)
    if (postR && postR.answers) {
      var postAvgs = getStageAvgs(postR.answers);
      var bestImprove = null;
      var bestDelta = 0;
      STAGES.forEach(function(stg) {
        var delta = preAvgs[stg.id] - postAvgs[stg.id];
        if (delta > bestDelta) { bestDelta = delta; bestImprove = stg; }
      });
      if (bestImprove) {
        var coachItem2 = el("div", "coaching-item");
        coachItem2.innerHTML = '🟢 <strong>가장 개선된 단계:</strong> ' + bestImprove.name + ' · ' + bestImprove.label + ' (▼' + bestDelta.toFixed(1) + ')';
        coachCard.appendChild(coachItem2);
      }

      // Rebounded (increased post→followup)
      if (fuR && fuR.answers) {
        var fuAvgs = getStageAvgs(fuR.answers);
        var rebound = null;
        var rebDelta = 0;
        STAGES.forEach(function(stg) {
          var delta = fuAvgs[stg.id] - postAvgs[stg.id];
          if (delta > rebDelta) { rebDelta = delta; rebound = stg; }
        });
        if (rebound) {
          var coachItem3 = el("div", "coaching-item");
          coachItem3.innerHTML = '🟡 <strong>다시 어려워진 단계:</strong> ' + rebound.name + ' · ' + rebound.label + ' (▲' + rebDelta.toFixed(1) + ')';
          coachCard.appendChild(coachItem3);
        }
      }
    }
    wrap.appendChild(coachCard);
  }

  return wrap;
}

// ─── Admin: Group ───────────────────────────────────────────

function buildAdminGroup(wrap) {
  var data = state.adminData || {};
  var master = data.master || [];

  if (master.length === 0) {
    var msg = el("div", "loading-wrap");
    msg.innerHTML = '<div class="loading-text">마스터 데이터를 먼저 업로드해주세요</div>';
    wrap.appendChild(msg);
    return;
  }

  var responses = data.responses || [];

  // Build lookup: empId → master info
  var masterMap = {};
  master.forEach(function(m) { masterMap[m.empId] = m; });

  // Get pre-responses only for grouping
  var preResponses = responses.filter(function(r) { return r.timepoint === "pre"; });

  // Group by grade
  var gradeCard = el("div", "chart-card");
  gradeCard.innerHTML = '<div class="chart-title">성적단별 평균</div>';
  var gradeContainer = el("div", "chart-container");
  var gradeCanvas = el("canvas");
  gradeCanvas.id = "group-grade";
  gradeContainer.appendChild(gradeCanvas);
  gradeCard.appendChild(gradeContainer);
  wrap.appendChild(gradeCard);

  // Group by tenure
  var tenureCard = el("div", "chart-card");
  tenureCard.innerHTML = '<div class="chart-title">차월구간별 평균</div>';
  var tenureContainer = el("div", "chart-container");
  var tenureCanvas = el("canvas");
  tenureCanvas.id = "group-tenure";
  tenureContainer.appendChild(tenureCanvas);
  tenureCard.appendChild(tenureContainer);
  wrap.appendChild(tenureCard);

  // Group by channel
  var channelCard = el("div", "chart-card");
  channelCard.innerHTML = '<div class="chart-title">채널별 평균</div>';
  var channelContainer = el("div", "chart-container");
  var channelCanvas = el("canvas");
  channelCanvas.id = "group-channel";
  channelContainer.appendChild(channelCanvas);
  channelCard.appendChild(channelContainer);
  wrap.appendChild(channelCard);
}

// ─── Admin: Data ────────────────────────────────────────────

function buildAdminData(wrap) {
  var data = state.adminData || {};
  var master = data.master || [];
  var responses = data.responses || [];

  // Master upload section
  var uploadCard = el("div", "chart-card");
  uploadCard.innerHTML = '<div class="chart-title">마스터 데이터 관리</div>';

  var statusDiv = el("div");
  statusDiv.style.cssText = "font-size:14px;color:#8B95A5;margin-bottom:16px;";
  statusDiv.textContent = "현재 등록: " + master.length + "명";
  uploadCard.appendChild(statusDiv);

  var uploadZone = el("div", "upload-zone");
  var fileInput = el("input");
  fileInput.type = "file";
  fileInput.accept = ".csv";
  fileInput.style.cssText = "width:100%;margin-bottom:12px;";
  uploadZone.appendChild(fileInput);

  var formatNote = el("div");
  formatNote.style.cssText = "font-size:12px;color:#8B95A5;margin-bottom:12px;line-height:1.6;";
  formatNote.textContent = 'CSV 형식: empId,name,grade,tenure,age,gender,channel';
  uploadZone.appendChild(formatNote);

  var uploadBtn = el("button", "btn-primary", "업로드");
  uploadBtn.style.width = "100%";
  uploadBtn.addEventListener("click", function() {
    var file = fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var text = e.target.result;
      var lines = text.split("\n");
      var masterData = [];
      for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var cols = parseCSVLine(line);
        if (cols.length >= 2) {
          masterData.push({
            empId: cols[0] || "",
            name: cols[1] || "",
            grade: cols[2] || "",
            tenure: cols[3] || "",
            age: cols[4] || "",
            gender: cols[5] || "",
            channel: cols[6] || "",
          });
        }
      }
      postData({ action: "uploadMaster", master: masterData });
      statusDiv.textContent = "업로드 완료: " + masterData.length + "명 (서버 반영 대기 중)";
    };
    reader.readAsText(file);
  });
  uploadZone.appendChild(uploadBtn);
  uploadCard.appendChild(uploadZone);
  wrap.appendChild(uploadCard);

  // Export section
  var exportCard = el("div", "chart-card");
  exportCard.innerHTML = '<div class="chart-title">데이터 내보내기</div>';

  var exportStatus = el("div");
  exportStatus.style.cssText = "font-size:14px;color:#8B95A5;margin-bottom:16px;";
  exportStatus.textContent = "전체 응답: " + responses.length + "건";
  exportCard.appendChild(exportStatus);

  var csvBtn = el("button", "btn-full", "CSV 다운로드");
  csvBtn.addEventListener("click", function() {
    exportCSV(responses);
  });
  exportCard.appendChild(csvBtn);
  wrap.appendChild(exportCard);
}

function parseCSVLine(line) {
  var result = [];
  var current = "";
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function exportCSV(responses) {
  var bom = "\uFEFF";
  var header = "timestamp,branch,empId,timepoint,L1,L2,I1,I2,N1,N2,K1,K2,bonusStage,bonusApplied,bonusReaction,comment";
  var lines = [header];
  responses.forEach(function(r) {
    var ans = r.answers || new Array(8).fill("");
    var row = [
      r.timestamp || "",
      r.branch || "",
      r.empId || "",
      r.timepoint || "",
      ans[0], ans[1], ans[2], ans[3], ans[4], ans[5], ans[6], ans[7],
      r.bonusStage || "",
      (r.bonusApplied || []).join(";"),
      r.bonusReaction || "",
      '"' + (r.comment || "").replace(/"/g, '""') + '"',
    ];
    lines.push(row.join(","));
  });

  var csvContent = bom + lines.join("\n");
  var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "link_responses_" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Screen: Manager Login ──────────────────────────────────

function buildManagerLogin() {
  var wrap = el("div", "screen center");

  var h = el("h1", null, "지점장 대시보드");
  wrap.appendChild(h);

  var sub = el("p", "sub", "지점명을 입력하세요");
  wrap.appendChild(sub);

  var field = el("div", "field");
  field.innerHTML = '<label>지점명</label>';
  var input = el("input");
  input.type = "text";
  input.placeholder = "지점명을 입력하세요";
  input.value = state.managerBranch;
  input.addEventListener("input", function(e) { state.managerBranch = e.target.value.trim(); });
  field.appendChild(input);
  wrap.appendChild(field);

  var errDiv = el("div", "error");
  errDiv.id = "manager-error";
  if (state.error) errDiv.textContent = state.error;
  wrap.appendChild(errDiv);

  var btn = el("button", "btn-full", "로그인");
  btn.addEventListener("click", function() {
    if (!state.managerBranch) {
      state.error = "지점명을 입력하세요";
      document.getElementById("manager-error").textContent = state.error;
      return;
    }
    state.error = null;
    state.loading = true;
    navigate("manager");
    fetchManagerData();
  });
  wrap.appendChild(btn);

  return wrap;
}

function fetchManagerData() {
  jsonpFetch("getBranchData", { branch: state.managerBranch }, function(data) {
    state.loading = false;
    if (data && !data.error) {
      state.managerData = data;
    } else {
      state.managerData = { responses: [] };
      state.error = data ? data.error : "데이터 로드 실패";
    }
    render();
  });
}

// ─── Screen: Manager ────────────────────────────────────────

function buildManager() {
  var wrap = el("div", "screen");

  var back = el("button", "btn-back", "← 로그아웃");
  back.addEventListener("click", function() {
    state.managerData = null;
    navigate("managerLogin", null, true);
  });
  wrap.appendChild(back);

  var h = el("h2", null, state.managerBranch);
  wrap.appendChild(h);

  if (state.loading) {
    var lw = el("div", "loading-wrap");
    lw.innerHTML = '<div class="spinner"></div><div class="loading-text">데이터 불러오는 중...</div>';
    wrap.appendChild(lw);
    return wrap;
  }

  if (state.error) {
    var eb = el("div", "error-banner", state.error);
    wrap.appendChild(eb);
  }

  var data = state.managerData || { responses: [] };
  var responses = data.responses || [];

  var preCnt = 0, postCnt = 0, fuCnt = 0;
  responses.forEach(function(r) {
    if (r.timepoint === "pre") preCnt++;
    else if (r.timepoint === "post") postCnt++;
    else if (r.timepoint === "followup") fuCnt++;
  });

  // Stat cards
  var cards = el("div", "stat-cards");
  [
    { label: "교육 전", num: preCnt, color: "#3B5BDB" },
    { label: "교육 직후", num: postCnt, color: "#0CA678" },
    { label: "3~4주 후", num: fuCnt, color: "#E8470A" },
  ].forEach(function(s) {
    var card = el("div", "stat-card");
    card.innerHTML = '<div class="stat-num" style="color:' + s.color + '">' + s.num + '</div><div class="stat-label">' + s.label + '</div>';
    cards.appendChild(card);
  });
  wrap.appendChild(cards);

  // Radar chart
  var chartCard = el("div", "chart-card");
  chartCard.innerHTML = '<div class="chart-title">단계별 평균 (시점 비교)</div>';
  var container = el("div", "chart-container");
  var canvas = el("canvas");
  canvas.id = "manager-radar";
  container.appendChild(canvas);
  chartCard.appendChild(container);
  wrap.appendChild(chartCard);

  // Search bar
  var searchBar = el("div", "search-bar");
  var searchInput = el("input");
  searchInput.type = "text";
  searchInput.placeholder = "사번 또는 이름으로 검색";
  searchInput.addEventListener("input", function(e) {
    var q = e.target.value.trim().toLowerCase();
    var items = wrap.querySelectorAll(".fp-item");
    for (var i = 0; i < items.length; i++) {
      var text = items[i].textContent.toLowerCase();
      items[i].style.display = (!q || text.indexOf(q) !== -1) ? "" : "none";
    }
  });
  searchBar.appendChild(searchInput);
  wrap.appendChild(searchBar);

  // FP list
  var fpMap = {};
  responses.forEach(function(r) {
    if (!fpMap[r.empId]) fpMap[r.empId] = { empId: r.empId, name: r.name || r.empId, pre: false, post: false, followup: false };
    fpMap[r.empId][r.timepoint] = true;
    if (r.name) fpMap[r.empId].name = r.name;
  });

  Object.keys(fpMap).forEach(function(eid) {
    var fp = fpMap[eid];
    var item = el("div", "fp-item");
    var dots = (fp.pre ? "●" : "○") + " " + (fp.post ? "●" : "○") + " " + (fp.followup ? "●" : "○");
    item.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:700;color:#1C2B5E">' + fp.name + '</div><div style="font-size:13px;color:#8B95A5">' + fp.empId + '</div></div><div class="fp-dots">' + dots + '</div></div>';
    item.addEventListener("click", function() {
      state.managerFP = { empId: fp.empId, name: fp.name, branch: state.managerBranch };
      // Get FP responses from manager data
      state.managerFP.responses = responses.filter(function(r) { return r.empId === fp.empId; });
      navigate("managerFP");
    });
    wrap.appendChild(item);
  });

  if (Object.keys(fpMap).length === 0) {
    var empty = el("div", "loading-wrap");
    empty.innerHTML = '<div class="loading-text">아직 응답이 없습니다</div>';
    wrap.appendChild(empty);
  }

  return wrap;
}

// ─── Screen: Manager FP ─────────────────────────────────────

function buildManagerFP() {
  return buildFPDetailScreen("manager");
}

// ─── Chart Rendering ────────────────────────────────────────

function renderCharts() {
  if (typeof Chart === "undefined") return;

  switch (state.screen) {
    case "result":
      renderResultRadar();
      break;
    case "admin":
      if (state.adminTab === "overview") renderAdminOverviewCharts();
      if (state.adminTab === "group") renderAdminGroupCharts();
      break;
    case "adminBranchDetail":
      renderTimepointGroupedBar("branch-bar", getBranchTimepointData(state.adminBranch));
      break;
    case "adminFPDetail":
      renderTimepointRadar("fp-radar", getFPTimepointData(state.adminFP));
      break;
    case "manager":
      renderTimepointRadar("manager-radar", getManagerTimepointData());
      break;
    case "managerFP":
      renderTimepointRadar("fp-radar", getFPTimepointData(state.managerFP));
      break;
  }
}

function renderResultRadar() {
  var canvas = document.getElementById("result-radar");
  if (!canvas) return;

  var avgs = getStageAvgs(state.answers);
  // INVERT: display (6 - score)
  var values = STAGES.map(function(stg) { return 6 - avgs[stg.id]; });

  var chart = new Chart(canvas, {
    type: "radar",
    data: {
      labels: STAGES.map(function(s) { return s.name + " " + s.label; }),
      datasets: [{
        label: "역량 수준",
        data: values,
        backgroundColor: "rgba(232, 71, 10, 0.15)",
        borderColor: "#E8470A",
        borderWidth: 2,
        pointBackgroundColor: "#E8470A",
        pointRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0,
          max: 5,
          ticks: { stepSize: 1, display: false },
          pointLabels: { font: { size: 13, weight: "bold" } },
          grid: { color: "rgba(0,0,0,0.06)" },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
  state._charts["result-radar"] = chart;
}

function renderTimepointGroupedBar(canvasId, tpData) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  var tpConfigs = [
    { key: "pre",      label: "교육 전",  color: "#3B5BDB" },
    { key: "post",     label: "교육 직후", color: "#0CA678" },
    { key: "followup", label: "3~4주 후", color: "#E8470A" },
  ];

  var datasets = [];
  tpConfigs.forEach(function(tc) {
    if (tpData[tc.key]) {
      datasets.push({
        label: tc.label,
        data: STAGES.map(function(stg) { return tpData[tc.key][stg.id] || 0; }),
        backgroundColor: tc.color,
        borderRadius: 6,
        barPercentage: 0.85,
        categoryPercentage: 0.75,
      });
    }
  });

  if (datasets.length === 0) return;

  var chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: STAGES.map(function(s) { return s.id + " " + s.label; }),
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 2,
          max: 4,
          ticks: {
            stepSize: 0.5,
            font: { size: 13, weight: "600" },
            color: "#6B7280",
            callback: function(v) {
              if (v === 2) return "2 쉬움";
              if (v === 4) return "4 어려움";
              return v;
            }
          },
          grid: { color: "rgba(0,0,0,0.06)" },
        },
        x: {
          ticks: {
            font: { size: 14, weight: "700" },
            color: "#1C2B5E",
          },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { size: 14, weight: "600" }, padding: 14, boxWidth: 14 }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) { return ctx.dataset.label + ": " + ctx.parsed.y.toFixed(1); }
          }
        }
      },
    },
  });
  state._charts[canvasId] = chart;
}

function renderTimepointRadar(canvasId, tpData) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  var datasets = [];
  var tpConfigs = [
    { key: "pre", label: "교육 전", color: "#3B5BDB", opacity: 0.8 },
    { key: "post", label: "교육 직후", color: "#0CA678", opacity: 0.6 },
    { key: "followup", label: "3~4주 후", color: "#E8470A", opacity: 0.4 },
  ];

  tpConfigs.forEach(function(tc) {
    if (tpData[tc.key]) {
      // INVERT: display (6 - avg)
      var values = STAGES.map(function(stg) { return 6 - (tpData[tc.key][stg.id] || 0); });
      datasets.push({
        label: tc.label,
        data: values,
        backgroundColor: tc.color + Math.round(tc.opacity * 40).toString(16).padStart(2, "0"),
        borderColor: tc.color,
        borderWidth: 2,
        pointBackgroundColor: tc.color,
        pointRadius: 4,
      });
    }
  });

  if (datasets.length === 0) return;

  var chart = new Chart(canvas, {
    type: "radar",
    data: {
      labels: STAGES.map(function(s) { return s.name + " " + s.label; }),
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0,
          max: 5,
          ticks: { stepSize: 1, display: false },
          pointLabels: { font: { size: 13, weight: "bold" } },
          grid: { color: "rgba(0,0,0,0.06)" },
        },
      },
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 12 } } },
      },
    },
  });
  state._charts[canvasId] = chart;
}

function renderAdminOverviewCharts() {
  var data = state.adminData || { responses: [] };
  var responses = data.responses || [];

  // Radar chart: pre/post/followup
  var tpData = computeTimepointAverages(responses);
  renderTimepointGroupedBar("admin-radar", tpData);

  // Q bar chart (pre only)
  var preResponses = responses.filter(function(r) { return r.timepoint === "pre"; });
  var canvas = document.getElementById("admin-qbar");
  if (canvas && preResponses.length > 0) {
    var qAvgs = [];
    for (var qi = 0; qi < 8; qi++) {
      var sum = 0, cnt = 0;
      preResponses.forEach(function(r) {
        if (r.answers && r.answers[qi]) { sum += r.answers[qi]; cnt++; }
      });
      qAvgs.push(cnt > 0 ? sum / cnt : 0);
    }

    var qLabels = QUESTIONS.map(function(q, i) { return "Q" + (i + 1) + " (" + q.stage + ")"; });

    var chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: qLabels,
        datasets: [{
          data: qAvgs,
          backgroundColor: QUESTIONS.map(function(q) { return STAGE_COLORS[q.stage] + "AA"; }),
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: { min: 2, max: 4, ticks: { stepSize: 0.5 } },
          y: { grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    });
    state._charts["admin-qbar"] = chart;
  }

  // Bonus doughnut
  var bonusCanvas = document.getElementById("admin-bonus-doughnut");
  if (bonusCanvas) {
    var bonusCounts = { L: 0, I: 0, N: 0, K: 0 };
    responses.forEach(function(r) {
      if (r.timepoint === "post" && r.bonusStage && bonusCounts.hasOwnProperty(r.bonusStage)) {
        bonusCounts[r.bonusStage]++;
      }
    });

    var chart = new Chart(bonusCanvas, {
      type: "doughnut",
      data: {
        labels: STAGES.map(function(s) { return s.name + " " + s.label; }),
        datasets: [{
          data: STAGES.map(function(s) { return bonusCounts[s.id]; }),
          backgroundColor: STAGES.map(function(s) { return s.color; }),
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 12 } } },
        },
      },
    });
    state._charts["admin-bonus-doughnut"] = chart;
  }

  // Applied bar
  var appliedCanvas = document.getElementById("admin-applied-bar");
  if (appliedCanvas) {
    var appliedCounts = {};
    BONUS_APPLIED_OPTIONS.forEach(function(o) { appliedCounts[o.id] = 0; });
    responses.forEach(function(r) {
      if (r.timepoint === "followup" && r.bonusApplied) {
        r.bonusApplied.forEach(function(a) {
          if (appliedCounts.hasOwnProperty(a)) appliedCounts[a]++;
        });
      }
    });

    var chart = new Chart(appliedCanvas, {
      type: "bar",
      data: {
        labels: BONUS_APPLIED_OPTIONS.map(function(o) { return o.label; }),
        datasets: [{
          data: BONUS_APPLIED_OPTIONS.map(function(o) { return appliedCounts[o.id]; }),
          backgroundColor: "#E8470AAA",
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: { ticks: { stepSize: 1 } },
          y: { grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    });
    state._charts["admin-applied-bar"] = chart;
  }
}

function renderAdminGroupCharts() {
  var data = state.adminData || {};
  var master = data.master || [];
  var responses = data.responses || [];

  if (master.length === 0) return;

  var masterMap = {};
  master.forEach(function(m) { masterMap[m.empId] = m; });

  var preResponses = responses.filter(function(r) { return r.timepoint === "pre"; });

  // Helper: group responses by field and render grouped bar chart
  function renderGroupedBar(canvasId, fieldName, bucketFn) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var groups = {};
    preResponses.forEach(function(r) {
      var m = masterMap[r.empId];
      if (!m) return;
      var key = bucketFn ? bucketFn(m[fieldName]) : (m[fieldName] || "기타");
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    var groupNames = Object.keys(groups).sort();
    if (groupNames.length === 0) return;

    var datasets = STAGES.map(function(stg, si) {
      return {
        label: stg.name + " " + stg.label,
        data: groupNames.map(function(gn) {
          var resps = groups[gn];
          var sum = 0, cnt = 0;
          resps.forEach(function(r) {
            if (r.answers) {
              sum += (r.answers[si * 2] || 0) + (r.answers[si * 2 + 1] || 0);
              cnt += 2;
            }
          });
          return cnt > 0 ? sum / cnt : 0;
        }),
        backgroundColor: stg.color + "CC",
        borderRadius: 4,
      };
    });

    var chart = new Chart(canvas, {
      type: "bar",
      data: { labels: groupNames, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { min: 2, max: 4, ticks: { stepSize: 0.5 } },
        },
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 11 } } },
        },
      },
    });
    state._charts[canvasId] = chart;
  }

  renderGroupedBar("group-grade", "grade");
  renderGroupedBar("group-tenure", "tenure", function(val) {
    var n = parseInt(val, 10);
    if (isNaN(n)) return "기타";
    if (n <= 12) return "~12개월";
    if (n <= 24) return "13~24개월";
    if (n <= 36) return "25~36개월";
    return "37개월~";
  });
  renderGroupedBar("group-channel", "channel");
}

// ─── Chart Data Helpers ─────────────────────────────────────

function computeTimepointAverages(responses) {
  var result = {};
  ["pre", "post", "followup"].forEach(function(tp) {
    var tpResps = responses.filter(function(r) { return r.timepoint === tp; });
    if (tpResps.length === 0) return;
    var avgs = {};
    STAGES.forEach(function(stg, si) {
      var sum = 0, cnt = 0;
      tpResps.forEach(function(r) {
        if (r.answers) {
          sum += (r.answers[si * 2] || 0) + (r.answers[si * 2 + 1] || 0);
          cnt += 2;
        }
      });
      avgs[stg.id] = cnt > 0 ? sum / cnt : 0;
    });
    result[tp] = avgs;
  });
  return result;
}

function getBranchTimepointData(branch) {
  var data = state.adminData || { responses: [] };
  var bKey = branch.key || normalizeBranch(branch.name);
  var responses = (data.responses || []).filter(function(r) { return normalizeBranch(r.branch) === bKey; });
  return computeTimepointAverages(responses);
}

function getFPTimepointData(fp) {
  var responses = fp.responses || [];
  var result = {};
  responses.forEach(function(r) {
    if (r.answers) {
      result[r.timepoint] = getStageAvgs(r.answers);
    }
  });
  return result;
}

function getManagerTimepointData() {
  var data = state.managerData || { responses: [] };
  return computeTimepointAverages(data.responses || []);
}

// ─── Initialization ─────────────────────────────────────────

(function init() {
  var params = new URLSearchParams(window.location.search);
  if (params.has("admin")) {
    state.mode = "admin";
    state.screen = "adminLogin";
  } else if (params.has("manager")) {
    state.mode = "manager";
    state.screen = "managerLogin";
  } else {
    state.mode = "fp";
    // ?t=pre / ?t=post / ?t=followup 로 시점 결정 (기본값: pre)
    var t = params.get("t") || "pre";
    if (!TIMEPOINTS[t]) t = "pre";
    state.timepoint = t;
    state.screen = "cover";
    // 자동 복원 없음 — 매번 새로 입력
    state.fpName = "";
  }
  render();
})();
