# 북치킨클럽 v0.4 — 책 추가 + 표지 + 참여

## 이번 버전
- 로그인한 회원이 사이트에서 책을 직접 추가
- 책 제목 / 저자 / 상태 / 모임일 입력
- JPG/PNG/WEBP/GIF 표지 업로드 (8MB 이하)
- 표지는 Google Drive의 `북치킨클럽-책표지` 폴더에 저장
- 책 추가자는 자동으로 참여자로 등록
- 다른 로그인 회원은 책 상세에서 `+ 참여하기` 가능
- 기존 독서 기록/Google Sheets 공유 DB 기능 유지

## 중요: Apps Script도 업데이트해야 함
1. Google Sheets → 확장 프로그램 → Apps Script
2. 기존 `Code.gs` 전체 삭제
3. 이 패키지의 `Code.gs` 전체 붙여넣기
4. 저장
5. 배포 → 배포 관리 → 기존 웹 앱 배포의 새 버전으로 업데이트
6. 기존과 같은 웹 앱 URL을 사용하면 됨

처음 책 표지를 올릴 때 Google Drive 권한이 필요할 수 있습니다. Apps Script가 실행하는 Google 계정의 Drive에 `북치킨클럽-책표지` 폴더가 자동 생성됩니다.

## GitHub Pages
`index.html`, `app.js`, `styles.css` 등 웹 파일을 GitHub 저장소에 올려 기존 파일을 교체합니다.
