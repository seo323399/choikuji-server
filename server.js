const express = require('express');
const { createClient } = require('@libsql/client');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 미들웨어 ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'choikuji-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// 정적 파일
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== Turso DB 초기화 ====================
const dbUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
const dbToken = process.env.TURSO_AUTH_TOKEN || undefined;

console.log('========== DB 설정 ==========');
console.log('TURSO_DATABASE_URL 환경변수:', process.env.TURSO_DATABASE_URL ? '존재함' : '없음');
console.log('사용할 DB URL:', dbUrl);
console.log('Auth Token:', dbToken ? '설정됨' : '미설정');
console.log('==============================');

const db = createClient({
  url: dbUrl,
  authToken: dbToken,
});

async function initDB() {
  await db.batch([
    "CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)",
    "CREATE TABLE IF NOT EXISTS published (id INTEGER PRIMARY KEY DEFAULT 1, data TEXT NOT NULL, published_at TEXT)",
    "CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY DEFAULT 1, password_hash TEXT NOT NULL)",
  ]);

  const adminRow = await db.execute("SELECT * FROM admin WHERE id=1");
  if (adminRow.rows.length === 0) {
    const defaultPw = process.env.ADMIN_PASSWORD || 'admin123';
    await db.execute({ sql: "INSERT INTO admin (id, password_hash) VALUES (1, ?)", args: [defaultPw] });
    console.log('기본 관리자 비밀번호 설정됨: ' + defaultPw);
  }
}

// ==================== 인증 미들웨어 ====================
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: '로그인 필요' });
}

// ==================== API: 인증 ====================
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  const result = await db.execute("SELECT password_hash FROM admin WHERE id=1");
  if (result.rows.length && result.rows[0].password_hash === password) {
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

app.post('/api/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상' });
  const result = await db.execute("SELECT password_hash FROM admin WHERE id=1");
  if (result.rows[0].password_hash !== oldPassword) return res.status(401).json({ error: '현재 비밀번호가 틀렸습니다' });
  await db.execute({ sql: "UPDATE admin SET password_hash=? WHERE id=1", args: [newPassword] });
  res.json({ ok: true });
});

// ==================== API: 데이터 CRUD ====================
app.get('/api/data', requireAuth, async (req, res) => {
  try {
    const result = await db.execute({ sql: "SELECT value FROM app_data WHERE key=?", args: ['appData'] });
    if (result.rows.length) {
      res.json(JSON.parse(result.rows[0].value));
    } else {
      res.json({ people: {}, games: [] });
    }
  } catch (e) {
    console.error('데이터 로드 에러:', e);
    res.status(500).json({ error: '데이터 로드 실패: ' + e.message });
  }
});

app.post('/api/data', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.people) return res.status(400).json({ error: '유효하지 않은 데이터' });
    const jsonStr = JSON.stringify(data);
    console.log('데이터 저장:', (jsonStr.length / 1024).toFixed(1) + 'KB, 회원:' + Object.keys(data.people).length + '명');
    await db.execute({ sql: "INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, ?)", args: ['appData', jsonStr, new Date().toISOString()] });
    res.json({ ok: true });
  } catch (e) {
    console.error('데이터 저장 에러:', e);
    res.status(500).json({ error: '서버 저장 실패: ' + e.message });
  }
});

// ==================== API: 발행 ====================
app.post('/api/publish', requireAuth, async (req, res) => {
  try {
    const result = await db.execute({ sql: "SELECT value FROM app_data WHERE key=?", args: ['appData'] });
    if (!result.rows.length) return res.status(400).json({ error: '데이터가 없습니다' });
    const appData = JSON.parse(result.rows[0].value);
    const members = [];
    const names = Object.keys(appData.people).sort((a, b) => a.localeCompare(b, 'ko'));
    for (const name of names) {
      const p = appData.people[name];
      if (p.stickers !== undefined && p.stickers_earned === undefined) { p.stickers_earned = p.stickers; p.stickers_used = 0; }
      if (p.stickers_earned === undefined) { p.stickers_earned = 0; p.stickers_used = 0; }
      members.push({ name, code: p.code || '', stickers_earned: p.stickers_earned || 0, stickers_used: p.stickers_used || 0, earned: p.earned || 0, used: p.used || 0 });
    }
    const publishData = { members, publishedAt: new Date().toISOString(), totalMembers: members.length, totalGames: (appData.games || []).length };
    await db.execute({ sql: "INSERT OR REPLACE INTO published (id, data, published_at) VALUES (1, ?, ?)", args: [JSON.stringify(publishData), new Date().toISOString()] });
    res.json({ ok: true, totalMembers: members.length });
  } catch (e) {
    console.error('발행 에러:', e);
    res.status(500).json({ error: '발행 실패: ' + e.message });
  }
});

app.get('/api/published', async (req, res) => {
  try {
    const result = await db.execute("SELECT data FROM published WHERE id=1");
    if (result.rows.length) { res.json(JSON.parse(result.rows[0].data)); }
    else { res.json(null); }
  } catch (e) { res.json(null); }
});

// ==================== API: 마이그레이션 ====================
app.post('/api/migrate', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.people) return res.status(400).json({ error: '유효하지 않은 데이터' });
    Object.entries(data.people).forEach(([n, p]) => {
      if (typeof p === 'number') { data.people[n] = { earned: 0, used: 0, stickers_earned: p, stickers_used: 0 }; }
      else {
        if (p.stickers !== undefined && p.stickers_earned === undefined) { p.stickers_earned = p.stickers; p.stickers_used = 0; delete p.stickers; delete p.mileage; }
        if (p.stickers_earned === undefined) { p.stickers_earned = 0; p.stickers_used = 0; }
        if (p.earned === undefined) p.earned = 0;
        if (p.used === undefined) p.used = 0;
        if (p.mileage !== undefined) delete p.mileage;
      }
    });
    if (!data.games) data.games = [];
    await db.execute({ sql: "INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, ?)", args: ['appData', JSON.stringify(data), new Date().toISOString()] });
    res.json({ ok: true, people: Object.keys(data.people).length, games: data.games.length });
  } catch (e) {
    console.error('마이그레이션 에러:', e);
    res.status(500).json({ error: '마이그레이션 실패: ' + e.message });
  }
});

// ==================== 페이지 라우팅 ====================
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/index.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/index.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// ==================== 서버 시작 ====================
initDB().then(() => {
  app.listen(PORT, () => {
    console.log('초이쿠지 서버 실행 중: http://localhost:' + PORT);
    console.log('관리자 페이지: http://localhost:' + PORT + '/admin');
    console.log('회원 페이지: http://localhost:' + PORT);
  });
}).catch(e => { console.error('DB 초기화 실패:', e); process.exit(1); });