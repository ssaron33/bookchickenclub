# 북치킨클럽 v0.3 — Google Sheets 공유 DB 버전

현재 웹사이트는 Google Apps Script 웹 API를 통해 Google Sheets의 공유 DB를 읽고 씁니다.

## 연결된 API
`https://script.google.com/macros/s/AKfycbxONtBlo8vsHmi8xdoOt5lJGHjnLOf6o3zPuIB1sYB3Gb2tb2EGe69ET-UFSal03y3K6A/exec`

## 변경 사항
- 로그인: 군번을 Google Sheets `Members`에서 조회
- 책/회원/독서 기록/회의록: Google Sheets에서 읽음
- 독서 기록 저장: `Records` 시트에 추가
- 여러 기기에서 같은 데이터를 볼 수 있도록 공유 DB 사용
- 책 상세의 참여자/기록/회의록이 실제 DB 관계를 사용
- 기존 `localStorage`는 로그인 상태 유지에만 사용
- API에 연결하지 못하면 로컬 샘플 데이터를 보여주는 fallback 포함

## 중요
최종적으로 여러 기기에서 사용하려면 이 사이트를 HTTPS 웹사이트로 호스팅하는 것을 권장합니다.
`file://`로 더블클릭 실행하는 경우 브라우저의 CORS/보안 정책 때문에 Google API 호출이 막힐 수 있습니다.
