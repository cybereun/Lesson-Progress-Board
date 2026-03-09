# 수업진도표 작업 기록

기준일: 2026-03-09

## 완료

- 단일 과목 수업진도 체크 웹앱 기본 구조 구현
- 화면 구성 완료
  - `/admin` 관리창
  - `/board` 실행창
  - `/progress` 반별 최근 진도 화면
- 관리창 기능 구현
  - 수업내용 한 줄 등록
  - 수정
  - 비활성화
  - 순서 변경
  - 미사용 항목 삭제
- 실행창 기능 구현
  - 날짜, 교시, 수업내용 기준 수업행 추가
  - 1반~9반 `EMPTY -> O -> X -> EMPTY` 순환 체크
  - 기존 수업행의 날짜, 교시, 수업내용 수정
- 최근 진도 기능 구현
  - 반별 마지막 `O/X` 기록 표시
- 웹앱 아이콘 작업 완료
  - 설치 아이콘 생성
  - `favicon.ico` 교체
  - 관리창 제목 앞 아이콘 추가
- 로컬 실행 스크립트 구성 완료
  - Google Drive 경로에서 직접 실행하지 않고 NTFS 실행 폴더로 동기화
- Git 저장소 초기화 완료
- GitHub 원격 저장소 연결 및 푸시 완료
  - `https://github.com/cybereun/Lesson-Progress-Board.git`
- README 정리 완료
- `v0.1.0` 태그 생성 완료
- Vercel 500 대응 완료
  - 원인: 로컬 SQLite/파일시스템 의존
  - 조치: 저장소 계층을 분리해 로컬은 SQLite, Vercel은 Postgres, 미설정 시 메모리 fallback
- Vercel 배포용 환경 예시 파일 추가
  - `.env.example`

## 검증 완료

- 로컬 타입체크 통과
- 로컬 빌드 통과
- `VERCEL=1` 환경으로 실행 시 `/`와 `/admin` 응답 200 확인

## 남은 일

- Vercel 프로젝트에 Neon 연결
- Vercel 환경변수 확인
  - `POSTGRES_URL`
  - `POSTGRES_PRISMA_URL`
  - `POSTGRES_URL_NON_POOLING`
  - `DATABASE_URL`
- Neon 연결 후 Vercel 재배포
- 재배포 후 실제 데이터가 배포 환경에서 유지되는지 확인

## 참고 메모

- 현재 코드는 Postgres 환경변수가 있으면 자동으로 Postgres 사용
- Vercel에서 DB 환경변수가 없으면 메모리 모드로 동작하므로 데이터가 유지되지 않음
