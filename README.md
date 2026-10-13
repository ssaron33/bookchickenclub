# 북치킨클럽 v0.9.0 — 게시판 추가

v0.8.1의 기존 책·회원·독서 기록·회의록 기능을 유지하면서 게시판 기능을 추가한 버전입니다.

## 추가 기능

- 상단 PC/모바일 메뉴에 **게시판** 추가
- 게시글 목록과 상세 화면
- 게시글 작성·수정·삭제
- 댓글 작성·수정·삭제
- 관리자 공지 등록/해제, 공지 상단 고정
- 분류: 자유, 독서 토론, 책 추천
- 제목·내용·작성자 검색 및 분류 필터
- 게시글별 댓글 수, 게시글 링크 복사
- 게시글과 댓글의 작성 날짜·시간 표시 (한국 표준시 KST, 24시간 형식)
- 공지는 상단에 고정하고, 공지/일반 글 묶음 안에서는 실제 작성 시각 최신순으로 정렬
- 댓글은 대화 흐름을 따라 오래된 순서부터 표시
- 게시글 삭제 시 해당 게시글의 댓글도 함께 삭제

## 파일 안내

- `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.json`: GitHub Pages에 올릴 프론트엔드 파일
- `Code.gs`: Google Apps Script 편집기에 적용할 백엔드 코드. **GitHub Pages에 프론트엔드로 올릴 필요는 없습니다.**

## 적용 순서

1. **Google Sheets 파일을 백업**합니다.
2. Apps Script 편집기에서 기존 `Code.gs`를 이 패키지의 `Code.gs` 내용으로 전체 교체하고 저장합니다.
3. 함수 선택 목록에서 **`setupV090`**을 선택해 한 번 실행합니다. 권한 승인이 나타나면 승인합니다.
4. Google Sheets에 `Posts`와 `Comments` 시트가 생겼는지 확인합니다. 헤더는 아래와 같습니다.
   - `Posts`: `post_id`, `member_id`, `category`, `title`, `body`, `is_notice`, `created_at`, `updated_at`
   - `Comments`: `comment_id`, `post_id`, `member_id`, `body`, `created_at`, `updated_at`
5. 기존 `Meta` 시트의 `admin_member_ids` 값에 관리자 `member_id`가 들어 있는지 확인합니다. 여러 명은 쉼표로 구분합니다. 예: `m001,m002`. 공지 작성 및 관리자 게시글/댓글 관리에 사용됩니다.
6. Apps Script의 **배포 관리**에서 웹 앱을 수정하고 새 버전으로 배포합니다. 기존 웹 앱 URL을 유지하면 프론트엔드의 `API_URL`을 바꿀 필요가 없습니다.
7. GitHub 저장소에는 위의 프론트엔드 파일 5개를 업로드/교체합니다. 모든 자산 버전은 `0.9.0`으로 올라가 있습니다.
8. GitHub Pages 배포가 끝난 후 사이트에서 강력 새로고침을 하고 로그인, 게시글 등록, 댓글 등록을 시험합니다.

## 게시판 권한

- 등록 회원: 게시글과 댓글 작성
- 작성자: 본인이 작성한 게시글/댓글 수정·삭제
- 관리자: 다른 회원의 게시글/댓글 관리 및 공지 등록/해제
- 공지: 관리자만 등록·수정·해제·삭제 가능

기존 사이트 정책대로 군번 조회 기반의 간단한 로그인 방식을 유지합니다. 별도의 추가 인증 체계는 도입하지 않았습니다. 현재 로그인 방식은 실제 세션 토큰으로 작성자를 증명하지 않으므로, 클라이언트가 보내는 회원 ID를 위조하는 행위까지 막지는 못합니다.

## 시간과 정렬

Apps Script가 게시글/댓글의 `created_at`에 실제 저장 시각을 기록합니다. 화면에서는 `Asia/Seoul` 기준 `YYYY.MM.DD. HH:mm` 24시간 표기로 나타냅니다. 일반 게시글은 작성 시각 최신순이며, 공지는 항상 상단에 고정됩니다. 게시글을 수정해도 작성 순서는 바뀌지 않고 `updated_at`만 갱신됩니다.

## 검사 범위

파일 문법 검사, 자산 경로, manifest JSON 및 패키지 압축을 확인했습니다. 실제 운영 중인 Google Sheets와 배포된 Apps Script에 연결해 쓰기/수정/삭제를 실시간으로 시험한 것은 아니므로, 실제 배포 후 테스트 게시글을 만들어 전체 동작을 검증하세요.

# 북치킨클럽 v0.8.1 — 구절 중심 독서 기록

v0.8.1은 기존 독서 기록의 구조를 `title`, `page`, `extract`, `body`로 확장합니다.

- `title`: 기록 제목 (비워두면 책 제목을 이용한 기본 제목으로 저장)
- `page`: 페이지 또는 페이지 범위. 예: `32`, `32–34`, `전자책 18%` (선택 입력)
- `extract`: 책에서 기억하고 싶은 구절 (선택 입력)
- `body`: 해당 구절을 읽고 든 생각/감상 (필수)
- `record_date`: 작성일은 기존처럼 자동 저장되며, 수정 화면에서 변경 가능

## 적용 순서

1. 현재 Google Sheet를 복사해 백업합니다.
2. Apps Script의 `Code.gs`를 이 패키지의 `Code.gs`로 전체 교체합니다.
3. Apps Script 편집기에서 `setupV081()`을 한 번 실행합니다. 이 함수는 `Records` 시트에 없는 `page`, `extract` 헤더를 추가하고 `schema_version`을 `0.8.1`로 갱신합니다. 기존 기록은 삭제하거나 재작성하지 않습니다.
4. `Records` 시트에 `page`, `extract` 헤더가 있는지 확인합니다. 기존 헤더 이름을 정확히 `page`, `extract`로 써야 합니다. 코드가 열 위치가 아니라 헤더 이름으로 읽고 쓰므로 컬럼 순서는 기능에 영향을 주지 않습니다.
5. Apps Script 웹 앱을 새 버전으로 배포합니다. 기존 URL을 유지합니다.
6. GitHub Pages 저장소에 `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.json`을 업로드합니다. `Code.gs`와 이 README는 프론트엔드 저장소 루트에 올릴 필요가 없습니다.

## 기존 기록 호환성

기존 기록에는 `page`와 `extract`가 없으므로 해당 화면에서는 두 항목이 비어 표시됩니다. 기존 `title`과 `body`는 그대로 보존됩니다. 예전 프론트엔드가 `page`/`extract`를 보내지 않아도 API가 빈 문자열로 처리합니다.

## 변경 파일

- `Code.gs`: API 데이터 구조, 등록·수정 저장, 시트 헤더 준비
- `app.js`: 등록/수정 양식, 기록 목록/상세 화면, 텍스트 내보내기
- `styles.css`: 인용 구절과 페이지 표시 스타일
- `index.html`, `sw.js`: 버전 `0.8.1`로 갱신

## 확인 사항

이 패키지는 정적 문법 검사와 코드 경로 점검을 기준으로 준비했습니다. 실제 Google Apps Script 배포 및 실제 시트 쓰기까지 이 환경에서 수행한 것은 아니므로, 배포 후 테스트 기록 1개를 등록하고 수정한 뒤 Records 시트와 상세 화면에 네 필드가 맞게 표시되는지 확인하세요.

# 북치킨클럽 v0.8.0

v0.8.0은 실제 회원 사용 전에 데이터 구조와 권한/표지 처리 방식을 정리한 안정화 버전입니다.

## 변경 사항

- 책 수정: 모든 등록 회원에게 허용
- 회의록 등록: 모든 등록 회원에게 허용
- 회원 추가/수정: 관리자만 허용
- 참여자 API 데이터: 이름 문자열 → `{id, name, cohort}` 구조
- 회의록: `author_member_id`를 저장해 작성자를 식별
- 표지: Google Drive `thumbnail` URL을 표준 형식으로 사용
- 기존 `uc?export=view` 표지 링크는 마이그레이션 시 자동으로 thumbnail URL로 변환
- 서비스 워커와 HTML/JS/CSS의 버전을 모두 0.8.0으로 통일
- 누락되어 있던 PWA `manifest.json` 추가
- 표지 이미지가 나중에 다시 깨지더라도 제목 기반 대체 표시가 나오도록 처리

## DB 구조

### Members
`member_id | name | cohort | service_number | created_at | updated_at`

### Books
`book_id | title | author | status | meeting_date | cover | created_at | updated_at`

`cover`에는 원본 Drive URL 대신 canonical thumbnail URL을 저장합니다.

예:
`https://drive.google.com/thumbnail?id=FILE_ID&sz=w1200`

### BookMembers
`book_id | member_id | role | created_at`

### Records
`record_id | book_id | member_id | record_date | title | body | created_at | updated_at`

### Meetings
`meeting_id | book_id | meeting_date | title | body | author_member_id | created_at | updated_at`

기존 회의록은 `author_member_id`가 비어 있어도 정상적으로 읽힙니다.

### Meta
`key | value | description | updated_at`

관리자 지정:
- key: `admin_member_ids`
- value: 관리자 member_id를 쉼표로 구분
- 예: `m001,m002`

## 적용 순서

### 1. 현재 Google Sheet를 먼저 복사해 백업
데이터를 그대로 유지한 상태에서 복사본을 하나 만들어 두는 것을 권장합니다.

### 2. Apps Script의 Code.gs 교체
이 패키지의 `Code.gs` 전체를 현재 Apps Script의 코드와 교체합니다.

### 3. Apps Script 편집기에서 `setupV080`을 한 번 실행
실행 시 다음을 처리합니다.

- 필요한 컬럼이 없으면 추가
- `Meta` 시트를 만들거나 필요한 컬럼을 보완
- `schema_version = 0.8.0` 기록
- 기존 Google Drive 표지 URL을 thumbnail 방식으로 일괄 변환

### 4. Meta 시트에서 관리자 지정
`admin_member_ids`의 `value`에 관리자 member_id를 입력합니다.

예를 들어 현재 관리자 회원의 ID가 `m001`이라면:

`admin_member_ids | m001`

### 5. 웹 앱 배포
Apps Script에서 현재 웹 앱 배포의 새 버전으로 배포합니다.
URL은 기존과 동일하게 유지해도 됩니다.

### 6. GitHub Pages에 v0.8.0 파일 업로드
`index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.json`을 저장소 루트에 올립니다.

## 주의

현재 인증 방식은 군번 조회 + localStorage 기반의 간단한 식별 방식입니다. 따라서 v0.8.0의 관리자 권한도 이 전제 위에서 동작합니다. 작은 모임용 운영에는 맞지만, 강한 보안이 필요한 서비스의 인증 방식은 아닙니다.

회원 관리 API는 서버에서 `admin_member_id`가 Meta의 관리자 목록에 있는지 다시 검사합니다.

일반 회원에게는 `getData`에서 군번을 보내지 않습니다. 관리자 화면에서만 별도의 `adminMembers` 요청으로 군번을 조회합니다.

# 북치킨클럽 v0.7.9

- 회원 메뉴 렌더링 포함
- 회의록 등록
- 참여 상태 표시 보강: `이름 (기수)` 형태의 참여자와 현재 회원 이름을 정상 비교
- 푸터 버전 표시 v0.7.9
- 서비스 워커/앱 셸 버전 쿼리 캐시 버스팅 강화
- 
# 북치킨클럽 v0.7.8

- 회원 메뉴 렌더링 포함
- 회의록 등록
- 참여 상태 표시 보강: `이름 (기수)` 형태의 참여자와 현재 회원 이름을 정상 비교
- 푸터 버전 표시 v0.7.8
- 서비스 워커/앱 셸 버전 쿼리 캐시 버스팅 강화




# 북치킨클럽 v0.7.7

## 변경사항
- 회원 메뉴 라우팅 및 회원 목록/상세 화면 추가
- 특정 책에 참여한 로그인 회원에게 `✓ 참여 중` 표시
- 책 상세 화면에서 회의록 등록 기능 추가
- Google Apps Script의 기존 `addMeeting` API 사용
- 푸터 버전 표시를 v0.7.7로 변경
- 서비스 워커 캐시 버전 갱신

## 배포
GitHub Pages의 기존 파일을 v0.7.7 파일로 교체합니다.
Google Apps Script `Code.gs`는 기존 배포본의 `addMeeting` 기능이 이미 포함되어 있으므로 별도 변경이 필요하지 않습니다.


# 북치킨클럽 v0.7.6

## 안정화
- 독서 기록 삭제 버튼을 인라인 onclick 의존 방식에서 이벤트 위임 방식으로 변경해 카드 클릭과의 충돌을 방지했습니다.
- 삭제 버튼에서 기본 동작과 이벤트 전파를 차단하고 삭제 함수를 호출합니다.
- 서비스 워커 캐시를 0.7.5로 갱신했습니다.
- 서비스 워커 등록 시 `updateViaCache: none`과 버전 쿼리를 사용해 오래된 `sw.js` 캐시를 통한 갱신 실패 가능성을 줄였습니다.
- 서비스 워커가 자기 자신의 `sw.js` 요청을 캐시하지 않도록 했습니다.
- 새 서비스 워커의 `skipWaiting`/`clients.claim` 동작은 기존과 유지됩니다.

## 적용
GitHub Pages의 기존 파일을 v0.7.6 파일로 교체한 뒤 일반 새로고침하면 됩니다.
기존 서비스 워커가 이미 페이지를 제어하고 있더라도 새 `sw.js`를 정상적으로 확인하도록 등록 코드를 수정했습니다.


# 북치킨클럽 v0.7.5

## 안정화
- 독서 기록 삭제 버튼을 인라인 onclick 의존 방식에서 이벤트 위임 방식으로 변경해 카드 클릭과의 충돌을 방지했습니다.
- 삭제 버튼에서 기본 동작과 이벤트 전파를 차단하고 삭제 함수를 호출합니다.
- 서비스 워커 캐시를 0.7.5로 갱신했습니다.
- 서비스 워커 등록 시 `updateViaCache: none`과 버전 쿼리를 사용해 오래된 `sw.js` 캐시를 통한 갱신 실패 가능성을 줄였습니다.
- 서비스 워커가 자기 자신의 `sw.js` 요청을 캐시하지 않도록 했습니다.
- 새 서비스 워커의 `skipWaiting`/`clients.claim` 동작은 기존과 유지됩니다.

## 적용
GitHub Pages의 기존 파일을 v0.7.5 파일로 교체한 뒤 일반 새로고침하면 됩니다.
기존 서비스 워커가 이미 페이지를 제어하고 있더라도 새 `sw.js`를 정상적으로 확인하도록 등록 코드를 수정했습니다.


# 북치킨클럽 v0.7.4

## 안정화 목적
이번 버전은 새 기능 추가보다 v0.7.3에서 확인된 실제 사용 오류를 수정하는 데 초점을 맞췄습니다.

### 수정
- 공유 DB 정상 연결 시 `dataStatus` 오류 배너가 남아 있던 CSS 충돌 수정
- 책 카드 클릭 후 책 상세 화면으로 이동하는 해시 라우팅 안정화
- `book-xxxx`와 `xxxx` 형태의 책 ID를 모두 안전하게 인식하도록 정규화
- 책 상세의 참여자/기록/회의록 조회에서 ID 형식 차이로 데이터가 누락되지 않도록 수정
- 독서 기록 수정 화면의 Google Sheets 날짜 형식(`YYYY.MM.DD`, `YYYY/MM/DD`, ISO 등) 처리 강화
- 기록 수정 시 날짜가 비어 있으면 API에 잘못된 요청을 보내지 않도록 프론트 검증 추가
- 기록 수정/삭제 버튼의 이동 처리를 안정화
- 서비스 워커 캐시 버전을 0.7.4로 올리고 네트워크 우선 업데이트 유지
- `hidden` 속성이 CSS의 `display:flex`에 의해 무시되던 문제 수정

### 확인
- `app.js`, `sw.js` JavaScript 문법 검사 통과
- 실제 Apps Script `action=data` 응답 구조에 맞춰 프론트 데이터 매핑을 재검토
- 기록 수정/삭제 API의 필수 필드 및 본인 확인 로직과 프론트 요청 구조 대조


# 북치킨클럽 v0.7.3

v0.7.3은 v0.7의 실제 테스트에서 발견된 프런트엔드 문제를 수정한 버전입니다.

## 수정 사항
- 책 카드/기록에서 `#book/book-b001` 등의 해시 라우팅이 실제 책 상세 화면을 렌더링하도록 `bookDetail()` 추가
- 책 상세에서 참여 상태 표시 및 `+ 참여하기` 기능 복구
- 책 상세에서 책 정보 수정 기능 복구
- 책 표지 교체 지원
- 책 상세에서 참여자/독서 기록/회의록 표시
- 독서 기록 수정 시 Google Sheets 날짜 형식(`2026.10.07` 등)을 HTML date 입력 형식으로 변환
- 독서 기록 삭제의 무응답 상황을 명확한 오류/권한 메시지로 개선
- 초기 데이터 로딩 후 화면을 먼저 렌더링한 다음 공유 DB 상태 배너를 갱신하도록 순서 수정
- 공유 DB 연결 성공 상태와 화면 렌더링을 분리
- 서비스 워커 캐시 버전 v0.7.3

## 배포
GitHub Pages에는 다음 파일을 교체합니다.
- index.html
- app.js
- styles.css
- manifest.json
- sw.js

Google Apps Script에는 `Code.gs`를 v0.7.3 패키지의 파일로 교체한 뒤 새 배포 버전을 생성합니다.


# 북치킨클럽 v0.7

이번 버전은 책/독서 기록 관리 기능을 개선했습니다.

## 웹사이트 변경
- 책 상세에서 책 정보 수정
- 책 제목/저자/상태/모임 날짜 수정
- 책 표지 교체
- 참여 중인 책은 `✓ 참여 중`으로 표시
- 내 독서 기록에만 수정/삭제 버튼 표시
- 독서 기록 수정: 작성일/제목/내용
- 독서 기록 삭제 전 확인
- 삭제/수정 후 공유 DB를 다시 불러와 화면 갱신

## Apps Script 변경
`Code.gs`를 함께 업데이트해야 위 관리 기능이 작동합니다.
- `updateBook`
- `updateRecord`
- `deleteRecord`
- 기존 `addBook`, 표지 업로드, `addBookMember` 유지

## 배포
1. Google Apps Script의 `Code.gs`를 이 버전으로 교체하고 저장합니다.
2. 웹 앱 배포를 새 버전으로 업데이트합니다.
3. GitHub Pages에는 `index.html`, `app.js`, `styles.css`, `manifest.json`, `sw.js`를 교체합니다.
4. 기존 v0.6 서비스 워커가 정상 업데이트되는지 확인합니다.


# 북치킨클럽 v0.6

## 이번 버전
- 서비스 워커 캐시를 v0.6 방식으로 교체
- 기존 서비스 워커 캐시 자동 삭제
- 새 서비스 워커 즉시 적용(`skipWaiting`, `clients.claim`)
- 온라인에서는 최신 HTML/CSS/JS를 우선 사용하고, 오프라인일 때만 캐시 사용
- 공유 DB 연결 실패 시 GitHub Pages에서 샘플 데이터를 실제 데이터처럼 표시하지 않도록 수정
- DB 연결 실패 배너에 다시 연결 버튼 추가
- 초기 데이터 로딩 표시 추가
- 공유 DB가 연결되지 않은 상태에서는 책/독서 기록 저장 버튼 비활성화

## 배포
GitHub 저장소 루트에 다음 파일을 업로드/교체합니다.

- `index.html`
- `app.js`
- `styles.css`
- `manifest.json`
- `sw.js`

기존 `sw.js`가 이미 등록된 사이트에서는 첫 접속 때 새 서비스 워커가 설치되고 기존 캐시가 정리됩니다.

## 중요
Google Apps Script API URL은 `app.js`에 포함되어 있습니다. Apps Script 배포 URL이 바뀌지 않았다면 별도 수정은 필요 없습니다.

# 북치킨클럽 v0.5

GitHub Pages용 정적 웹사이트 파일입니다.

## 포함 기능
- Google Sheets 공유 DB 연동
- 군번 로그인
- 책 목록/상세
- 사이트에서 책 추가
- 책 표지 이미지 업로드 → Google Drive 저장
- 책 참여하기
- 독서 기록 작성
- PC/모바일 상단 메뉴 균등 배치

## 업데이트
Google Apps Script의 Code.gs는 기존 v0.4에서 이미 추가된 `addBook`, `addBookMember`, 표지 업로드 기능을 그대로 사용합니다. 기존 배포 버전을 최신 코드로 업데이트한 상태라면 별도 Code.gs 교체는 필요 없습니다.
