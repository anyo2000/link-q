/**
 * LINK 컨설팅 진단 — Google Apps Script 백엔드
 *
 * 사용법:
 * 1. Google Sheets에서 새 스프레드시트를 생성합니다.
 * 2. 첫 번째 시트 이름을 "응답" 으로 변경합니다.
 * 3. 첫 행(헤더)에 다음을 입력합니다:
 *    A1: timestamp | B1: branch | C1: empId | D1: Q1 | E1: Q2 | F1: Q3 | G1: Q4 | H1: Q5 | I1: result
 * 4. https://script.google.com 에서 새 프로젝트를 생성합니다.
 * 5. 아래 SPREADSHEET_ID를 본인 스프레드시트 ID로 변경합니다.
 *    (스프레드시트 URL에서 /d/ 와 /edit 사이의 문자열)
 * 6. 이 파일의 내용을 전체 복사하여 붙여넣습니다.
 * 7. 배포 > 새 배포 > 유형: 웹 앱 을 선택합니다.
 *    - 실행 계정: 본인
 *    - 액세스 권한: 모든 사용자
 * 8. 배포 후 생성된 URL을 index.html의 GAS_URL 변수에 붙여넣습니다.
 */

// ★ 여기에 스프레드시트 ID를 붙여넣으세요
// URL 예시: https://docs.google.com/spreadsheets/d/여기가_ID/edit
const SPREADSHEET_ID = "1_ZoOHXGxJ8qhsc4DUZuLcfC2h_mJMVwsDYxPAIRWMeQ";
const SHEET_NAME = "응답";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.branch || "",
      data.empId || "",
      (data.answers && data.answers[0]) || "",
      (data.answers && data.answers[1]) || "",
      (data.answers && data.answers[2]) || "",
      (data.answers && data.answers[3]) || "",
      (data.q5 || []).join("|"),
      data.result || "",
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const data = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      data.push({
        timestamp: row[0],
        branch: row[1],
        empId: String(row[2]),
        answers: [row[3], row[4], row[5], row[6]].map(Number),
        q5: row[7] ? String(row[7]).split("|") : [],
        result: row[8],
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
