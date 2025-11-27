(function () {
  const $ = (sel) => document.querySelector(sel);

  function nowStr() {
    const d = new Date();
    return d.toLocaleString("el-GR", { hour12: false });
  }

  function safeSetIframeSrc(iframe, src) {
    try {
      iframe.src = src;
      return true;
    } catch (e) {
      return false;
    }
  }

  function storageKey(pageId) {
    return `notes:${pageId}`;
  }

  function initNotes(pageId) {
    const ta = $("#notes");
    const status = $("#saveStatus");
    const count = $("#charCount");

    if (!ta) return;

    const key = storageKey(pageId);
    ta.value = localStorage.getItem(key) || "";

    const updateMeta = () => {
      const n = ta.value.length;
      if (count) count.textContent = `${n} chars`;
    };

    let t = null;
    const save = () => {
      localStorage.setItem(key, ta.value);
      if (status) status.textContent = `Saved ${nowStr()}`;
      updateMeta();
    };

    ta.addEventListener("input", () => {
      updateMeta();
      if (t) clearTimeout(t);
      t = setTimeout(save, 350);
    });

    // Initial
    updateMeta();
    if (status) status.textContent = `Loaded ${nowStr()}`;

    // Manual export (Ctrl+S)
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    });
  }

  // Best-effort scroll sync (works only if iframe is same-origin / local loaded in a way that allows access)
  function initScrollSync() {
    const iframe = $("#refFrame");
    const ta = $("#notes");
    const chip = $("#syncChip");
    if (!iframe || !ta) return;

    let enabled = true;
    const setChip = (txt) => { if (chip) chip.textContent = txt; };

    function getIframeDoc() {
      try {
        return iframe.contentDocument || iframe.contentWindow.document;
      } catch {
        return null;
      }
    }

    function canAccessIframe() {
      return !!getIframeDoc();
    }

    function syncFromNotes() {
      const doc = getIframeDoc();
      if (!doc) return;
      const scroller = doc.scrollingElement || doc.documentElement || doc.body;
      const notesMax = ta.scrollHeight - ta.clientHeight;
      const refMax = scroller.scrollHeight - scroller.clientHeight;
      if (notesMax <= 0 || refMax <= 0) return;
      const ratio = ta.scrollTop / notesMax;
      scroller.scrollTop = ratio * refMax;
    }

    function syncFromRef() {
      const doc = getIframeDoc();
      if (!doc) return;
      const scroller = doc.scrollingElement || doc.documentElement || doc.body;
      const notesMax = ta.scrollHeight - ta.clientHeight;
      const refMax = scroller.scrollHeight - scroller.clientHeight;
      if (notesMax <= 0 || refMax <= 0) return;
      const ratio = scroller.scrollTop / refMax;
      ta.scrollTop = ratio * notesMax;
    }

    let lock = false;
    ta.addEventListener("scroll", () => {
      if (!enabled || lock) return;
      if (!canAccessIframe()) { setChip("Sync: blocked (cross-site)"); return; }
      lock = true;
      syncFromNotes();
      setTimeout(() => (lock = false), 0);
      setChip("Sync: ON");
    });

    iframe.addEventListener("load", () => {
      if (!enabled) return;
      if (!canAccessIframe()) { setChip("Sync: blocked (cross-site)"); return; }
      const doc = getIframeDoc();
      const scroller = (doc && (doc.scrollingElement || doc.documentElement || doc.body)) ? (doc.scrollingElement || doc.documentElement || doc.body) : null;
      if (!scroller) return;
      scroller.addEventListener("scroll", () => {
        if (!enabled || lock) return;
        lock = true;
        syncFromRef();
        setTimeout(() => (lock = false), 0);
        setChip("Sync: ON");
      }, { passive: true });
      setChip("Sync: ON");
    });

    const btn = $("#toggleSync");
    if (btn) {
      btn.addEventListener("click", () => {
        enabled = !enabled;
        setChip(enabled ? "Sync: ON" : "Sync: OFF");
      });
    }
  }

  function initReference(defaultUrl) {
    const iframe = $("#refFrame");
    const urlInput = $("#refUrl");
    const openBtn = $("#openUrl");
    const fileInput = $("#refFile");
    const hint = $("#refHint");

    if (!iframe) return;

    const setHint = (txt) => { if (hint) hint.textContent = txt; };

    // Load default url if provided
    if (urlInput && defaultUrl) urlInput.value = defaultUrl;

    function loadUrl() {
      const url = (urlInput ? urlInput.value.trim() : "") || defaultUrl;
      if (!url) return;
      safeSetIframeSrc(iframe, url);
      setHint("Online mode: Αν δεις κενό/σφάλμα, η σελίδα μπλοκάρει iframe. Τότε χρησιμοποίησε Local load.");
    }

    function loadLocalFile(file) {
      if (!file) return;
      const u = URL.createObjectURL(file);
      safeSetIframeSrc(iframe, u);
      setHint("Local mode: Η αναφορά φορτώθηκε από τοπικό αρχείο. (Αυτό είναι και το καλύτερο για synced scroll.)");
    }

    if (openBtn) openBtn.addEventListener("click", loadUrl);
    if (urlInput) {
      urlInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") loadUrl();
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const f = fileInput.files && fileInput.files[0];
        loadLocalFile(f);
      });
    }

    // Try loading at start
    if (defaultUrl) loadUrl();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const pageId = document.documentElement.getAttribute("data-page-id") || location.pathname;
    const defaultRef = document.documentElement.getAttribute("data-default-ref") || "";
    initNotes(pageId);
    initReference(defaultRef);
    initScrollSync();
  });
})();
