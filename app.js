// 북치킨클럽 v0.8.0 — 안정화/데이터 구조 정리
const API_URL = 'https://script.google.com/macros/s/AKfycbxONtBlo8vsHmi8xdoOt5lJGHjnLOf6o3zPuIB1sYB3Gb2tb2EGe69ET-UFSal03y3K6A/exec';
const APP_VERSION = '0.8.0';

const data = {
  books: [],
  members: [],
  records: [],
  meetings: []
};

let sharedDbAvailable = false;
let lastDataError = '';
let dataLoading = true;

const fallbackData = {
  books: [
    {id:'book-b001', book_id:'b001', title:'노르웨이의 숲', author:'무라카미 하루키', status:'읽은 책', date:'미정', cover:'green', participants:[{id:'m001',name:'김정운',cohort:'869기'}]}
  ],
  members: [
    {id:'m001', name:'김정운 (869기)', plain_name:'김정운', cohort:'869기'}
  ],
  records: [
    {id:'r001', book:'book-b001', book_id:'b001', member_id:'m001', author:'김정운 (869기)', date:'2026.10.07', title:'노르웨이의 숲 — 독서 기록', body:'읽으면서 등장인물들의 관계와 감정이 계속 신경 쓰였다.\n\n특히 지나간 기억과 현재의 감정이 서로 얽히는 방식이 인상적이었다. 생각보다 오래 여운이 남을 것 같다.'}
  ],
  meetings: []
};

const app = document.getElementById('app');
const route = () => location.hash.replace(/^#\/?/, '') || 'home';

function navigate(hash){
  const target = String(hash || '#home');
  if(location.hash === target){ render(); }
  else location.hash = target;
}

function normalizeBookId(id){
  let s = String(id ?? '').trim();
  try { s = decodeURIComponent(s); } catch(e) {}
  if(!s) return '';
  return s.startsWith('book-') ? s : `book-${s}`;
}

function copyData(source){
  data.books = Array.isArray(source.books) ? source.books : [];
  data.members = Array.isArray(source.members) ? source.members : [];
  data.records = Array.isArray(source.records) ? source.records : [];
  data.meetings = Array.isArray(source.meetings) ? source.meetings : [];
}

function book(id){
  const target = normalizeBookId(id);
  return data.books.find(x => normalizeBookId(x.id || x.book_id) === target);
}

function normalizeDateInput(value){
  const s = String(value ?? '').trim();
  if(!s || s === '미정') return '';
  // Google Sheets에서 날짜가 2026.10.07 / 2026/10/07 등으로 들어오는 경우
  let m = s.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  // ISO datetime
  m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if(m) return m[1];
  return '';
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

async function fetchData(){
  dataLoading = true;
  lastDataError = '';

  // Google Apps Script는 간혹 첫 요청에서 리다이렉트/네트워크 지연이 발생할 수 있으므로
  // 짧게 재시도한다. API 자체가 정상이라면 첫 번째 또는 두 번째 요청에서 복구된다.
  let lastError = null;
  for(let attempt = 1; attempt <= 3; attempt++){
    try {
      const url = `${API_URL}?action=data&client=v0.8.0&_=${Date.now()}-${attempt}`;
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        redirect: 'follow',
        credentials: 'omit'
      });

      if(!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      console.info(`[북치킨클럽] 공유 DB 응답 ${attempt}/3`, result);

      // Apps Script가 ok=true를 반환했다면 공유 DB 연결 자체는 성공한 것이다.
      // 일부 컬렉션이 없거나 빈 값으로 반환되어도 연결 실패로 오판하지 않는다.
      if(result && result.ok === true){
        copyData({
          books: Array.isArray(result.books) ? result.books : [],
          members: Array.isArray(result.members) ? result.members : [],
          records: Array.isArray(result.records) ? result.records : [],
          meetings: Array.isArray(result.meetings) ? result.meetings : []
        });
        sharedDbAvailable = true;
        lastDataError = '';
        dataLoading = false;
        console.info('[북치킨클럽] 공유 DB 연결 성공', {
          books: data.books.length,
          members: data.members.length,
          records: data.records.length,
          meetings: data.meetings.length
        });
        return true;
      }

      throw new Error(result?.error || '공유 DB 응답이 정상적으로 반환되지 않았습니다.');
    } catch(error) {
      lastError = error;
      console.warn(`[북치킨클럽] 공유 DB 연결 실패 ${attempt}/3`, error);
      if(attempt < 3) await new Promise(resolve => setTimeout(resolve, 400 * attempt));
    }
  }

  sharedDbAvailable = false;
  dataLoading = false;
  lastDataError = lastError?.message || '공유 DB에 연결할 수 없습니다.';
  // file://에서 오프라인 프로토타입을 직접 열 때만 샘플 데이터를 사용한다.
  // GitHub Pages에서는 샘플 데이터를 실제 데이터처럼 보여주지 않는다.
  if(location.protocol === 'file:') copyData(fallbackData);
  else copyData({books:[], members:[], records:[], meetings:[]});
  return false;
}


function showDataErrorIfNeeded(ok){
  const banner = document.getElementById('dataStatus');
  if(!banner) return;
  banner.hidden = !!ok;
  if(ok){ banner.innerHTML = ''; return; }
  const detail = lastDataError ? ` (${escapeHtml(lastDataError)})` : '';
  const localNote = location.protocol === 'file:' ? ' 로컬 파일에서는 샘플 데이터가 표시됩니다.' : '';
  banner.innerHTML = `공유 DB에 연결하지 못했습니다.${detail}${localNote} <button type="button" onclick="retryData()">다시 연결</button>`;
}

async function retryData(){
  const banner = document.getElementById('dataStatus');
  if(banner){
    banner.hidden = false;
    banner.innerHTML = '공유 DB에 다시 연결하는 중...';
  }
  const ok = await fetchData();
  render();
  showDataErrorIfNeeded(ok);
}

function render(){
  const r = route();
  if(r === 'home') home();
  else if(r === 'books') books();
  else if(r === 'members') members();
  else if(r === 'member-admin') memberAdminPage();
  else if(r === 'records') records();
  else if(r === 'write-record') writeRecordPage();
  else if(r.startsWith('book/')) bookDetail(decodeURIComponent(r.split('/').slice(1).join('/')));
  else if(r.startsWith('member/')) memberDetail(decodeURIComponent(r.split('/').slice(1).join('/')));
  else if(r.startsWith('record-edit/')) recordEditPage(decodeURIComponent(r.split('/')[1]));
  else if(r.startsWith('record/')) recordDetail(decodeURIComponent(r.split('/')[1]));
  else if(r === 'login') loginPage();
  else home();
  updateAuth();
  window.scrollTo({top:0, behavior:'instant'});
}

function navButton(text, href){ return `<button class="link-button" type="button" onclick="navigate('#${href}')">${text}</button>`; }

function home(){
  app.innerHTML = `
    <section class="hero">
      <div><div class="eyebrow">BOOK CHICKEN CLUB</div>
      <h1>읽은 책을,<br>기억으로 남기다.</h1>
      <p>북치킨클럽의 독서 기록을 책을 중심으로 모아두는 작은 아카이브입니다.</p></div>
      <div class="hero-note">책, 사람, 기록, 모임의 관계를 한 곳에서 볼 수 있는 북치킨클럽 공유 아카이브입니다.</div>
    </section>
    <section class="stats">
      <div class="stat"><strong>${data.books.length}</strong><span>등록된 책</span></div>
      <div class="stat"><strong>${data.records.length}</strong><span>독서 기록</span></div>
      <div class="stat"><strong>${data.members.length}</strong><span>회원</span></div>
    </section>
    <section class="section">
      <div class="section-head"><div><h2>최근 책</h2><p>책을 중심으로 기록을 찾아보세요.</p></div>${navButton('전체 보기 →','books')}</div>
      <div class="book-grid">${data.books.slice(0,6).map(bookCard).join('') || '<div class="empty">등록된 책이 없습니다.</div>'}</div>
    </section>
    <section class="section">
      <div class="section-head"><div><h2>최근 독서 기록</h2><p>회원들이 남긴 기록입니다.</p></div>${navButton('전체 기록 →','records')}</div>
      <div class="list">${[...data.records].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,3).map(recordCard).join('') || '<div class="empty">등록된 독서 기록이 없습니다.</div>'}</div>
    </section>`;
}

function driveFileIdFromUrl(value){
  const s=String(value ?? '').trim();
  if(!s) return '';
  if(/^[A-Za-z0-9_-]{20,}$/.test(s)) return s;
  try{
    const u=new URL(s, location.href);
    if(u.hostname!=='drive.google.com' && u.hostname!=='www.drive.google.com') return '';
    const queryId=u.searchParams.get('id');
    if(queryId) return queryId;
    const match=u.pathname.match(/\/file\/d\/([^/]+)/);
    return match ? match[1] : '';
  }catch(e){ return ''; }
}

function normalizeCoverUrl(value){
  const s=String(value ?? '').trim();
  if(!s) return '';
  const id=driveFileIdFromUrl(s);
  if(!id) return s;
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`;
}

function participantLabel(participant){
  if(participant && typeof participant==='object'){
    const name=String(participant.name || '').trim();
    const cohort=String(participant.cohort || '').trim();
    return cohort ? `${name} (${cohort})` : name;
  }
  return String(participant ?? '').trim();
}

function participantId(participant){
  if(participant && typeof participant==='object') return String(participant.id ?? '').trim();
  const label=participantLabel(participant);
  const plain=label.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const matched=data.members.find(m=>String(m.plain_name || m.name || '').trim()===plain);
  return matched ? String(matched.id) : '';
}

function coverMarkup(item, className='book-cover'){
  const cover=normalizeCoverUrl(item.cover);
  if(cover && /^https?:\/\//i.test(cover)){
    const title=escapeHtml(item.title || '책 표지');
    return `<div class="${className} image-cover"><img src="${escapeHtml(cover)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.parentElement.classList.add('cover-broken')"><span class="cover-fallback">${title}</span></div>`;
  }
  const fallback=cover || 'green';
  return `<div class="${className} ${escapeHtml(fallback)}">${escapeHtml(item.title || '')}</div>`;
}

function bookCard(b){
  return `<article class="book-card" onclick="navigate('#book/${encodeURIComponent(b.id)}')">
    ${coverMarkup(b)}
    <div class="book-meta"><span class="status">${escapeHtml(b.status)}</span>
      <h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.author)}</p>
      <div class="tags"><span class="tag">${b.participants.length}명 참여</span>
      <span class="tag">${data.records.filter(r=>normalizeBookId(r.book)===normalizeBookId(b.id)).length}개 기록</span></div>
    </div>
  </article>`;
}


function isUserParticipant(bookItem, user){
  if(!bookItem || !user) return false;
  const participants=Array.isArray(bookItem.participants) ? bookItem.participants : [];
  const userId=String(user.id ?? '').trim();
  if(!userId) return false;
  return participants.some(participant => participantId(participant) === userId);
}

function bookDetail(id){
  const b = book(id);
  if(!b){
    app.innerHTML = `<div class="empty">책 정보를 찾을 수 없습니다.<br><button class="secondary" onclick="navigate('#books')">책 목록으로 돌아가기</button></div>`;
    return;
  }

  const user = getUser();
  const participants = Array.isArray(b.participants) ? b.participants : [];
  const participated = isUserParticipant(b, user);
  const rs = data.records.filter(r => normalizeBookId(r.book) === normalizeBookId(b.id))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const ms = data.meetings.filter(m => normalizeBookId(m.book) === normalizeBookId(b.id))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)));

  app.innerHTML = `
    <button class="back" onclick="navigate('#books')">← 책 목록으로 돌아가기</button>
    <section class="detail-header">
      ${coverMarkup(b,'detail-cover')}
      <div class="detail-info">
        <div class="eyebrow">BOOK DETAIL</div>
        <h1>${escapeHtml(b.title)}</h1>
        <div class="author">${escapeHtml(b.author)}</div>
        <div class="info-row">
          <span class="status">${escapeHtml(b.status)}</span>
          <span class="pill">모임일: ${escapeHtml(b.date || '미정')}</span>
          <span class="pill">${participants.length}명 참여</span>
          <span class="pill">${rs.length}개 기록</span>
        </div>
        <div class="action-row">
          ${user ? (participated
            ? `<button class="secondary" disabled>✓ 참여 중</button>`
            : `<button class="primary" onclick="participateBook('${escapeHtml(b.book_id)}')">+ 참여하기</button>`) : ''}
          ${user ? `<button class="secondary" onclick="showEditBookForm('${escapeHtml(b.book_id)}')">✎ 책 정보 수정</button>` : ''}
          ${user ? `<button class="secondary" onclick="showAddMeetingForm('${escapeHtml(b.book_id)}')">＋ 회의록 등록</button>` : ''}
          <button class="secondary" onclick="downloadBook('${encodeURIComponent(b.id)}')">TXT 다운로드</button>
        </div>
      </div>
    </section>

    <section class="content-grid">
      <div>
        <section class="section">
          <div class="section-head"><div><h2>참여자</h2><p>${b.participants.length}명</p></div></div>
          <div class="member-list">
            ${participants.map(p=>`<span class="member-chip">${escapeHtml(participantLabel(p))}</span>`).join('') || '<div class="empty">아직 참여자가 없습니다.</div>'}
          </div>
        </section>

        <section class="section">
          <div class="section-head"><div><h2>독서 기록</h2><p>${rs.length}개</p></div></div>
          <div class="list">${rs.map(recordCard).join('') || '<div class="empty">아직 독서 기록이 없습니다.</div>'}</div>
        </section>

        <div id="bookMeetingPanel" hidden></div>
        <section class="section">
          <div class="section-head"><div><h2>모임 회의록</h2><p>${ms.length}개</p></div></div>
          <div class="list">${ms.map(meetingCard).join('') || '<div class="empty">아직 회의록이 없습니다.</div>'}</div>
        </section>
      </div>
    </section>
    <div id="bookEditPanel"></div>`;
}

function showAddMeetingForm(bookId){
  const b=book(bookId), user=getUser();
  const panel=document.getElementById('bookMeetingPanel');
  if(!b || !user || !panel)return;
  panel.hidden=false;
  panel.innerHTML=`<section class="section"><div class="add-book-panel">
    <div class="section-head"><div><h2>회의록 등록</h2><p>${escapeHtml(b.title)} 모임에서 나눈 내용을 기록합니다.</p></div>
    <button class="back" type="button" onclick="hideAddMeetingForm()">닫기</button></div>
    <form id="meetingForm" class="auth-form">
      <label>모임 날짜<input id="meetingDate" type="date" required></label>
      <label>제목<input id="meetingTitle" required placeholder="예: 10월 모임 회의록"></label>
      <label>회의 내용<textarea id="meetingBody" rows="10" required placeholder="모임에서 나눈 이야기와 결정 사항을 적어주세요."></textarea></label>
      <button class="primary-button" type="submit">회의록 저장</button>
      <p id="meetingMessage" class="form-message"></p>
    </form></div></section>`;
  document.getElementById('meetingForm').addEventListener('submit',e=>saveMeeting(e,b));
}
function hideAddMeetingForm(){const p=document.getElementById('bookMeetingPanel');if(p){p.hidden=true;p.innerHTML='';}}
async function saveMeeting(e,b){
  e.preventDefault();
  const user=getUser(),msg=document.getElementById('meetingMessage');
  if(!user){navigate('#login');return;}
  if(!sharedDbAvailable){msg.textContent='공유 DB에 연결된 상태에서만 회의록을 저장할 수 있습니다.';return;}
  const date=document.getElementById('meetingDate').value;
  const title=document.getElementById('meetingTitle').value.trim();
  const body=document.getElementById('meetingBody').value.trim();
  if(!date||!title||!body){msg.textContent='모임 날짜, 제목, 내용을 모두 입력해주세요.';return;}
  msg.textContent='회의록을 저장하는 중...';
  try{
    const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'addMeeting',book_id:b.book_id,member_id:user.id,meeting_date:date,title,body})});
    const result=await response.json();
    if(!result.ok)throw new Error(result.error||'회의록 등록에 실패했습니다.');
    await fetchData();
    bookDetail(`book-${b.book_id}`);
  }catch(error){msg.textContent=`등록하지 못했습니다: ${error.message||error}`;}
}

function meetingCard(m){
  return `<article class="meeting-card">
    <details>
      <summary>${escapeHtml(m.date)} · ${escapeHtml(m.title)}</summary>
      <p>${m.author ? `<span class="meeting-author">작성자: ${escapeHtml(m.author)}</span>\n` : ''}${escapeHtml(m.body)}</p>
    </details>
  </article>`;
}

function showEditBookForm(bookId){
  const b = book(bookId);
  const panel = document.getElementById('bookEditPanel');
  if(!b || !panel) return;
  panel.innerHTML = `
    <section class="section">
      <div class="add-book-panel">
        <div class="section-head">
          <div><h2>책 정보 수정</h2><p>제목, 저자, 상태, 모임 날짜와 표지를 수정할 수 있습니다.</p></div>
          <button class="back" type="button" onclick="document.getElementById('bookEditPanel').innerHTML=''">닫기</button>
        </div>
        <form id="bookEditForm" class="auth-form book-form">
          <label>책 제목<input id="editBookTitle" required value="${escapeHtml(b.title)}"></label>
          <label>저자<input id="editBookAuthor" required value="${escapeHtml(b.author)}"></label>
          <label>상태<select id="editBookStatus">
            ${['읽을 책','읽는 중','읽은 책'].map(s=>`<option ${b.status===s?'selected':''}>${s}</option>`).join('')}
          </select></label>
          <label>모임 날짜 <span class="optional">(선택)</span><input id="editBookMeetingDate" type="date" value="${escapeHtml(normalizeDateInput(b.date))}"></label>
          <label>표지 교체 <span class="optional">(선택)</span><input id="editBookCover" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label>
          <p class="form-hint">새 이미지를 선택하지 않으면 기존 표지를 유지합니다. JPG, PNG, WEBP, GIF · 최대 8MB</p>
          <div id="editBookCoverPreview" class="cover-preview" hidden></div>
          <button class="primary-button" type="submit">수정 내용 저장</button>
          <p id="editBookMessage" class="form-message"></p>
        </form>
      </div>
    </section>`;
  document.getElementById('editBookCover').addEventListener('change', previewEditCover);
  document.getElementById('bookEditForm').addEventListener('submit', e=>saveBookEdit(e,b));
}

function previewEditCover(e){
  const file=e.target.files?.[0], preview=document.getElementById('editBookCoverPreview');
  if(!preview) return;
  if(!file){preview.hidden=true;return;}
  if(file.size>8*1024*1024){e.target.value='';preview.hidden=true;alert('표지 이미지는 8MB 이하로 올려주세요.');return;}
  preview.hidden=false;
  preview.innerHTML=`<img src="${URL.createObjectURL(file)}" alt="표지 미리보기"><span>${escapeHtml(file.name)}</span>`;
}

async function saveBookEdit(e,b){
  e.preventDefault();
  const msg=document.getElementById('editBookMessage');
  const user=getUser();
  if(!user){navigate('#login');return;}
  if(!sharedDbAvailable){msg.textContent='공유 DB에 연결된 상태에서만 수정할 수 있습니다.';return;}
  const title=document.getElementById('editBookTitle').value.trim();
  const author=document.getElementById('editBookAuthor').value.trim();
  const status=document.getElementById('editBookStatus').value;
  const meetingDate=document.getElementById('editBookMeetingDate').value || '미정';
  const file=document.getElementById('editBookCover').files?.[0];
  if(!title||!author){msg.textContent='책 제목과 저자를 입력해주세요.';return;}
  if(file && file.size>8*1024*1024){msg.textContent='표지 이미지는 8MB 이하로 올려주세요.';return;}
  msg.textContent='수정 내용을 저장하는 중...';
  try{
    let cover_base64='', cover_type='';
    if(file){
      const dataUrl=await fileToDataUrl(file);
      cover_base64=dataUrl.split(',')[1];
      cover_type=file.type;
    }
    const response=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({
        action:'updateBook',
        book_id:b.book_id,
        member_id:user.id,
        title, author, status,
        meeting_date:meetingDate,
        cover_base64, cover_type
      })
    });
    const result=await response.json();
    if(!result.ok) throw new Error(result.error||'책 수정에 실패했습니다.');
    await fetchData();
    bookDetail(`book-${b.book_id}`);
  }catch(error){
    msg.textContent=`수정하지 못했습니다: ${error.message||error}`;
  }
}

async function participateBook(bookId){
  const user=getUser();
  const msgId='bookActionMessage';
  const b=data.books.find(x=>String(x.book_id)===String(bookId));
  if(!user){navigate('#login');return;}
  if(!b)return;
  if(isUserParticipant(b, user))return;
  try{
    const response=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:'addBookMember',book_id:bookId,member_id:user.id,role:'participant'})
    });
    const result=await response.json();
    if(!result.ok)throw new Error(result.error||'참여 등록에 실패했습니다.');
    await fetchData();
    bookDetail(`book-${bookId}`);
  }catch(error){
    alert(`참여하지 못했습니다: ${error.message||error}`);
  }
}

function isAdmin(user=getUser()){ return !!user && user.is_admin === true; }

function members(){
  const ms=[...data.members].sort((a,b)=>String(a.cohort).localeCompare(String(b.cohort), 'ko') || String(a.plain_name||a.name).localeCompare(String(b.plain_name||b.name), 'ko'));
  const user=getUser();
  app.innerHTML=`<div class="page-title"><div class="eyebrow">CLUB MEMBERS</div><div class="page-title-row"><div><h1>회원</h1>
  <p>북치킨클럽의 회원과 각 회원이 남긴 독서 기록을 볼 수 있습니다.</p></div>
  ${isAdmin(user)?'<button class="primary add-book-button" onclick="navigate(\'#member-admin\')">회원 관리</button>':''}</div></div>
  <div class="stats"><div class="stat"><strong>${ms.length}</strong><span>전체 회원</span></div>
  <div class="stat"><strong>${new Set(ms.map(m=>m.cohort).filter(Boolean)).size}</strong><span>기수</span></div>
  <div class="stat"><strong>${data.records.length}</strong><span>전체 독서 기록</span></div></div>
  <section class="section"><div class="list">${ms.map(m=>`<article class="member-card" onclick="navigate('#member/${encodeURIComponent(m.id)}')" style="cursor:pointer">
    <div class="record-top"><div><strong>${escapeHtml(m.plain_name||m.name)}</strong><div class="record-book">${escapeHtml(m.cohort||'기수 미상')}</div></div>
    <span class="tag">${data.records.filter(r=>String(r.member_id)===String(m.id)).length}개 기록</span></div>
  </article>`).join('') || '<div class="empty">등록된 회원이 없습니다.</div>'}</div></section>`;
}

let adminMembersData=[];

async function memberAdminPage(){
  const user=getUser();
  if(!user){navigate('#login');return;}
  if(!isAdmin(user)){alert('관리자 권한이 필요합니다.');navigate('#members');return;}

  app.innerHTML=`<button class="back" onclick="navigate('#members')">← 회원 목록으로 돌아가기</button>
  <div class="page-title"><div class="eyebrow">MEMBER ADMIN</div><h1>회원 관리</h1><p>회원 추가 및 정보 수정은 관리자만 할 수 있습니다.</p></div>
  <section class="section"><div class="add-book-panel"><div class="section-head"><div><h2 id="memberAdminFormTitle">새 회원 추가</h2><p>군번은 로그인 식별용으로만 사용되며 일반 회원 화면에는 표시되지 않습니다.</p></div><button class="back" type="button" onclick="clearMemberAdminForm()">새로 입력</button></div>
    <form id="memberAdminForm" class="auth-form">
      <input id="memberAdminId" type="hidden">
      <label>이름<input id="memberAdminName" required placeholder="예: 김정운"></label>
      <label>기수<input id="memberAdminCohort" required placeholder="예: 869기"></label>
      <label>군번<input id="memberAdminServiceNumber" required placeholder="로그인에 사용할 군번"></label>
      <button class="primary-button" type="submit">저장</button>
      <p id="memberAdminMessage" class="form-message"></p>
    </form></div></section>
  <section class="section"><div class="section-head"><div><h2>현재 회원</h2><p id="memberAdminCount">불러오는 중...</p></div></div><div id="memberAdminList" class="list"><div class="empty">관리자 회원 목록을 불러오는 중...</div></div></section>`;

  document.getElementById('memberAdminForm').addEventListener('submit',saveMemberAdmin);
  await loadAdminMembers();
}

async function loadAdminMembers(){
  const user=getUser();
  const list=document.getElementById('memberAdminList');
  const count=document.getElementById('memberAdminCount');
  if(!user || !isAdmin(user) || !list) return;
  try{
    const response=await fetch(`${API_URL}?action=adminMembers&member_id=${encodeURIComponent(user.id)}&_=${Date.now()}`,{cache:'no-store'});
    const result=await response.json();
    if(!result.ok) throw new Error(result.error||'회원 목록을 불러오지 못했습니다.');
    adminMembersData=Array.isArray(result.members)?result.members:[];
    count.textContent=`${adminMembersData.length}명`;
    list.innerHTML=adminMembersData.map(m=>`<article class="member-card"><div class="record-top"><div><strong>${escapeHtml(m.name)}</strong><div class="record-book">${escapeHtml(m.cohort||'기수 미상')} · 군번 ${escapeHtml(m.service_number)}</div></div><button class="secondary" type="button" onclick="editMemberAdmin('${escapeHtml(m.id)}')">수정</button></div></article>`).join('') || '<div class="empty">등록된 회원이 없습니다.</div>';
  }catch(error){
    count.textContent='불러오기 실패';
    list.innerHTML=`<div class="empty">${escapeHtml(error.message||error)}</div>`;
  }
}

function clearMemberAdminForm(){
  document.getElementById('memberAdminId').value='';
  document.getElementById('memberAdminName').value='';
  document.getElementById('memberAdminCohort').value='';
  document.getElementById('memberAdminServiceNumber').value='';
  document.getElementById('memberAdminFormTitle').textContent='새 회원 추가';
  document.getElementById('memberAdminMessage').textContent='';
}

function editMemberAdmin(id){
  const m=adminMembersData.find(x=>String(x.id)===String(id));
  if(!m)return;
  document.getElementById('memberAdminId').value=m.id;
  document.getElementById('memberAdminName').value=m.name||'';
  document.getElementById('memberAdminCohort').value=m.cohort||'';
  document.getElementById('memberAdminServiceNumber').value=m.service_number||'';
  document.getElementById('memberAdminFormTitle').textContent=`회원 정보 수정 · ${m.name}`;
  document.getElementById('memberAdminMessage').textContent='';
  window.scrollTo({top:0,behavior:'smooth'});
}

async function saveMemberAdmin(e){
  e.preventDefault();
  const user=getUser();
  const msg=document.getElementById('memberAdminMessage');
  if(!user || !isAdmin(user)){msg.textContent='관리자 권한이 필요합니다.';return;}
  const memberId=document.getElementById('memberAdminId').value.trim();
  const name=document.getElementById('memberAdminName').value.trim();
  const cohort=document.getElementById('memberAdminCohort').value.trim();
  const serviceNumber=document.getElementById('memberAdminServiceNumber').value.trim();
  if(!name||!cohort||!serviceNumber){msg.textContent='이름, 기수, 군번을 모두 입력해주세요.';return;}
  msg.textContent='회원 정보를 저장하는 중...';
  try{
    const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'upsertMember',admin_member_id:user.id,member_id:memberId,name,cohort,service_number:serviceNumber})});
    const result=await response.json();
    if(!result.ok)throw new Error(result.error||'회원 저장에 실패했습니다.');
    await fetchData();
    if(memberId===String(user.id)){
      const refreshed={...user,name,cohort,service_number:serviceNumber};
      setUser(refreshed);
    }
    msg.textContent='저장했습니다.';
    clearMemberAdminForm();
    await loadAdminMembers();
  }catch(error){msg.textContent=`저장하지 못했습니다: ${error.message||error}`;}
}

function memberDetail(id){
  const m=data.members.find(x=>String(x.id)===String(id));
  if(!m){navigate('#members');return;}
  const rs=data.records.filter(r=>String(r.member_id)===String(m.id)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const participatedBooks=data.books.filter(b=>isUserParticipant(b, {id:m.id,name:m.plain_name||m.name}));
  app.innerHTML=`<button class="back" onclick="navigate('#members')">← 회원 목록으로 돌아가기</button>
  <div class="page-title"><div class="eyebrow">MEMBER</div><h1>${escapeHtml(m.plain_name||m.name)}</h1><p>${escapeHtml(m.cohort||'기수 미상')}</p></div>
  <section class="section"><div class="section-head"><div><h2>참여한 책</h2><p>${participatedBooks.length}권</p></div></div>
    <div class="book-grid">${participatedBooks.map(bookCard).join('') || '<div class="empty">아직 참여한 책이 없습니다.</div>'}</div></section>
  <section class="section"><div class="section-head"><div><h2>독서 기록</h2><p>${rs.length}개</p></div></div>
    <div class="list">${rs.map(recordCard).join('') || '<div class="empty">아직 독서 기록이 없습니다.</div>'}</div></section>`;
}

function books(){
  const statuses=['읽는 중','읽은 책','읽을 책'];
  const user=getUser();
  app.innerHTML=`<div class="page-title"><div class="eyebrow">BOOK ARCHIVE</div><div class="page-title-row"><div><h1>등록된 책</h1>
  <p>북치킨클럽에서 함께 읽은 책과 앞으로 읽을 책을 한곳에서 찾아볼 수 있습니다.</p></div>
  ${user?'<button class="primary add-book-button" onclick="showAddBookForm()">+ 책 추가</button>':''}</div></div>
  <div class="stats"><div class="stat"><strong>${data.books.length}</strong><span>전체 책</span></div>
  <div class="stat"><strong>${data.books.filter(b=>b.status==='읽는 중').length}</strong><span>읽는 중</span></div>
  <div class="stat"><strong>${data.books.filter(b=>b.status==='읽은 책').length}</strong><span>읽은 책</span></div></div>
  ${user?`<div id="addBookPanel" class="add-book-panel" hidden></div>`:''}
  ${statuses.map(st=>{const bs=data.books.filter(b=>b.status===st);return bs.length?`<section class="section"><div class="section-head"><div><h2>${st}</h2><p>${bs.length}권</p></div></div><div class="book-grid">${bs.map(bookCard).join('')}</div></section>`:''}).join('')}`;
}

function showAddBookForm(){
  const panel=document.getElementById('addBookPanel');
  if(!panel) return;
  panel.hidden=false;
  panel.innerHTML=`<div class="add-book-inner"><div class="section-head"><div><h2>새 책 등록</h2><p>등록한 회원은 자동으로 이 책의 참여자가 됩니다.</p></div><button class="back" type="button" onclick="hideAddBookForm()">닫기</button></div>
    <form id="bookForm" class="auth-form book-form">
      <label>책 제목<input id="bookTitle" required placeholder="예: 노르웨이의 숲"></label>
      <label>저자<input id="bookAuthor" required placeholder="예: 무라카미 하루키"></label>
      <label>상태<select id="bookStatus"><option>읽을 책</option><option>읽는 중</option><option>읽은 책</option></select></label>
      <label>모임 날짜 <span class="optional">(선택)</span><input id="bookMeetingDate" type="date"></label>
      <label>책 표지 <span class="optional">(선택)</span><input id="bookCover" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label>
      <p class="form-hint">JPG, PNG, WEBP, GIF · 최대 8MB</p>
      <div id="bookCoverPreview" class="cover-preview" hidden></div>
      <button class="primary-button" type="submit" ${sharedDbAvailable?'':'disabled'}>책 등록하기</button>
      <p id="bookMessage" class="form-message"></p>
    </form></div>`;
  const file=document.getElementById('bookCover');
  file.addEventListener('change',previewCover);
  document.getElementById('bookForm').addEventListener('submit',saveBook);
}
function hideAddBookForm(){const p=document.getElementById('addBookPanel');if(p){p.hidden=true;p.innerHTML='';}}
function previewCover(e){
  const file=e.target.files?.[0], preview=document.getElementById('bookCoverPreview');
  if(!file){preview.hidden=true;return;}
  if(file.size>8*1024*1024){e.target.value='';preview.hidden=true;alert('표지 이미지는 8MB 이하로 올려주세요.');return;}
  preview.hidden=false; preview.innerHTML=`<img src="${URL.createObjectURL(file)}" alt="표지 미리보기"><span>${escapeHtml(file.name)}</span>`;
}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
async function saveBook(e){
  e.preventDefault();
  const user=getUser(), msg=document.getElementById('bookMessage');
  if(!user){navigate('#login');return;}
  if(!sharedDbAvailable){msg.textContent='공유 DB에 연결된 상태에서만 책을 등록할 수 있습니다. 먼저 다시 연결해주세요.';return;}
  const title=document.getElementById('bookTitle').value.trim();
  const author=document.getElementById('bookAuthor').value.trim();
  const status=document.getElementById('bookStatus').value;
  const meetingDate=document.getElementById('bookMeetingDate').value;
  const file=document.getElementById('bookCover').files?.[0];
  if(!title||!author){msg.textContent='책 제목과 저자를 입력해주세요.';return;}
  if(file && file.size>8*1024*1024){msg.textContent='표지 이미지는 8MB 이하로 올려주세요.';return;}
  msg.textContent='책을 등록하는 중...';
  try{
    let cover_base64='', cover_type='';
    if(file){const dataUrl=await fileToDataUrl(file);cover_base64=dataUrl.split(',')[1];cover_type=file.type;}
    const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'addBook',title,author,status,meeting_date:meetingDate||'미정',member_id:user.id,cover_base64,cover_type})});
    const result=await response.json();
    if(!result.ok) throw new Error(result.error||'책 등록에 실패했습니다.');
    await fetchData();
    navigate(`#book/book-${encodeURIComponent(result.book_id)}`);
  }catch(error){msg.textContent=`등록하지 못했습니다: ${error.message||error}`;}
}

function records(){
  const rs=[...data.records].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  app.innerHTML=`<div class="page-title"><div class="eyebrow">READING NOTES</div><h1>전체 독서 기록</h1>
  <p>북치킨클럽 회원들이 남긴 모든 독서 기록을 최신 작성일 순으로 볼 수 있습니다.</p></div>
  <div class="stats"><div class="stat"><strong>${data.records.length}</strong><span>전체 기록</span></div>
  <div class="stat"><strong>${new Set(data.records.map(r=>r.author)).size}</strong><span>기록 작성자</span></div>
  <div class="stat"><strong>${new Set(data.records.map(r=>r.book)).size}</strong><span>기록이 있는 책</span></div></div>
  <section class="section"><div class="list">${rs.map(recordCard).join('')||'<div class="empty">등록된 독서 기록이 없습니다.</div>'}</div></section>`;
}

function recordCard(r){
  const b=book(r.book), user=getUser(), mine=!!user && String(r.member_id)===String(user.id);
  const ownerActions=mine ? `<div class="record-owner-actions">
    <button type="button" onclick="event.stopPropagation();navigate('#record-edit/${encodeURIComponent(r.id)}');return false;">수정</button>
    <button type="button" onclick="event.stopPropagation();deleteRecordPrompt('${String(r.id).replace(/'/g,"\\'")}');return false;">삭제</button>
  </div>` : '';
  return `<article class="record-card" onclick="navigate('#record/${encodeURIComponent(r.id)}')">
    <div class="record-top"><div><strong>${escapeHtml(r.author)}</strong><div class="record-book">${escapeHtml(b?.title||'알 수 없는 책')}</div></div>
    <span class="tag">${escapeHtml(r.date)}</span></div>
    <p class="excerpt">${escapeHtml(r.body)}</p>${ownerActions}</article>`;
}

function recordDetail(id){
  const r=data.records.find(x=>String(x.id)===String(id));
  if(!r) return records();
  const b=book(r.book), user=getUser(), mine=!!user && String(r.member_id)===String(user.id);
  app.innerHTML=`<button class="back" onclick="navigate('#records')">← 독서 기록 목록</button>
  <div class="page-title"><div class="eyebrow">READING NOTE</div><h1>${escapeHtml(r.title)}</h1>
  <p>${escapeHtml(r.author)} · ${escapeHtml(r.date)} · ${escapeHtml(b?.title||'')}</p></div>
  <article class="record-full"><h3>${escapeHtml(r.author)}</h3><div class="date">${escapeHtml(r.date)}</div>
  <div class="record-body">${escapeHtml(r.body)}</div></article>
  <div class="action-row"><button class="primary" onclick="navigate('#book/${encodeURIComponent(r.book)}')">책 페이지로 이동</button>${mine?`<button class="secondary" onclick="navigate('#record-edit/${encodeURIComponent(r.id)}')">✎ 수정</button><button class="danger-button" type="button" onclick="deleteRecordPrompt('${String(r.id).replace(/'/g,"\\'")}');return false;">삭제</button>`:''}</div>`;
}

function recordEditPage(id){
  const r=data.records.find(x=>String(x.id)===String(id)), user=getUser();
  if(!user){navigate('#login');return;}
  if(!r || String(r.member_id)!==String(user.id)){alert('본인이 작성한 기록만 수정할 수 있습니다.');navigate('#records');return;}
  app.innerHTML=`<button class="back" onclick="navigate('#record/${encodeURIComponent(r.id)}')">← 기록으로 돌아가기</button>
  <div class="page-title"><div class="eyebrow">EDIT READING NOTE</div><h1>독서 기록 수정</h1><p>작성자: ${escapeHtml(user.name)}</p></div>
  <div class="auth-card wide"><form id="recordEditForm" class="auth-form">
    <label>책<input disabled value="${escapeHtml(book(r.book)?.title||'알 수 없는 책')}"></label>
    <label>작성자<input disabled value="${escapeHtml(user.name)}"></label>
    <label>작성일<input id="editRecordDate" type="date" value="${escapeHtml(normalizeDateInput(r.date))}"></label>
    <label>제목<input id="editRecordTitle" value="${escapeHtml(r.title||'')}"></label>
    <label>기록<textarea id="editRecordContent" rows="14" required>${escapeHtml(r.body)}</textarea></label>
    <button class="primary-button" type="submit">수정 내용 저장</button><p id="editRecordMessage" class="form-message"></p>
  </form></div>`;
  document.getElementById('recordEditForm').addEventListener('submit',e=>saveRecordEdit(e,r));
}

async function saveRecordEdit(e,r){
  e.preventDefault();
  const msg=document.getElementById('editRecordMessage');
  if(!sharedDbAvailable){msg.textContent='공유 DB에 연결된 상태에서만 수정할 수 있습니다.';return;}
  const body=document.getElementById('editRecordContent').value.trim(), title=document.getElementById('editRecordTitle').value.trim(), date=document.getElementById('editRecordDate').value;
  if(!date){msg.textContent='작성일을 입력해주세요.';return;}
  if(!body){msg.textContent='기록 내용을 입력해주세요.';return;}
  msg.textContent='수정 내용을 저장하는 중...';
  try{
    const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'updateRecord',record_id:r.id,member_id:r.member_id,record_date:date,title:title||`${book(r.book)?.title||'책'} — 독서 기록`,body})});
    const result=await response.json();
    if(!result.ok)throw new Error(result.error||'수정에 실패했습니다.');
    await fetchData();
    navigate(`#record/${encodeURIComponent(r.id)}`);
  }catch(error){msg.textContent=`수정하지 못했습니다: ${error.message||error}`;}
}

async function deleteRecordPrompt(id){
  const r=data.records.find(x=>String(x.id)===String(id)), user=getUser();
  if(!r){alert('삭제할 기록을 찾을 수 없습니다.');return;}
  if(!user){navigate('#login');return;}
  if(String(r.member_id)!==String(user.id)){
    alert('본인이 작성한 기록만 삭제할 수 있습니다.');
    return;
  }
  if(!sharedDbAvailable){alert('공유 DB에 연결된 상태에서만 삭제할 수 있습니다.');return;}
  if(!confirm('이 독서 기록을 삭제할까요? 삭제하면 되돌릴 수 없습니다.'))return;
  try{
    const response=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:'deleteRecord',record_id:r.id,member_id:user.id})
    });
    const result=await response.json();
    if(!result.ok)throw new Error(result.error||'삭제에 실패했습니다.');
    await fetchData();
    navigate('#records');
  }catch(error){
    alert(`삭제하지 못했습니다: ${error.message||error}`);
  }
}
window.deleteRecordPrompt = deleteRecordPrompt;

function writeRecordPage(){
  const user=getUser();
  if(!user){ navigate('#login'); return; }
  app.innerHTML=`<div class="page-title"><div class="eyebrow">READING NOTE</div><h1>독서 기록 작성</h1>
  <p>작성자는 현재 로그인한 회원으로 자동 지정됩니다. 저장하면 모든 회원이 볼 수 있습니다.</p></div>
  <div class="auth-card wide">
    <form id="recordForm" class="auth-form">
      <label>책<select id="recordBook" required>${data.books.map(b=>`<option value="${escapeHtml(b.book_id)}">${escapeHtml(b.title)} — ${escapeHtml(b.author)}</option>`).join('')}</select></label>
      <label>작성자<input id="recordAuthor" disabled value="${escapeHtml(user.name)}"></label>
      <label>제목<input id="recordTitle" placeholder="예: 노르웨이의 숲 — 독서 기록"></label>
      <label>기록<textarea id="recordContent" rows="12" required placeholder="책을 읽고 남기고 싶은 내용을 적어주세요."></textarea></label>
      <button class="primary-button" type="submit" ${sharedDbAvailable && data.books.length?'':'disabled'}>공유 DB에 저장</button>
      <p id="recordMessage" class="form-message"></p>
    </form>
  </div>`;
  document.getElementById('recordForm').addEventListener('submit', saveRecord);
}

function loginPage(){
  app.innerHTML=`<div class="auth-page active"><div class="auth-card">
    <div class="eyebrow">BOOK CHICKEN CLUB</div><h1>로그인</h1>
    <p>군번을 입력하면 회원으로 로그인됩니다.</p>
    <form id="loginForm" class="auth-form"><label>군번<input id="loginUsername" autocomplete="username" placeholder="군번 입력" required></label>
    <button class="primary-button" type="submit">로그인</button><p id="loginMessage" class="form-message"></p></form>
  </div></div>`;
  document.getElementById('loginForm').addEventListener('submit', login);
}

async function login(e){
  e.preventDefault();
  const input=document.getElementById('loginUsername');
  const msg=document.getElementById('loginMessage');
  const serviceNumber=input.value.trim();
  if(!serviceNumber) return;
  msg.textContent='회원 정보를 확인하는 중...';
  try{
    const response=await fetch(`${API_URL}?action=member&service_number=${encodeURIComponent(serviceNumber)}&_=${Date.now()}`, {cache:'no-store'});
    const result=await response.json();
    if(!result.ok) throw new Error(result.error || '등록되지 않은 군번입니다.');
    setUser({id:result.member.id,name:result.member.name,cohort:result.member.cohort,service_number:serviceNumber,is_admin:result.member.is_admin===true});
    await fetchData();
    navigate('#home');
  }catch(error){
    msg.textContent = error.message || '로그인에 실패했습니다.';
  }
}

async function refreshLoggedInUser(){
  const current=getUser();
  if(!current?.service_number) return;
  try{
    const response=await fetch(`${API_URL}?action=member&service_number=${encodeURIComponent(current.service_number)}&_=${Date.now()}`,{cache:'no-store'});
    const result=await response.json();
    if(result?.ok && result.member){
      setUser({id:result.member.id,name:result.member.name,cohort:result.member.cohort,service_number:current.service_number,is_admin:result.member.is_admin===true});
    }
  }catch(error){
    console.warn('[북치킨클럽] 기존 로그인 정보 갱신 실패',error);
  }
}

async function saveRecord(e){
  e.preventDefault();
  const user=getUser();
  const msg=document.getElementById('recordMessage');
  if(!user){navigate('#login');return;}
  if(!sharedDbAvailable){msg.textContent='공유 DB에 연결된 상태에서만 기록을 저장할 수 있습니다. 먼저 다시 연결해주세요.';return;}
  if(!data.books.length){msg.textContent='등록된 책이 없습니다. 책을 먼저 등록해주세요.';return;}
  const bookId=document.getElementById('recordBook').value;
  const body=document.getElementById('recordContent').value.trim();
  const title=document.getElementById('recordTitle').value.trim();
  if(!body){msg.textContent='기록 내용을 입력해주세요.';return;}
  msg.textContent='저장하는 중...';
  try{
    const response=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({
        action:'addRecord',
        book_id:bookId,
        member_id:user.id,
        record_date:new Date().toISOString().slice(0,10),
        title:title || `${book(bookId)?.title || '책'} — 독서 기록`,
        body
      })
    });
    const result=await response.json();
    if(!result.ok) throw new Error(result.error || '저장에 실패했습니다.');
    await fetchData();
    msg.textContent='독서 기록을 저장했습니다. 이제 다른 회원도 볼 수 있습니다.';
    document.getElementById('recordContent').value='';
    document.getElementById('recordTitle').value='';
  }catch(error){
    msg.textContent=`저장하지 못했습니다: ${error.message || error}`;
  }
}

window.participateBook = participateBook;
window.showEditBookForm = showEditBookForm;
window.showAddMeetingForm = showAddMeetingForm;
window.hideAddMeetingForm = hideAddMeetingForm;
window.downloadBook = downloadBook;

function getUser(){
  try{return JSON.parse(localStorage.getItem('bcc_user')||'null');}
  catch(e){return null;}
}
function setUser(user){
  if(user)localStorage.setItem('bcc_user',JSON.stringify(user));
  else localStorage.removeItem('bcc_user');
  updateAuth();
}
function updateAuth(){
  const user=getUser();
  const currentUser=document.getElementById('currentUser');
  const loginLink=document.getElementById('loginLink');
  const logoutButton=document.getElementById('logoutButton');
  if(currentUser){currentUser.hidden=!user;if(user)currentUser.textContent=user.name;}
  if(loginLink)loginLink.hidden=!!user;
  if(logoutButton)logoutButton.hidden=!user;
}

function bookText(id){
  const b=book(id),rs=data.records.filter(r=>r.book===id),ms=data.meetings.filter(m=>m.book===id);
  return `북치킨클럽 - ${b.title}\n========================\n\n책 정보\n--------\n제목: ${b.title}\n저자: ${b.author}\n모임일: ${b.date}\n상태: ${b.status}\n\n참여자\n--------\n${b.participants.map(participantLabel).join('\n')||'(없음)'}\n\n${rs.map(r=>`[${r.author}의 독서 기록]\n------------------------\n작성일: ${r.date}\n제목: ${r.title}\n\n${r.body}`).join('\n\n')}\n\n[모임 회의록]\n------------------------\n${ms.map(m=>`${m.date} ${m.title}\n\n${m.body}`).join('\n\n')||'(없음)'}\n`;
}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function downloadBook(id){const decoded=decodeURIComponent(id);const b=book(decoded);if(b)download(`북치킨클럽_${b.title}.txt`,bookText(b.id));}
function downloadAll(){download('북치킨클럽_전체기록.txt',data.books.map(b=>bookText(b.id)).join('\n\n\n'));}

document.getElementById('menuButton')?.addEventListener('click',()=>document.getElementById('mobileNav')?.classList.toggle('open'));
document.querySelectorAll('[data-route]').forEach(x=>x.addEventListener('click',()=>location.hash=x.dataset.route));
document.getElementById('logoutButton')?.addEventListener('click',()=>{setUser(null);navigate('#home');});
window.addEventListener('hashchange',render);
if('serviceWorker' in navigator) window.addEventListener('load',async()=>{
  try{
    const registration=await navigator.serviceWorker.register(`sw.js?v=${APP_VERSION}`,{updateViaCache:'none'});
    await registration.update();
  }catch(error){
    console.warn('[북치킨클럽] 서비스 워커 업데이트 실패',error);
  }
});

(function initialLoading(){
  if(app) app.innerHTML='<div class="empty loading">공유 DB에서 북치킨클럽 데이터를 불러오는 중...</div>';
})();

(async function init(){
  await refreshLoggedInUser();
  const ok=await fetchData();
  const versionEl=document.getElementById('appVersion');
  if(versionEl) versionEl.textContent=`Google Sheets 공유 DB · v${APP_VERSION}`;
  render();
  showDataErrorIfNeeded(ok);
})();
