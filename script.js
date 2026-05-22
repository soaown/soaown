let coverUrl = "";

function selectCoverImage() {
  const input = document.getElementById("cover-input");
  if (!input) return;

  input.click();
}

// ===== 서버연결 =====
const SUPABASE_URL = "https://pwbupzluwwyecsabdtcc.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZRjzTSDAc70_elo91hs9zg_ZvdTyn5v";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
// ===== 공통 =====
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let searchQuery = '';

function formatDate(isoDate) {
  const d = isoDate ? new Date(isoDate) : new Date();
  return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function getItems(category) {
  const { data, error } = await db
    .from("posts")
    .select("*")
    .eq("category", category)
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}

async function saveItem(item) {
  const { error } = await db
    .from("posts")
    .insert([item]);

  if (error) {
    console.error(error);
  }
}




// ===== 검색 =====
function handleSearch(event) {
  searchQuery = event.target.value.toLowerCase();
  renderList();
}

function clearSearch() {
  searchQuery = '';
  const input = document.getElementById('search-input');
  if (input) input.value = '';
}




// ===== 리스트 페이지 =====
async function renderList() {
  const category = document.body.dataset.category;
  let items = await getItems(category);

  items.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  // 검색 필터링 (제목, 카테고리, 내용 모두 검색)
  if (searchQuery) {
    items = items.filter(item => {
      const haystack = [
        item.title || '',
        item.content || '',
        item.category || ''
      ].join(' ').toLowerCase();
      return haystack.includes(searchQuery);
    });
  }

  const list = document.querySelector('.item-list');
  if (!list) return;

  if (items.length === 0) {
    if (searchQuery) {
      list.innerHTML = `<li class="empty-state">검색 결과가 없습니다.</li>`;
    } else {
      list.innerHTML = '<li class="empty-state">아직 작성된 글이 없습니다.</li>';
    }
    return;
  }

  list.innerHTML = items.map(item => `
    <li>
      <h2 class="item-title">
        <a href="post.html?category=${category}&id=${item.id}">${escapeHtml(item.title)}</a>
      </h2>
      <div class="item-meta">
        <span>${escapeHtml(item.date)}</span>
        ${item.subcategory ? `<span>· ${escapeHtml(item.subcategory)}</span>` : ''}
      </div>
    </li>
  `).join('');
}

function showAddForm() {
  const form = document.getElementById("add-form");
  const addBtn = document.getElementById("add-btn");

  if (!form) return;

  form.style.display = "flex";
  if (addBtn) addBtn.style.display = "none";

  const pageTitle = document.querySelector(".page-title");
  const searchSection = document.querySelector(".search-section");
  const itemList = document.querySelector(".item-list");

  if (pageTitle) pageTitle.style.display = "none";
  if (searchSection) searchSection.style.display = "none";
  if (itemList) itemList.style.display = "none";

  const titleInput = document.getElementById("title-input");
  if (titleInput) titleInput.focus();

  window.scrollTo(0, 0);
}

function hideAddForm() {
  document.getElementById('add-form').style.display = 'none';
  document.getElementById('add-btn').style.display = 'inline-block';
  document.getElementById('add-form').reset();

  // ===== 표지 이미지 상태 초기화 =====
  coverUrl = "";
  window.currentEditingId = null;
  const titleBanner = document.querySelector(".title-banner-preview");
  if (titleBanner) {
    titleBanner.style.removeProperty("--cover-url");
  }

  // 다시 보이도록 복원
  const pageTitle = document.querySelector('.page-title');
  const searchSection = document.querySelector('.search-section');
  const itemList = document.querySelector('.item-list');
  if (pageTitle) pageTitle.style.display = '';
  if (searchSection) searchSection.style.display = '';
  if (itemList) itemList.style.display = '';
}

async function handleSubmit(event) {
  event.preventDefault();
  const category = document.body.dataset.category;
  const title = document.getElementById('title-input').value.trim();
  const dateRaw = document.getElementById('date-input').value;
  const subCategory = document.getElementById('category-input').value.trim();
  const content = document.getElementById('content-input').innerHTML.trim();
  const link = document.getElementById('link-input').value.trim();
  const author = document.getElementById('author-input').value.trim();
  const publisher = document.getElementById('publisher-input').value.trim();
  const details = document.getElementById('details-input').value.trim();

  if (!title || !content) return;

  if (window.currentEditingId) {

    const { error } = await db
      .from("posts")
      .update({
        title,
        date: formatDate(dateRaw),
        subcategory: subCategory,
        link,
        author,
        publisher,
        details,
        content,
        cover_url: coverUrl
      })
      .eq("id", window.currentEditingId);

    if (error) {
      console.error(error);
      return;
    }

  } else {

    // 새 글 저장
    await saveItem({
      title,
      date: formatDate(dateRaw),
      category,
      subcategory: subCategory,
      author,
      publisher,
      details,
      link,
      content,
      cover_url: coverUrl
    });

  }

  window.currentEditingId = null;

  hideAddForm();
  await renderList();
}

// ===== 삭제랑 수정버튼 =====
async function deletePost() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const category = params.get('category');

  if (!id || !category) {
    alert("잘못된 접근입니다.");
    return;
  }

  if (!confirm("정말 삭제하시겠습니까?")) return;

  const { error } = await db
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("삭제 중 오류가 발생했습니다.");
    return;
  }

  window.location.href = `${category.toLowerCase()}.html`;
}
// ===== 삭제랑 수정버튼(여기가수정) =====
function editPost() {
  const params = new URLSearchParams(window.location.search);

  const id = params.get('id');
  const category = params.get('category');

  if (!id || !category) {
    alert("잘못된 접근입니다.");
    return;
  }

  window.location.href = `${category.toLowerCase()}.html?edit=${id}`;
}

// ===== 글 상세 페이지 =====
async function renderPost() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category') || 'BLOG';
  const id = params.get('id');

  const titleEl = document.querySelector('.post-title');
  const metaEl = document.querySelector('.meta-grid');
  const contentEl = document.querySelector('.post-content');

  if (!id) {
    titleEl.textContent = '글을 찾을 수 없습니다';
    metaEl.textContent = '';
    contentEl.innerHTML = '';
    return;
  }

  const items = await getItems(category);
  const post = items.find(item => String(item.id) === id);

  if (!post) {
    titleEl.textContent = '글을 찾을 수 없습니다';
    metaEl.textContent = '';
    contentEl.innerHTML = '';
    return;
  }

  document.title = `${post.title} | SOAOWN`;
  titleEl.textContent = post.title;

  // ===== 책 표지 배경 =====
  const postHeader =
    document.querySelector(".post-header");

  if (postHeader && post.cover_url) {
    postHeader.style.setProperty(
      "--cover-url",
      `url("${post.cover_url}")`
    );
  }

  let metaHTML = '';

  if (post.date) {
    metaHTML += `
    <label>
      <span>date:</span>
      <p>${escapeHtml(post.date)}</p>
    </label>
  `;
  }

  if (post.subcategory) {
    metaHTML += `
    <label>
      <span>category:</span>
      <p>${escapeHtml(post.subcategory)}</p>
    </label>
  `;
  }

  if (post.link) {
    metaHTML += `
    <label>
      <span>link:</span>
      <a href="${escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(post.link)}
      </a>
    </label>
  `;
  }

  if (post.author) {
    metaHTML += `
    <label>
      <span>author:</span>
      <p>${escapeHtml(post.author)}</p>
    </label>
  `;
  }

  if (post.publisher) {
    metaHTML += `
    <label>
      <span>publisher:</span>
      <p>${escapeHtml(post.publisher)}</p>
    </label>
  `;
  }

  if (post.details) {
    metaHTML += `
    <label>
      <span>details:</span>
      <p>${escapeHtml(post.details)}</p>
    </label>
  `;
  }

  metaEl.innerHTML = metaHTML;

  contentEl.innerHTML = post.content || '';
  contentEl.querySelectorAll(".footnote-ref").forEach(ref => {
    ref.removeAttribute("title");
  });

  // 뒤로가기 링크 카테고리에 맞게 설정
  const backLink = document.querySelector('.post-back a');
  if (backLink) {
    backLink.href = `${category.toLowerCase()}.html`;
    backLink.textContent = `← ${category.charAt(0).toUpperCase() + category.slice(1)}로 돌아가기`;
  }
}

// ===== 페이지 종류에 따라 실행 =====
document.addEventListener('DOMContentLoaded', async () => {

  const pageType = document.body.dataset.page;

  if (pageType === 'post') {

    await renderPost();

  } else if (document.body.dataset.category) {

    await renderList();

    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');

    if (editId) {
      await loadEditPost(editId);
    }
  }
});

async function loadEditPost(id) {
  const category = document.body.dataset.category;
  const items = await getItems(category);

  const post = items.find(item => String(item.id) === id);

  if (!post) return;

  window.currentEditingId = id;

  showAddForm();

  document.getElementById('title-input').value = post.title || '';
  document.getElementById('date-input').value =
    post.date
      ? new Date(post.date).toISOString().split('T')[0]
      : '';
  document.getElementById('category-input').value = post.subcategory || '';
  document.getElementById('link-input').value = post.link || '';
  document.getElementById('author-input').value = post.author || '';
  document.getElementById('publisher-input').value = post.publisher || '';
  document.getElementById('details-input').value = post.details || '';
  document.getElementById('content-input').innerHTML = post.content || '';
  document.querySelectorAll(".footnote-ref").forEach(ref => {
    ref.removeAttribute("title");
  });

  // ===== 표지 이미지 복원 =====
  coverUrl = post.cover_url || "";

  const titleBanner = document.querySelector(".title-banner-preview");
  if (titleBanner && coverUrl) {
    titleBanner.style.setProperty("--cover-url", `url("${coverUrl}")`);
  }

  document.querySelectorAll('.add-form textarea').forEach(autoResizeTextarea);
}
// ===== textarea 자동 높이 조절 =====
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

document.querySelectorAll('.add-form textarea').forEach(ta => {
  ta.addEventListener('input', () => autoResizeTextarea(ta));
});

// ===== 수정창 카테고리 박스 늘어남 =====
function resizeMetaInput(input) {
  input.style.width =
    Math.max(input.value.length + 2, 12) + 'ch';
}

document
  .querySelectorAll('.meta-grid input')
  .forEach(input => {

    resizeMetaInput(input);

    input.addEventListener('input', () => {
      resizeMetaInput(input);
    });

  });


// ===== 제목 textarea 자동 높이 =====
const titleInput = document.getElementById("title-input");

if (titleInput) {

  function autoResizeTitle() {
    titleInput.style.height = "auto";
    titleInput.style.height =
      titleInput.scrollHeight + "px";
  }

  autoResizeTitle();

  titleInput.addEventListener(
    "input",
    autoResizeTitle
  );

  titleInput.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
      }
    }
  );
}

// ===== 엔터누르면비번써밋 =====

document.addEventListener("DOMContentLoaded", () => {

  const input =
    document.getElementById("password-input");

  if (input) {

    input.addEventListener("keydown", (e) => {

      if (e.key === "Enter") {

        e.preventDefault();

        submitPassword();
      }
    });
  }
});

// ===== 그 툴바 ====
// 굵게
function formatText(command) {

  const editor =
    document.getElementById("content-input");

  if (!editor) return;

  editor.focus();

  const selectedImage =
    document.querySelector(".image-box.selected");

  if (
    selectedImage &&
    (
      command === "justifyCenter" ||
      command === "justifyLeft" ||
      command === "justifyRight"
    )
  ) {

    if (command === "justifyCenter") {
      // 이미지 가운데 정렬 토글
      const m = selectedImage.style.margin;
      const isCentered =
        m === "1rem auto" ||
        m === "1rem auto 1rem auto" ||
        m.indexOf("auto") !== -1;

      if (isCentered) {
        selectedImage.style.margin = "";
        selectedImage.style.display = "";
      } else {
        selectedImage.style.display = "block";
        selectedImage.style.margin = "1rem auto";
      }
      return;
    }

    if (command === "justifyLeft") {
      selectedImage.style.display = "block";
      selectedImage.style.margin = "1rem 0";
    }

    if (command === "justifyRight") {
      selectedImage.style.display = "block";
      selectedImage.style.margin = "1rem 0 1rem auto";
    }

    return;
  }

  // 텍스트 가운데 정렬 토글 (이미 가운데면 해제)
  if (command === "justifyCenter") {
    let isCentered = false;
    try {
      isCentered = document.queryCommandState("justifyCenter");
    } catch (e) {
      isCentered = false;
    }
    if (isCentered) {
      document.execCommand("justifyLeft", false, null);
      return;
    }
  }

  document.execCommand(
    command,
    false,
    null
  );
}

// 사진 버튼
function insertImage() {

  const imageInput =
    document.getElementById("image-input");

  if (!imageInput) return;

  imageInput.click();
}

// 이미지 삽입
document
  .getElementById("image-input")
  ?.addEventListener(
    "change",
    async function () {

      const file = this.files[0];

      if (!file) return;

      const editor =
        document.getElementById(
          "content-input"
        );

      if (!editor) return;

      // ===== Supabase Storage에 이미지 업로드 =====
      const fileExt =
        file.name.split(".").pop();

      const fileName =
        `${Date.now()}-${Math.random()}.${fileExt}`;

      const filePath =
        `posts/${fileName}`;

      const { error } = await db.storage
        .from("post-images")
        .upload(filePath, file);

      if (error) {
        console.error(error);
        alert("이미지 업로드 실패");
        return;
      }

      const { data } = db.storage
        .from("post-images")
        .getPublicUrl(filePath);

      const box =
        document.createElement("span");

      box.className = "image-box";
      box.contentEditable = "false";
      box.style.width = "300px";
      box.style.height = "auto";

      const img =
        document.createElement("img");

      // 기존 e.target.result 대신 publicUrl 사용
      img.src = data.publicUrl;
      img.loading = "lazy";
      img.decoding = "async";
      img.fetchPriority = "low";

      box.appendChild(img);

      const handle =
        document.createElement("div");

      handle.className =
        "resize-handle";

      box.appendChild(handle);

      const footnoteList =
        editor.querySelector(".footnote-list");

      if (footnoteList) {
        editor.insertBefore(box, footnoteList);
        editor.insertBefore(
          document.createElement("br"),
          footnoteList
        );
      } else {
        editor.appendChild(box);
        editor.appendChild(
          document.createElement("br")
        );
      }

      this.value = "";
    }
  );

// 글씨 색상
function setTextColor(color) {
  const editor =
    document.getElementById("content-input");

  if (!editor) return;

  editor.focus();

  document.execCommand(
    "foreColor",
    false,
    color
  );
}

// 글씨 하이라이트
function setHighlight(color) {
  const editor =
    document.getElementById("content-input");

  if (!editor) return;

  editor.focus();

  document.execCommand(
    "hiliteColor",
    false,
    color
  );
}

// ===== 글씨색 / 하이라이트 드롭다운 =====
function toggleColorDropdown(triggerEl) {
  const dropdown = triggerEl.closest(".color-dropdown");
  if (!dropdown) return;

  const wasOpen = dropdown.classList.contains("open");

  // 다른 드롭다운은 모두 닫기
  document
    .querySelectorAll(".color-dropdown.open")
    .forEach(d => d.classList.remove("open"));

  if (!wasOpen) {
    dropdown.classList.add("open");
  }
}

function pickTextColor(swatchEl, color) {
  const dropdown = swatchEl.closest(".color-dropdown");
  if (dropdown) {
    const bar = dropdown.querySelector(".trigger-bar");
    if (bar) bar.style.background = color;
    dropdown.classList.remove("open");
  }
  setTextColor(color);
}

function pickHighlight(swatchEl, color) {
  const dropdown = swatchEl.closest(".color-dropdown");
  const bar = dropdown ? dropdown.querySelector(".trigger-bar") : null;

  const editor = document.getElementById("content-input");
  if (!editor) {
    if (dropdown) dropdown.classList.remove("open");
    return;
  }
  editor.focus();

  // 현재 selection의 하이라이트 색상 확인
  let current = "";
  try {
    current =
      document.queryCommandValue("backColor") ||
      document.queryCommandValue("hiliteColor") ||
      "";
  } catch (e) {
    current = "";
  }

  if (isSameColor(current, color)) {
    // 같은 색이면 해제 (토글)
    document.execCommand("hiliteColor", false, "transparent");
    if (bar) bar.style.background = "transparent";
  } else {
    document.execCommand("hiliteColor", false, color);
    if (bar) bar.style.background = color;
  }

  if (dropdown) dropdown.classList.remove("open");
}

// 색상 비교용 헬퍼
function isSameColor(a, b) {
  const na = normalizeColor(a);
  const nb = normalizeColor(b);
  if (!na || !nb) return false;
  return na === nb;
}

function normalizeColor(color) {
  if (!color) return "";
  color = String(color).trim().toLowerCase();
  if (
    !color ||
    color === "transparent" ||
    color === "rgba(0, 0, 0, 0)"
  ) {
    return "";
  }
  if (color.startsWith("#")) {
    if (color.length === 4) {
      return "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color;
  }
  if (color.startsWith("rgb")) {
    const m = color.match(/\d+/g);
    if (m && m.length >= 3) {
      const hex = n =>
        parseInt(n, 10).toString(16).padStart(2, "0");
      return "#" + hex(m[0]) + hex(m[1]) + hex(m[2]);
    }
  }
  return color;
}

// 바깥 영역 클릭 시 드롭다운 닫기
document.addEventListener("click", function (e) {
  if (!e.target.closest(".color-dropdown")) {
    document
      .querySelectorAll(".color-dropdown.open")
      .forEach(d => d.classList.remove("open"));
  }
});

// ===== 각주 기능 =====
let footnoteCount = 1;

function insertFootnote() {
  const editor =
    document.getElementById("content-input");

  if (!editor) return;

  editor.focus();

  const note = prompt("placeholder=Enter annotation(optical)");
  if (!note) return;

  const number = footnoteCount++;

  const sup = document.createElement("sup");
  sup.className = "footnote-ref";
  sup.textContent = `[${number}]`;
  sup.dataset.note = note;
  sup.dataset.number = number;
  sup.contentEditable = "false";

  const after = document.createElement("span");
  after.className = "after-footnote";
  after.innerHTML = "&nbsp;";

  const selection = window.getSelection();

  if (selection.rangeCount) {
    const range = selection.getRangeAt(0);

    range.insertNode(after);
    range.insertNode(sup);

    range.setStartAfter(after);
    range.setEndAfter(after);

    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    editor.appendChild(sup);
    editor.appendChild(after);
  }
}

// ===== 이미지 선택 =====
document.addEventListener("click", function (e) {

  document
    .querySelectorAll(".image-box")
    .forEach(box => {
      box.classList.remove("selected");
    });

  const box =
    e.target.closest(".image-box");

  if (box) {
    box.classList.add("selected");
  }
});

// ===== 이미지 리사이즈 =====
document.addEventListener("mousedown", function (e) {

  if (
    !e.target.classList.contains(
      "resize-handle"
    )
  ) return;

  e.preventDefault();

  const box =
    e.target.parentElement;

  const startX = e.clientX;

  const startWidth =
    box.offsetWidth;

  function resize(ev) {

    const newWidth =
      startWidth +
      (ev.clientX - startX);

    box.style.width =
      newWidth + "px";
  }

  function stopResize() {

    document.removeEventListener(
      "mousemove",
      resize
    );

    document.removeEventListener(
      "mouseup",
      stopResize
    );
  }

  document.addEventListener(
    "mousemove",
    resize
  );

  document.addEventListener(
    "mouseup",
    stopResize
  );
});

// ===== 각주 팝업 =====
document.addEventListener("click", function (e) {
  const ref = e.target.closest(".footnote-ref");

  document.querySelector(".footnote-popup")?.remove();

  if (!ref) return;

  const popup = document.createElement("div");
  popup.className = "footnote-popup";
  popup.textContent =
    ref.dataset.note || ref.title || "";

  document.body.appendChild(popup);

  const rect = ref.getBoundingClientRect();

  popup.style.left =
    rect.left + window.scrollX + "px";

  popup.style.top =
    rect.bottom + window.scrollY + 8 + "px";
});

// ===== 관리자 모드 =====
function isAdminMode() {
  return localStorage.getItem("adminMode") === "true";
}

function applyAdminMode() {
  document.body.classList.toggle("admin-mode", isAdminMode());
}

document.addEventListener(
  "DOMContentLoaded",
  applyAdminMode
);

function guardKnowledge(event) {
  if (!isAdminMode()) {
    event.preventDefault();
    openAdminPopup();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (document.body.dataset.category === "KNOWLEDGE" && !isAdminMode()) {
    location.href = "index.html";
  }
});

function guardAddForm() {
  if (!isAdminMode()) {
    openAdminPopup();
    return;
  }

  showAddForm();
}

function openAdminPopup() {
  const popup = document.getElementById("admin-popup");

  if (!popup) {
    alert("ADMIN");
    return;
  }

  popup.style.display = "flex";

  const input = document.getElementById("admin-password-input");
  if (input) input.focus();
}

function closeAdminPopup() {
  const popup = document.getElementById("admin-popup");
  if (popup) popup.style.display = "none";
}

function submitAdminPassword() {
  const input = document.getElementById("admin-password-input");
  const password = input ? input.value : "";

  if (password === "0310") {
    localStorage.setItem("adminMode", "true");
    applyAdminMode();
    closeAdminPopup();
  } else {
    const error = document.getElementById("error-popup");
    if (error) error.style.display = "flex";
  }
}

// 하이라이트 제거
function removeHighlight() {

  const editor =
    document.getElementById(
      "content-input"
    );

  if (!editor) return;

  editor.focus();

  document.execCommand(
    "hiliteColor",
    false,
    "transparent"
  );
}

document
  .getElementById("cover-input")
  ?.addEventListener("change", async function () {
    const file = this.files[0];

    if (!file) return;

    const fileName = `cover-${Date.now()}-${file.name}`;

    const { data, error } = await db.storage
      .from("post-images")
      .upload(fileName, file);

    if (error) {
      console.error("표지 업로드 실패:", error);
      return;
    }

    const { data: publicData } = db.storage
      .from("post-images")
      .getPublicUrl(fileName);

    coverUrl = publicData.publicUrl;

    // ===== 제목 배너 미리보기 =====
    const titleBanner =
      document.querySelector(
        ".title-banner-preview"
      );

    if (titleBanner) {
      titleBanner.style.setProperty(
        "--cover-url",
        `url("${coverUrl}")`
      );
    }

    alert("cover image added");
  });