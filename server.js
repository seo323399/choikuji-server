const express = require('express');
const Database = require('better-sqlite3');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 미들웨어 ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'choikuji-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24시간
}));

// 정적 파일
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== DB 초기화 ====================
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'choikuji.db'));
db.pragma('journal_mode = WAL');

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS app_data (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS published (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data TEXT NOT NULL,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY DEFAULT 1,
    password_hash TEXT NOT NULL
  );
`);

// 기본 관리자 비밀번호 설정 (없으면)
const adminRow = db.prepare('SELECT * FROM admin WHERE id=1').get();
if (!adminRow) {
  // 기본 비밀번호: admin123 (반드시 변경하세요!)
  const defaultPw = process.env.ADMIN_PASSWORD || 'admin123';
  db.prepare('INSERT INTO admin (id, password_hash) VALUES (1, ?)').run(defaultPw);
  console.log('기본 관리자 비밀번호 설정됨: ' + defaultPw);
}

// ==================== 인증 미들웨어 ====================
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: '로그인 필요' });
}

// ==================== API: 인증 ====================
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const admin = db.prepare('SELECT password_hash FROM admin WHERE id=1').get();
  if (admin && admin.password_hash === password) {
    req.session.authenticated = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: '비밀번호가 틀렸습니다' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/auth-check', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

app.post('/api/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상' });
  const admin = db.prepare('SELECT password_hash FROM admin WHERE id=1').get();
  if (admin.password_hash !== oldPassword) return res.status(401).json({ error: '현재 비밀번호가 틀렸습니다' });
  db.prepare('UPDATE admin SET password_hash=? WHERE id=1').run(newPassword);
  res.json({ ok: true });
});

// ==================== API: 데이터 CRUD ====================

// 전체 데이터 가져오기 (관리자)
app.get('/api/data', requireAuth, (req, res) => {
  const row = db.prepare('SELECT value FROM app_data WHERE key=?').get('appData');
  if (row) {
    res.json(JSON.parse(row.value));
  } else {
    res.json({ people: {}, games: [] });
  }
});

// 전체 데이터 저장 (관리자)
app.post('/api/data', requireAuth, (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.people) return res.status(400).json({ error: '유효하지 않은 데이터' });
    
    const jsonStr = JSON.stringify(data);
    console.log('데이터 저장:', (jsonStr.length / 1024).toFixed(1) + 'KB, 회원:' + Object.keys(data.people).length + '명');
    
    const stmt = db.prepare("INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, datetime('now'))");
    stmt.run('appData', jsonStr);
    res.json({ ok: true });
  } catch (e) {
    console.error('데이터 저장 에러:', e);
    res.status(500).json({ error: '서버 저장 실패: ' + e.message });
  }
});

// ==================== API: 발행 ====================

// 발행하기 (관리자)
app.post('/api/publish', requireAuth, (req, res) => {
  const row = db.prepare('SELECT value FROM app_data WHERE key=?').get('appData');
  if (!row) return res.status(400).json({ error: '데이터가 없습니다' });

  const appData = JSON.parse(row.value);
  const members = [];
  const names = Object.keys(appData.people).sort((a, b) => a.localeCompare(b, 'ko'));

  for (const name of names) {
    const p = appData.people[name];
    // 스티커 마이그레이션
    if (p.stickers !== undefined && p.stickers_earned === undefined) {
      p.stickers_earned = p.stickers; p.stickers_used = 0;
    }
    if (p.stickers_earned === undefined) { p.stickers_earned = 0; p.stickers_used = 0; }

    members.push({
      name, code: p.code || '',
      stickers_earned: p.stickers_earned || 0,
      stickers_used: p.stickers_used || 0,
      earned: p.earned || 0,
      used: p.used || 0
    });
  }

  const publishData = {
    members,
    publishedAt: new Date().toISOString(),
    totalMembers: members.length,
    totalGames: (appData.games || []).length
  };

  const stmt = db.prepare("INSERT OR REPLACE INTO published (id, data, published_at) VALUES (1, ?, datetime('now'))");
  stmt.run(JSON.stringify(publishData));
  res.json({ ok: true, totalMembers: members.length });
});

// 발행 데이터 가져오기 (공개)
app.get('/api/published', (req, res) => {
  const row = db.prepare('SELECT data FROM published WHERE id=1').get();
  if (row) {
    res.json(JSON.parse(row.data));
  } else {
    res.json(null);
  }
});

// ==================== API: 마이그레이션 ====================

// JSON 백업에서 복원 (관리자)
app.post('/api/migrate', requireAuth, (req, res) => {
  const data = req.body;
  if (!data || !data.people) return res.status(400).json({ error: '유효하지 않은 데이터' });

  // 스티커 마이그레이션
  Object.entries(data.people).forEach(([n, p]) => {
    if (typeof p === 'number') {
      data.people[n] = { earned: 0, used: 0, stickers_earned: p, stickers_used: 0 };
    } else {
      if (p.stickers !== undefined && p.stickers_earned === undefined) {
        p.stickers_earned = p.stickers; p.stickers_used = 0;
        delete p.stickers; delete p.mileage;
      }
      if (p.stickers_earned === undefined) { p.stickers_earned = 0; p.stickers_used = 0; }
      if (p.earned === undefined) p.earned = 0;
      if (p.used === undefined) p.used = 0;
      if (p.mileage !== undefined) delete p.mileage;
    }
  });

  if (!data.games) data.games = [];

  const stmt = db.prepare("INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, datetime('now'))");
  stmt.run('appData', JSON.stringify(data));
  res.json({ ok: true, people: Object.keys(data.people).length, games: data.games.length });
});

// ==================== 페이지 라우팅 ====================
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/index.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/index.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// ==================== 서버 시작 ====================
app.listen(PORT, () => {
  console.log(`초이쿠지 서버 실행 중: http://localhost:${PORT}`);
  console.log(`관리자 페이지: http://localhost:${PORT}/admin`);
  console.log(`회원 페이지: http://localhost:${PORT}`);
});