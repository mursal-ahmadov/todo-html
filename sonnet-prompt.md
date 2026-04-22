# PROMPT: Peşəkar PWA Todo Tətbiqi (Azərbaycan dili, Glassmorphism)

> Bu promptu tam oxu. Heç bir addımı buraxma. Kodlaşdırmağa başlamazdan ÖNCƏ bütün bölmələri oxu ki, arxitekturanı düzgün qur.

---

## 1) ROL VƏ MƏQSƏD

Sən **senior front-end developer**-sən. Tapşırığın: **GitHub Pages-də host olunacaq**, telefona **PWA kimi yüklənə bilən**, **tam offline işləyən**, **push bildirişli**, **glassmorphism dizaynlı** peşəkar Todo tətbiqi qurmaqdır.

**Məndə artıq bunlar var:**
- Public GitHub repo: `https://github.com/mursal-ahmadov/todo-html` (tətbiqin kodu burada olacaq və GitHub Pages-lə deploy olunacaq)
- GitHub **Personal Access Token (classic)** `repo` scope ilə (məlumatları saxlamaq üçün)
- Mən ayrıca **PRIVATE repo** yaradacağam (məsələn: `todo-data`) — qeydlərim orada JSON fayl kimi saxlanacaq

**Kritik tələb:** Public repo-nu hamı görə bilər, amma MƏNİM QEYDLƏRİMİ HEÇ KİM GÖRMƏMƏLİDİR. Qeydlər şifrələnmiş formada private repo-da saxlanacaq və yalnız mən token + passphrase ilə oxuya biləcəyəm.

---

## 2) ARXİTEKTURA (ÇOX VACİB — ƏVVƏLCƏ OXU)

```
┌──────────────────────────────────────────────────────────────┐
│  PUBLIC REPO (todo-html) — GitHub Pages deploy               │
│  └── Sadəcə HTML/CSS/JS kod var. MƏLUMAT YOXDUR.             │
└──────────────────────────────────────────────────────────────┘
                          │
                          │  (GitHub REST API + user token)
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  PRIVATE REPO (todo-data) — istifadəçinin özü yaradır        │
│  └── data.json   (AES-GCM ilə şifrələnmiş qeydlər)           │
└──────────────────────────────────────────────────────────────┘
```

**Təhlükəsizlik qatları:**
1. Private repo → yalnız sahibi görür
2. `data.json` AES-GCM ilə şifrələnib → token oğurlansa belə, passphrase olmadan oxunmaz
3. Token və passphrase localStorage-də saxlanır (token şifrələnmiş: passphrase-dən PBKDF2 ilə alınan açarla)

---

## 3) TEXNOLOGİYA STACK-i (BUILD STEP YOXDUR)

GitHub Pages static fayllar verir, ona görə **build tool işlətmə**. Hər şey brauzerdə işləsin.

- **Vanilla JavaScript (ES Modules)** — `<script type="module">`
- **CSS** — vanilla, CSS variables, `backdrop-filter`, container queries
- CDN-dən (import map ilə):
  - `marked` — markdown render
  - `chart.js` — statistika qrafikləri
  - `sortablejs` — drag & drop
  - `dayjs` — tarix hesablamaları
- **Web Crypto API (SubtleCrypto)** — şifrələmə üçün (CDN lazım deyil, native)
- **Service Worker** — offline + bildirişlər
- **Web Notifications API** — push bildirişlər
- **IndexedDB** — offline cache (optional, localStorage-dən böyük data üçün)

**QADAĞAN:** React, Vue, bundler (webpack/vite), npm install. Heç bir build yoxdur.

---

## 4) TAM FAYL STRUKTURU

Bu strukturu eynilə yarat:

```
todo-html/
├── index.html                  # Giriş/setup (token + passphrase)
├── app.html                    # Əsas dashboard (tasklar)
├── pomodoro.html               # Pomodoro timer
├── stats.html                  # Statistika və analitika
├── archive.html                # Arxiv + Zibil qutusu (tab-larla)
├── settings.html               # Ayarlar
├── manifest.webmanifest        # PWA manifest
├── service-worker.js           # Offline + bildiriş SW
├── offline.html                # Offline fallback səhifə
├── README.md                   # Deploy təlimatları
│
├── css/
│   ├── tokens.css              # CSS variables (rəng, spacing, font)
│   ├── reset.css               # Normalize
│   ├── base.css                # body, typography
│   ├── glass.css               # Glassmorphism utility klaslar
│   ├── animations.css          # keyframes, transitions
│   ├── components.css          # button, input, card, modal, toast
│   ├── layout.css              # nav, grid, flex helpers
│   ├── pages/
│   │   ├── auth.css            # index.html üçün
│   │   ├── app.css             # app.html üçün
│   │   ├── pomodoro.css
│   │   ├── stats.css
│   │   ├── archive.css
│   │   └── settings.css
│   └── themes.css              # dark/light mode
│
├── js/
│   ├── config.js               # Sabitlər: repo adı, API endpoint, versiya
│   ├── core/
│   │   ├── crypto.js           # AES-GCM şifrələmə/açma, PBKDF2
│   │   ├── auth.js             # Token + passphrase idarəsi
│   │   ├── storage.js          # GitHub API wrapper (GET/PUT data.json)
│   │   ├── state.js            # Yaddaşda state (observer pattern)
│   │   ├── cache.js            # IndexedDB cache
│   │   └── router.js           # Səhifələr arası naviqasiya guard
│   ├── ui/
│   │   ├── nav.js              # Paylaşılan nav component (inject)
│   │   ├── toast.js            # Toast bildirişlər
│   │   ├── modal.js            # Modal dialog sistemi
│   │   ├── confirm.js          # Təsdiq dialoqu
│   │   ├── loader.js           # Loading spinner/skeleton
│   │   └── empty.js            # Boş state komponenti
│   ├── features/
│   │   ├── tasks.js            # Task CRUD + render
│   │   ├── categories.js       # Kateqoriya CRUD
│   │   ├── tags.js             # Teq CRUD
│   │   ├── recurring.js        # Təkrarlanan task məntiqi
│   │   ├── search.js           # Axtarış + filter
│   │   ├── dragdrop.js         # Sortable.js wrapper
│   │   ├── shortcuts.js        # Klaviatura shortcuts
│   │   ├── markdown.js         # Marked.js wrapper + sanitize
│   │   ├── notifications.js    # Push bildiriş scheduler
│   │   ├── theme.js            # Dark/light toggle
│   │   ├── pomodoro.js         # Pomodoro timer
│   │   ├── stats.js            # Statistika hesablamaları
│   │   └── streak.js           # Streak sayğacı
│   ├── utils/
│   │   ├── date.js             # Tarix helper-ləri
│   │   ├── id.js               # crypto.randomUUID() wrapper
│   │   ├── debounce.js
│   │   ├── format.js           # Date format, number format
│   │   └── dom.js              # querySelector helper-ləri
│   └── pages/                  # Hər səhifəyə aid init.js
│       ├── index.init.js
│       ├── app.init.js
│       ├── pomodoro.init.js
│       ├── stats.init.js
│       ├── archive.init.js
│       └── settings.init.js
│
├── assets/
│   ├── icons/                  # PWA ikonları (192, 512, maskable)
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon-maskable.png
│   ├── favicon.svg
│   └── sounds/
│       ├── complete.mp3        # Task tamamlanma səsi
│       └── pomodoro-end.mp3
│
└── .nojekyll                   # GitHub Pages üçün (Jekyll keç)
```

**Qayda:** Hər HTML faylı yuxarıdakı `<nav>` bölməsini JS ilə inject edir (`nav.js`). Hər səhifə özünə aid CSS və `pages/*.init.js` yükləyir. Core və utils hər səhifədə paylaşılır.

---

## 5) AUTENTİFİKASİYA VƏ TƏHLÜKƏSİZLİK

### `index.html` — İlk giriş axını

İstifadəçi ilk dəfə daxil olanda iki input:
1. **GitHub Personal Access Token** (şifrə inputu — görsənməsin)
2. **Passphrase** (qeydləri şifrələyən parol — istifadəçi özü seçir, ən az 8 simvol)

Həmçinin opsional: **Private repo adı** (default: `todo-data`). Əgər repo yoxdursa, "Repo yarat" düyməsi GitHub API ilə avtomatik yaradır (`POST /user/repos` ilə `private: true`).

**İlk setup:**
```
1. Token + passphrase daxil et
2. Passphrase-dən PBKDF2 (100k iteration, SHA-256) ilə 256-bit açar törət
3. Token-i bu açarla AES-GCM şifrələ
4. localStorage-də saxla:
   - todo.token.enc    (şifrəli token + IV + salt)
   - todo.passphrase.hash (SHA-256 hash — yoxlama üçün, orijinal passphrase YOX)
   - todo.repo         (private repo adı, məs: "mursal-ahmadov/todo-data")
5. Passphrase-i memory-də session boyu saxla (sessionStorage-də DEYİL, JS variable-də)
6. app.html-ə yönləndir
```

**Sonrakı girişlər:**
```
1. Əgər localStorage-də todo.token.enc varsa, passphrase istə
2. Passphrase-in hash-ini yoxla
3. Doğrudursa → token-i deşifrələ, memory-də saxla, app.html-ə yönləndir
4. Yanlışdırsa → xəta göstər
```

**Çıxış (logout):**
```
localStorage.clear()
memory-dəki passphrase-i sil
index.html-ə yönləndir
```

### `js/core/crypto.js` — Lazım olan funksiyalar

```js
export async function deriveKey(passphrase, salt) {
  // PBKDF2, 100_000 iterations, SHA-256, 256-bit output
}
export async function encrypt(plaintext, key) {
  // AES-GCM, random IV (12 bytes), returns {ciphertext, iv}
}
export async function decrypt(ciphertext, iv, key) {
  // AES-GCM decrypt
}
export async function sha256(text) {
  // verification üçün
}
export function randomSalt() {
  // crypto.getRandomValues(16 bytes)
}
```

Token və `data.json`-un məzmunu **eyni mexanizmlə** şifrələnir.

---

## 6) MƏLUMAT SAXLANMASI — GitHub API

`js/core/storage.js`-də bu iki funksiya olsun:

```js
// Fetch data.json from private repo
export async function loadData() {
  // GET https://api.github.com/repos/{owner}/{repo}/contents/data.json
  // Authorization: Bearer {token}
  // Accept: application/vnd.github.v3+json
  // response.content (base64) → atob → şifrəli JSON string → decrypt → parse
  // SHA-i də saxla (update zamanı lazımdır)
}

export async function saveData(data) {
  // Encrypt data → base64 → PUT
  // PUT https://api.github.com/repos/{owner}/{repo}/contents/data.json
  // body: {message: "update", content: base64, sha: currentSha}
  // Yeni SHA-nı yadda saxla
}
```

**Vacib detallar:**
- `data.json` yoxdursa (ilk dəfə), 404 qaytarılır → boş data qur, PUT ilə yarat (SHA olmadan)
- Bütün save əməliyyatları **debounced** olsun (2 saniyə) — hər task dəyişikliyində dərhal API çağırma
- Offline isə IndexedDB-də pending dəyişiklikləri saxla, online olanda sync et
- Retry logic: şəbəkə xətası olarsa 3 dəfə exponential backoff ilə təkrarla
- Rate limit (GitHub 5000/saat) — halal, narahat olma

---

## 7) DATA SCHEMA (data.json strukturu)

```json
{
  "version": 1,
  "lastModified": "2026-04-22T10:00:00Z",
  "tasks": [
    {
      "id": "uuid-v4",
      "title": "Süd al",
      "notes": "2L, az yağlı **mütləq**",
      "completed": false,
      "createdAt": "ISO",
      "updatedAt": "ISO",
      "completedAt": null,
      "dueDate": "2026-04-23T18:00:00Z",
      "reminderAt": "2026-04-23T17:00:00Z",
      "categoryId": "uuid",
      "tags": ["alış-veriş", "təcili"],
      "recurring": {
        "type": "daily | weekly | monthly | custom | none",
        "interval": 1,
        "daysOfWeek": [1, 3, 5],
        "endDate": null,
        "nextOccurrence": "ISO"
      },
      "order": 0,
      "archivedAt": null,
      "deletedAt": null
    }
  ],
  "categories": [
    { "id": "uuid", "name": "İş", "color": "#6366f1", "icon": "💼", "order": 0 }
  ],
  "tags": ["təcili", "alış-veriş", "ev"],
  "stats": {
    "streak": 5,
    "longestStreak": 12,
    "lastCompletedDate": "2026-04-22",
    "totalCompleted": 127,
    "pomodoroSessions": [
      { "date": "2026-04-22", "workMinutes": 75, "sessions": 3 }
    ]
  },
  "settings": {
    "theme": "auto",
    "language": "az",
    "pomodoroWork": 25,
    "pomodoroShortBreak": 5,
    "pomodoroLongBreak": 15,
    "pomodoroLongBreakEvery": 4,
    "notificationsEnabled": true,
    "soundEnabled": true,
    "defaultView": "list",
    "weekStart": 1
  }
}
```

---

## 8) SƏHİFƏLƏR — HƏR BİRİ DETALLI

### 8.1) `index.html` — Giriş

- Mərkəzləşmiş glassmorphism card
- Logo + "Todo" başlığı (gradient animation)
- İki input: token, passphrase
- "Private repo adı" (default `todo-data`)
- "Repo yaradılmayıbsa avtomatik yarat" checkbox
- "Daxil ol" düyməsi
- Alt hissədə kiçik mətn: *"Token və passphrase yalnız sənin cihazında saxlanır. Heç bir serverə göndərilmir."*
- Dark mode avtomatik OS preference-dən

### 8.2) `app.html` — Əsas Dashboard

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ [Nav: Tasklar | Pomodoro | Stats | Arxiv | ⚙]  [🌙/☀]   │
├───────────────┬─────────────────────────────────────────┤
│ Sidebar       │ Main content                            │
│ ──────────    │ ──────────────                          │
│ 🔍 Axtar      │ [+ Yeni task...] (inline quick-add)     │
│ ⭐ Bu gün      │                                         │
│ 📅 Gələn 7    │ ┌─ Task card ──────────────────────┐   │
│ 📋 Hamısı     │ │ ☐ Süd al       📅 sabah  #alış  ⋮ │   │
│ ──────────    │ └───────────────────────────────────┘   │
│ Kateqoriyalar │ ┌─ Task card ──────────────────────┐   │
│ + Yeni        │ │ ☑ Gym          ✓ bu gün          │   │
│ 💼 İş         │ └───────────────────────────────────┘   │
│ 🏠 Ev         │                                         │
│ ──────────    │                                         │
│ Teqlər        │                                         │
│ #təcili       │                                         │
└───────────────┴─────────────────────────────────────────┘
```

**Mobil:** sidebar çökür, hamburger menyu.

**View modları (tab-lar yuxarıda):**
- **Siyahı** (default)
- **Kanban** (Edilməli / Edilir / Bitdi — sütunlar, drag & drop)
- **Təqvim** (aylıq görünüş, taskları günlərə drag)

**Task card komponenti:**
- Sol: checkbox (dairəvi, animasiya ilə dolur)
- Orta: başlıq + alt sətirdə: due date relativ ("sabah"), kateqoriya badge, teqlər
- Sağ: `⋮` menyu (Redaktə, Duplicate, Arxivləşdir, Sil)
- Click → detail modal açılır (başlıq, qeyd/markdown, due, reminder, təkrar, kateqoriya, teqlər)
- Drag handle göstərilir hover zamanı
- Completed tasklar üstündən xətt + 60% opacity

**Quick-add input** təbii dil parse etsin:
- `"Süd al sabah 18:00 #alış @ev"` → başlıq: "Süd al", due: sabah 18:00, tag: alış, kateqoriya: ev
- `dayjs` ilə tarixləri parse et

**Əsas bölmələr (sidebar-də filterlər):**
- Bu gün (due bu gün)
- Gələn 7 gün
- Gec qalmış (overdue)
- Tamamlanmış (son 30 gün)
- Hamısı
- Hər kateqoriya
- Hər teq

Hər bölmədə sayğac rozet göstər.

### 8.3) `pomodoro.html` — Pomodoro Timer

- Böyük dairəvi timer (SVG progress ring, animasiyalı)
- 25 dəq iş → 5 dəq fasilə, hər 4-dən sonra 15 dəq uzun fasilə
- Cari task seçilə bilər (dropdown ilə aktiv tasklardan)
- Start / Pause / Reset / Skip düymələri
- Tamamlandıqda səs + bildiriş + vibrasiya (mobil)
- Alt hissədə: bu günün sessiyaları (kiçik dairələr)
- Settings-dən iş/fasilə dəqiqələri dəyişilə bilər

### 8.4) `stats.html` — Statistika

Chart.js ilə:
- **Streak kartı:** cari streak + ən uzun streak (böyük rəqəm, alov emoji)
- **Heatmap:** son 6 ay (GitHub contribution kimi, tamamlanmış tasklar)
- **Həftəlik bar chart:** hər günün tamamlanma sayı
- **Donut chart:** kateqoriyalara görə paylama
- **Top 5 teq** (bar)
- **Pomodoro:** həftəlik iş dəqiqələri
- **Ümumi statistika:** total task, tamamlanma faizi, orta gündəlik

### 8.5) `archive.html` — Arxiv + Zibil

İki tab:
- **Arxiv:** arxivlənmiş tasklar (geri qaytar / həmişəlik sil düymələri)
- **Zibil qutusu:** silinmiş tasklar (geri qaytar / həmişəlik sil)
- 30 gündən köhnə zibilləri avtomatik sil (login zamanı yoxla)
- "Hamısını təmizlə" düyməsi (təsdiq dialoqu ilə)

### 8.6) `settings.html` — Ayarlar

Bölmələr:
- **Hesab:** repo adı, token-i dəyiş, passphrase-i dəyiş, çıxış
- **Görünüş:** tema (auto/light/dark), dil (hələlik yalnız az)
- **Pomodoro:** iş/qısa fasilə/uzun fasilə dəqiqələri, neçədən bir uzun fasilə
- **Bildirişlər:** aktiv/deaktiv, icazə iste, test bildirişi göndər
- **Səslər:** aktiv/deaktiv
- **Data:** Export (JSON download), Import (JSON upload), Hamısını sil
- **Haqqında:** versiya, GitHub link

---

## 9) FUNKSİONALLIQLAR — DETALLI SPEK

### 9.1) Tasklar — CRUD

- **Add:** Quick-add (inline) və ya full modal
- **Edit:** Card-a click → modal
- **Delete:** Soft delete (zibil qutusuna), 30 gündən sonra hard delete
- **Complete:** Checkbox — animasiya + səs + streak yenilə
- **Duplicate:** Kontekst menyudan
- **Archive:** Tamamlanmış task-ları arxivə

### 9.2) Kateqoriyalar — CRUD

- Rəng seçici (12 hazır rəng)
- Emoji seçici (native emoji picker və ya sadə grid)
- Sidebar-da reorder (drag)
- Silinəndə: "Bu kateqoriyadakı tasklar haraya?" → digər kateqoriyaya köçür və ya "Kateqoriyasız"-a düşsün

### 9.3) Teqlər — CRUD

- Task modalında teq input (chip şəklində əlavə)
- Autocomplete (mövcud teqlərdən)
- Settings-də teq idarəsi: yenidən adlandır, sil (bütün tasklardan da silir)

### 9.4) Due Date + Reminder

- Native `<input type="datetime-local">` + quick buttons (Bu gün, Sabah, Gələn həftə)
- Reminder ayrıca seçilir (due-dan X dəqiqə əvvəl)
- Reminder zamanı → Notification API ilə bildiriş
- Service worker bildirişləri schedule edir (aşağı bax)

### 9.5) Təkrarlanan Tasklar

- Tipi: Gündəlik / Həftəlik (günlər seçilir) / Aylıq / Heç biri
- Tamamlandıqda: **yeni instance yarat** növbəti tarixlə, köhnəsi "completed" qalır
- Stop date olarsa, ona qədər təkrarla

### 9.6) Search + Filter

- Üst axtarış (Ctrl+K açır) — tez axtarış
- Fuzzy match (başlıq + qeyd + teq)
- Filterlər: tamamlanma statusu, kateqoriya, teq, due range

### 9.7) Drag & Drop (Sortable.js)

- Siyahıda tasklar arası sıralama (`order` sahəsi yenilənir)
- Kanban sütunlar arası
- Təqvim günləri arası (due date dəyişir)
- Sidebar kateqoriyaları arası

### 9.8) Markdown Notes

- Task modalında Notes bölməsi `textarea`
- Preview toggle (marked.js + sanitize — XSS qorunma)
- Dəstək: başlıq, bold, italic, siyahı, link, kod, quote, checkbox

### 9.9) Klaviatura Shortcuts

| Shortcut | Əməl |
|---|---|
| `N` | Yeni task |
| `/` | Axtarış |
| `Ctrl+K` | Command palette |
| `1-5` | Sidebar bölmələri arası |
| `E` | Seçili task-ı redaktə |
| `D` | Seçili task-ı sil |
| `C` | Seçili task-ı tamamla |
| `T` | Tema dəyiş |
| `?` | Shortcut cheat sheet göstər |
| `Esc` | Modal bağla |

### 9.10) Dark/Light Mode

- CSS variables `[data-theme="dark"]` və `[data-theme="light"]`
- Auto → `prefers-color-scheme`
- Toggle nav-da
- Hər dəyişiklik smooth transition (200ms)

### 9.11) Streak Sayğacı

- Hər gün ən az 1 task tamamlayanda streak += 1
- Bir gün atla → streak = 0
- Şəhifə yükləndikdə yoxla (bu gün və ya dünən tamamlama varmı)
- Animasiya: 7, 30, 100 günlərdə konfetti + toast

---

## 10) DİZAYN SİSTEMİ — GLASSMORPHISM

### 10.1) CSS Variables (`css/tokens.css`)

```css
:root {
  /* Gradients */
  --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  --bg-mesh: radial-gradient(at 20% 30%, #7c3aed 0, transparent 50%),
             radial-gradient(at 80% 70%, #ec4899 0, transparent 50%),
             radial-gradient(at 50% 50%, #3b82f6 0, transparent 50%);

  /* Glass */
  --glass-bg: rgba(255, 255, 255, 0.12);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  --glass-blur: blur(20px) saturate(180%);

  /* Colors */
  --text-primary: #1a1a2e;
  --text-secondary: rgba(26, 26, 46, 0.7);
  --accent: #6366f1;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;

  /* Spacing scale (4px) */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;

  /* Radius */
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 24px; --r-full: 9999px;

  /* Font */
  --font: "Inter", "Noto Sans Azerbaijani", -apple-system, sans-serif;
  --font-display: "Cal Sans", "Inter", sans-serif;

  /* Transitions */
  --t-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --t-med: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --t-bounce: 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

[data-theme="dark"] {
  --bg-gradient: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --text-primary: #f1f5f9;
  --text-secondary: rgba(241, 245, 249, 0.7);
}
```

### 10.2) Glass Klas

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--r-lg);
  box-shadow: var(--glass-shadow);
}
```

### 10.3) Animasiyalar

- **Səhifə yüklənmə:** elementlər növbə ilə fade-up (stagger, hər biri 50ms gec)
- **Task tamamlanma:** checkbox dairə → tick animasiyası (stroke-dashoffset), kart sarsılır, konfetti (streak milestones-də)
- **Modal açılma:** scale(0.9) → scale(1) + fade, 300ms cubic-bezier
- **Nav seçim:** underline gradient smooth sürüşür
- **Drag:** kart böyüyür (scale 1.05), shadow artır
- **Gradient arxa plan:** yavaş-yavaş hərəkət edir (animated mesh, 20s infinite)
- **Hover:** glass kartlar yüngül yuxarı (translateY(-2px)) + shadow güclənir
- **Loading:** shimmer effect skeleton-larda

### 10.4) Tipoqrafiya

- Başlıqlar: Inter / Cal Sans, bold, tracking tight
- Body: Inter regular
- Rəqəmlər (statistika): böyük, tabular-nums
- Azərbaycan hərfləri düzgün göstərsin (ə, ğ, ı, ü, ö, ç, ş)

### 10.5) Accessibility

- Hər interaktiv elementdə `:focus-visible` outline (2px solid accent, 2px offset)
- `aria-label`-lar bütün ikon düymələrdə
- `role` atributları (dialog, alert, listbox, option)
- Kontrast ≥ 4.5:1
- `prefers-reduced-motion` hörmət et — animasiyalar söndür

---

## 11) PWA QURAŞDIRMASI

### 11.1) `manifest.webmanifest`

```json
{
  "name": "Todo",
  "short_name": "Todo",
  "description": "Şəxsi todo tətbiqi",
  "start_url": "/todo-html/app.html",
  "scope": "/todo-html/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0f0f23",
  "theme_color": "#6366f1",
  "lang": "az",
  "dir": "ltr",
  "icons": [
    { "src": "/todo-html/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/todo-html/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/todo-html/assets/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Yeni task", "url": "/todo-html/app.html?new=1", "icons": [{ "src": "/todo-html/assets/icons/icon-192.png", "sizes": "192x192" }] },
    { "name": "Pomodoro", "url": "/todo-html/pomodoro.html" }
  ],
  "categories": ["productivity"]
}
```

**QEYD:** Bütün yollarda `/todo-html/` prefiksi — çünki GitHub Pages `username.github.io/todo-html/` ünvanında hostlanır. Əgər istifadəçi custom domain qoşarsa, README-də bunu dəyişmək lazım olduğunu qeyd et.

Hər HTML-in `<head>`-ində:
```html
<link rel="manifest" href="/todo-html/manifest.webmanifest">
<meta name="theme-color" content="#6366f1">
<link rel="apple-touch-icon" href="/todo-html/assets/icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

### 11.2) `service-worker.js`

İki əsas məqsəd:

**A) Offline cache (Workbox YOX — vanilla):**
- Install: bütün static faylları cache-lə (app shell strategy)
- Fetch: cache-first HTML/CSS/JS, network-first GitHub API
- Activate: köhnə cache-ləri təmizlə
- `offline.html` fallback

**B) Bildirişlər:**
- Client `postMessage` ilə schedule edəcək reminder-ləri
- SW `setTimeout`-lar saxlayır və vaxtı çatanda `self.registration.showNotification()` çağırır
- DİQQƏT: SW yatdıqda `setTimeout` itə bilər — ona görə alternativ:
  - `Periodic Background Sync` (müəyyən brauzerlərdə)
  - Daha etibarlı: client online olanda yaxın saatın reminder-lərini SW-yə göndər, SW onları idarə etsin
  - Tarix uzaq olanda client açılanda yoxla

**İkon click:**
```js
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/todo-html/app.html?task=' + e.notification.data.taskId));
});
```

### 11.3) Bildiriş icazəsi

- İlk dəfə app.html açılanda soft-ask: "Bildiriş almaq istəyirsən?" (banner, X-lə bağlanır)
- "Bəli" → `Notification.requestPermission()`
- Permission verildi → "Test bildirişi göndər" seçimi göstər
- Settings-də həmişə toggle olsun

### 11.4) Install Prompt

- `beforeinstallprompt` event-i tut
- Nav-da "Tətbiqi yüklə" düyməsi (yalnız install oluna bilərsə göstər)
- Click → `deferredPrompt.prompt()`

---

## 12) XƏTA İDARƏETMƏSİ

Hər async əməliyyatda try/catch:

| Xəta | İstifadəçiyə göstər |
|---|---|
| 401 (token yanlış) | "Token etibarsızdır. Yenidən daxil ol." + logout |
| 403 (rate limit) | "GitHub API limiti. 1 saat sonra cəhd et." |
| 404 (repo yoxdur) | "Private repo tapılmadı. Ayarlardan yoxla." |
| Network offline | "Offline rejim. Dəyişikliklər qaydaya qoyuldu." |
| Decrypt error | "Passphrase səhvdir." |
| Conflict (SHA uyğun deyil) | Avtomatik reload + retry |

Toast sistemi ilə göstər, kritiklərdə modal.

---

## 13) PERFORMANCE

- `js` modulları `<script type="module" defer>`
- Sırf lazım olan səhifə üçün CSS yüklə (nav shared-dir)
- Taskları **virtualize** etmə 1000-dən az olana qədər (sadə render)
- 1000+ taskda: pagination (50 per səhifə) və ya virtual scroll
- IndexedDB cache → ilk açılışda dərhal render, arxa planda API-dən yenilə
- `requestIdleCallback` ağır hesablamalar üçün (stats)

---

## 14) DEPLOY VƏ GIT PUSH

İşi bitirəndə aşağıdakı əmrləri **sırayla** tam icra et (local environment-də):

```bash
# 1) Repo-ya daxil ol (əgər artıq clone edilməyibsə)
cd todo-html

# 2) Bütün faylları əlavə et
git add .

# 3) Commit
git commit -m "feat: initial PWA todo app with glassmorphism UI, GitHub storage, and PWA support"

# 4) Push (main branch)
git push origin main
```

**GitHub Pages aktivləşdirmə** (istifadəçi özü etməlidir, README-də yaz):
1. GitHub → Repository → Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main`, folder: `/ (root)`
4. Save
5. 2-3 dəqiqə sonra `https://mursal-ahmadov.github.io/todo-html/` aktivləşəcək

README.md-də həmçinin aşağıdakılar olsun:
- Token necə generasiya olunur (GitHub → Settings → Developer settings → PAT classic → `repo` scope)
- Private repo necə yaradılır (manual və ya app-dəki avtomatik düymə ilə)
- Telefona PWA necə yüklənir (iOS: Safari → Share → Add to Home Screen; Android: Chrome menyu → Install app)
- Təhlükəsizlik qeydi (token yalnız brauzerdə, heç bir serverə getmir)

---

## 15) TEST CHECKLİST (İşi bitirməmişdən ÖNCƏ yoxla)

- [ ] `index.html`-də token + passphrase daxil edib repo avtomatik yaradılır
- [ ] `app.html` yüklənir, data.json yaradılır
- [ ] Task əlavə et → private repo-da data.json yenilənir (commit-də görünür)
- [ ] Task-ı sil → zibilə düşür, 30 gündən sonra hard delete (simulate)
- [ ] Task-ı complete et → streak yenilənir
- [ ] Təkrarlanan task → yeni instance yaranır
- [ ] Kateqoriya əlavə/redaktə/sil
- [ ] Teq əlavə/sil
- [ ] Search işləyir (Ctrl+K)
- [ ] Drag & drop sıralama
- [ ] Pomodoro timer tam dövr
- [ ] Stats səhifəsində qrafiklər göstərilir
- [ ] Arxiv/Zibil səhifələri
- [ ] Settings-dən bütün parametrlər
- [ ] Dark/Light mode keçid
- [ ] Offline rejim (Network → Offline et, app işləməlidir)
- [ ] Service worker qeydiyyatdan keçir
- [ ] Bildiriş icazəsi istənilir və test bildirişi işləyir
- [ ] Telefonda (mobil simulator və ya real cihazda) PWA install prompt çıxır
- [ ] Keyboard shortcuts işləyir
- [ ] Bütün animasiyalar hamar
- [ ] 4.5:1 kontrast bütün mətnlərdə
- [ ] Azərbaycan hərfləri düzgün göstərilir
- [ ] Xəta hallarında toast göstərilir
- [ ] Logout işləyir və localStorage təmizlənir

---

## 16) MÜTLƏQ RİAYƏT EDİLƏCƏK QAYDALAR

**DO:**
- ✅ Bütün kodu modullara böl — heç bir fayl 400 sətirdən böyük olmasın
- ✅ Hər funksiyada JSDoc comment (parameter + return)
- ✅ Az dili mətnlərin hamısı `i18n` obyektində topla (gələcəkdə dil əlavə etmək asan olsun)
- ✅ `const`/`let` — `var` YOXDUR
- ✅ Async/await — `.then()` chain YOXDUR
- ✅ Error handling hər yerdə
- ✅ `innerHTML` əvəzinə `textContent` və ya template (XSS qorunma)
- ✅ `marked` istifadə edəndə DOMPurify kimi sanitize et (və ya `marked.setOptions({sanitize: true})`)
- ✅ Bütün API açarları və sirli dəyərlər yalnız runtime-da (kod içində HARDCODE ETMƏ)
- ✅ Hər commit-dən əvvəl özün icra et və sına

**DON'T:**
- ❌ Framework (React, Vue, Svelte) istifadə etmə
- ❌ npm install / build step etmə
- ❌ Təhlükəsiz olmayan eval, innerHTML (sanitize olmadan)
- ❌ Token-i plain-text localStorage-də saxlama
- ❌ Public repo-ya heç vaxt data.json commit etmə
- ❌ jQuery, Bootstrap, hazır template YOX
- ❌ CORS problemi yaradan API çağırışları — GitHub API düzgün header-lərlə işləyir
- ❌ 100 KB-dan böyük asset (ikonlar istisna)

---

## 17) FAYL YARATMA SIRASI (Sonnet üçün iş planı)

1. `css/tokens.css` → `reset.css` → `base.css` → `glass.css` → `components.css` → `animations.css`
2. `js/config.js` → `js/utils/*` → `js/core/crypto.js` → `js/core/auth.js` → `js/core/storage.js` → `js/core/state.js` → `js/core/cache.js`
3. `js/ui/*` (toast, modal, nav, loader)
4. `js/features/*` (tasks birinci, sonra digərləri)
5. HTML faylları (index → app → pomodoro → stats → archive → settings)
6. `manifest.webmanifest`, `service-worker.js`, `offline.html`
7. İkonlar (sadə SVG-dən PNG-yə çevir və ya placeholder)
8. `README.md`
9. `.nojekyll`
10. Test et, düzəlt
11. Git add → commit → push

---

## 18) SON YOXLAMA VƏ TƏHVİL

Bitirəndən sonra mənə bu formada hesabat ver:

1. **Yaradılan faylların siyahısı** (ağac şəklində)
2. **İstifadə olunan CDN/kitabxanalar** (hər biri nə üçün)
3. **Hər səhifənin qısa təsviri** (ekran görüntüləri olmadan, mətnlə)
4. **Təhlükəsizlik qatlarının xülasəsi**
5. **İstifadəçi üçün sonrakı addımlar** (token yaratma, private repo, GitHub Pages aktivləşdirmə)
6. **Məlum məhdudiyyətlər** (məs: SW bildirişləri bəzi brauzerlərdə məhduddur)
7. **Git push nəticəsi** (uğurlu/xəta)

---

> **Bitdi.** Bu promptun hər hissəsini nəzərə al. Hər hansı addım aydın deyilsə, mənimlə pillə-pillə aydınlaşdır, amma dəyişmə — hər şey dəqiq və məqsədyönlü yazılıb. Uğurlar.
