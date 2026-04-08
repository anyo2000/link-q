// ============================================================
// LINK 컨설팅 진단 v2 — Google Apps Script (Web App)
//
// 사용법:
// 1. Google Sheets에서 새 스프레드시트 생성
// 2. https://script.google.com 에서 새 프로젝트 생성
// 3. 아래 코드 전체를 붙여넣기
// 4. 배포 > 새 배포 > 유형: 웹 앱
//    - 실행 계정: 본인
//    - 액세스 권한: 모든 사용자
// 5. 배포 후 URL을 app.js의 GAS_URL에 붙여넣기
//
// 시트는 자동 생성됩니다 (responses, master)
// ============================================================

var RESP_SHEET = "responses";
var MASTER_SHEET = "master";

var RESP_HEADERS = [
  "timestamp", "empId", "name", "branch", "timepoint",
  "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8",
  "bonusStage", "bonusApplied", "bonusReaction", "comment"
];

var MASTER_HEADERS = [
  "empId", "name", "grade", "tenure", "age", "gender", "channel"
];

// ── 시트 헬퍼 ────────────────────────────────────────
function getSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers) sheet.appendRow(headers);
  }
  return sheet;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST ──────────────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "saveResponse";

    if (action === "uploadMaster") return handleUploadMaster(data);
    return handleSaveResponse(data);
  } catch (err) {
    return jsonOut({ success: false, error: err.message });
  }
}


function handleUploadMaster(data) {
  var sheet = getSheet(MASTER_SHEET, MASTER_HEADERS);
  // 기존 데이터 삭제 (헤더 유지)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
  }
  var rows = data.data || [];
  if (rows.length > 0) {
    var values = rows.map(function (r) {
      return [
        String(r.empId || ""), r.name || "", r.grade || "",
        r.tenure || "", r.age || "", r.gender || "", r.channel || ""
      ];
    });
    sheet.getRange(2, 1, values.length, 7).setValues(values);
  }
  return jsonOut({ success: true, count: rows.length });
}

// ── GET ───────────────────────────────────────────────
function doGet(e) {
  var action = (e.parameter && e.parameter.action) || "summary";
  var callback = e.parameter && e.parameter.callback;
  var result;

  try {
    switch (action) {
      case "save":
        var saveData = JSON.parse(e.parameter.data);
        handleSaveResponse(saveData);
        result = { success: true };
        break;
      case "summary":   result = getSummary(); break;
      case "branches":  result = getBranches(); break;
      case "branch":    result = getBranchReport(e.parameter.branch); break;
      case "fp":        result = getFPDetail(e.parameter.empId); break;
      case "export":    result = getExportData(); break;
      default:          result = getSummary();
    }
  } catch (err) {
    result = { error: err.message };
  }

  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(result) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonOut(result);
}

// ── 데이터 읽기 ──────────────────────────────────────
function readAllResponses() {
  var sheet = getSheet(RESP_SHEET, RESP_HEADERS);
  if (sheet.getLastRow() < 2) return [];
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  // 헤더에 name 컬럼이 없으면 자동 추가 (마이그레이션)
  if (headers.indexOf("name") === -1) {
    sheet.insertColumnAfter(2); // empId 다음
    sheet.getRange(1, 3).setValue("name");
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }
  // 헤더 → 인덱스 매핑
  var idx = {};
  headers.forEach(function (h, i) { idx[h] = i; });
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return data.map(function (row) {
    return {
      timestamp:    row[idx.timestamp],
      empId:        String(row[idx.empId]),
      name:         String(row[idx.name] || ""),
      branch:       String(row[idx.branch] || ""),
      timepoint:    String(row[idx.timepoint] || ""),
      answers: [
        Number(row[idx.Q1]) || 0, Number(row[idx.Q2]) || 0,
        Number(row[idx.Q3]) || 0, Number(row[idx.Q4]) || 0,
        Number(row[idx.Q5]) || 0, Number(row[idx.Q6]) || 0,
        Number(row[idx.Q7]) || 0, Number(row[idx.Q8]) || 0
      ],
      bonusStage:    String(row[idx.bonusStage] || ""),
      bonusApplied:  row[idx.bonusApplied] ? String(row[idx.bonusApplied]).split("|").filter(Boolean) : [],
      bonusReaction: String(row[idx.bonusReaction] || ""),
      comment:       String(row[idx.comment] || "")
    };
  });
}

function handleSaveResponse(data) {
  var sheet = getSheet(RESP_SHEET, RESP_HEADERS);
  // 헤더 기반으로 안전하게 저장
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.indexOf("name") === -1) {
    sheet.insertColumnAfter(2);
    sheet.getRange(1, 3).setValue("name");
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }
  var a = data.answers || [];
  var rowMap = {
    timestamp: data.timestamp || new Date().toISOString(),
    empId: String(data.empId),
    name: data.name || "",
    branch: data.branch || "",
    timepoint: data.timepoint || "",
    Q1: a[0] || "", Q2: a[1] || "", Q3: a[2] || "", Q4: a[3] || "",
    Q5: a[4] || "", Q6: a[5] || "", Q7: a[6] || "", Q8: a[7] || "",
    bonusStage: data.bonusStage || "",
    bonusApplied: (data.bonusApplied || []).join("|"),
    bonusReaction: data.bonusReaction || "",
    comment: data.comment || ""
  };
  var row = headers.map(function (h) { return rowMap[h] !== undefined ? rowMap[h] : ""; });
  sheet.appendRow(row);
  return jsonOut({ success: true });
}

function readMasterMap() {
  var sheet = getSheet(MASTER_SHEET, MASTER_HEADERS);
  if (sheet.getLastRow() < 2) return {};
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  var map = {};
  data.forEach(function (row) {
    map[String(row[0])] = {
      name: String(row[1] || ""),
      grade: String(row[2] || ""),
      tenure: Number(row[3]) || 0,
      age: Number(row[4]) || 0,
      gender: String(row[5] || ""),
      channel: String(row[6] || "")
    };
  });
  return map;
}

// ── 집계 유틸 ────────────────────────────────────────
function calcAvg(sums, count) {
  return sums.map(function (s) {
    return count > 0 ? Math.round(s / count * 10) / 10 : 0;
  });
}

function calcStageAvg(qAvgs) {
  return {
    L: qAvgs[0] || qAvgs[1] ? Math.round((qAvgs[0] + qAvgs[1]) / 2 * 10) / 10 : 0,
    I: qAvgs[2] || qAvgs[3] ? Math.round((qAvgs[2] + qAvgs[3]) / 2 * 10) / 10 : 0,
    N: qAvgs[4] || qAvgs[5] ? Math.round((qAvgs[4] + qAvgs[5]) / 2 * 10) / 10 : 0,
    K: qAvgs[6] || qAvgs[7] ? Math.round((qAvgs[6] + qAvgs[7]) / 2 * 10) / 10 : 0
  };
}

function aggregateByTimepoint(responses) {
  var tps = ["pre", "post", "followup"];
  var counts = {}; var sums = {};
  tps.forEach(function (tp) { counts[tp] = 0; sums[tp] = [0,0,0,0,0,0,0,0]; });

  responses.forEach(function (r) {
    var tp = r.timepoint;
    if (counts[tp] !== undefined) {
      counts[tp]++;
      r.answers.forEach(function (a, i) { sums[tp][i] += a; });
    }
  });

  var avgs = {}; var stageAvgs = {};
  tps.forEach(function (tp) {
    avgs[tp] = calcAvg(sums[tp], counts[tp]);
    stageAvgs[tp] = calcStageAvg(avgs[tp]);
  });

  return { counts: counts, avgs: avgs, stageAvgs: stageAvgs };
}

// ── API: 전체 요약 ───────────────────────────────────
function getSummary() {
  var responses = readAllResponses();
  var master = readMasterMap();
  var agg = aggregateByTimepoint(responses);

  // 지점 목록
  var branchSet = {};
  responses.forEach(function (r) { branchSet[r.branch] = true; });
  var branches = Object.keys(branchSet).sort();

  // 지점별 요약
  var branchSummary = {};
  branches.forEach(function (b) {
    var bResp = responses.filter(function (r) { return r.branch === b; });
    var bAgg = aggregateByTimepoint(bResp);
    // 고유 FP 수
    var fpSet = {};
    bResp.forEach(function (r) { fpSet[r.empId] = true; });
    branchSummary[b] = {
      counts: bAgg.counts,
      stageAvgs: bAgg.stageAvgs,
      fpCount: Object.keys(fpSet).length
    };
  });

  // 그룹 분석 (마스터 데이터 필요)
  var hasMaster = Object.keys(master).length > 0;
  var groups = { grade: {}, tenure: {}, channel: {} };

  if (hasMaster) {
    responses.forEach(function (r) {
      var m = master[r.empId];
      if (!m) return;

      // 성적단별
      if (m.grade) {
        if (!groups.grade[m.grade]) groups.grade[m.grade] = { count: 0, sums: [0,0,0,0,0,0,0,0] };
        groups.grade[m.grade].count++;
        r.answers.forEach(function (a, i) { groups.grade[m.grade].sums[i] += a; });
      }
      // 채널별
      if (m.channel) {
        if (!groups.channel[m.channel]) groups.channel[m.channel] = { count: 0, sums: [0,0,0,0,0,0,0,0] };
        groups.channel[m.channel].count++;
        r.answers.forEach(function (a, i) { groups.channel[m.channel].sums[i] += a; });
      }
      // 차월 구간별
      if (m.tenure > 0) {
        var bracket = m.tenure <= 6 ? "1-6차월" :
                      m.tenure <= 12 ? "7-12차월" :
                      m.tenure <= 24 ? "13-24차월" : "25차월+";
        if (!groups.tenure[bracket]) groups.tenure[bracket] = { count: 0, sums: [0,0,0,0,0,0,0,0] };
        groups.tenure[bracket].count++;
        r.answers.forEach(function (a, i) { groups.tenure[bracket].sums[i] += a; });
      }
    });

    // sums → avgs
    ["grade", "tenure", "channel"].forEach(function (gType) {
      Object.keys(groups[gType]).forEach(function (gKey) {
        var g = groups[gType][gKey];
        g.avgs = calcAvg(g.sums, g.count);
        g.stageAvg = calcStageAvg(g.avgs);
        delete g.sums;
      });
    });
  }

  // 보너스 통계
  var bonus = {
    helpfulStage: { L: 0, I: 0, N: 0, K: 0 },
    applied: {},
    reaction: { positive: 0, neutral: 0, negative: 0 }
  };
  responses.forEach(function (r) {
    if (r.timepoint === "post" && r.bonusStage) {
      bonus.helpfulStage[r.bonusStage] = (bonus.helpfulStage[r.bonusStage] || 0) + 1;
    }
    if (r.timepoint === "followup") {
      r.bonusApplied.forEach(function (item) {
        bonus.applied[item] = (bonus.applied[item] || 0) + 1;
      });
      if (r.bonusReaction) {
        bonus.reaction[r.bonusReaction] = (bonus.reaction[r.bonusReaction] || 0) + 1;
      }
    }
  });

  return {
    totalResponses: responses.length,
    counts: agg.counts,
    avgs: agg.avgs,
    stageAvgs: agg.stageAvgs,
    branches: branches,
    branchSummary: branchSummary,
    groups: groups,
    hasMaster: hasMaster,
    bonus: bonus
  };
}

// ── API: 지점 목록 ───────────────────────────────────
function getBranches() {
  var responses = readAllResponses();
  var set = {};
  responses.forEach(function (r) { set[r.branch] = true; });
  return { branches: Object.keys(set).sort() };
}

// ── API: 지점 리포트 ─────────────────────────────────
function getBranchReport(branch) {
  var responses = readAllResponses().filter(function (r) { return r.branch === branch; });
  var master = readMasterMap();

  if (responses.length === 0) return { branch: branch, error: "데이터 없음" };

  var agg = aggregateByTimepoint(responses);

  // 개별 FP 목록
  var fpMap = {};
  responses.forEach(function (r) {
    if (!fpMap[r.empId]) fpMap[r.empId] = { empId: r.empId, responses: [] };
    fpMap[r.empId].responses.push(r);
  });

  var fps = Object.keys(fpMap).map(function (eid) {
    var fp = fpMap[eid];
    var m = master[eid];
    var tps = fp.responses.map(function (r) { return r.timepoint; });
    return {
      empId: eid,
      name: m ? m.name : "",
      responseCount: fp.responses.length,
      timepoints: tps,
      hasPre: tps.indexOf("pre") >= 0,
      hasPost: tps.indexOf("post") >= 0,
      hasFollowup: tps.indexOf("followup") >= 0
    };
  });

  return {
    branch: branch,
    counts: agg.counts,
    avgs: agg.avgs,
    stageAvgs: agg.stageAvgs,
    fps: fps,
    totalFPs: fps.length
  };
}

// ── API: 개별 FP 상세 ────────────────────────────────
function getFPDetail(empId) {
  var eid = String(empId);
  var responses = readAllResponses().filter(function (r) { return r.empId === eid; });
  var master = readMasterMap();
  var m = master[eid] || {};

  if (responses.length === 0) return { empId: eid, error: "데이터 없음" };

  return {
    empId: eid,
    branch: responses[0].branch,
    name: m.name || "",
    master: m,
    responses: responses.map(function (r) {
      return {
        timepoint: r.timepoint,
        answers: r.answers,
        bonusStage: r.bonusStage,
        bonusApplied: r.bonusApplied,
        bonusReaction: r.bonusReaction,
        comment: r.comment,
        timestamp: r.timestamp
      };
    })
  };
}

// ── API: 전체 데이터 내보내기 ────────────────────────
function getExportData() {
  var responses = readAllResponses();
  var master = readMasterMap();
  return {
    data: responses.map(function (r) {
      var m = master[r.empId] || {};
      return {
        timestamp: r.timestamp, empId: r.empId, branch: r.branch,
        timepoint: r.timepoint,
        Q1: r.answers[0], Q2: r.answers[1], Q3: r.answers[2], Q4: r.answers[3],
        Q5: r.answers[4], Q6: r.answers[5], Q7: r.answers[6], Q8: r.answers[7],
        bonusStage: r.bonusStage,
        bonusApplied: r.bonusApplied.join("|"),
        bonusReaction: r.bonusReaction,
        comment: r.comment,
        name: r.name || m.name || "",
        grade: m.grade || "",
        tenure: m.tenure || "", age: m.age || "",
        gender: m.gender || "", channel: m.channel || ""
      };
    })
  };
}
