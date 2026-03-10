# 초이쿠지 통합 관리자 - Node.js 설정 가이드

## 📁 파일 구조

```
choikuji-node/
├── server.js              ← 서버 (Express + SQLite)
├── package.json           ← 의존성
├── render.yaml            ← Render.com 배포 설정
├── .gitignore
├── data/                  ← DB 파일 (자동 생성됨)
│   └── choikuji.db
└── public/
    ├── index.html         ← 회원 페이지 (공개)
    └── admin/
        ├── index.html     ← 관리자 페이지
        ├── style.css      ← 스타일
        ├── db.js          ← 서버 API 레이어
        ├── app.js         ← 관리 로직 1
        └── app2.js        ← 관리 로직 2
```

## 🔧 로컬 테스트

```bash
# 프로젝트 폴더에서
npm install
npm start

# 브라우저에서
# 회원 페이지: http://localhost:3000
# 관리자 페이지: http://localhost:3000/admin
# 기본 비밀번호: admin123
```

## 🚀 Render.com 배포 (무료)

### 1단계: GitHub에 올리기

```bash
git init
git add .
git commit -m "초이쿠지 서버"
```
GitHub에서 새 저장소(repository) 만들고 push.

### 2단계: Render.com 설정

1. https://render.com 가입 (GitHub 계정으로)
2. Dashboard → "New" → "Web Service"
3. GitHub 저장소 연결
4. 설정:
   - Name: choikuji
   - Runtime: Node
   - Build Command: npm install
   - Start Command: npm start
   - Plan: Free
5. Environment Variables (환경변수) 추가:
   - ADMIN_PASSWORD: 원하는 관리자 비밀번호
   - SESSION_SECRET: 아무 랜덤 문자열 (예: mySecretKey123)
6. ★ Disk 추가 (중요! 데이터 보존용):
   - Name: choikuji-data
   - Mount Path: /opt/render/project/src/data
   - Size: 1 GB
7. "Create Web Service" 클릭

### 3단계: 접속

배포 완료 후 나오는 URL (예: https://choikuji.onrender.com)
- 회원 페이지: https://choikuji.onrender.com
- 관리자 페이지: https://choikuji.onrender.com/admin

### 4단계: 기존 데이터 이전

1. 관리자 로그인
2. 설정 탭 → 데이터 관리
3. 기존 프로그램에서 백업 JSON 다운로드 → "백업 복원"으로 업로드
4. 또는 같은 브라우저면 "localStorage에서 가져오기"
5. 이전 완료 후 "📢 발행" 버튼 → 회원 페이지 반영

## ⚠️ 무료 플랜 주의사항

- 15분 미접속 시 서버 슬립 → 재접속 시 30초 대기
- 월 750시간 가동 (1개 서비스면 충분)
- Disk를 추가해야 데이터가 보존됨 (★ 중요)

## 💡 비밀번호 변경

환경변수 ADMIN_PASSWORD를 변경하면 됩니다.
또는 관리자 로그인 후 설정에서 변경 가능.
