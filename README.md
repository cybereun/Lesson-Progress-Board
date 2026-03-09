# 수업진도 체크표

단일 과목 기준으로 `관리창`, `실행창`, `반별 최근 진도`를 제공하는 Next.js 웹앱입니다.

## 실행 방식

이 프로젝트는 `Y:` 구글드라이브 경로에서 직접 `npm install`이 안정적으로 되지 않을 수 있습니다.  
그래서 원본 소스는 현재 폴더에 두고, 실행은 로컬 NTFS 경로로 동기화해서 진행합니다.

로컬 실행 스크립트:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command dev
```

기본 포트는 `3000`입니다. 다른 포트를 쓰려면:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command dev -Port 3100
```

## 지원 명령

```powershell
# 소스만 로컬 실행 폴더로 동기화
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command sync

# 개발 서버 실행
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command dev

# 타입 검사
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command typecheck

# 린트
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command lint

# 프로덕션 빌드
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command build

# 빌드 후 실행
powershell -ExecutionPolicy Bypass -File .\scripts\local.ps1 -Command start
```

## 로컬 작업 경로

- 실행본: `C:\CodexTemp\lesson-progress-board-run`
- 의존성: `C:\CodexTemp\lesson-progress-board-deps`
- 데이터: `C:\CodexTemp\lesson-progress-board-data`

데이터 파일은 별도 경로에 저장되므로, 소스를 다시 동기화해도 진도 기록은 유지됩니다.
