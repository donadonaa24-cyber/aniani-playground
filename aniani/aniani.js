(() => {
    const STORAGE_KEY = "aniani_articles_v1";

    const defaultArticles = [
        {
            id: "seed-1",
            title: "あにあにの遊び場を公開",
            category: "お知らせ",
            body: "Battle a la carte とは別に、制作ゲームをまとめるポータルを新設しました。",
            createdAt: "2026-04-20T00:00:00+09:00"
        },
        {
            id: "seed-2",
            title: "今後の更新予定",
            category: "配信予定",
            body: "天涯比隣のページ追加、各ゲームの更新履歴リンク追加を予定しています。",
            createdAt: "2026-04-20T00:01:00+09:00"
        }
    ];

    const form = document.getElementById("article-form");
    const clearButton = document.getElementById("article-clear");
    const list = document.getElementById("article-list");
    const titleInput = document.getElementById("article-title");
    const categoryInput = document.getElementById("article-category");
    const bodyInput = document.getElementById("article-body");

    function escapeHtml(value) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(value) {
        try {
            const date = new Date(value);
            return date.toLocaleString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return String(value || "");
        }
    }

    function saveArticles(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }

    function loadArticles() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            saveArticles(defaultArticles);
            return [...defaultArticles];
        }

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                saveArticles(defaultArticles);
                return [...defaultArticles];
            }
            return parsed;
        } catch {
            saveArticles(defaultArticles);
            return [...defaultArticles];
        }
    }

    function renderArticles(items) {
        if (!list) {
            return;
        }

        if (!items.length) {
            list.innerHTML = "<p class=\"article-empty\">記事はまだありません。右側フォームから追加してください。</p>";
            return;
        }

        const sorted = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const html = sorted.map((item) => {
            const id = escapeHtml(String(item.id || ""));
            const title = escapeHtml(String(item.title || ""));
            const category = escapeHtml(String(item.category || ""));
            const body = escapeHtml(String(item.body || ""));
            const createdAt = escapeHtml(formatDate(item.createdAt));

            return `
                <article class="article-item" data-id="${id}">
                    <div class="article-item-head">
                        <h5>${title}</h5>
                        <button class="article-delete" type="button" data-delete-id="${id}">削除</button>
                    </div>
                    <div class="article-meta">
                        <span class="tag">${category}</span>
                        <span>${createdAt}</span>
                    </div>
                    <p class="article-body">${body}</p>
                </article>
            `;
        }).join("");

        list.innerHTML = html;
    }

    let articles = loadArticles();
    renderArticles(articles);

    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();

            const title = (titleInput?.value || "").trim();
            const category = (categoryInput?.value || "").trim() || "お知らせ";
            const body = (bodyInput?.value || "").trim();

            if (!title || !body) {
                return;
            }

            const newArticle = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                title,
                category,
                body,
                createdAt: new Date().toISOString()
            };

            articles = [newArticle, ...articles];
            saveArticles(articles);
            renderArticles(articles);
            form.reset();
            titleInput?.focus();
        });
    }

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            form?.reset();
            titleInput?.focus();
        });
    }

    if (list) {
        list.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const deleteId = target.dataset.deleteId;
            if (!deleteId) {
                return;
            }

            articles = articles.filter((item) => String(item.id) !== deleteId);
            saveArticles(articles);
            renderArticles(articles);
        });
    }
})();
