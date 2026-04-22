const DEFAULT_DATA_REPO = 'mursal-ahmadov/todo-html';
const DEFAULT_DATA_FILE = 'data/todos.json';
const CACHE_KEY = 'todo_cache_v4';
const LAST_SYNC_KEY = 'todo_last_sync';
const PENDING_CHANGES_KEY = 'todo_pending_sync_v1';
const ACTIVE_LIST_KEY = 'todo_active_list_v1';
const ACTIVE_VIEW_KEY = 'todo_active_view_v1';
const AUTO_SYNC_MS = 45000;

let appData = createDefaultData();
let activeListId = localStorage.getItem(ACTIVE_LIST_KEY) || 'main';
let currentView = localStorage.getItem(ACTIVE_VIEW_KEY) || 'list';
let fileSha = null;
let filter = 'all';
let editId = null;
let deferredPrompt = null;
let syncing = false;
let autoSyncTimer = null;
let reminderTimer = null;
let searchTerm = '';
let dragTodoId = null;
let selectedDateKey = '';
let calendarCursor = startOfMonth(new Date());
let lastRemoteSync = localStorage.getItem(LAST_SYNC_KEY) || null;
let pendingLocalChanges = localStorage.getItem(PENDING_CHANGES_KEY) === '1';

window.addEventListener('load', () => {
  registerSW();
  bindUI();
  hydrateFromCache();
  applyUrlListSelection();
  setDate();
  syncSettingsFields();

  if (getToken()) {
    showApp();
    renderApp();
    loadData({ silent: hasCachedData() || pendingLocalChanges, preferLocal: pendingLocalChanges });
    initAutoSync();
    initReminderChecks();
  }
});

function bindUI() {
  const addInput = document.getElementById('add-input');
  const searchInput = document.getElementById('search-input');

  addInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  addInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTodo();
    }
  });

  searchInput.addEventListener('input', function(e) {
    searchTerm = e.target.value;
    renderCurrentView();
  });

  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target === el) {
        el.classList.remove('open');
        editId = null;
      }
    });
  });

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !getToken() || !navigator.onLine || syncing) return;
    if (pendingLocalChanges) {
      saveData(true);
    } else {
      loadData({ silent: true });
    }
  });

  window.addEventListener('online', () => {
    if (!getToken() || syncing) return;
    toast('Bağlantı bərpa olundu, məlumatlar yoxlanılır...', 'success');
    if (pendingLocalChanges) {
      saveData(true);
    } else {
      loadData({ silent: true });
    }
  });
}

function createDefaultData() {
  return {
    version: 4,
    lists: [
      {
        id: 'main',
        name: 'Əsas siyahı',
        color: '#c8ff57',
        createdAt: new Date().toISOString()
      }
    ],
    todos: []
  };
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function hasCachedData() {
  return Boolean(localStorage.getItem(CACHE_KEY));
}

function getToken() {
  return localStorage.getItem('gh_token');
}

function setToken(token) {
  localStorage.setItem('gh_token', token);
}

function getDataRepo() {
  return localStorage.getItem('gh_data_repo') || DEFAULT_DATA_REPO;
}

function setDataRepo(repo) {
  localStorage.setItem('gh_data_repo', repo);
}

function getDataFile() {
  return localStorage.getItem('gh_data_file') || DEFAULT_DATA_FILE;
}

function setDataFile(filePath) {
  localStorage.setItem('gh_data_file', filePath);
}

function getApiUrl() {
  return `https://api.github.com/repos/${getDataRepo()}/contents/${getDataFile()}`;
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function hydrateFromCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached) {
      appData = normalizeData(cached);
      ensureCurrentList();
    }
  } catch {
    localStorage.removeItem(CACHE_KEY);
    appData = createDefaultData();
  }
}

function cacheData() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(appData));
}

function setDate() {
  const el = document.getElementById('header-date');
  if (!el) return;
  const dateText = new Date().toLocaleDateString('az-AZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  if (lastRemoteSync) {
    const syncText = new Date(lastRemoteSync).toLocaleTimeString('az-AZ', {
      hour: '2-digit',
      minute: '2-digit'
    });
    el.textContent = `${dateText} • Son sync ${syncText}${pendingLocalChanges ? ' • Lokal dəyişiklik var' : ''}`;
    return;
  }

  el.textContent = pendingLocalChanges ? `${dateText} • Lokal dəyişiklik var` : dateText;
}

function markSynced() {
  pendingLocalChanges = false;
  localStorage.removeItem(PENDING_CHANGES_KEY);
  lastRemoteSync = new Date().toISOString();
  localStorage.setItem(LAST_SYNC_KEY, lastRemoteSync);
  setDate();
}

function markDirty() {
  pendingLocalChanges = true;
  localStorage.setItem(PENDING_CHANGES_KEY, '1');
  cacheData();
  setDate();
}

function showApp() {
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('add-area').style.display = 'block';
}

function saveToken() {
  const token = document.getElementById('token-input').value.trim();
  if (!token) {
    toast('Token daxil et', 'error');
    return;
  }

  setToken(token);
  showApp();
  syncSettingsFields();
  renderApp();
  loadData();
  initAutoSync();
  initReminderChecks();
}

function syncSettingsFields() {
  const tokenField = document.getElementById('settings-token');
  const repoField = document.getElementById('settings-data-repo');
  const fileField = document.getElementById('settings-data-file');
  const note = document.getElementById('settings-repo-note');

  if (tokenField) tokenField.value = getToken() || '';
  if (repoField) repoField.value = getDataRepo();
  if (fileField) fileField.value = getDataFile();
  if (note) {
    const sameRepo = getDataRepo() === DEFAULT_DATA_REPO;
    note.textContent = sameRepo
      ? 'Hazırda məlumatlar sayt repounda saxlanır. Repo publicdirsə, data faylı da görünür.'
      : 'Hazırda məlumatlar ayrıca repo-da saxlanır. Həmin repo private olsa, qeydlər gizli qala bilər.';
  }
  updateNotificationUI();
}

async function updateSettings() {
  const token = document.getElementById('settings-token').value.trim();
  const repo = document.getElementById('settings-data-repo').value.trim();
  const filePath = document.getElementById('settings-data-file').value.trim();

  if (!token) {
    toast('GitHub token boş ola bilməz', 'error');
    return;
  }
  if (!repo || !filePath) {
    toast('Data repo və fayl yolunu doldur', 'error');
    return;
  }

  const repoChanged = repo !== getDataRepo() || filePath !== getDataFile();
  setToken(token);
  setDataRepo(repo);
  setDataFile(filePath);
  fileSha = null;

  syncSettingsFields();
  closeSettings();
  toast(repoChanged ? 'Ayarlar yeniləndi, yeni data mənbəyi yüklənir' : 'Ayarlar yadda saxlandı ✓', 'success');

  if (repoChanged) {
    await loadData();
  }
}

function showSettings() {
  syncSettingsFields();
  document.getElementById('settings-modal').classList.add('open');
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('open');
}

async function enableNotifications() {
  if (!('Notification' in window)) {
    toast('Bu brauzer bildirişləri dəstəkləmir', 'error');
    return;
  }

  const result = await Notification.requestPermission();
  updateNotificationUI();
  if (result === 'granted') {
    toast('Bildirişlər aktiv edildi ✓', 'success');
    checkReminders();
  } else {
    toast('Bildiriş icazəsi verilmədi', 'error');
  }
}

function updateNotificationUI() {
  const status = document.getElementById('notification-status');
  const button = document.getElementById('notification-btn');
  if (!status || !button) return;

  if (!('Notification' in window)) {
    status.textContent = 'Bu brauzer bildiriş dəstəyi vermir';
    button.textContent = 'Dəstəklənmir';
    button.disabled = true;
    return;
  }

  button.disabled = false;
  if (Notification.permission === 'granted') {
    status.textContent = 'Bildirişlər aktivdir';
    button.textContent = 'Aktiv';
    button.disabled = true;
  } else if (Notification.permission === 'denied') {
    status.textContent = 'Bildiriş icazəsi bloklanıb';
    button.textContent = 'Bloklanıb';
    button.disabled = true;
  } else {
    status.textContent = 'Xatırlatmalar üçün brauzer icazəsi lazımdır';
    button.textContent = 'Aktiv et';
  }
}

async function ghFetch(method, body) {
  const response = await fetch(getApiUrl(), {
    method,
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function refreshFileSha() {
  try {
    const data = await ghFetch('GET');
    fileSha = data.sha;
  } catch (e) {
    if (e.status === 404) {
      fileSha = null;
      return;
    }
    throw e;
  }
}

async function loadData(options = {}) {
  const { silent = false, preferLocal = false } = options;
  if (!getToken() || syncing) return;
  if (preferLocal && pendingLocalChanges) {
    renderApp();
    if (navigator.onLine) saveData(true);
    return;
  }

  setSyncing(true);
  try {
    const data = await ghFetch('GET');
    fileSha = data.sha;
    const content = atob(data.content.replace(/\n/g, ''));
    const parsed = JSON.parse(content);
    if (!pendingLocalChanges) {
      appData = normalizeData(parsed);
      ensureCurrentList();
      applyUrlListSelection();
      cacheData();
      markSynced();
    }
  } catch (e) {
    if (e.status === 404) {
      appData = normalizeData(appData);
      ensureCurrentList();
      cacheData();
      await saveData(true);
    } else if (!silent) {
      toast('Bulud versiyası yüklənmədi, lokal nüsxə açıldı', 'error');
    }
  } finally {
    setSyncing(false);
    renderApp();
  }
}

async function saveData(silent = false, attempt = 0) {
  if (!getToken()) return;

  cacheData();
  setSyncing(true);
  try {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(appData, null, 2))));
    const body = {
      message: `Todo yeniləndi — ${new Date().toLocaleString('az-AZ')}`,
      content
    };
    if (fileSha) body.sha = fileSha;
    const res = await ghFetch('PUT', body);
    fileSha = res.content.sha;
    markSynced();
    if (!silent) toast('Yadda saxlandı ✓', 'success');
  } catch (e) {
    if (attempt === 0 && (e.status === 409 || /sha|conflict/i.test(e.message))) {
      await refreshFileSha();
      return saveData(silent, attempt + 1);
    }
    markDirty();
    if (!silent) {
      toast('Lokal yadda saxlandı, internet gələndə sync olacaq', 'error');
    }
  } finally {
    setSyncing(false);
    renderApp();
  }
}

function normalizeData(raw) {
  if (Array.isArray(raw)) {
    return {
      version: 4,
      lists: [
        {
          id: 'main',
          name: 'Əsas siyahı',
          color: '#c8ff57',
          createdAt: new Date().toISOString()
        }
      ],
      todos: raw.map((item, index) => normalizeTodo(item, 'main', index))
    };
  }

  if (!raw || typeof raw !== 'object') {
    return createDefaultData();
  }

  const base = createDefaultData();
  const lists = Array.isArray(raw.lists) && raw.lists.length
    ? raw.lists.map((list, index) => normalizeList(list, index))
    : base.lists;

  const firstListId = lists[0].id;
  const todos = Array.isArray(raw.todos)
    ? raw.todos.map((item, index) => normalizeTodo(item, firstListId, index, lists))
    : [];

  return {
    version: 4,
    lists,
    todos
  };
}

function normalizeList(list, index) {
  return {
    id: typeof list.id === 'string' && list.id ? list.id : `list_${index + 1}`,
    name: typeof list.name === 'string' && list.name.trim() ? list.name.trim() : `Siyahı ${index + 1}`,
    color: typeof list.color === 'string' && list.color ? list.color : '#c8ff57',
    createdAt: list.createdAt || new Date().toISOString()
  };
}

function normalizeTodo(item, fallbackListId, index, lists = appData.lists) {
  const validListIds = new Set((lists || []).map(list => list.id));
  const listId = validListIds.has(item.listId) ? item.listId : fallbackListId;
  const status = ['active', 'archived', 'trash'].includes(item.status) ? item.status : 'active';
  return {
    id: item.id || createId('todo'),
    listId,
    text: typeof item.text === 'string' ? item.text : '',
    done: Boolean(item.done),
    priority: ['low', 'mid', 'high'].includes(item.priority) ? item.priority : 'mid',
    tag: item.tag || '',
    category: item.category || '',
    dueAt: item.dueAt || '',
    reminderAt: item.reminderAt || '',
    remindedAt: item.remindedAt || '',
    repeat: ['none', 'daily', 'weekly', 'monthly'].includes(item.repeat) ? item.repeat : 'none',
    status,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    completedAt: item.completedAt || '',
    sortOrder: Number.isFinite(item.sortOrder) ? item.sortOrder : index + 1
  };
}

function ensureCurrentList() {
  if (!appData.lists.length) {
    appData = createDefaultData();
  }
  if (!appData.lists.some(list => list.id === activeListId)) {
    activeListId = appData.lists[0].id;
    localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
  }
}

function applyUrlListSelection() {
  const params = new URLSearchParams(window.location.search);
  const listFromUrl = params.get('list');
  if (listFromUrl && appData.lists.some(list => list.id === listFromUrl)) {
    activeListId = listFromUrl;
    localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
  }
  ensureCurrentList();
}

function updateUrlForList() {
  const url = new URL(window.location.href);
  url.searchParams.set('list', activeListId);
  window.history.replaceState({}, '', url);
}

function getCurrentList() {
  ensureCurrentList();
  return appData.lists.find(list => list.id === activeListId) || appData.lists[0];
}

function getListTodos(listId = activeListId) {
  return appData.todos.filter(todo => todo.listId === listId);
}

function getFilteredTodos() {
  let todos = getListTodos().slice();

  if (filter === 'archive') {
    todos = todos.filter(todo => todo.status === 'archived');
  } else if (filter === 'trash') {
    todos = todos.filter(todo => todo.status === 'trash');
  } else {
    todos = todos.filter(todo => todo.status === 'active');
    if (filter === 'active') todos = todos.filter(todo => !todo.done);
    if (filter === 'done') todos = todos.filter(todo => todo.done);
  }

  const query = searchTerm.trim().toLowerCase();
  if (query) {
    todos = todos.filter(todo => {
      const haystack = [todo.text, todo.tag, todo.category].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }

  if (selectedDateKey) {
    todos = todos.filter(todo => dateKey(todo.dueAt) === selectedDateKey);
  }

  return todos.sort(sortTodos);
}

function sortTodos(a, b) {
  return (a.sortOrder || 0) - (b.sortOrder || 0) || new Date(b.createdAt) - new Date(a.createdAt);
}

function canDragSort() {
  return currentView === 'list' && filter === 'all' && !searchTerm.trim() && !selectedDateKey;
}

function getTopSortOrder(listId) {
  const todos = getListTodos(listId).filter(todo => todo.status === 'active');
  if (!todos.length) return 1;
  return Math.min(...todos.map(todo => todo.sortOrder || 0)) - 1;
}

async function addTodo() {
  const input = document.getElementById('add-input');
  const text = input.value.trim();
  if (!text) return;

  const todo = {
    id: createId('todo'),
    listId: activeListId,
    text,
    done: false,
    priority: document.getElementById('priority-select').value,
    tag: document.getElementById('tag-input').value.trim().replace(/^#/, ''),
    category: document.getElementById('category-input').value.trim(),
    dueAt: document.getElementById('due-input').value,
    reminderAt: document.getElementById('reminder-input').value,
    remindedAt: '',
    repeat: document.getElementById('repeat-select').value,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: '',
    sortOrder: getTopSortOrder(activeListId)
  };

  appData.todos.push(todo);
  markDirty();
  renderApp();

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('tag-input').value = '';
  document.getElementById('category-input').value = '';
  document.getElementById('due-input').value = '';
  document.getElementById('reminder-input').value = '';
  document.getElementById('repeat-select').value = 'none';

  await saveData();
}

async function toggleTodo(id) {
  const todo = appData.todos.find(item => item.id === id);
  if (!todo || todo.status !== 'active') return;

  const wasDone = todo.done;
  todo.done = !todo.done;
  todo.updatedAt = new Date().toISOString();
  todo.completedAt = todo.done ? new Date().toISOString() : '';

  if (!wasDone && todo.done && todo.repeat !== 'none') {
    appData.todos.push(createRecurringTodo(todo));
  }

  markDirty();
  renderApp();
  await saveData();
}

function createRecurringTodo(todo) {
  return {
    ...todo,
    id: createId('todo'),
    done: false,
    dueAt: shiftDateValue(todo.dueAt, todo.repeat),
    reminderAt: shiftDateTimeValue(todo.reminderAt, todo.repeat),
    remindedAt: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: '',
    sortOrder: getTopSortOrder(todo.listId)
  };
}

function shiftDateValue(value, repeat) {
  const base = value ? new Date(`${value}T12:00`) : new Date();
  if (repeat === 'daily') base.setDate(base.getDate() + 1);
  if (repeat === 'weekly') base.setDate(base.getDate() + 7);
  if (repeat === 'monthly') base.setMonth(base.getMonth() + 1);
  return formatDateInput(base);
}

function shiftDateTimeValue(value, repeat) {
  if (!value) return '';
  const base = new Date(value);
  if (repeat === 'daily') base.setDate(base.getDate() + 1);
  if (repeat === 'weekly') base.setDate(base.getDate() + 7);
  if (repeat === 'monthly') base.setMonth(base.getMonth() + 1);
  return formatDateTimeInput(base);
}

async function archiveTodo(id) {
  const todo = appData.todos.find(item => item.id === id);
  if (!todo) return;
  todo.status = 'archived';
  todo.updatedAt = new Date().toISOString();
  markDirty();
  renderApp();
  await saveData();
}

async function moveToTrash(id) {
  const todo = appData.todos.find(item => item.id === id);
  if (!todo) return;
  todo.status = 'trash';
  todo.updatedAt = new Date().toISOString();
  markDirty();
  renderApp();
  await saveData();
}

async function restoreTodo(id) {
  const todo = appData.todos.find(item => item.id === id);
  if (!todo) return;
  todo.status = 'active';
  todo.updatedAt = new Date().toISOString();
  markDirty();
  renderApp();
  await saveData();
}

async function deleteForever(id) {
  appData.todos = appData.todos.filter(item => item.id !== id);
  markDirty();
  renderApp();
  await saveData();
}

function openEdit(id) {
  const todo = appData.todos.find(item => item.id === id);
  if (!todo) return;

  editId = id;
  document.getElementById('edit-input').value = todo.text;
  document.getElementById('edit-priority').value = todo.priority;
  document.getElementById('edit-tag').value = todo.tag || '';
  document.getElementById('edit-category').value = todo.category || '';
  document.getElementById('edit-due').value = todo.dueAt || '';
  document.getElementById('edit-reminder').value = todo.reminderAt || '';
  document.getElementById('edit-repeat').value = todo.repeat || 'none';
  document.getElementById('edit-modal').classList.add('open');
}

async function saveEdit() {
  const todo = appData.todos.find(item => item.id === editId);
  if (!todo) return;

  const text = document.getElementById('edit-input').value.trim();
  if (!text) {
    toast('Mətn boş ola bilməz', 'error');
    return;
  }

  todo.text = text;
  todo.priority = document.getElementById('edit-priority').value;
  todo.tag = document.getElementById('edit-tag').value.trim().replace(/^#/, '');
  todo.category = document.getElementById('edit-category').value.trim();
  todo.dueAt = document.getElementById('edit-due').value;
  todo.reminderAt = document.getElementById('edit-reminder').value;
  todo.repeat = document.getElementById('edit-repeat').value;
  todo.updatedAt = new Date().toISOString();
  todo.remindedAt = '';

  closeEditModal();
  markDirty();
  renderApp();
  await saveData();
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
  editId = null;
}

function openListModal() {
  document.getElementById('list-name-input').value = '';
  document.getElementById('list-color-input').value = '#c8ff57';
  document.getElementById('list-modal').classList.add('open');
}

function closeListModal() {
  document.getElementById('list-modal').classList.remove('open');
}

async function createList() {
  const name = document.getElementById('list-name-input').value.trim();
  const color = document.getElementById('list-color-input').value;
  if (!name) {
    toast('Siyahı adı yaz', 'error');
    return;
  }

  const list = {
    id: slugify(name) || createId('list'),
    name,
    color,
    createdAt: new Date().toISOString()
  };

  if (appData.lists.some(item => item.id === list.id)) {
    list.id = createId('list');
  }

  appData.lists.push(list);
  activeListId = list.id;
  localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
  updateUrlForList();
  closeListModal();
  markDirty();
  renderApp();
  await saveData();
}

function switchList(id) {
  if (!appData.lists.some(list => list.id === id)) return;
  activeListId = id;
  selectedDateKey = '';
  localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
  updateUrlForList();
  renderApp();
}

async function copyShareLink() {
  const url = new URL(window.location.href);
  url.searchParams.set('list', activeListId);
  const link = url.toString();

  try {
    await navigator.clipboard.writeText(link);
    toast('Paylaşım linki kopyalandı ✓', 'success');
  } catch {
    toast(link, 'success');
  }
}

async function refreshTodos() {
  if (pendingLocalChanges) {
    await saveData(true);
  }
  await loadData();
}

function renderApp() {
  ensureCurrentList();
  syncSettingsFields();
  renderListSwitcher();
  renderStats();
  renderCurrentView();
  updateUrlForList();
  setDate();
}

function renderListSwitcher() {
  const container = document.getElementById('list-switcher');
  const current = getCurrentList();
  const chips = appData.lists.map(list => {
    const active = list.id === current.id ? 'active' : '';
    return `
      <button class="list-chip ${active}" onclick="switchList('${list.id}')">
        <span class="list-chip-dot" style="background:${list.color}"></span>
        <span>${escHtml(list.name)}</span>
      </button>`;
  }).join('');

  container.innerHTML = `
    <div class="list-switch-scroll">${chips}</div>
    <button class="list-add-btn" onclick="openListModal()">+ Siyahı</button>
  `;
}

function renderStats() {
  const currentListTodos = getListTodos();
  const activeTodos = currentListTodos.filter(todo => todo.status === 'active');
  const doneTodos = activeTodos.filter(todo => todo.done).length;
  const openTodos = activeTodos.length - doneTodos;
  const dueToday = activeTodos.filter(todo => !todo.done && dateKey(todo.dueAt) === formatDateInput(new Date())).length;
  const overdue = activeTodos.filter(todo => !todo.done && todo.dueAt && dateKey(todo.dueAt) < formatDateInput(new Date())).length;
  const syncLabel = pendingLocalChanges
    ? 'lokal'
    : (lastRemoteSync ? new Date(lastRemoteSync).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) : 'lokal');

  document.getElementById('stats-bar').innerHTML = `
    <div class="stat-pill accent"><strong>${openTodos}</strong> açıq</div>
    <div class="stat-pill"><strong>${doneTodos}</strong> tamamlandı</div>
    <div class="stat-pill"><strong>${dueToday}</strong> bu gün</div>
    <div class="stat-pill ${overdue ? 'danger' : ''}"><strong>${overdue}</strong> gecikib</div>
    <div class="stat-pill"><strong>${syncLabel}</strong> sync</div>
  `;
}

function renderCurrentView() {
  document.querySelectorAll('.view-tab').forEach(button => {
    button.classList.toggle('active', button.dataset.view === currentView);
  });

  document.getElementById('list-section').style.display = currentView === 'list' ? 'block' : 'none';
  document.getElementById('calendar-section').style.display = currentView === 'calendar' ? 'block' : 'none';
  document.getElementById('insights-section').style.display = currentView === 'insights' ? 'block' : 'none';

  if (currentView === 'list') renderTodos();
  if (currentView === 'calendar') renderCalendar();
  if (currentView === 'insights') renderInsights();
}

function setView(view, button) {
  currentView = view;
  localStorage.setItem(ACTIVE_VIEW_KEY, currentView);
  if (button) {
    document.querySelectorAll('.view-tab').forEach(tab => tab.classList.remove('active'));
    button.classList.add('active');
  }
  renderCurrentView();
}

function setFilter(nextFilter, button) {
  filter = nextFilter;
  document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
  button.classList.add('active');
  renderCurrentView();
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  const todos = getFilteredTodos();

  if (!todos.length) {
    const emptyMessage = searchTerm.trim()
      ? 'Axtarışa uyğun tapşırıq yoxdur'
      : selectedDateKey
        ? 'Bu gün üçün tapşırıq yoxdur'
        : ({ all: 'Heç bir tapşırıq yoxdur', active: 'Aktiv tapşırıq yoxdur', done: 'Tamamlanan yoxdur', archive: 'Arxiv boşdur', trash: 'Zibil qutusu boşdur' }[filter]);

    list.innerHTML = `<div class="empty-state"><div class="empty-icon">✦</div><div class="empty-text">${emptyMessage}</div></div>`;
    return;
  }

  list.innerHTML = todos.map(todo => renderTodoCard(todo)).join('');
}

function renderTodoCard(todo) {
  const canDrag = canDragSort() && todo.status === 'active';
  const dueBadge = todo.dueAt ? `<span class="meta-badge ${dueBadgeClass(todo.dueAt, todo.done)}">${escHtml(formatDueLabel(todo.dueAt, todo.done))}</span>` : '';
  const tagBadge = todo.tag ? `<span class="meta-badge">#${escHtml(todo.tag)}</span>` : '';
  const categoryBadge = todo.category ? `<span class="meta-badge">${escHtml(todo.category)}</span>` : '';
  const repeatBadge = todo.repeat !== 'none' ? `<span class="meta-badge">${repeatLabel(todo.repeat)}</span>` : '';
  const reminderBadge = todo.reminderAt ? `<span class="meta-badge">🔔 ${escHtml(formatReminderLabel(todo.reminderAt))}</span>` : '';

  return `
    <div class="todo-item ${todo.done ? 'done' : ''} ${canDrag ? 'sortable' : ''}"
      ${canDrag ? 'draggable="true"' : ''}
      ${canDrag ? `ondragstart="handleDragStart(event, '${todo.id}')" ondragover="handleDragOver(event)" ondrop="handleDrop(event, '${todo.id}')" ondragend="handleDragEnd()"` : ''}>
      <div class="priority-bar ${todo.priority}"></div>
      ${canDrag ? '<div class="drag-handle" title="Sürüşdür">⋮⋮</div>' : ''}
      <button class="check-btn" ${todo.status !== 'active' ? 'disabled' : ''} onclick="toggleTodo('${todo.id}')">
        <svg width="12" height="12" fill="none" stroke="#0f0f13" stroke-width="2.5" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
      <div class="todo-content">
        <div class="todo-text">${escHtml(todo.text)}</div>
        <div class="todo-meta">
          <span class="todo-time">${formatCreatedLabel(todo.createdAt)}</span>
          ${tagBadge}
          ${categoryBadge}
          ${dueBadge}
          ${reminderBadge}
          ${repeatBadge}
        </div>
      </div>
      <div class="todo-actions">${renderTodoActions(todo)}</div>
    </div>`;
}

function renderTodoActions(todo) {
  if (todo.status === 'trash') {
    return `
      <button class="action-btn" onclick="restoreTodo('${todo.id}')" title="Bərpa et">↺</button>
      <button class="action-btn delete" onclick="deleteForever('${todo.id}')" title="Tam sil">✕</button>
    `;
  }

  if (todo.status === 'archived') {
    return `
      <button class="action-btn" onclick="restoreTodo('${todo.id}')" title="Bərpa et">↺</button>
      <button class="action-btn delete" onclick="moveToTrash('${todo.id}')" title="Zibilə at">🗑</button>
    `;
  }

  return `
    <button class="action-btn" onclick="openEdit('${todo.id}')" title="Düzəlt">✎</button>
    <button class="action-btn" onclick="archiveTodo('${todo.id}')" title="Arxivlə">⌁</button>
    <button class="action-btn delete" onclick="moveToTrash('${todo.id}')" title="Zibilə at">🗑</button>
  `;
}

function renderCalendar() {
  document.getElementById('calendar-label').textContent = calendarCursor.toLocaleDateString('az-AZ', {
    month: 'long',
    year: 'numeric'
  });

  const grid = document.getElementById('calendar-grid');
  const headers = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'];
  const start = startOfCalendarGrid(calendarCursor);
  const activeTodos = getListTodos().filter(todo => todo.status === 'active' && todo.dueAt);

  const cells = headers.map(label => `<div class="calendar-head">${label}</div>`);
  for (let index = 0; index < 42; index += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const key = formatDateInput(current);
    const count = activeTodos.filter(todo => dateKey(todo.dueAt) === key).length;
    const classes = [
      'calendar-day',
      current.getMonth() !== calendarCursor.getMonth() ? 'outside' : '',
      selectedDateKey === key ? 'active' : '',
      key === formatDateInput(new Date()) ? 'today' : ''
    ].filter(Boolean).join(' ');

    cells.push(`
      <button class="${classes}" onclick="selectCalendarDate('${key}')">
        <span class="calendar-day-num">${current.getDate()}</span>
        <span class="calendar-day-count">${count ? `${count} iş` : ''}</span>
      </button>
    `);
  }

  grid.innerHTML = cells.join('');
  renderCalendarDayList();
}

function renderCalendarDayList() {
  const container = document.getElementById('calendar-day-list');
  const dueTodos = getListTodos()
    .filter(todo => todo.status === 'active' && todo.dueAt)
    .sort((a, b) => dateKey(a.dueAt).localeCompare(dateKey(b.dueAt)) || sortTodos(a, b));

  if (!selectedDateKey) {
    const preview = dueTodos.slice(0, 6);
    if (!preview.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-text">Tarixli tapşırıq yoxdur</div></div>';
      return;
    }

    container.innerHTML = `
      <div class="section-title">Yaxın tarixlər</div>
      ${preview.map(todo => `<div class="calendar-list-item"><strong>${escHtml(todo.text)}</strong><span>${escHtml(formatDueLabel(todo.dueAt, todo.done))}</span></div>`).join('')}
    `;
    return;
  }

  const items = dueTodos.filter(todo => dateKey(todo.dueAt) === selectedDateKey);
  if (!items.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-text">Seçilən gün üçün tapşırıq yoxdur</div></div>';
    return;
  }

  container.innerHTML = `
    <div class="section-title">${new Date(`${selectedDateKey}T12:00`).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' })}</div>
    ${items.map(todo => `<div class="calendar-list-item"><strong>${escHtml(todo.text)}</strong><span>${escHtml(todo.category || repeatLabel(todo.repeat) || 'Tapşırıq')}</span></div>`).join('')}
  `;
}

function renderInsights() {
  const listTodos = getListTodos();
  const activeTodos = listTodos.filter(todo => todo.status === 'active');
  const today = formatDateInput(new Date());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const completedThisWeek = activeTodos.filter(todo => todo.done && todo.completedAt && new Date(todo.completedAt) >= weekAgo).length;
  const overdue = activeTodos.filter(todo => !todo.done && todo.dueAt && dateKey(todo.dueAt) < today).length;
  const dueToday = activeTodos.filter(todo => !todo.done && dateKey(todo.dueAt) === today).length;
  const repeatCount = activeTodos.filter(todo => todo.repeat !== 'none').length;
  const archivedCount = listTodos.filter(todo => todo.status === 'archived').length;
  const trashCount = listTodos.filter(todo => todo.status === 'trash').length;

  const categoryStats = buildCountMap(activeTodos.filter(todo => !todo.done).map(todo => todo.category || 'Digər'));
  const listStats = appData.lists.map(list => ({
    name: list.name,
    count: appData.todos.filter(todo => todo.listId === list.id && todo.status === 'active' && !todo.done).length
  })).filter(item => item.count);

  document.getElementById('insights-grid').innerHTML = `
    <div class="insight-card"><div class="insight-label">Bu gün</div><div class="insight-value">${dueToday}</div></div>
    <div class="insight-card"><div class="insight-label">Gecikən</div><div class="insight-value">${overdue}</div></div>
    <div class="insight-card"><div class="insight-label">7 gündə bitən</div><div class="insight-value">${completedThisWeek}</div></div>
    <div class="insight-card"><div class="insight-label">Təkrarlanan</div><div class="insight-value">${repeatCount}</div></div>
    <div class="insight-panel">
      <div class="section-title">Kateqoriya bölgüsü</div>
      ${renderBars(categoryStats)}
    </div>
    <div class="insight-panel">
      <div class="section-title">Siyahılar üzrə açıq iş</div>
      ${renderBars(listStats)}
    </div>
    <div class="insight-panel">
      <div class="section-title">Arxiv və zibil</div>
      <div class="summary-row"><span>Arxiv</span><strong>${archivedCount}</strong></div>
      <div class="summary-row"><span>Zibil qutusu</span><strong>${trashCount}</strong></div>
    </div>
    <div class="insight-panel">
      <div class="section-title">Yaxın tapşırıqlar</div>
      ${renderUpcoming(activeTodos)}
    </div>
  `;
}

function buildCountMap(values) {
  const map = new Map();
  values.forEach(value => map.set(value, (map.get(value) || 0) + 1));
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function renderBars(items) {
  if (!items.length) {
    return '<div class="empty-text">Hələ məlumat yoxdur</div>';
  }
  const max = Math.max(...items.map(item => item.count), 1);
  return items.map(item => `
    <div class="bar-row">
      <div class="bar-label"><span>${escHtml(item.name)}</span><strong>${item.count}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(item.count / max) * 100}%"></div></div>
    </div>
  `).join('');
}

function renderUpcoming(items) {
  const upcoming = items
    .filter(todo => !todo.done && todo.dueAt)
    .sort((a, b) => dateKey(a.dueAt).localeCompare(dateKey(b.dueAt)))
    .slice(0, 5);

  if (!upcoming.length) {
    return '<div class="empty-text">Yaxın tarixli tapşırıq yoxdur</div>';
  }

  return upcoming.map(todo => `
    <div class="summary-row">
      <span>${escHtml(todo.text)}</span>
      <strong>${escHtml(formatDueLabel(todo.dueAt, false))}</strong>
    </div>
  `).join('');
}

function selectCalendarDate(value) {
  selectedDateKey = selectedDateKey === value ? '' : value;
  renderCalendar();
}

function changeCalendarMonth(delta) {
  calendarCursor = startOfMonth(addMonths(calendarCursor, delta));
  selectedDateKey = '';
  renderCalendar();
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function startOfCalendarGrid(date) {
  const first = startOfMonth(date);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return start;
}

function initAutoSync() {
  if (autoSyncTimer) return;
  autoSyncTimer = window.setInterval(() => {
    if (document.visibilityState !== 'visible' || !navigator.onLine || !getToken() || syncing) return;
    if (pendingLocalChanges) {
      saveData(true);
    } else {
      loadData({ silent: true });
    }
  }, AUTO_SYNC_MS);
}

function initReminderChecks() {
  if (reminderTimer) return;
  reminderTimer = window.setInterval(checkReminders, 30000);
  checkReminders();
}

async function checkReminders() {
  const dueReminders = appData.todos.filter(todo => {
    if (todo.status !== 'active' || todo.done || !todo.reminderAt || todo.remindedAt) return false;
    return new Date(todo.reminderAt).getTime() <= Date.now();
  });

  if (!dueReminders.length) return;

  dueReminders.forEach(todo => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Xatırlatma: ${todo.text}`, {
        body: `${getCurrentList().name}${todo.dueAt ? ` • ${formatDueLabel(todo.dueAt, false)}` : ''}`
      });
    } else {
      toast(`Xatırlatma: ${todo.text}`, 'success');
    }
    todo.remindedAt = new Date().toISOString();
  });

  markDirty();
  await saveData(true);
}

function handleDragStart(event, id) {
  if (!canDragSort()) return;
  dragTodoId = id;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', id);
}

function handleDragOver(event) {
  if (!canDragSort()) return;
  event.preventDefault();
}

function handleDrop(event, targetId) {
  if (!canDragSort()) return;
  event.preventDefault();
  const sourceId = event.dataTransfer.getData('text/plain') || dragTodoId;
  if (!sourceId || sourceId === targetId) return;

  const activeTodos = getListTodos().filter(todo => todo.status === 'active').sort(sortTodos);
  const sourceIndex = activeTodos.findIndex(todo => todo.id === sourceId);
  const targetIndex = activeTodos.findIndex(todo => todo.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return;

  const [moved] = activeTodos.splice(sourceIndex, 1);
  activeTodos.splice(targetIndex, 0, moved);
  activeTodos.forEach((todo, index) => {
    todo.sortOrder = index + 1;
    todo.updatedAt = new Date().toISOString();
  });

  dragTodoId = null;
  markDirty();
  renderTodos();
  saveData(true);
}

function handleDragEnd() {
  dragTodoId = null;
}

function setSyncing(value) {
  syncing = value;
  const indicator = document.getElementById('sync-indicator');
  if (indicator) {
    indicator.innerHTML = value ? '<span class="sync-dot"></span>' : pendingLocalChanges ? '<span class="pending-dot"></span>' : '';
  }
}

function toast(message, type = '') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.className = 'toast';
  }, 3200);
}

function formatCreatedLabel(value) {
  return new Date(value).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' });
}

function formatDueLabel(value, done) {
  const key = dateKey(value);
  const today = formatDateInput(new Date());
  if (key === today) return done ? 'Bu gün bitdi' : 'Bu gün';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === formatDateInput(tomorrow)) return 'Sabah';
  if (!done && key < today) return `${new Date(`${key}T12:00`).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })} gecikib`;
  return new Date(`${key}T12:00`).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' });
}

function formatReminderLabel(value) {
  return new Date(value).toLocaleString('az-AZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function dueBadgeClass(value, done) {
  const key = dateKey(value);
  const today = formatDateInput(new Date());
  if (!done && key < today) return 'is-danger';
  if (key === today) return 'is-accent';
  return '';
}

function repeatLabel(value) {
  if (value === 'daily') return 'Hər gün';
  if (value === 'weekly') return 'Həftəlik';
  if (value === 'monthly') return 'Aylıq';
  return '';
}

function dateKey(value) {
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTimeInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function escHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
