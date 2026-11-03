// 화면 흐름: 시작 → 추천 주제 3개 → 포스팅 브리프 → 복사
(function () {
  const $ = (id) => document.getElementById(id);

  const views = {
    start: $("start-view"),
    topics: $("topics-view"),
    brief: $("brief-view"),
  };

  let selected = null;

  function show(name) {
    Object.entries(views).forEach(([key, el]) => (el.hidden = key !== name));
    window.scrollTo({ top: 0 });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // PRD 규칙: 출처 링크가 없는 주제는 추천하지 않는다
  function getRecommendations() {
    return window.MOCK_TOPICS.filter((t) => t.source && t.source.url).slice(0, 3);
  }

  function renderTopics() {
    const list = $("topic-list");
    list.innerHTML = "";
    getRecommendations().forEach((t) => {
      const card = document.createElement("div");
      card.className = "card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.innerHTML = `
        <span class="tag ${escapeHtml(t.type)}">${escapeHtml(t.type)}</span>
        <h3>${escapeHtml(t.topic)}</h3>
        <p class="reason">${escapeHtml(t.reason)}</p>
        <a class="source" href="${escapeHtml(t.source.url)}" target="_blank" rel="noopener">
          출처: ${escapeHtml(t.source.label)} ↗
        </a>
        <span class="pick">이 주제로 브리프 보기 →</span>
      `;
      // 출처 링크 클릭은 카드 선택으로 처리하지 않음
      card.querySelector(".source").addEventListener("click", (e) => e.stopPropagation());
      card.addEventListener("click", () => selectTopic(t));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectTopic(t); }
      });
      list.appendChild(card);
    });
  }

  function selectTopic(t) {
    selected = t;
    const b = t.brief;
    $("brief").innerHTML = `
      <span class="tag ${escapeHtml(t.type)}">${escapeHtml(t.type)}</span>
      <h3>${escapeHtml(t.topic)}</h3>
      <a class="source" href="${escapeHtml(t.source.url)}" target="_blank" rel="noopener">
        출처: ${escapeHtml(t.source.label)} ↗
      </a>

      <h4>제목 후보</h4>
      <ol>${b.titles.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ol>

      <h4>소제목 구성</h4>
      <ol>${b.outline.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ol>

      <h4>타깃 키워드</h4>
      <ul class="keywords">${b.keywords.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    `;
    $("copy-status").textContent = "";
    show("brief");
  }

  // GPT·제미나이에 그대로 붙여 넣기 좋은 텍스트 형식
  function briefToText(t) {
    const b = t.brief;
    return [
      `[포스팅 브리프] ${t.topic}`,
      `유형: ${t.type}`,
      `추천 이유: ${t.reason}`,
      `출처: ${t.source.label} (${t.source.url})`,
      "",
      "■ 제목 후보",
      ...b.titles.map((x, i) => `${i + 1}. ${x}`),
      "",
      "■ 소제목 구성",
      ...b.outline.map((x, i) => `${i + 1}. ${x}`),
      "",
      "■ 타깃 키워드",
      b.keywords.join(", "),
    ].join("\n");
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // 대체 방식 (일부 브라우저에서 파일로 열었을 때)
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("copy failed");
  }

  $("start-btn").addEventListener("click", () => {
    renderTopics();
    show("topics");
  });

  $("back-btn").addEventListener("click", () => show("topics"));

  $("copy-btn").addEventListener("click", async () => {
    if (!selected) return;
    const status = $("copy-status");
    try {
      await copyText(briefToText(selected));
      status.textContent = "브리프를 복사했어요. GPT·제미나이에 붙여 넣어 보세요.";
    } catch {
      status.textContent = "복사에 실패했어요. 브리프 내용을 직접 드래그해 복사해 주세요.";
    }
  });

  const d = new Date();
  $("today").textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 · 목업 데이터로 동작 중`;
})();
