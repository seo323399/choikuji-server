// ╔══════════════════════════════════════════════════════════════╗
// ║         서버 API 레이어 (localStorage 대체)                   ║
// ╚══════════════════════════════════════════════════════════════╝

let appData = { people: {}, games: [] };
let _dataLoaded = false;
let _saveTimer = null;

// ==================== 로그인/로그아웃 ====================
async function doLogin() {
  const pw = document.getElementById('login-pw').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  if (!pw) { errEl.textContent = '비밀번호를 입력하세요.'; errEl.style.display = 'block'; return; }

  try {
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    if (res.ok) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('main-app').classList.remove('hidden');
      await loadDataFromServer();
      initApp();
    } else {
      const data = await res.json();
      errEl.textContent = data.error || '로그인 실패';
      errEl.style.display = 'block';
    }
  } catch (e) {
    errEl.textContent = '서버 연결 실패: ' + e.message;
    errEl.style.display = 'block';
  }
}

async function doLogout() {
  if (!confirm('로그아웃 하시겠습니까?')) return;
  await fetch('/api/logout', { method: 'POST' });
  location.reload();
}

// 페이지 로드 시 인증 상태 확인
async function checkAuth() {
  try {
    const res = await fetch('/api/auth-check');
    const data = await res.json();
    if (data.authenticated) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('main-app').classList.remove('hidden');
      await loadDataFromServer();
      initApp();
    }
  } catch (e) {
    console.error('인증 확인 실패:', e);
  }
}

// ==================== 데이터 로드/저장 ====================
async function loadDataFromServer() {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      appData = await res.json();
      if (!appData.people) appData.people = {};
      if (!appData.games) appData.games = [];
      _dataLoaded = true;
      console.log('서버 데이터 로드 완료:', Object.keys(appData.people).length + '명, ' + appData.games.length + '게임');
    }
  } catch (e) {
    console.error('데이터 로드 실패:', e);
    alert('데이터를 불러오지 못했습니다: ' + e.message);
  }
}

// 저장 (디바운스 적용 - 빠른 연속 저장 방지)
function saveData() {
  pruneEmptyPeople();
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      const body = JSON.stringify(appData);
      console.log('저장 데이터 크기:', (body.length / 1024).toFixed(1) + 'KB');
      const res = await fetch('/api/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: body
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '서버 응답 ' + res.status);
      }
      updatePublishStatus(false);
    } catch (e) {
      console.error('저장 실패:', e);
      alert('저장에 실패했습니다: ' + e.message);
    }
  }, 300);
}

// 즉시 저장 (발행 전 등)
async function saveDataNow() {
  pruneEmptyPeople();
  try {
    const body = JSON.stringify(appData);
    console.log('즉시 저장 데이터 크기:', (body.length / 1024).toFixed(1) + 'KB');
    const res = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: body
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '서버 응답 ' + res.status);
    }
  } catch (e) {
    console.error('즉시 저장 실패:', e);
    alert('저장에 실패했습니다: ' + e.message);
    throw e; // 발행 중단을 위해 에러 전달
  }
}

// ==================== 발행 ====================
async function publishData() {
  if (!confirm('현재 데이터를 발행하시겠습니까?\n회원 페이지에 즉시 반영됩니다.')) return;

  const btn = document.getElementById('publish-btn');
  btn.disabled = true;
  btn.textContent = '⏳ 발행 중...';

  try {
    await saveDataNow(); // 먼저 최신 데이터 저장
    const res = await fetch('/api/publish', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      alert('발행 완료! ' + data.totalMembers + '명의 데이터가 공개되었습니다.');
      updatePublishStatus(true);
    } else {
      throw new Error(data.error || '발행 실패');
    }
  } catch (e) {
    alert('발행 실패: ' + e.message);
  }
  btn.textContent = '📢 발행';
  btn.disabled = false;
}

function updatePublishStatus(justPublished) {
  const el = document.getElementById('publish-status');
  if (justPublished) {
    el.textContent = '✅ 방금 발행됨';
    el.style.color = '#4ade80';
  } else {
    el.textContent = '⚠️ 미발행 변경사항';
    el.style.color = '#fbbf24';
  }
}

// ==================== 마이그레이션 ====================
async function migrateFromJSON(jsonData) {
  if (!jsonData || !jsonData.people) return alert('유효하지 않은 데이터입니다.');
  const pCount = Object.keys(jsonData.people).length;
  const gCount = (jsonData.games || []).length;
  if (!confirm('데이터를 서버로 이전하시겠습니까?\n현재 데이터가 덮어씌워집니다.\n\n회원: ' + pCount + '명\n게임: ' + gCount + '개')) return;

  try {
    const res = await fetch('/api/migrate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonData)
    });
    const data = await res.json();
    if (res.ok) {
      alert('이전 완료!\n회원: ' + data.people + '명\n게임: ' + data.games + '개\n\n페이지를 새로고침합니다.');
      location.reload();
    } else {
      throw new Error(data.error || '이전 실패');
    }
  } catch (e) {
    alert('이전 실패: ' + e.message);
  }
}

function importFromLocalStorageData() {
  try {
    const raw = localStorage.getItem('choikuji_unified');
    if (!raw) return alert('이 브라우저의 localStorage에 기존 데이터가 없습니다.\n기존 프로그램에서 백업 JSON을 다운로드한 후 "백업 복원"을 사용하세요.');
    migrateFromJSON(JSON.parse(raw));
  } catch (e) { alert('파싱 실패: ' + e.message); }
}

// 페이지 로드 시 인증 확인
document.addEventListener('DOMContentLoaded', checkAuth);