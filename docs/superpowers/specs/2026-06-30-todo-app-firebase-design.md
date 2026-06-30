# Todo 앱 (HTML/CSS/JS + Firebase) — 설계 문서

작성일: 2026-06-30

## 개요

개인용 단일 사용자 Todo 웹 앱. vanilla HTML/CSS/JS로 작성하고, 데이터는
Firebase Firestore에 저장한다. 로그인/인증은 없다.

## 요구사항

- **사용자**: 나 혼자, 로그인 없음 (단일 사용자)
- **할 일 기능**: 완료 체크, 수정, 삭제, 마감일, 카테고리 + 필터
- **디자인**: 라이트/다크 테마 토글 (선택값 유지)
- **데이터베이스**: Firebase Firestore (프로젝트 `sw-todo-backend` 보유)
- **Analytics**: 사용하지 않음

## 접근 방식

ES 모듈 + Firebase 모듈러 SDK (CDN, v12.15.0). 번들러/npm 없이 브라우저에서
바로 동작. 실행은 가벼운 로컬 서버(`npx serve` 등) 또는 Firebase Hosting.

> 주의: ES 모듈 CORS 때문에 `file://` 직접 열기는 동작하지 않음. 반드시
> 로컬 서버나 호스팅을 통해 실행한다.

## 파일 구조

```
To-Do/
├── index.html          # 마크업 + 화면 구조
├── style.css           # 라이트/다크 테마, 레이아웃
├── app.js              # 앱 로직 (ES 모듈, Firebase import)
└── firebase-config.js  # firebaseConfig 객체만 export
```

### 역할 분리

- **index.html** — 입력 폼(제목·마감일·카테고리), 필터 바, 목록 컨테이너,
  테마 토글 버튼. 정적 뼈대만.
- **firebase-config.js** — `firebaseConfig` 객체 하나만 export.
- **app.js** — 내부 4개 영역으로 구획:
  1. `db` 초기화 (Firebase 연결)
  2. Firestore 연동 함수 (`addTodo`, `updateTodo`, `deleteTodo`, 실시간 구독 `onSnapshot`)
  3. 렌더링 함수 (할 일 배열 → DOM, 필터/정렬 적용)
  4. 이벤트 핸들러 (폼 제출, 체크, 수정, 삭제, 필터/정렬/테마 토글)

### 데이터 흐름

사용자 동작 → Firestore 쓰기 → `onSnapshot`이 변경 감지 → 화면 자동 재렌더.
화면은 Firestore를 구독만 하고 로컬 상태를 따로 유지하지 않는다(단일 진실 공급원).
실시간 동기화가 공짜로 되고 상태 불일치 버그가 줄어든다.

## 데이터 모델 (Firestore)

컬렉션 하나: `todos`. 각 문서:

| 필드 | 타입 | 설명 |
|------|------|------|
| `title` | string | 할 일 내용 |
| `done` | boolean | 완료 여부 |
| `dueDate` | string \| null | 마감일 `"2026-07-15"`, 없으면 null |
| `category` | string | `"업무"` / `"개인"` / `"기타"` |
| `createdAt` | timestamp | 생성 시각 (기본 정렬 기준) |

- **정렬**: 기본 `createdAt` 내림차순(최신순), 화면 토글로 마감일순 전환.
- **카테고리**: 별도 컬렉션 없이 코드에 고정 목록(`업무 / 개인 / 기타`).
  추후 사용자 정의가 필요하면 확장.
- **필터 상태**: Firestore가 아닌 화면(JS 변수)에서 관리.
  상태(전체/미완료/완료) + 카테고리별. 구독해온 전체 목록을 걸러서 그림.

## UI / UX

화면 레이아웃 (위→아래):

- **헤더**: 제목 + 라이트/다크 토글 버튼(🌙/☀️). 선택 테마는 `localStorage`에
  저장해 새로고침 후에도 유지.
- **입력 영역**: 텍스트 입력 + `<input type="date">` + 카테고리 `<select>` + 추가 버튼.
- **필터 바**: 상태(전체/미완료/완료) + 카테고리 필터 + 정렬(최신순/마감일순) 토글.
- **목록**: 항목마다 체크박스, 제목, 카테고리 뱃지, 마감일. 호버 시 수정/삭제 버튼.
  완료 항목은 취소선 + 흐리게. 마감일 지난 미완료는 빨간색 강조.
- 목록이 비면 "할 일이 없어요 🎉" 안내.

### 테마

CSS 변수(`--bg`, `--text`, `--accent` 등)를 `:root`와 `[data-theme="dark"]`에 정의.
JS는 `<html>`의 `data-theme` 속성만 토글.

## 보안 (Firestore 규칙)

로그인이 없으므로 기간 제한 공개 규칙을 사용한다:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /todos/{doc} {
      allow read, write: if request.time < timestamp.date(2026, 12, 31);
    }
  }
}
```

**트레이드오프**: config를 아는 사람은 누구나 읽고 쓸 수 있다. 개인용 + 인증 없음
전제에서는 표준적인 방식. 비공개가 필요하면 향후 Firebase 익명 인증을 추가하고
규칙을 `if request.auth != null`로 강화한다.

> 참고: Firebase 웹 `apiKey`는 비밀값이 아니며 클라이언트 공개가 정상이다.
> 실제 보안은 위 Firestore 규칙으로 결정된다.

## 에러 처리

- Firestore 호출은 `try/catch`로 감싸고, 실패 시 짧은 토스트/알림 표시.
- 오프라인이어도 SDK 로컬 캐시로 동작하므로 입력을 막지 않는다.
- 빈 제목은 추가하지 않는다(폼 유효성 검사).

## 테스트 (수동 체크리스트)

자동화 프레임워크 없이 수동 검증:

- [ ] 할 일 추가 (제목/마감일/카테고리)
- [ ] 완료 체크 / 해제
- [ ] 수정
- [ ] 삭제
- [ ] 상태 필터 (전체/미완료/완료)
- [ ] 카테고리 필터
- [ ] 정렬 토글 (최신순/마감일순)
- [ ] 라이트/다크 토글 + 새로고침 후 테마 유지
- [ ] 새로고침 후 데이터 유지
- [ ] 두 번째 탭에서 실시간 반영 (onSnapshot)
- [ ] 마감일 지난 미완료 항목 강조 표시

## 범위 밖 (YAGNI)

- 로그인/멀티 사용자
- 사용자 정의 카테고리
- Analytics
- 알림/리마인더
- 빌드 도구 / npm 의존성
