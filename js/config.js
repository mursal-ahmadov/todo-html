/**
 * Global configuration constants.
 * @module config
 */

/** Current app version */
export const APP_VERSION = "1.0.0";

/** GitHub REST API base URL */
export const GITHUB_API = "https://api.github.com";

/** Default private data repo name (user can override in settings) */
export const DEFAULT_DATA_REPO = "todo-data";

/** Default data file path inside the data repo */
export const DATA_FILE_PATH = "data.json";

/** LocalStorage keys */
export const STORAGE_KEYS = {
  TOKEN_ENC:        "todo.token.enc",
  PASSPHRASE_HASH:  "todo.passphrase.hash",
  SALT:             "todo.salt",
  IV:               "todo.iv",
  REPO:             "todo.repo",
  THEME:            "todo.theme",
  DATA_SHA:         "todo.data.sha",
  OFFLINE_QUEUE:    "todo.offline.queue",
};

/** Debounce delay for saving data to GitHub (ms) */
export const SAVE_DEBOUNCE_MS = 2000;

/** Retry config for network failures */
export const RETRY_MAX      = 3;
export const RETRY_BASE_MS  = 1000;

/** IndexedDB database name and version */
export const IDB_NAME    = "todo-cache";
export const IDB_VERSION = 1;

/** Service worker path */
export const SW_PATH = "/todo-html/service-worker.js";

/** App base path (GitHub Pages subpath) */
export const BASE_PATH = "/todo-html";

/** Supported theme values */
export const THEMES = /** @type {const} */ (["auto", "light", "dark"]);

/** Data schema version */
export const DATA_VERSION = 1;

/** Soft-delete retention days */
export const TRASH_RETAIN_DAYS = 30;

/** i18n strings (Azerbaijani) */
export const i18n = {
  // Generic
  save:           "Saxla",
  cancel:         "Ləğv et",
  delete:         "Sil",
  edit:           "Redaktə et",
  add:            "Əlavə et",
  close:          "Bağla",
  confirm:        "Təsdiqlə",
  loading:        "Yüklənir…",
  error:          "Xəta",
  success:        "Uğurlu",
  warning:        "Xəbərdarlıq",

  // Auth
  token:          "GitHub Personal Access Token",
  passphrase:     "Passphrase (şifrə açarı)",
  repoName:       "Private repo adı",
  login:          "Daxil ol",
  logout:         "Çıxış",
  loginError:     "Token və ya passphrase yanlışdır.",
  decryptError:   "Passphrase səhvdir.",
  tokenInvalid:   "Token etibarsızdır. Yenidən daxil ol.",
  repoNotFound:   "Private repo tapılmadı. Ayarlardan yoxla.",
  rateLimited:    "GitHub API limiti. 1 saat sonra cəhd et.",
  offline:        "Offline rejim. Dəyişikliklər qaydaya qoyuldu.",
  conflict:       "Sinxronizasiya münaqişəsi. Yenilənir…",
  createRepo:     "Repo yarat",
  repoCreated:    "Repo uğurla yaradıldı.",

  // Tasks
  newTask:        "Yeni task…",
  taskAdded:      "Task əlavə edildi.",
  taskUpdated:    "Task yeniləndi.",
  taskDeleted:    "Task silindi.",
  taskCompleted:  "Task tamamlandı! 🎉",
  taskRestored:   "Task bərpa edildi.",
  taskArchived:   "Task arxivləşdirildi.",
  confirmDelete:  "Bu task silinsin?",
  confirmDeleteAll: "Hamısı silinsin? Bu əməliyyat geri qaytarıla bilməz.",
  noTasks:        "Task yoxdur.",
  noResults:      "Axtarış nəticəsi tapılmadı.",

  // Categories
  category:       "Kateqoriya",
  categories:     "Kateqoriyalar",
  newCategory:    "Yeni kateqoriya",
  categoryAdded:  "Kateqoriya əlavə edildi.",
  categoryDeleted:"Kateqoriya silindi.",
  categoryColor:  "Rəng",
  categoryIcon:   "İkon (emoji)",
  deleteCategoryTasks: "Bu kateqoriyadakı tasklar haraya köçsün?",
  noCategory:     "Kateqoriyasız",

  // Tags
  tags:           "Teqlər",
  newTag:         "Yeni teq",
  addTag:         "Teq əlavə et…",

  // Dates
  today:          "Bu gün",
  tomorrow:       "Sabah",
  nextWeek:       "Gələn həftə",
  overdue:        "Gecikmişdir",
  noDueDate:      "Tarix yoxdur",

  // Sections
  sectionToday:   "Bu gün",
  sectionWeek:    "Gələn 7 gün",
  sectionOverdue: "Gecikmiş",
  sectionAll:     "Hamısı",
  sectionCompleted: "Tamamlanmış",

  // Archive / Trash
  archive:        "Arxiv",
  trash:          "Zibil qutusu",
  restore:        "Bərpa et",
  emptyTrash:     "Zibili boşalt",
  emptyArchive:   "Arxivi boşalt",

  // Pomodoro
  workTime:       "İş vaxtı",
  shortBreak:     "Qısa fasilə",
  longBreak:      "Uzun fasilə",
  pomodoroStart:  "Başla",
  pomodoroPause:  "Dayan",
  pomodoroReset:  "Sıfırla",
  pomodoroSkip:   "Keç",
  pomodoroEnd:    "Pomodoro tamamlandı! 🍅",
  breakEnd:       "Fasilə bitti. Başlayaq!",

  // Stats
  stats:          "Statistika",
  streak:         "Ardıcıllıq",
  longestStreak:  "Ən uzun",
  totalCompleted: "Cəmi tamamlandı",
  completionRate: "Tamamlanma faizi",
  avgPerDay:      "Orta gündəlik",

  // Settings
  settings:       "Ayarlar",
  theme:          "Tema",
  themeAuto:      "Avtomatik",
  themeLight:     "Açıq",
  themeDark:      "Tünd",
  notifications:  "Bildirişlər",
  sounds:         "Səslər",
  exportData:     "Məlumatları İxrac et",
  importData:     "Məlumatları İdxal et",
  deleteAllData:  "Bütün məlumatları sil",
  about:          "Haqqında",
  version:        "Versiya",
};
