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
