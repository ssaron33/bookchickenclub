/**
 * 북치킨클럽 Google Sheets API v0.8.0
 *
 * v0.8.0 정리:
 * - 참여자 데이터는 이름 문자열이 아니라 member_id 기반 객체로 반환
 * - 회의록에 author_member_id 저장
 * - 책 수정/회의록 등록은 모든 등록 회원에게 허용
 * - 회원 관리(upsertMember)는 관리자만 가능
 * - Meta 시트의 admin_member_ids로 관리자 지정
 * - Google Drive 표지 URL을 thumbnail 방식으로 통일
 * - 기존 uc?export=view 표지 URL 자동 정규화/마이그레이션 지원
 * - 기존 데이터와의 호환을 최대한 유지
 */

const SPREADSHEET_ID = '';
const COVER_FOLDER_NAME = '북치킨클럽-책표지';
const APP_SCHEMA_VERSION = '0.8.1';
const SHEETS = {
  members: 'Members',
  books: 'Books',
  bookMembers: 'BookMembers',
  records: 'Records',
  meetings: 'Meetings',
  meta: 'Meta',
};

function spreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function rows_(sheetName) {
  const sh = spreadsheet_().getSheetByName(sheetName);
  if (!sh) throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(row => row.some(v => v !== '')).map(row => {
    const o = {};
    headers.forEach((h, i) => o[h] = row[i] === undefined ? '' : row[i]);
    return o;
  });
}

function findBy_(items, key, value) {
  return items.find(x => String(x[key]) === String(value)) || null;
}

function now_() { return new Date().toISOString(); }

function nextId_(prefix, sheetName, idField) {
  const items = rows_(sheetName);
  const nums = items.map(x => String(x[idField] || ''))
    .map(x => Number((x.match(/(\d+)$/) || [,'0'])[1]))
    .filter(n => !isNaN(n));
  const n = (nums.length ? Math.max.apply(null, nums) : 0) + 1;
  return prefix + String(n).padStart(3, '0');
}

function appendObject_(sheetName, obj) {
  const sh = spreadsheet_().getSheetByName(sheetName);
  if (!sh) throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
  return obj;
}

function updateObject_(sheetName, idField, idValue, updates) {
  const sh = spreadsheet_().getSheetByName(sheetName);
  const items = rows_(sheetName);
  const existing = findBy_(items, idField, idValue);
  if (!existing) throw new Error(`대상을 찾을 수 없습니다: ${idValue}`);
  const row = items.indexOf(existing) + 2;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const updated = Object.assign({}, existing, updates);
  sh.getRange(row, 1, 1, headers.length).setValues([headers.map(h => updated[h] ?? '')]);
  return updated;
}

function ensureHeaders_(sheetName, requiredHeaders) {
  const ss = spreadsheet_();
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  const lastColumn = Math.max(sh.getLastColumn(), 1);
  let headers = sh.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  if (headers.length === 1 && headers[0] === '') headers = [];

  requiredHeaders.forEach(header => {
    if (!headers.includes(header)) {
      sh.getRange(1, headers.length + 1).setValue(header);
      headers.push(header);
    }
  });
  return sh;
}

function ensureMetaSheet_() {
  const sh = ensureHeaders_(SHEETS.meta, ['key', 'value', 'description', 'updated_at']);
  return sh;
}

function metaValue_(key) {
  const sh = spreadsheet_().getSheetByName(SHEETS.meta);
  if (!sh) return '';
  const items = rows_(SHEETS.meta);
  const row = items.find(x => String(x.key || '').trim() === String(key).trim());
  return row ? String(row.value || '').trim() : '';
}

function setMetaValue_(key, value, description) {
  const sh = ensureMetaSheet_();
  const items = rows_(SHEETS.meta);
  const existing = items.find(x => String(x.key || '').trim() === String(key).trim());
  if (existing) {
    return updateObject_(SHEETS.meta, 'key', existing.key, {
      value: value,
      description: description !== undefined ? description : existing.description || '',
      updated_at: now_(),
    });
  }
  return appendObject_(SHEETS.meta, {
    key,
    value,
    description: description || '',
    updated_at: now_(),
  });
}

function adminIds_() {
  return metaValue_('admin_member_ids')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

function isAdmin_(memberId) {
  const id = String(memberId || '').trim();
  return !!id && adminIds_().some(x => String(x) === id);
}

function requireAdmin_(memberId) {
  ensureMember_(memberId);
  if (!isAdmin_(memberId)) throw new Error('관리자 권한이 필요합니다.');
}

function getCoverFolder_() {
  const folders = DriveApp.getFoldersByName(COVER_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(COVER_FOLDER_NAME);
}

function driveFileIdFromUrl_(value) {
  const s = String(value || '').trim();
  if (!s) return '';

  // Drive 파일 ID 단독 저장도 허용한다.
  if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return s;

  try {
    const u = new URL(s);
    if (u.hostname !== 'drive.google.com' && u.hostname !== 'www.drive.google.com') return '';

    const queryId = u.searchParams.get('id');
    if (queryId) return queryId;

    const match = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (match) return match[1];
  } catch (err) {
    return '';
  }
  return '';
}

function normalizeCoverUrl_(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  const fileId = driveFileIdFromUrl_(s);
  if (!fileId) return s;
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`;
}

function saveCover_(base64, mimeType, title) {
  if (!base64) return '';
  if (!mimeType || !/^image\/(jpeg|png|webp|gif)$/i.test(mimeType)) {
    throw new Error('지원하지 않는 표지 이미지 형식입니다. JPG, PNG, WEBP, GIF만 사용할 수 있습니다.');
  }
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > 8 * 1024 * 1024) throw new Error('표지 이미지는 8MB 이하만 사용할 수 있습니다.');
  const ext = mimeType.toLowerCase() === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
  const safeTitle = String(title || 'book').replace(/[\\/:*?"<>|#%{}~&]/g, '_').slice(0, 80);
  const blob = Utilities.newBlob(bytes, mimeType, `${safeTitle}_${Date.now()}.${ext}`);
  const file = getCoverFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return normalizeCoverUrl_(`https://drive.google.com/uc?export=view&id=${file.getId()}`);
}

function migrateCoverUrls_() {
  const sh = spreadsheet_().getSheetByName(SHEETS.books);
  if (!sh) return 0;
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return 0;
  const headers = values[0].map(String);
  const coverIndex = headers.indexOf('cover');
  const idIndex = headers.indexOf('book_id');
  if (coverIndex < 0) return 0;

  let changed = 0;
  for (let r = 1; r < values.length; r++) {
    const current = String(values[r][coverIndex] || '').trim();
    const normalized = normalizeCoverUrl_(current);
    if (normalized && normalized !== current) {
      sh.getRange(r + 1, coverIndex + 1).setValue(normalized);
      changed++;
    }
  }
  return changed;
}

function setupV081() {
  const ss = spreadsheet_();
  ensureHeaders_(SHEETS.members, ['member_id', 'name', 'cohort', 'service_number', 'created_at', 'updated_at']);
  ensureHeaders_(SHEETS.books, ['book_id', 'title', 'author', 'status', 'meeting_date', 'cover', 'created_at', 'updated_at']);
  ensureHeaders_(SHEETS.bookMembers, ['book_id', 'member_id', 'role', 'created_at']);
  ensureHeaders_(SHEETS.records, ['record_id', 'book_id', 'member_id', 'record_date', 'title', 'page', 'extract', 'body', 'created_at', 'updated_at']);
  ensureHeaders_(SHEETS.meetings, ['meeting_id', 'book_id', 'meeting_date', 'title', 'body', 'author_member_id', 'created_at', 'updated_at']);
  ensureMetaSheet_();

  if (!metaValue_('admin_member_ids')) {
    setMetaValue_('admin_member_ids', '', '관리자로 지정할 member_id를 쉼표로 구분해 입력합니다. 예: m001,m002');
  }
  setMetaValue_('schema_version', APP_SCHEMA_VERSION, '현재 DB 구조 버전');

  const migratedCoverCount = migrateCoverUrls_();
  return json_({ok:true, schema_version:APP_SCHEMA_VERSION, migrated_cover_urls:migratedCoverCount, message:'v0.8.1 DB 구조 준비가 완료되었습니다. Records에 page와 extract 컬럼을 확인하세요.'});
}

// 이전 적용 안내에서 사용한 함수명과의 호환성을 위해 남겨둡니다.
function setupV080() { return setupV081(); }

function getData_() {
  const members = rows_(SHEETS.members);
  const books = rows_(SHEETS.books);
  const links = rows_(SHEETS.bookMembers);
  const records = rows_(SHEETS.records);
  const meetings = rows_(SHEETS.meetings);
  const membersById = {};
  members.forEach(m => membersById[m.member_id] = m);

  const booksOut = books.map(b => {
    const participantLinks = links.filter(x => String(x.book_id) === String(b.book_id));
    const participants = participantLinks.map(x => membersById[x.member_id]).filter(Boolean)
      .map(m => ({id:m.member_id, name:m.name, cohort:m.cohort}));
    return {
      id: `book-${b.book_id}`,
      book_id: b.book_id,
      title: b.title,
      author: b.author,
      status: b.status,
      date: b.meeting_date || '미정',
      cover: normalizeCoverUrl_(b.cover || 'green') || 'green',
      participants,
    };
  });

  const recordsOut = records.map(r => {
    const m = membersById[r.member_id];
    const b = books.find(x => String(x.book_id) === String(r.book_id));
    return {
      id: r.record_id,
      book: b ? `book-${b.book_id}` : '',
      book_id: r.book_id,
      member_id: r.member_id,
      author: m ? `${m.name} (${m.cohort})` : '알 수 없는 회원',
      date: r.record_date,
      title: r.title || (b ? `${b.title} — 독서 기록` : '독서 기록'),
      page: r.page === undefined || r.page === null ? '' : String(r.page),
      extract: r.extract || '',
      body: r.body,
    };
  });

  const meetingsOut = meetings.map(m => {
    const authorMember = membersById[m.author_member_id];
    return {
      id: m.meeting_id,
      book: `book-${m.book_id}`,
      book_id: m.book_id,
      date: m.meeting_date,
      title: m.title,
      body: m.body,
      author_member_id: m.author_member_id || '',
      author: authorMember ? `${authorMember.name} (${authorMember.cohort})` : '',
    };
  });

  const membersOut = members.map(m => ({
    id: m.member_id, name: `${m.name} (${m.cohort})`, plain_name: m.name, cohort: m.cohort,
  }));

  return {ok:true, members:membersOut, books:booksOut, records:recordsOut, meetings:meetingsOut, generated_at:now_()};
}

function doGet(e) {
  try {
    const action = String(e.parameter.action || 'data');
    if (action === 'health') return json_({ok:true, service:'bookchickenclub', schema_version:APP_SCHEMA_VERSION, time:now_()});

    if (action === 'member') {
      const serviceNumber = String(e.parameter.service_number || '').trim();
      if (!serviceNumber) return json_({ok:false,error:'service_number가 필요합니다.'});
      const member = rows_(SHEETS.members).find(m => String(m.service_number).trim() === serviceNumber);
      if (!member) return json_({ok:false,error:'회원 정보를 찾을 수 없습니다.'});
      return json_({ok:true,member:{id:member.member_id,name:member.name,cohort:member.cohort,is_admin:isAdmin_(member.member_id)}});
    }

    if (action === 'adminMembers') {
      const adminMemberId = String(e.parameter.member_id || '').trim();
      requireAdmin_(adminMemberId);
      const members = rows_(SHEETS.members).map(m => ({
        id:m.member_id, name:m.name, cohort:m.cohort, service_number:m.service_number
      }));
      return json_({ok:true,members});
    }

    if (action === 'data') return json_(getData_());
    return json_({ok:false,error:`알 수 없는 action: ${action}`});
  } catch (err) {
    return json_({ok:false,error:String(err.message || err)});
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = String(payload.action || '');

    if (action === 'addRecord') {
      requireFields_(payload, ['book_id','member_id','record_date','body']);
      ensureMember_(payload.member_id); ensureBook_(payload.book_id);
      const obj = {
        record_id: nextId_('r', SHEETS.records, 'record_id'), book_id:payload.book_id,
        member_id:payload.member_id, record_date:payload.record_date, title:payload.title || '',
        page:payload.page === undefined || payload.page === null ? '' : String(payload.page),
        extract:payload.extract || '', body:payload.body, created_at:now_(), updated_at:now_(),
      };
      appendObject_(SHEETS.records,obj);
      return json_({ok:true,record:obj});
    }

    if (action === 'updateRecord') {
      requireFields_(payload, ['record_id','member_id','record_date','body']);
      const existing = findBy_(rows_(SHEETS.records), 'record_id', payload.record_id);
      if (!existing) throw new Error('독서 기록을 찾을 수 없습니다.');
      if (String(existing.member_id) !== String(payload.member_id)) throw new Error('본인이 작성한 기록만 수정할 수 있습니다.');
      const updated = updateObject_(SHEETS.records, 'record_id', payload.record_id, {
        record_date:payload.record_date, title:payload.title || '',
        page:payload.page === undefined || payload.page === null ? String(existing.page || '') : String(payload.page),
        extract:payload.extract === undefined || payload.extract === null ? String(existing.extract || '') : String(payload.extract),
        body:payload.body, updated_at:now_(),
      });
      return json_({ok:true,record:updated});
    }

    if (action === 'deleteRecord') {
      requireFields_(payload, ['record_id','member_id']);
      const sh = spreadsheet_().getSheetByName(SHEETS.records);
      const items = rows_(SHEETS.records);
      const existing = findBy_(items, 'record_id', payload.record_id);
      if (!existing) throw new Error('독서 기록을 찾을 수 없습니다.');
      if (String(existing.member_id) !== String(payload.member_id)) throw new Error('본인이 작성한 기록만 삭제할 수 있습니다.');
      sh.deleteRow(items.indexOf(existing) + 2);
      return json_({ok:true,deleted_record_id:payload.record_id});
    }

    if (action === 'addBook') {
      requireFields_(payload, ['title','author','status','member_id']);
      ensureMember_(payload.member_id);
      const cover = payload.cover_base64 ? saveCover_(payload.cover_base64,payload.cover_type,payload.title) : normalizeCoverUrl_(payload.cover || 'green');
      const obj = {
        book_id:nextId_('b',SHEETS.books,'book_id'), title:payload.title, author:payload.author,
        status:payload.status, meeting_date:payload.meeting_date || '미정', cover:cover || 'green',
        created_at:now_(), updated_at:now_(),
      };
      appendObject_(SHEETS.books,obj);
      const link = {book_id:obj.book_id,member_id:payload.member_id,role:'participant',created_at:now_()};
      appendObject_(SHEETS.bookMembers,link);
      return json_({ok:true,book:obj,book_id:obj.book_id});
    }

    if (action === 'updateBook') {
      requireFields_(payload, ['book_id','member_id','title','author','status']);
      ensureMember_(payload.member_id);
      ensureBook_(payload.book_id);
      const existing = findBy_(rows_(SHEETS.books),'book_id',payload.book_id);
      let cover = normalizeCoverUrl_(existing.cover || 'green');
      if (payload.cover_base64) cover = saveCover_(payload.cover_base64,payload.cover_type,payload.title);
      const updated = updateObject_(SHEETS.books,'book_id',payload.book_id,{
        title:payload.title, author:payload.author, status:payload.status,
        meeting_date:payload.meeting_date || '미정', cover:cover || 'green', updated_at:now_(),
      });
      return json_({ok:true,book:updated,book_id:updated.book_id});
    }

    if (action === 'addMeeting') {
      requireFields_(payload,['book_id','member_id','meeting_date','title','body']);
      ensureBook_(payload.book_id); ensureMember_(payload.member_id);
      const obj={
        meeting_id:nextId_('m',SHEETS.meetings,'meeting_id'),
        book_id:payload.book_id,
        meeting_date:payload.meeting_date,
        title:payload.title,
        body:payload.body,
        author_member_id:payload.member_id,
        created_at:now_(),
        updated_at:now_()
      };
      appendObject_(SHEETS.meetings,obj);
      return json_({ok:true,meeting:obj});
    }

    if (action === 'addBookMember') {
      requireFields_(payload,['book_id','member_id']);
      ensureBook_(payload.book_id); ensureMember_(payload.member_id);
      const links=rows_(SHEETS.bookMembers);
      if(links.some(x=>String(x.book_id)===String(payload.book_id)&&String(x.member_id)===String(payload.member_id))) return json_({ok:true,already_exists:true});
      const obj={book_id:payload.book_id,member_id:payload.member_id,role:payload.role||'participant',created_at:now_()};
      appendObject_(SHEETS.bookMembers,obj);
      return json_({ok:true,link:obj});
    }

    if (action === 'upsertMember') {
      requireFields_(payload,['admin_member_id','name','cohort','service_number']);
      requireAdmin_(payload.admin_member_id);
      const items=rows_(SHEETS.members);
      const memberId=String(payload.member_id || '').trim();
      const serviceNumber=String(payload.service_number || '').trim();
      const existing=memberId ? findBy_(items,'member_id',memberId) : null;
      const serviceOwner=items.find(x=>String(x.service_number).trim()===serviceNumber);

      if(serviceOwner && (!existing || String(serviceOwner.member_id)!==String(existing.member_id))) {
        throw new Error('이미 다른 회원에게 등록된 군번입니다.');
      }

      if(existing){
        const updated=updateObject_(SHEETS.members,'member_id',existing.member_id,{
          name:payload.name,cohort:payload.cohort,service_number:serviceNumber,updated_at:now_()
        });
        return json_({ok:true,member:updated});
      }

      const obj={
        member_id:nextId_('m',SHEETS.members,'member_id'),
        name:payload.name,
        cohort:payload.cohort,
        service_number:serviceNumber,
        created_at:now_(),
        updated_at:now_()
      };
      appendObject_(SHEETS.members,obj);
      return json_({ok:true,member:obj});
    }

    // 이전 클라이언트/수동 호출과의 호환을 유지하되, 회원 식별을 요구한다.
    if (action === 'upsertBook') {
      requireFields_(payload,['title','author','status','member_id']);
      ensureMember_(payload.member_id);
      const items=rows_(SHEETS.books),existing=payload.book_id?findBy_(items,'book_id',payload.book_id):null;
      if(existing){
        const updated=updateObject_(SHEETS.books,'book_id',existing.book_id,{title:payload.title,author:payload.author,status:payload.status,meeting_date:payload.meeting_date||'미정',cover:normalizeCoverUrl_(payload.cover||existing.cover||'green'),updated_at:now_()});
        return json_({ok:true,book:updated});
      }
      const obj={book_id:nextId_('b',SHEETS.books,'book_id'),title:payload.title,author:payload.author,status:payload.status,meeting_date:payload.meeting_date||'미정',cover:normalizeCoverUrl_(payload.cover||'green'),created_at:now_(),updated_at:now_()};
      appendObject_(SHEETS.books,obj);
      return json_({ok:true,book:obj});
    }

    return json_({ok:false,error:`알 수 없는 action: ${action}`});
  } catch(err) {
    return json_({ok:false,error:String(err.message||err)});
  } finally { lock.releaseLock(); }
}

function requireFields_(obj,fields){const missing=fields.filter(k=>obj[k]===undefined||obj[k]===null||String(obj[k])==='');if(missing.length)throw new Error(`필수 항목 누락: ${missing.join(', ')}`);}
function ensureMember_(id){if(!findBy_(rows_(SHEETS.members),'member_id',id))throw new Error(`회원이 없습니다: ${id}`);}
function ensureBook_(id){if(!findBy_(rows_(SHEETS.books),'book_id',id))throw new Error(`책이 없습니다: ${id}`);}

// Drive 권한 승인용. 처음 한 번 편집기에서 실행하면 됩니다.
function authorizeDrive(){
  const folders=DriveApp.getFoldersByName(COVER_FOLDER_NAME);
  if(!folders.hasNext()) DriveApp.createFolder(COVER_FOLDER_NAME);
}
