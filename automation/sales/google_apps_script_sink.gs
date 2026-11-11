const SPREADSHEET_ID = '1k9aK6nBlca-o6k8-hOBqvmnV3SouWA3EcDY9kRSs_zI';
const SHEET_NAME = '見込み客一覧';

function scoreLead(text) {
  let score = 20;
  const reasons = [];
  const has = (words) => words.some((word) => text.indexOf(word) !== -1);
  if (has(['毎日','毎週','繰り返し','転記','コピペ','集計','日報','記録','定型'])) {
    score += 25; reasons.push('繰り返し作業');
  }
  if (has(['時間がかかる','手間','ミス','忘れる','二重入力','属人化','面倒'])) {
    score += 20; reasons.push('具体的な業務課題');
  }
  if (has(['見積','相談','導入','お願い','依頼','費用'])) {
    score += 20; reasons.push('相談・見積り意向');
  }
  if (has(['急ぎ','至急','今月','すぐ','困って','止まって'])) {
    score += 15; reasons.push('緊急度');
  }
  score = Math.min(score, 100);
  const priority = score >= 75 ? 'A' : score >= 50 ? 'B' : 'C';
  return { score, priority, reasons };
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const expected = PropertiesService.getScriptProperties().getProperty('BASE_SINK_SHARED_SECRET');
    if (!expected || payload.shared_secret !== expected) {
      return ContentService.createTextOutput(JSON.stringify({ok:false,error:'unauthorized'}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const r = payload.record || {};
    const text = String(r.message_text || '').trim();
    if (!text) {
      return ContentService.createTextOutput(JSON.stringify({ok:true,ignored:true}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const result = scoreLead(text);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('sheet not found');

    // A:P = 受付日時,会社・店舗名,担当者,連絡経路,相談内容,スコア,優先度,課題,希望時期,予算感,利用中ツール,次アクション,提案商品,見積状況,成約状況,メモ
    sheet.appendRow([
      new Date(Number(r.timestamp || Date.now())),
      '',
      '',
      'LINE',
      text,
      result.score,
      result.priority,
      result.reasons.join(' / '),
      '',
      '',
      '',
      '課題ヒアリング → 対象作業を1つに絞る → 提案確認',
      '業務自動化ミニパック 33,000円〜',
      '未対応',
      '未成約',
      'LINE userId: ' + String(r.user_id || '') + ' / eventId: ' + String(r.event_id || '')
    ]);

    return ContentService.createTextOutput(JSON.stringify({ok:true,score:result.score,priority:result.priority}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
