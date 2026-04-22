# Todo — Şəxsi PWA Tapşırıq Meneceri

Glassmorphism dizaynlı, GitHub-a AES-GCM şifrəli sinxronizasiya ilə offline-first PWA.

## 🔗 Canlı ünvan
**[https://mursal-ahmadov.github.io/todo-html/](https://mursal-ahmadov.github.io/todo-html/)**

---

## 🚀 Quraşdırma

### 1. GitHub Token yaratmaq
1. [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)**
2. Scope: `repo` (full repository access)
3. Token-i kopyalayın → tətbiqə daxil olarkən istifadə edin

### 2. Birinci istifadə
1. Tətbiqə daxil olun: [todo-html/index.html](https://mursal-ahmadov.github.io/todo-html/)
2. GitHub token-inizı daxil edin
3. Güclü **passphrase** (şifrə) qurun
4. "Repo mövcud deyilsə özü yarsın" seçimi aktiv buraxın
5. **Başla** düyməsinə basın

### 3. PWA kimi quraşdırmaq
- **Chrome/Edge (masaüstü):** Ünvan çubuğunda 📥 ikonuna basın
- **Android Chrome:** "Ana ekrana əlavə et" banneri gözləyin
- **iOS Safari:** Paylaş → "Ana Ekrana Əlavə Et"

---

## 🔒 Təhlükəsizlik

Datanız **3 qat qorunur:**

| Qat | Açıqlama |
|-----|----------|
| Private GitHub repo | `todo-data` repo yalnız sizin hesabınızdadır |
| AES-GCM şifrələmə | Bütün data şifrəli saxlanılır |
| PBKDF2 passphrase | Şifrə açarı PBKDF2 (100,000 iterasiya) ilə törədilir |

> **Token** heç vaxt düz mətnlə saxlanılmır — özü də AES-GCM ilə şifrələnir.  
> **Passphrase** heç vaxt diskə yazılmır — yalnız JS yaddaşında saxlanılır.

---

## ✨ Xüsusiyyətlər

- ✅ Task yaratma, redaktə, silmə, arxivləmə
- 🏷️ Teqlər və kateqoriyalar
- 🔁 Təkrarlanan tasklar (gündəlik/həftəlik/aylıq)
- 🍅 Pomodoro taymeri
- 📊 Statistika (heatmap, qrafiklər, seriya)
- 🔔 Push bildirişlər / xatırlatmalar
- 🌓 Qaranlıq/işıqlı/avtomatik tema
- 📴 Tam offline dəstək (IndexedDB cache)
- ⌨️ Klaviatura shortcut-ları (`?` ilə göstər)
- 🖱️ Drag & drop sıralama

---

## 📁 Fayl strukturu

```
todo-html/
├── index.html         # Auth / giriş
├── app.html           # Əsas task səhifəsi
├── pomodoro.html      # Pomodoro taymeri
├── stats.html         # Statistika
├── archive.html       # Arxiv & zibil
├── settings.html      # Parametrlər
├── offline.html       # Offline fallback
├── service-worker.js  # PWA service worker
├── manifest.webmanifest
├── css/               # Stillar
├── js/
│   ├── config.js
│   ├── utils/
│   ├── core/          # Crypto, auth, storage, state
│   ├── ui/            # Toast, modal, nav
│   ├── features/      # Tasks, pomodoro, stats...
│   └── pages/         # Hər səhifənin init faylı
└── assets/
    ├── favicon.svg
    └── icons/
```

---

## 🔧 Texniki detallar

- **Vanilla JS ES Modules** — build tool yoxdur
- **Web Crypto API** — SubtleCrypto (AES-GCM + PBKDF2)
- **GitHub REST API v3** — şifrəli `data.json` saxlama
- **IndexedDB** — offline cache
- **Service Worker** — cache-first app shell, push notifications
- **CDN via import maps** — dayjs, marked, chart.js, sortablejs

---

## 📝 Lisenziya

MIT — Şəxsi istifadə üçün açıqdır.
