// 북치킨클럽 v0.3 — Google Sheets 공유 DB 연동
const API_URL = 'https://script.google.com/macros/s/AKfycbxONtBlo8vsHmi8xdoOt5lJGHjnLOf6o3zPuIB1sYB3Gb2tb2EGe69ET-UFSal03y3K6A/exec';

const data = {
  books: [],
  members: [],
  records: [],
  meetings: []
};

const fallbackData = {
  books: [
    {id:'book-b001', book_id:'b001', title:'노르웨이의 숲', author:'무라카미 하루키', status:'읽은 책', date:'미정', cover:'green', participants:['김정운 (869기)']}
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

function copyData(source){
  data.books = source.books || [];
  data.members = source.members || [];
  data.records = source.records || [];
  data.meetings = source.meetings || [];
}

function book(id){ return data.books.find(x => x.id === id); }

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

async function fetchData(){
  try {
    const response = await fetch(`${API_URL}?action=data&_=${Date.now()}`, {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if(!result.ok) throw new Error(result.error || 'API 오류');
    copyData(result);
    return true;
  } catch(error) {
    console.warn('공유 DB를 불러오지 못했습니다. 로컬 샘플 데이터로 표시합니다.', error);
    copyData(fallbackData);
    return false;
  }
}

function showDataErrorIfNeeded(ok){
  const banner = document.getElementById('dataStatus');
  if(!banner) return;
  banner.hidden = ok;
}

function render(){
  const r = route();
  if(r === 'home') home();
  else if(r === 'books') books();
  else if(r === 'members') members();
  else if(r === 'records') records();
  else if(r === 'write-record') writeRecordPage();
  else if(r.startsWith('book/')) bookDetail(r.split('/')[1]);
  else if(r.startsWith('member/')) memberDetail(decodeURIComponent(r.split('/').slice(1).join('/')));
  else if(r.startsWith('record/')) recordDetail(decodeURIComponent(r.split('/')[1]));
  else if(r === 'login') loginPage();
  else home();
  updateAuth();
  window.scrollTo({top:0, behavior:'instant'});
}

function navButton(text, href){ return `<button class="link-button" onclick="location.hash='${href}'">${text}</button>`; }

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

function coverMarkup(item, className='book-cover'){
  const cover = String(item.cover || '').trim();
  if(/^https?:\/\//i.test(cover)){
    return `<div class="${className} image-cover"><img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title || '책 표지')}" loading="lazy"><span class="cover-fallback">${escapeHtml(item.title || '')}</span></div>`;
  }
  return `<div class="${className} ${escapeHtml(cover)}">${escapeHtml(item.title || '')}</div>`;
}

function bookCard(b){
  return `<article class="book-card" onclick="location.hash='book/${encodeURIComponent(b.id)}'">
    ${coverMarkup(b)}
    <div class="book-meta"><span class="status">${escapeHtml(b.status)}</span>
      <h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.author)}</p>
      <div class="tags"><span class="tag">${b.participants.length}명 참여</span>
      <span class="tag">${data.records.filter(r=>r.book===b.id).length}개 기록</span></div>
    </div>
  </article>`;
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
      <button class="primary-button" type="submit">책 등록하기</button>
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
  if(!user){location.hash='login';return;}
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
    location.hash=`book/book-${encodeURIComponent(result.book_id)}`;
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
  const b=book(r.book);
  return `<article class="record-card" onclick="location.hash='record/${encodeURIComponent(r.id)}'">
    <div class="record-top"><div><strong>${escapeHtml(r.author)}</strong><div class="record-book">${escapeHtml(b?.title||'알 수 없는 책')}</div></div>
    <span class="tag">${escapeHtml(r.date)}</span></div>
    <p class="excerpt">${escapeHtml(r.body)}</p></article>`;
}

function members(){
  app.innerHTML=`<div class="page-title"><div class="eyebrow">MEMBERS</div><h1>회원 목록</h1>
  <p>북치킨클럽 회원별로 참여한 책과 작성한 독서 기록을 확인할 수 있습니다.</p></div>
  <div class="stats"><div class="stat"><strong>${data.members.length}</strong><span>전체 회원</span></div>
  <div class="stat"><strong>${data.records.length}</strong><span>전체 독서 기록</span></div>
  <div class="stat"><strong>${data.books.length}</strong><span>등록된 책</span></div></div>
  <section class="section"><div class="list">${data.members.map(m=>{
    const bs=data.books.filter(b=>b.participants.includes(m.name));
    const rs=data.records.filter(r=>r.member_id===m.id);
    return `<article class="member-card" onclick="location.hash='member/${encodeURIComponent(m.id)}'">
      <div class="record-top"><div><strong>${escapeHtml(m.name)}</strong><div class="record-book">참여한 책 ${bs.length}권 · 독서 기록 ${rs.length}개</div></div><span class="link-button">보기 →</span></div></article>`;
  }).join('')||'<div class="empty">등록된 회원이 없습니다.</div>'}</div></section>`;
}

function memberDetail(id){
  const m=data.members.find(x=>x.id===id);
  if(!m) return members();
  const rs=data.records.filter(r=>r.member_id===id);
  const bs=data.books.filter(b=>b.participants.includes(m.name));
  app.innerHTML=`<button class="back" onclick="location.hash='members'">← 회원 목록</button>
  <div class="page-title"><div class="eyebrow">MEMBER</div><h1>${escapeHtml(m.name)}</h1>
  <p>${bs.length}권의 책에 참여 · ${rs.length}개의 독서 기록</p></div>
  <section class="section"><div class="section-head"><h2>참여한 책</h2></div>
  <div class="book-grid">${bs.map(bookCard).join('')||'<div class="empty">아직 참여한 책이 없습니다.</div>'}</div></section>
  <section class="section"><div class="section-head"><h2>독서 기록</h2></div>
  <div class="list">${rs.map(recordCard).join('')||'<div class="empty">아직 독서 기록이 없습니다.</div>'}</div></section>`;
}

function bookDetail(id){
  const b=book(id); if(!b) return books();
  const rs=data.records.filter(r=>r.book===id);
  const ms=data.meetings.filter(m=>m.book===id);
  app.innerHTML=`<button class="back" onclick="location.hash='books'">← 책 목록</button>
  <section class="detail-header">${coverMarkup(b,'detail-cover')}
  <div class="detail-info"><div class="eyebrow">BOOK</div><h1>${escapeHtml(b.title)}</h1>
  <div class="author">${escapeHtml(b.author)}</div><span class="status">${escapeHtml(b.status)}</span>
  <div class="info-row"><span class="pill">모임일 ${escapeHtml(b.date)}</span><span class="pill">참여자 ${b.participants.length}명</span>
  <span class="pill">독서 기록 ${rs.length}개</span><span class="pill">회의록 ${ms.length}개</span></div>
  <div class="action-row"><button class="primary" onclick="downloadBook('${encodeURIComponent(id)}')">↓ 이 책의 기록 .txt</button>
  ${getUser()?`<button class="secondary" onclick="location.hash='write-record'">+ 독서 기록 작성</button>${b.participants.includes(getUser().name)?'':`<button class="secondary" onclick="joinBook('${encodeURIComponent(id)}')">+ 참여하기</button>`}`:''}</div></div></section>
  <div class="content-grid"><div><section class="section"><div class="section-head"><h2>참여자</h2></div>
  <div class="member-list">${b.participants.map(n=>{const m=data.members.find(x=>x.name===n);return m?`<span class="member-chip"><button onclick="location.hash='member/${encodeURIComponent(m.id)}'">${escapeHtml(n)}</button></span>`:`<span class="member-chip">${escapeHtml(n)}</span>`}).join('')||'<span class="muted">아직 참여자가 없습니다.</span>'}</div></section>
  <section class="section"><div class="section-head"><h2>독서 기록</h2><span>${rs.length}개</span></div>
  <div class="list">${rs.map(recordCard).join('')||'<div class="empty">등록된 독서 기록이 없습니다.</div>'}</div></section></div>
  <aside><section class="section"><div class="section-head"><h2>모임 회의록</h2></div>
  <div class="list">${ms.map(m=>`<article class="meeting-card"><details><summary>${escapeHtml(m.title)}<span class="tag" style="float:right">${escapeHtml(m.date)}</span></summary><p>${escapeHtml(m.body)}</p></details></article>`).join('')||'<div class="empty">등록된 회의록이 없습니다.</div>'}</div></section></aside></div>`;
}

async function joinBook(encodedId){
  const user=getUser(); if(!user){location.hash='login';return;}
  const id=decodeURIComponent(encodedId), b=book(id); if(!b)return;
  try{
    const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'addBookMember',book_id:b.book_id,member_id:user.id,role:'participant'})});
    const result=await response.json();
    if(!result.ok) throw new Error(result.error||'참여 처리에 실패했습니다.');
    await fetchData(); render();
  }catch(error){alert(error.message||'참여 처리에 실패했습니다.');}
}

function recordDetail(id){
  const r=data.records.find(x=>String(x.id)===String(id));
  if(!r) return records();
  const b=book(r.book);
  app.innerHTML=`<button class="back" onclick="location.hash='records'">← 독서 기록 목록</button>
  <div class="page-title"><div class="eyebrow">READING NOTE</div><h1>${escapeHtml(r.title)}</h1>
  <p>${escapeHtml(r.author)} · ${escapeHtml(r.date)} · ${escapeHtml(b?.title||'')}</p></div>
  <article class="record-full"><h3>${escapeHtml(r.author)}</h3><div class="date">${escapeHtml(r.date)}</div>
  <div class="record-body">${escapeHtml(r.body)}</div></article>
  <div class="action-row"><button class="primary" onclick="location.hash='book/${encodeURIComponent(r.book)}'">책 페이지로 이동</button></div>`;
}

function writeRecordPage(){
  const user=getUser();
  if(!user){ location.hash='login'; return; }
  app.innerHTML=`<div class="page-title"><div class="eyebrow">READING NOTE</div><h1>독서 기록 작성</h1>
  <p>작성자는 현재 로그인한 회원으로 자동 지정됩니다. 저장하면 모든 회원이 볼 수 있습니다.</p></div>
  <div class="auth-card wide">
    <form id="recordForm" class="auth-form">
      <label>책<select id="recordBook" required>${data.books.map(b=>`<option value="${escapeHtml(b.book_id)}">${escapeHtml(b.title)} — ${escapeHtml(b.author)}</option>`).join('')}</select></label>
      <label>작성자<input id="recordAuthor" disabled value="${escapeHtml(user.name)}"></label>
      <label>제목<input id="recordTitle" placeholder="예: 노르웨이의 숲 — 독서 기록"></label>
      <label>기록<textarea id="recordContent" rows="12" required placeholder="책을 읽고 남기고 싶은 내용을 적어주세요."></textarea></label>
      <button class="primary-button" type="submit">공유 DB에 저장</button>
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
    setUser({id:result.member.id,name:result.member.name,cohort:result.member.cohort,service_number:serviceNumber});
    await fetchData();
    location.hash='home';
  }catch(error){
    msg.textContent = error.message || '로그인에 실패했습니다.';
  }
}

async function saveRecord(e){
  e.preventDefault();
  const user=getUser();
  const msg=document.getElementById('recordMessage');
  if(!user){location.hash='login';return;}
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
  return `북치킨클럽 - ${b.title}\n========================\n\n책 정보\n--------\n제목: ${b.title}\n저자: ${b.author}\n모임일: ${b.date}\n상태: ${b.status}\n\n참여자\n--------\n${b.participants.join('\n')||'(없음)'}\n\n${rs.map(r=>`[${r.author}의 독서 기록]\n------------------------\n작성일: ${r.date}\n제목: ${r.title}\n\n${r.body}`).join('\n\n')}\n\n[모임 회의록]\n------------------------\n${ms.map(m=>`${m.date} ${m.title}\n\n${m.body}`).join('\n\n')||'(없음)'}\n`;
}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function downloadBook(id){const decoded=decodeURIComponent(id);const b=book(decoded);if(b)download(`북치킨클럽_${b.title}.txt`,bookText(decoded));}
function downloadAll(){download('북치킨클럽_전체기록.txt',data.books.map(b=>bookText(b.id)).join('\n\n\n'));}

document.getElementById('menuButton')?.addEventListener('click',()=>document.getElementById('mobileNav')?.classList.toggle('open'));
document.querySelectorAll('[data-route]').forEach(x=>x.addEventListener('click',()=>location.hash=x.dataset.route));
document.getElementById('logoutButton')?.addEventListener('click',()=>{setUser(null);location.hash='home';});

window.addEventListener('hashchange',render);
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

(async function init(){
  const ok=await fetchData();
  showDataErrorIfNeeded(ok);
  render();
})();
