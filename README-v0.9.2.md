# 북치킨클럽 v0.9.2 — 독서 기록 시간순 정렬과 댓글

v0.9.1의 게시판 및 기존 아카이브 기능을 유지하면서 독서 기록의 작성 시각 표시·정렬을 개선하고, 독서 기록별 댓글 기능을 추가한 버전입니다.

## 변경 사항

- 최근 독서 기록(홈), 전체 독서 기록을 실제 작성 시각(`created_at`) 최신순으로 정렬
- 책 상세·회원 상세의 독서 기록 목록도 동일한 최신 작성 시각순으로 정렬
- 목록과 상세 화면에서 작성 시각을 `YYYY.MM.DD. HH:mm` 형식으로 표시 (Asia/Seoul, 24시간제)
- 기록일(`record_date`)과 실제 작성 시각(`created_at`)을 구분해 상세 화면에 표시
- 독서 기록 상세 화면에 댓글 작성·수정·삭제 기능 추가
- 댓글은 기록별로 오래된 댓글부터 표시하고, 각 댓글 작성 시각도 KST 24시간 형식으로 표시
- 댓글 수를 기록 카드 제목 옆 `(3)` 형식으로 표시
- `RecordComments` Google Sheets 시트 추가; 기존 `Comments` 시트는 게시판 댓글용으로 유지
- 독서 기록 삭제 시 해당 기록의 댓글도 함께 삭제
- 기존 기록의 `created_at`을 활용하므로 기록 데이터 자체를 재입력할 필요 없음
- 코드/캐시 버전을 `0.9.2`로 통일

## 적용 순서

1. **Google Sheets 파일을 백업**합니다.
2. Apps Script의 기존 `Code.gs`를 ZIP 안의 `Code.gs` 전체 내용으로 교체하고 저장합니다.
3. Apps Script 편집기에서 `setupV092()`를 한 번 실행합니다. `RecordComments` 시트를 생성하고 필요한 헤더를 준비합니다. 기존 `Posts`, `Comments`, `Records` 데이터는 삭제하지 않습니다.
4. Apps Script 웹 앱 배포를 **새 버전으로 갱신**합니다. 기존 웹 앱 URL은 그대로 유지합니다.
5. ZIP 안의 프론트엔드 파일 `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.json`을 GitHub Pages 저장소에 덮어쓰고 커밋합니다.
6. 배포 후 사이트에서 `Ctrl + Shift + R`로 강력 새로고침하고 하단의 `v0.9.2` 표시를 확인합니다.

## Google Sheets 구조

`RecordComments` 헤더:

`record_comment_id | record_id | member_id | body | created_at | updated_at`

게시판 댓글은 기존 `Comments` 시트의 `post_id`를 계속 사용합니다. 두 댓글 종류를 섞지 않습니다.

## 권한

- 로그인한 회원은 모든 독서 기록에 댓글을 달 수 있습니다.
- 댓글 수정·삭제는 작성자 본인 또는 관리자에게 허용합니다.
- 독서 기록 삭제 시 작성자 검사를 거친 뒤 연결된 댓글을 함께 삭제합니다.
- 기존 군번 기반의 간단한 로그인·권한 구조는 유지합니다.

## 검사 범위 및 유의사항

- JavaScript 및 Apps Script 문법 검사, JSON/자산 버전 일치, 주요 action/route 문자열 및 ZIP 구성을 점검했습니다.
- 실제 운영 Google Sheets 및 배포된 Apps Script에서 라이브 등록·수정·삭제 테스트는 수행하지 않았습니다. 적용 후 댓글 등록 → 수정 → 삭제, 기록 삭제 시 댓글 연쇄 삭제, 작성 시각의 KST 표기를 테스트해주세요.
- `created_at`이 존재하는 기존 기록은 그 값을 정렬에 사용합니다. 과거 일부 행에서 `created_at`이 비어 있다면 해당 기록은 `record_date`를 대체 정렬 기준으로 사용하며 정확한 작성 시각을 복원할 수는 없습니다.
