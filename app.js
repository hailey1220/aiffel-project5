// 화면 흐름: 시작 → 추천 주제 3개 → 포스팅 브리프 → 복사
(function () {
  const $ = (id) => document.getElementById(id);

  const views = {
    profile: $("profile-view"),
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

  // ───────── 블로그 프로필 (localStorage에 1개만 저장) ─────────
  const PROFILE_KEY = "ltp.profile.v1";
  const CATEGORY_OPTIONS = ["살림템", "가전", "가구", "인테리어 소품", "주방", "청소·수납", "생활 꿀팁"];

  let profile = null;

  const splitList = (s) =>
    s.split(",").map((x) => x.trim()).filter(Boolean)
      .filter((x, i, arr) => arr.indexOf(x) === i);

  function loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      // 필수값이 빠진 손상 데이터는 없는 것으로 처리 → 프로필 화면부터 다시
      if (!p || !p.field || !p.tone || !p.titleStyle || !Array.isArray(p.categories) || !p.categories.length) return null;
      return p;
    } catch {
      return null;
    }
  }

  function saveProfile(p) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  }

  function renderCategoryChips() {
    $("p-categories").innerHTML = CATEGORY_OPTIONS.map(
      (c) => `<label><input type="checkbox" name="categories" value="${escapeHtml(c)}" />${escapeHtml(c)}</label>`
    ).join("");
  }

  function fillProfileForm(p) {
    const form = $("profile-form");
    form.reset();
    clearErrors();
    if (!p) return;
    $("p-field").value = p.field;
    $("p-tone").value = p.tone;
    $("p-title-style").value = p.titleStyle;
    $("p-keywords").value = (p.keywords || []).join(", ");
    const extra = [];
    p.categories.forEach((c) => {
      const box = form.querySelector(`input[name="categories"][value="${CSS.escape(c)}"]`);
      if (box) box.checked = true; else extra.push(c);
    });
    $("p-categories-extra").value = extra.join(", ");
  }

  function readProfileForm() {
    const form = $("profile-form");
    const checked = [...form.querySelectorAll('input[name="categories"]:checked')].map((x) => x.value);
    const categories = [...checked, ...splitList($("p-categories-extra").value)]
      .filter((x, i, arr) => arr.indexOf(x) === i);
    return {
      field: $("p-field").value.trim(),
      categories,
      tone: $("p-tone").value.trim(),
      titleStyle: $("p-title-style").value.trim(),
      keywords: splitList($("p-keywords").value),
    };
  }

  // 빈 칸(공백만 입력한 경우 포함) 검사. 관심 키워드는 선택 항목.
  function validateProfile(p) {
    const errors = {};
    if (!p.field) errors.field = "블로그 분야를 입력해 주세요.";
    if (!p.categories.length) errors.categories = "카테고리를 하나 이상 고르거나 직접 입력해 주세요.";
    if (!p.tone) errors.tone = "글 톤을 입력해 주세요. 브리프 맨 위에 들어가요.";
    if (!p.titleStyle) errors.titleStyle = "제목 스타일을 입력해 주세요. 브리프 맨 위에 들어가요.";
    return errors;
  }

  function clearErrors() {
    document.querySelectorAll("#profile-form .field").forEach((f) => {
      f.classList.remove("invalid");
      const e = f.querySelector(".error");
      if (e) e.textContent = "";
    });
    $("profile-status").textContent = "";
  }

  function showErrors(errors) {
    let first = null;
    Object.entries(errors).forEach(([key, msg]) => {
      const f = document.querySelector(`#profile-form [data-field="${key}"]`);
      f.classList.add("invalid");
      f.querySelector(".error").textContent = msg;
      if (!first) first = f.querySelector("input");
    });
    $("profile-status").textContent = `빈 칸 ${Object.keys(errors).length}곳을 채워야 저장할 수 있어요.`;
    if (first) first.focus();
  }

  function openProfile() {
    fillProfileForm(profile);
    $("profile-cancel").hidden = !profile; // 처음 만들 때는 취소할 곳이 없음
    show("profile");
  }

  function renderProfileSummary() {
    $("profile-summary-text").textContent =
      `${profile.field} · ${profile.categories.join(", ")} · 톤: ${profile.tone}`;
  }

  $("profile-form").addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors();
    const p = readProfileForm();
    const errors = validateProfile(p);
    if (Object.keys(errors).length) {
      showErrors(errors);
      return;
    }
    try {
      saveProfile(p);
    } catch {
      $("profile-status").textContent =
        "이 브라우저에서는 저장할 수 없어요. (시크릿 모드라면 일반 창에서 열어 주세요)";
      return;
    }
    profile = p;
    renderProfileSummary();
    show("start");
  });

  // 입력하면 그 칸의 오류 표시는 바로 지움
  $("profile-form").addEventListener("input", (e) => {
    const f = e.target.closest(".field");
    if (f && f.classList.contains("invalid")) {
      f.classList.remove("invalid");
      f.querySelector(".error").textContent = "";
    }
  });

  $("profile-cancel").addEventListener("click", () => show("start"));
  $("edit-profile-btn").addEventListener("click", openProfile);

  // GPT·제미나이에 그대로 붙여 넣기 좋은 텍스트 형식
  // 맨 위에 프로필의 글 톤·제목 스타일을 넣어 따로 설명하지 않아도 되게 함
  function briefToText(t) {
    const b = t.brief;
    return [
      "[내 블로그 스타일] 아래 브리프로 글을 쓸 때 이 스타일을 지켜 줘.",
      `글 톤: ${profile.tone}`,
      `제목 스타일: ${profile.titleStyle}`,
      "",
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

  // 첫 화면: 프로필이 없으면 프로필 입력, 있으면 "오늘 기획 시작"
  renderCategoryChips();
  profile = loadProfile();
  if (profile) {
    renderProfileSummary();
    show("start");
  } else {
    openProfile();
  }
})();
