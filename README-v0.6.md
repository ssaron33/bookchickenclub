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
