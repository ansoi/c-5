# 명당 — 작업 규칙

자율좌석제 사무실의 좌석 컨디션 웹앱이에요. 동료들이 남긴 좌석 리뷰로 "오늘 나에게 맞는 자리"를 추천해요.

작업 전에 **[docs/개발명세.md](docs/개발명세.md)** 를 먼저 읽어 주세요. 결정 사항, 화면 목록, 데이터 구조, 추천 로직이 다 있어요.
기획 원문은 [docs/기획서.md](docs/기획서.md), 디자인·말투는 [docs/톤앤매너.md](docs/톤앤매너.md)에 있어요.
**시안 이미지와 톤앤매너 가이드가 다르면 가이드를 따라요.**

## 기술 규칙 (과제 필수)
- 바닐라 HTML·CSS·JS만 써요. React 같은 프레임워크, npm 패키지, 빌드 도구는 쓰지 않아요.
- `index.html`은 저장소 맨 바깥에 있어요. 심사위원이 **index.html을 더블클릭해도 열려야** 해요.
  - `<script type="module">`, `import`/`export` 금지 → 일반 `<script>`와 전역 `window.MD`를 써요.
  - `fetch()`로 로컬 JSON 읽기 금지 → 데이터는 `js/data.js`에 넣어요.
- DB, 로그인, 외부 API는 쓰지 않아요. 발표 날 300~400명이 동시에 접속해요.
  사용자가 입력한 값은 `MD.state`(브라우저 저장소)에만 저장해요.
- 공개 저장소라서 API 키, 비밀번호, 실명·사번, 실제 사무실 도면, 삼일PwC 로고를 올리지 않아요.

## Git 규칙
- 브랜치 없이 `main`에서만 작업해요. 시작하기 전에 `git pull`로 최신 내용을 받아요.
- 커밋 메시지는 무엇을 바꿨는지 한국어 한 줄로 써요.
- 충돌이 나면 다른 사람 작업을 지우지 말고, 무엇이 겹쳤는지 설명해요.
- 같은 파일을 두 사람이 동시에 고치지 않아요. 작업 전에 톡방에 "지금 ○○ 작업 중"이라고 알려요.

## 파일 구조
```
index.html                 첫 화면. CSS·JS를 여기서 순서대로 불러요
css/tokens.css             색·모서리·글꼴 (색은 여기서만 정해요)
css/base.css               뼈대: 상단바, 하단 탭, 카드, 버튼, 알약, 칩
css/components.css         공통 부품: 페이지 머리말, 뒤로 가기, 세그먼트, 확인 창, 단계 그림, 스위치, 선택 칩, 별점, 안내 상자, 리뷰 카드
css/screens/*.css          화면별 스타일
js/util.js                 날짜, 고정 난수
js/data.js                 17F 가상 도면, 좌석, 샘플 리뷰·수리 요청
js/store.js                브라우저 저장소(MD.store)와 내 상태(MD.state)
js/tickets.js              수리 요청 (고장 즉시 접수, 불만 7일 3건 자동 접수)
js/score.js                추천 로직 (MD.score.snapshot)
js/ui.js                   아이콘, 왕관, 알약, 단계 그림, 뒤로 가기, 확인 창(MD.ui.confirm), 안내 메시지, 글자 이스케이프
js/actions.js              여러 화면이 같이 쓰는 동작: 예약(시연), 체크인, 이용 종료, 리뷰 등록
js/screens/home.js         홈                       #/
js/screens/map.js          자리 확인 (배치도·히트맵)   #/map, #/map?seat=A03
js/screens/seat-sheet.js   좌석 상세 시트 내용 (map.js에서 열어요)
js/screens/seat-reviews.js 좌석 리뷰                  #/seat/A03/reviews
js/screens/review-write.js 리뷰 남기기                #/review/A03
js/screens/prefs.js        내 조건                    #/prefs
js/screens/alerts.js       알림 (+ MD.alerts)          #/alerts
js/screens/reviews.js      리뷰 탭                    #/reviews
js/screens/my.js           마이                       #/my
js/screens/placeholder.js  아직 없는 화면 자리 (시설 담당자 #/admin)
js/app.js                  주소(#/...)에 맞는 화면 그리기, 뒤로 가기, 알림 종
docs/                      기획서, 톤앤매너, 레퍼런스, 시안, 개발 명세·기록
```

## 화면 추가하는 법
1. `js/screens/이름.js`에 `MD.screens.이름 = { title, render(view, ctx) }`를 만들어요. `ctx.params`, `ctx.query`로 주소 값을 받아요.
   - 같은 화면 안에서 주소의 `?` 뒤만 바뀔 때 다시 그리지 않으려면 `update(view, ctx)`도 만들어요 (예: map.js).
2. `css/screens/이름.css`를 만들어요.
3. `index.html`에 `<link>`와 `<script>`를 추가해요. 스크립트는 `placeholder.js` 뒤, `app.js` 앞에 둬요.
4. 주소가 `js/app.js`의 `ROUTES`에 없으면 추가해요.
- 자리 상태·점수·추천은 직접 계산하지 말고 `MD.score.snapshot()` 결과를 써요.
- 예약·체크인·이용 종료·리뷰 등록은 `MD.actions`를 불러요. 같은 동작을 화면마다 따로 만들지 않아요.
- 확인이 필요한 동작은 `await MD.ui.confirm({ title, body, confirm, cancel })`을 써요. 브라우저 기본 `confirm()`은 쓰지 않아요.
- 뒤로 가기 링크는 `MD.ui.back('#/대신-갈-주소')`를 써요.
- 사용자가 쓴 글은 화면에 넣기 전에 `MD.ui.esc()`로 감싸요.
- 좌석 번호 바로 뒤에는 조사를 붙이지 않아요. "A08을/를" 대신 "A08 자리를"처럼 써요.

## 디자인 규칙 (톤앤매너 요약)
- 색은 `css/tokens.css`의 변수만 써요. 주황(`--brand`)이 주색이고, 크림 바탕에 흰 카드를 써요. 다른 색은 상태 표시에만 써요.
- 한 화면에 주요 버튼(`btn--primary`)은 하나만 둬요.
- 상태는 색과 글자 라벨이 같이 있는 알약(`MD.ui.pill`)으로 보여요. 색만으로 뜻을 전하지 않아요.
- 온도는 4단계(추움·적당함·따뜻함·더움), 소음은 3단계(조용함·보통·시끄러움), 거리는 m로 보여요. ℃·dB 같은 측정값은 보여 주지 않아요.
- 금색 왕관(`MD.ui.crown`)은 층마다 1곳(`snapshot.crownId`)에만 붙여요.
- 이모지와 캐릭터는 쓰지 않아요. 아이콘은 `MD.ui.icon`을 써요.
- 모바일 360px부터 PC 1280px까지 깨지지 않게 만들어요.

## 말투
- 해요체로 짧게 쓰고, 결론(자리·숫자·상태)을 앞에 둬요. 느낌표는 화면당 최대 1개예요.
- 버튼은 동사로 끝내요: "자리 확인하기", "익명으로 등록".
- 소음·불편은 사람이 아니라 위치의 특성으로 말해요: "회의실 앞이라 오후에 소란스러워요" (O) / "옆자리 사람이 시끄러워요" (X)
- 빈 화면: "아직 리뷰가 없는 자리예요. 첫 리뷰를 남겨 주세요" / 오류: "연결이 끊겼어요. 다시 시도해 주세요"
- 리뷰 작성자는 이름·사번 없이 본부·연차만 보여요.

## 올리기 전에 확인
- 브라우저에서 `index.html`을 열고 직접 눌러 봐요. 개발자 도구 콘솔에 빨간 오류가 없어야 해요.
- 개발자 도구 기기 모드(360~390px)와 PC 너비에서 모두 확인해요.
- 막혔던 지점과 프롬프트를 고친 과정은 [docs/개발기록.md](docs/개발기록.md)에 Before→After로 남겨요 (PPT P.13).
