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
