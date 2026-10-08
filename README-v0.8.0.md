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
