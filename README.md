# Pitchcoach BACK — NestJS Backend

**POKI(Pitchcoach)** 프로젝트의 백엔드 서버입니다.  
스타트업 IR 발표 준비를 돕는 AI 코칭 플랫폼의 REST API를 제공합니다.

---

## 프로젝트 개요

사용자가 공고문 PDF, IR Deck PDF, 음성 리허설 파일을 업로드하면, AI 서버(FastAPI)가 분석하고 백엔드가 결과를 가공하여 프론트엔드에 전달합니다. Q&A 트레이닝과 종합 리포트 기능도 제공합니다.

```
[Frontend (React)] ←→ [Backend (NestJS)] ←→ [AI Server (FastAPI)]
                              ↕
                      [PostgreSQL DB]
                              ↕
                         [AWS S3]
```

---

## 소스코드 구조

```
src/
├── main.ts                   # 앱 진입점 (helmet, CORS, ValidationPipe, Swagger, GlobalFilter)
├── app.module.ts             # 루트 모듈 (ThrottlerModule, APP_GUARD 등록)
│
├── modules/
│   ├── auth/                 # 회원가입·로그인·JWT·Google OAuth·리프레시 토큰
│   ├── user/                 # 프로필 조회·수정·비밀번호 변경·탈퇴
│   ├── pitch/                # Pitch(발표 세션) 생성·목록 조회
│   ├── notice/               # 공고문 PDF → AI 분석 요청·결과 동기화·수정
│   ├── deck/                 # IR Deck PDF → AI 분석·슬라이드별 결과·버전 관리
│   ├── rehearsal/            # 음성 파일 → AI 분석·슬라이드 타임스탬프·버전 비교
│   ├── qa/                   # Q&A 질문 생성·음성/텍스트 답변 평가
│   ├── report/               # 종합 리포트 생성·조회
│   └── ai/                   # 내부 모듈 (컨트롤러 없음)
│
├── infra/
│   ├── prisma/               # Prisma 전역 DI 모듈
│   └── fastapi/              # FastAPI AI 서버 HTTP 클라이언트 (axios)
│
└── common/
    └── filters/              # GlobalExceptionFilter (표준 에러 응답)

prisma/
├── schema.prisma             # DB 모델 정의 (9개 테이블)
└── migrations/               # Prisma 마이그레이션 이력 (9개)
```

---

## Tech Stack

| 분류 | 기술 |
|------|------|
| 런타임 | Node.js 20 |
| 프레임워크 | NestJS 11 |
| ORM | Prisma (PostgreSQL) |
| 인증 | JWT (access 12h / refresh 7d), Google OAuth, bcryptjs |
| 유효성 검사 | class-validator, class-transformer |
| API 문서 | @nestjs/swagger (Swagger UI) |
| HTTP 보안 | helmet (보안 헤더), @nestjs/throttler (Rate Limiting) |
| 파일 처리 | Multer (멀티파트), AWS S3 (썸네일 저장) |
| AI 연동 | axios (FastAPI 내부 API) |
| 패키지 매니저 | pnpm |
| 컨테이너 | Docker (멀티스테이지 빌드) |

---

## 환경변수 설정

`.env.example`을 복사하여 `.env`를 만들고 값을 채웁니다.

```bash
cp .env.example .env
```

### 필수 환경변수

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `JWT_SECRET` | JWT 서명 비밀키 (긴 랜덤 문자열) |
| `AI_SERVER_URL` | FastAPI AI 서버 주소 (예: `http://localhost:8000`) |
| `AI_INTERNAL_API_KEY` | AI 서버와 공유하는 내부 API Key |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |

> **주의:** `JWT_SECRET` 또는 `AI_SERVER_URL` 누락 시 앱이 시작 시 즉시 종료됩니다.  
> `AI_INTERNAL_API_KEY`는 FastAPI 서버의 동일 값과 일치해야 AI 연동이 작동합니다.

### 선택 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3000` | 서버 포트 |
| `CORS_ORIGINS` | localhost 목록 | 허용 Origin (콤마 구분) |
| `S3_BUCKET_NAME` | — | 썸네일 이미지 저장 버킷 |
| `AWS_REGION` | — | AWS 리전 |
| `AWS_ACCESS_KEY_ID` | — | AWS 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | — | AWS 시크릿 키 |

---

## How to Install & Run (로컬)

### 사전 요구사항

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL 15+ 실행 중

```bash
# 1. 의존성 설치
pnpm install

# 2. Prisma 클라이언트 생성
pnpm prisma generate

# 3. DB 마이그레이션 실행
pnpm prisma migrate dev

# 4. 개발 서버 시작
pnpm run start:dev
```

서버 접속:
- API: `http://localhost:3000`
- Swagger 문서: `http://localhost:3000/api-docs`

---

## How to Build

```bash
pnpm run build
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

프로덕션 실행:

```bash
pnpm run start:prod
```

---

## How to Run with Docker

### Docker Compose (권장)

```bash
# 빌드 후 실행 (DB 포함)
docker compose up --build

# 백그라운드 실행
docker compose up -d --build
```

컨테이너 시작 시 `prisma migrate deploy`가 자동 실행됩니다.

### Docker 단독

```bash
docker build -t pitchcoach-back .
docker run -p 3000:3000 --env-file .env pitchcoach-back
```

---

## How to Test

```bash
# 단위 테스트 전체
pnpm run test

# 특정 파일만
pnpm run test -- src/modules/auth/auth.flow.spec.ts

# e2e 테스트
pnpm run test:e2e

# 커버리지
pnpm run test:cov
```

### auth.flow.spec.ts 검증 항목

1. 정상 회원가입 → 로그인 → `/me` 성공
2. 삭제 계정 로그인 → 401 반환
3. refresh 토큰으로 보호 API 접근 → 401 반환

---

## API Overview

Swagger(`/api-docs`)에 전체 명세가 노출됩니다. 아래는 요약입니다.

### Auth — `/api/auth`

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/signup` | 이메일 회원가입 |
| POST | `/api/auth/login` | 이메일 로그인 |
| POST | `/api/auth/google` | Google OAuth 로그인/회원가입 |
| GET | `/api/auth/me` | 내 프로필 조회 (Bearer 필요) |
| POST | `/api/auth/refresh` | Access 토큰 갱신 |
| POST | `/api/auth/logout` | 로그아웃 (Bearer 필요) |

### User — `/api/users`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/users/me` | 내 정보 조회 |
| PATCH | `/api/users/me/profile` | 추가 프로필 수정 |
| PATCH | `/api/users/me/password` | 비밀번호 변경 |
| DELETE | `/api/users/me` | 회원 탈퇴 (소프트 삭제) |

### Pitch — `/api/pitches`

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/pitches` | Pitch(발표 세션) 생성 |
| GET | `/api/pitches` | 내 Pitch 목록 조회 |
| GET | `/api/pitches/:pitchId` | Pitch 상세 조회 |

### Notice (공고문 분석)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/pitches/:pitchId/notices/analyze` | 공고문 PDF 업로드 → AI 분석 시작 |
| GET | `/api/notices/:noticeId` | 분석 결과 조회 (AI 서버 폴링 동기화) |
| PATCH | `/api/notices/:noticeId` | 분석 결과 수동 수정 |

### IR Deck

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/pitches/:pitchId/ir-decks/analyze` | IR Deck PDF 업로드 → AI 분석 시작 |
| GET | `/api/ir-decks/:deckId` | 덱 요약 조회 |
| GET | `/api/ir-decks/:deckId/slides` | 슬라이드별 분석 결과 조회 |
| GET | `/api/pitches/:pitchId/ir-decks/versions` | 버전 목록 조회 |
| GET | `/api/ir-decks/:deckId/compare` | 버전 간 점수 비교 |

### Rehearsal (음성 리허설)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/pitches/:pitchId/voice/upload-and-analyze` | 음성 파일 업로드 → AI 분석 시작 |
| GET | `/api/voice/:voiceId` | 분석 결과 조회 |
| GET | `/api/voice/:voiceId/slides` | 슬라이드별 음성 분석 조회 |
| GET | `/api/pitches/:pitchId/voice/versions` | 버전 목록 조회 |
| GET | `/api/voice/:voiceId/compare` | 버전 간 점수 비교 |

### Q&A

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/pitches/:pitchId/questions` | Q&A 질문 목록 조회 |
| PATCH | `/api/pitches/:pitchId/qa-mode` | QA 모드 설정 (음성/텍스트) |
| POST | `/api/questions/:questionId/answers` | 답변 제출 → AI 서버 평가 요청 |
| GET | `/api/answers/:answerId` | 답변 평가 결과 조회 |

### Report (종합 리포트)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/pitches/:pitchId/report` | AI 종합 리포트 생성 요청 |
| GET | `/api/reports/:reportId` | 리포트 조회 |

---

## 에러 응답 형식

모든 에러는 GlobalExceptionFilter를 통해 아래 형식으로 반환됩니다.

```json
{
  "success": false,
  "statusCode": 401,
  "error": "INVALID_CREDENTIALS",
  "message": "이메일 또는 비밀번호가 올바르지 않습니다",
  "path": "/api/auth/login",
  "timestamp": "2026-06-18T00:00:00.000Z"
}
```

`error` 필드는 서비스에서 명시적으로 지정한 경우에만 포함됩니다.

---

## 보안

| 기능 | 구현 |
|------|------|
| HTTP 보안 헤더 | `helmet` (X-Frame-Options, CSP, HSTS 등) |
| Rate Limiting | `@nestjs/throttler` — 전체 120 req/min, auth 엔드포인트 10 req/min per IP |
| JWT | access 12h / refresh 7d, DB에 refresh 토큰 해시 저장 |
| 비밀번호 | bcrypt 해시 (salt rounds 10) |
| 파일 검증 | PDF magic bytes 검사, 오디오 시그니처 검사, 크기 제한 25MB |
| DTO 검증 | ValidationPipe (whitelist + forbidNonWhitelisted + transform) |
| OAuth | Google ID Token 서버 검증 (`google-auth-library`) |

---

## 데이터베이스

PostgreSQL + Prisma ORM. 주요 테이블:

| 테이블 | 설명 |
|--------|------|
| `User` | 사용자 계정, 프로필, 인증 정보 |
| `Pitch` | 발표 세션 (공고 유형, 발표 타입, 시간 등) |
| `Notice` | 공고문 분석 결과 |
| `EvaluationCriteria` | 공고문에서 추출된 평가 기준 |
| `IRDeck` | IR Deck 분석 결과 (버전별) |
| `Slide` + `SlideFeedback` | 슬라이드별 분석 데이터 |
| `VoiceAnalysis` | 음성 리허설 분석 결과 (버전별) |
| `RehearsalSlideAnalysis` | 슬라이드별 음성 분석 |
| `QATraining` + `Question` + `Answer` | Q&A 세션, 질문, 답변 평가 |
| `Report` | 종합 리포트 |

마이그레이션은 `prisma/migrations/`에 관리됩니다.  
컨테이너 기동 시 `prisma migrate deploy`가 자동 실행되어 최신 스키마를 반영합니다.

---

## 사용 오픈소스

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| NestJS | 11 | HTTP 서버, DI 컨테이너 |
| Prisma | 6 | PostgreSQL ORM, 마이그레이션 |
| @nestjs/jwt, passport-jwt | — | JWT 발급/검증 |
| bcryptjs | — | 비밀번호 해시 |
| google-auth-library | — | Google ID Token 검증 |
| class-validator, class-transformer | — | DTO 자동 검증 |
| @nestjs/swagger | — | Swagger UI 자동 생성 |
| helmet | — | HTTP 보안 헤더 |
| @nestjs/throttler | — | IP 기반 Rate Limiting |
| axios | — | FastAPI 서버 내부 연동 |
| Multer (@nestjs/platform-express) | — | 멀티파트 파일 처리 |
| @aws-sdk/client-s3 | — | S3 파일 저장 |
| pnpm | — | 패키지 매니저 |

---

## CI

`.github/workflows/ci.yml`:

1. `pnpm install --frozen-lockfile`
2. `pnpm prisma generate`
3. `pnpm run --if-present test`
4. `pnpm run build`

---

## 자주 발생하는 문제

| 증상 | 원인 | 해결 |
|------|------|------|
| `JWT_SECRET is required` | `.env`에 `JWT_SECRET` 미설정 | `.env.example` 참고해서 설정 |
| `AI_SERVER_URL is required` | `.env`에 `AI_SERVER_URL` 미설정 | `.env.example` 참고해서 설정 |
| AI 요청 시 `AI_INTERNAL_API_KEY is required` | `.env`에 `AI_INTERNAL_API_KEY` 미설정 | FastAPI 서버 `.env`의 값과 동일하게 설정 |
| Prisma 타입 오류 | schema 변경 후 클라이언트 미재생성 | `pnpm prisma generate` 후 재빌드 |
| Docker 빌드 실패 | node_modules 캐시 문제 | `docker compose build --no-cache` |
