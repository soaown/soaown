/**
 * SOAOWN - blog/book/knowledge/post 페이지 공통 스크립트
 *
 * 구조 (위에서 아래로):
 *   1. 설정 / 상수
 *   2. Supabase 클라이언트
 *   3. 모듈 내부 상태
 *   4. 유틸 (escapeHtml, formatDate, 색상)
 *   5. DB (getItems, saveItem, updateItem, deleteItem, uploadImage)
 *   6. 검색
 *   7. 리스트 렌더링
 *   8. add-form 표시/숨김 + 표지 이미지
 *   9. 저장 / 수정 / 삭제
 *  10. 상세 페이지 렌더링 + 수정 모드 로드
 *  11. 에디터 툴바 (서식, 색상, 하이라이트, 드롭다운)
 *  12. 에디터 이미지 (삽입, 선택, 리사이즈)
 *  13. 각주
 *  14. textarea / meta input 자동 크기
 *  15. 어드민 진입 가드 (admin.js와 연동)
 *  16. 부트스트랩 (단일 DOMContentLoaded)
 *  17. 인라인 onclick 노출
 */
(() => {
  'use strict';

  // ===== 1. 설정 / 상수 =====
  const SUPABASE_URL = "https://pwbupzluwwyecsabdtcc.supabase.co";
  const SUPABASE_KEY = "sb_publishable_ZRjzTSDAc70_elo91hs9zg_ZvdTyn5v";
  const STORAGE_BUCKET = "post-images";
  const POSTS_TABLE = "posts";

  const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const IMAGE_BOX_DEFAULT_WIDTH = 300; // px
  const META_INPUT_MIN_WIDTH = 12;     // ch
  const META_INPUT_PADDING = 2;        // ch

  // ===== 2. Supabase 클라이언트 =====
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // ===== 3. 모듈 내부 상태 =====
  let coverUrl = "";
  let searchQuery = "";
  let footnoteCount = 1;
  let currentEditingId = null;

  // ===== 4. 유틸 =====
  function getEditor() {
    return document.getElementById("content-input");
  }

  function formatDate(isoDate) {
    const d = isoDate ? new Date(isoDate) : new Date();
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function normalizeColor(color) {
    if (!color) return "";
    color = String(color).trim().toLowerCase();
    if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") {
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
        const hex = n => parseInt(n, 10).toString(16).padStart(2, "0");
        return "#" + hex(m[0]) + hex(m[1]) + hex(m[2]);
      }
    }
    return color;
  }

  function isSameColor(a, b) {
    const na = normalizeColor(a);
    const nb = normalizeColor(b);
    if (!na || !nb) return false;
    return na === nb;
  }

  // ===== 5. DB =====
  async function getItems(category) {
    const { data, error } = await db
      .from(POSTS_TABLE)
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
    const { error } = await db.from(POSTS_TABLE).insert([item]);
    if (error) console.error(error);
  }

  async function updateItem(id, item) {
    const { error } = await db.from(POSTS_TABLE).update(item).eq("id", id);
    if (error) {
      console.error(error);
      return false;
    }
    return true;
  }

  async function deleteItem(id) {
    const { error } = await db.from(POSTS_TABLE).delete().eq("id", id);
    if (error) {
      console.error(error);
      return false;
    }
    return true;
  }

  async function uploadImage(file, prefix) {
    const fileExt = file.name.split(".").pop();
    const fileName = prefix
      ? `${prefix}-${Date.now()}-${file.name}`
      : `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = prefix ? fileName : `posts/${fileName}`;

    const { error } = await db.storage.from(STORAGE_BUCKET).upload(filePath, file);
    if (error) {
      console.error(error);
      return null;
    }

    const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  }

  // ===== 6. 검색 =====
  function handleSearch(event) {
    searchQuery = event.target.value.toLowerCase();
    renderList();
  }

  // ===== 7. 리스트 렌더링 =====
  async function renderList() {
    const category = document.body.dataset.category;
    let items = await getItems(category);

    const currentBookSubcategory =
      new URLSearchParams(window.location.search).get("sub");

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    // BOOK이면 소카테고리 숫자 목록 만들기
    if (category === "BOOK") {
      if (currentBookSubcategory) {
        items = items.filter(item =>
          (item.subcategory || "")
            .split(",")
            .map(cat => cat.trim())
            .includes(currentBookSubcategory)
        );
      } else {
        items = items.slice(0, 1
        );
      }
    }

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
      list.innerHTML = searchQuery
        ? '<li class="empty-state">검색 결과가 없습니다.</li>'
        : '<li class="empty-state">아직 작성된 글이 없습니다.</li>';
      return;
    }

    list.innerHTML = items.map(item => `
      <li>
        <h2 class="item-title">
          <a href="post.html?category=${category}&id=${item.id}">${escapeHtml(item.title)}</a>
        </h2>
        <div class="item-footer">
          <div class="item-meta">
           <span>${escapeHtml(item.date)}</span>
           ${item.subcategory ? `<span>· ${escapeHtml(item.subcategory)}</span>` : ''}
          </div>
          <div class="item-likes">
          <span class="like-heart">♥︎</span>
          <span class="like-count">${item.likes || 0}</span>
          </div>
        </div>
      </li>   
    `).join('');

    if (category === "BOOK" && !currentBookSubcategory) {
      const allBookItems = await getItems("BOOK");
      renderBookSubcategoryList(allBookItems);
    }
  }

  function renderBookSubcategoryList(posts) {
    const box = document.getElementById("book-subcategory-list");
    if (!box) return;

    const bookPosts = posts.filter(post => post.category === "BOOK");

    const categories = ["시", "소설", "비문학", "고전"];

    box.innerHTML = categories.map(name => {
      const count = bookPosts.filter(post => post.subcategory === name).length;

      return `
      <div class="book-subcategory-row">
        <span>${name} ✦ ${count} posts waiting for you</span>
        <a href="book.html?sub=${encodeURIComponent(name)}">browse ></a>
      </div>
    `;
    }).join("");
  }

  // ===== 8. add-form 표시/숨김 + 표지 이미지 =====
  function showAddForm() {
    const form = document.getElementById("add-form");
    if (!form) return;

    form.style.display = "flex";
    toggleListView(false);

    const titleInput = document.getElementById("title-input");
    if (titleInput) titleInput.focus();

    window.scrollTo(0, 0);
  }

  function hideAddForm() {
    const form = document.getElementById('add-form');
    if (form) {
      form.style.display = 'none';
      form.reset();
    }

    // 표지 이미지 상태 초기화
    coverUrl = "";
    currentEditingId = null;
    const titleBanner = document.querySelector(".title-banner-preview");
    if (titleBanner) {
      titleBanner.style.removeProperty("--cover-url");
    }

    toggleListView(true);
  }

  function toggleListView(visible) {
    const display = visible ? '' : 'none';
    const targets = ['.page-title', '.search-section', '.item-list'];
    targets.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.style.display = display;
    });

    const addBtn = document.getElementById('add-btn');
    if (addBtn) addBtn.style.display = visible ? 'inline-block' : 'none';
  }

  function selectCoverImage() {
    const input = document.getElementById("cover-input");
    if (input) input.click();
  }

  window.removeCoverImage = function () {
    coverUrl = "";

    const titleBanner =
      document.querySelector(".title-banner-preview");

    if (titleBanner) {
      titleBanner.style.setProperty("--cover-url", "none");
      titleBanner.classList.add("no-cover");
    }

    const coverInput =
      document.getElementById("cover-input");

    if (coverInput) {
      coverInput.value = "";
    }
  };

  async function handleCoverInputChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const publicUrl = await uploadImage(file, "cover");
    if (!publicUrl) {
      console.error("표지 업로드 실패");
      return;
    }

    coverUrl = publicUrl;

    const titleBanner = document.querySelector(".title-banner-preview");
    if (titleBanner) {
      titleBanner.style.setProperty("--cover-url", `url("${coverUrl}")`);
    }

    alert("cover image added");
  }

  // ===== 9. 저장 / 수정 / 삭제 =====
  function collectFormValues() {
    const get = id => document.getElementById(id);
    return {
      title: get('title-input').value.trim(),
      dateRaw: get('date-input').value,
      subcategory: get('category-input').value.trim(),
      content: get('content-input').innerHTML.trim(),
      link: get('link-input').value.trim(),
      author: get('author-input').value.trim(),
      publisher: get('publisher-input').value.trim(),
      details: get('details-input').value.trim(),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const category = document.body.dataset.category;
    const v = collectFormValues();

    if (!v.title || !v.content) return;

    const payload = {
      title: v.title,
      date: formatDate(v.dateRaw),
      subcategory: v.subcategory,
      link: v.link,
      author: v.author,
      publisher: v.publisher,
      details: v.details,
      content: v.content,
      cover_url: coverUrl,
    };

    if (currentEditingId) {
      const ok = await updateItem(currentEditingId, payload);
      if (!ok) return;
    } else {
      await saveItem({ ...payload, category });
    }

    currentEditingId = null;
    hideAddForm();
    await renderList();
  }

  async function deletePost() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const category = params.get('category');

    if (!id || !category) {
      alert("잘못된 접근입니다.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) return;

    const ok = await deleteItem(id);
    if (!ok) {
      alert("삭제 중 오류가 발생했습니다.");
      return;
    }

    window.location.href = `${category.toLowerCase()}.html`;
  }

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

  // ===== 10. 상세 페이지 렌더링 + 수정 모드 로드 =====
  const POST_META_FIELDS = [
    { key: 'date', label: 'date' },
    { key: 'subcategory', label: 'category' },
    { key: 'link', label: 'link', isLink: true },
    { key: 'author', label: 'author' },
    { key: 'publisher', label: 'publisher' },
    { key: 'details', label: 'details' },
  ];

  function renderPostMeta(post) {
    return POST_META_FIELDS
      .filter(f => post[f.key])
      .map(f => {
        const value = escapeHtml(post[f.key]);
        const body = f.isLink
          ? `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`
          : `<p>${value}</p>`;
        return `<label><span>${f.label}:</span>${body}</label>`;
      })
      .join('');
  }

  function setPostNotFound(titleEl, metaEl, contentEl) {
    titleEl.textContent = '글을 찾을 수 없습니다';
    metaEl.textContent = '';
    contentEl.innerHTML = '';
  }

  async function renderPost() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || 'BLOG';
    const id = params.get('id');

    const titleEl = document.querySelector('.post-title');
    const metaEl = document.querySelector('.meta-grid');
    const contentEl = document.querySelector('.post-content');

    if (!id) {
      setPostNotFound(titleEl, metaEl, contentEl);
      return;
    }

    const items = await getItems(category);
    const post = items.find(item => String(item.id) === id);

    if (!post) {
      setPostNotFound(titleEl, metaEl, contentEl);
      return;
    }

    document.title = `${post.title} | SOAOWN`;
    titleEl.textContent = post.title;

    // 책 표지 배경
    const postHeader = document.querySelector(".post-header");
    if (postHeader && post.cover_url) {
      postHeader.style.setProperty("--cover-url", `url("${post.cover_url}")`);
    }

    metaEl.innerHTML = renderPostMeta(post);

    contentEl.innerHTML = post.content || '';
    contentEl.querySelectorAll(".footnote-ref").forEach(ref => {
      ref.removeAttribute("title");
    });

    const likeBtn = document.getElementById("like-btn");
    const likeCount = document.getElementById("like-count");

    if (likeBtn && likeCount) {

      likeCount.textContent = post.likes || 0;

      const likedKey = `liked-post-${post.id}`;

      if (localStorage.getItem(likedKey)) {
        likeBtn.classList.add("liked");
        likeBtn.innerHTML =
          `♥ <span id="like-count">${post.likes || 0}</span>`;
      }

      likeBtn.onclick = async () => {

        if (localStorage.getItem(likedKey)) return;

        const newLikes = (post.likes || 0) + 1;

        const { error } = await db
          .from("posts")
          .update({ likes: newLikes })
          .eq("id", post.id);

        if (error) {
          console.error(error);
          return;
        }

        localStorage.setItem(likedKey, "true");

        post.likes = newLikes;

        likeBtn.classList.add("liked");

        likeBtn.innerHTML =
          `♥ <span id="like-count">${newLikes}</span>`;
      };
    }
  }


  async function loadEditPost(id) {
    const category = document.body.dataset.category;
    const items = await getItems(category);

    const post = items.find(item => String(item.id) === id);
    if (!post) return;

    currentEditingId = id;
    showAddForm();

    const setVal = (inputId, value) => {
      const el = document.getElementById(inputId);
      if (el) el.value = value;
    };

    setVal('title-input', post.title || '');
    setVal('date-input', post.date ? toDateInputValue(post.date) : '');
    setVal('category-input', post.subcategory || '');
    setVal('link-input', post.link || '');
    setVal('author-input', post.author || '');
    setVal('publisher-input', post.publisher || '');
    setVal('details-input', post.details || '');

    const contentEl = document.getElementById('content-input');
    if (contentEl) contentEl.innerHTML = post.content || '';

    document.querySelectorAll(".footnote-ref").forEach(ref => {
      ref.removeAttribute("title");
    });

    function toDateInputValue(dateText) {
      if (!dateText) return '';

      const d = new Date(dateText);

      if (Number.isNaN(d.getTime())) return '';

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    // 표지 이미지 복원
    coverUrl = post.cover_url || "";
    const titleBanner = document.querySelector(".title-banner-preview");
    if (titleBanner && coverUrl) {
      titleBanner.style.setProperty("--cover-url", `url("${coverUrl}")`);
    }

    document.querySelectorAll('.add-form textarea').forEach(autoResizeTextarea);
  }

  // ===== 11. 에디터 툴바 =====
  const ALIGN_COMMANDS = ['justifyCenter', 'justifyLeft', 'justifyRight'];

  function formatText(command) {
    const editor = getEditor();
    if (!editor) return;
    editor.focus();

    const selectedImage = document.querySelector(".image-box.selected");
    const selectedRow = selectedImage?.closest(".image-row");

    // 이미지가 선택된 상태에서 정렬 명령은 이미지에 적용
    if (
      selectedImage &&
      (
        command === "justifyCenter" ||
        command === "justifyLeft" ||
        command === "justifyRight"
      )
    ) {
      const target = selectedRow || selectedImage;

      if (command === "justifyCenter") {
        target.style.display = selectedRow ? "flex" : "block";
        target.style.justifyContent = "center";
        target.style.margin = "1rem auto";
      }

      if (command === "justifyLeft") {
        target.style.display = selectedRow ? "flex" : "block";
        target.style.justifyContent = "flex-start";
        target.style.margin = "1rem 0";
      }

      if (command === "justifyRight") {
        target.style.display = selectedRow ? "flex" : "block";
        target.style.justifyContent = "flex-end";
        target.style.margin = "1rem 0 1rem auto";
      }

      return;
    }

    // 텍스트 가운데 정렬 토글 (이미 가운데면 좌측으로)
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

    document.execCommand(command, false, null);
  }

  function applyImageAlignment(box, command) {
    if (command === "justifyCenter") {
      const m = box.style.margin;
      const isCentered =
        m === "1rem auto" ||
        m === "1rem auto 1rem auto" ||
        m.indexOf("auto") !== -1;

      if (isCentered) {
        box.style.margin = "";
        box.style.display = "";
      } else {
        box.style.display = "block";
        box.style.margin = "1rem auto";
      }
    } else if (command === "justifyLeft") {
      box.style.display = "block";
      box.style.margin = "1rem 0";
    } else if (command === "justifyRight") {
      box.style.display = "block";
      box.style.margin = "1rem 0 1rem auto";
    }
  }

  function setTextColor(color) {
    const editor = getEditor();
    if (!editor) return;
    editor.focus();
    document.execCommand("foreColor", false, color);
  }

  function setHighlight(color) {
    const editor = getEditor();
    if (!editor) return;
    editor.focus();
    document.execCommand("hiliteColor", false, color);
  }

  function removeHighlight() {
    const editor = getEditor();
    if (!editor) return;
    editor.focus();
    document.execCommand("hiliteColor", false, "transparent");
  }

  // 색상 드롭다운
  function toggleColorDropdown(triggerEl) {
    const dropdown = triggerEl.closest(".color-dropdown");
    if (!dropdown) return;

    const wasOpen = dropdown.classList.contains("open");
    closeAllColorDropdowns();
    if (!wasOpen) dropdown.classList.add("open");
  }

  function closeAllColorDropdowns() {
    document.querySelectorAll(".color-dropdown.open")
      .forEach(d => d.classList.remove("open"));
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

    const editor = getEditor();
    if (!editor) {
      if (dropdown) dropdown.classList.remove("open");
      return;
    }
    editor.focus();

    // 현재 selection의 하이라이트 색상 확인
    let current = "";
    try {
      current = document.queryCommandValue("backColor")
        || document.queryCommandValue("hiliteColor")
        || "";
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

  function handleColorDropdownOutsideClick(e) {
    if (!e.target.closest(".color-dropdown")) {
      closeAllColorDropdowns();
    }
  }

  // ===== 12. 에디터 이미지 (삽입, 선택, 리사이즈) =====
  function insertImage() {
    const imageInput = document.getElementById("image-input");
    if (imageInput) imageInput.click();
  }

  async function handleImageInputChange(e) {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;

    const editor = getEditor();
    if (!editor) return;

    const publicUrl = await uploadImage(file);
    if (!publicUrl) {
      alert("이미지 업로드 실패");
      return;
    }

    insertImageBox(editor, publicUrl);
    input.value = "";
  }

  function insertImageBox(editor, publicUrl) {
    const box = document.createElement("span");
    box.className = "image-box";
    box.contentEditable = "false";
    box.style.width = IMAGE_BOX_DEFAULT_WIDTH + "px";
    box.style.height = "auto";

    const img = document.createElement("img");
    img.src = publicUrl;
    img.loading = "lazy";
    img.decoding = "async";
    img.fetchPriority = "low";
    box.appendChild(img);

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    box.appendChild(handle);

    const footnoteList = editor.querySelector(".footnote-list");
    if (footnoteList) {
      editor.insertBefore(box, footnoteList);
      editor.insertBefore(document.createElement("br"), footnoteList);
    } else {
      editor.appendChild(box);
      editor.appendChild(document.createElement("br"));
    }
  }

  function handleImageBoxClick(e) {
    document.querySelectorAll(".image-box").forEach(box => {
      box.classList.remove("selected");
    });
    const box = e.target.closest(".image-box");
    if (box) box.classList.add("selected");
  }

  async function insertImageNextToSelected() {
    const selectedBox = document.querySelector(".image-box.selected");

    if (!selectedBox) {
      alert("먼저 옆에 붙일 사진을 클릭해줘");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";

    document.body.appendChild(input);

    input.addEventListener("change", async function () {
      const file = input.files[0];

      if (!file) {
        input.remove();
        return;
      }

      const publicUrl = await uploadImage(file);

      if (!publicUrl) {
        alert("이미지 업로드 실패");
        input.remove();
        return;
      }

      const newBox = document.createElement("span");
      newBox.className = "image-box";
      newBox.contentEditable = "false";
      newBox.style.width = IMAGE_BOX_DEFAULT_WIDTH + "px";
      newBox.style.height = "auto";

      const img = document.createElement("img");
      img.src = publicUrl;
      img.loading = "lazy";
      img.decoding = "async";
      img.fetchPriority = "low";

      newBox.appendChild(img);

      const handle = document.createElement("div");
      handle.className = "resize-handle";
      newBox.appendChild(handle);

      let row = selectedBox.closest(".image-row");

      if (!row) {
        row = document.createElement("div");
        row.className = "image-row";
        row.contentEditable = "false";

        selectedBox.parentNode.insertBefore(row, selectedBox);
        row.appendChild(selectedBox);
      }

      row.appendChild(newBox);

      input.remove();
    });

    input.click();
  }

  function handleImageResizeStart(e) {
    if (!e.target.classList.contains("resize-handle")) return;
    e.preventDefault();

    const box = e.target.parentElement;
    const startX = e.clientX;
    const startWidth = box.offsetWidth;

    function resize(ev) {
      const newWidth = startWidth + (ev.clientX - startX);
      box.style.width = newWidth + "px";
    }

    function stopResize() {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    }

    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
  }

  // ===== 13. 각주 =====
  function insertFootnote() {
    const editor = getEditor();
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

  function handleFootnoteClick(e) {
    const ref = e.target.closest(".footnote-ref");

    document.querySelector(".footnote-popup")?.remove();

    if (!ref) return;

    const popup = document.createElement("div");
    popup.className = "footnote-popup";
    popup.textContent = ref.dataset.note || ref.title || "";
    document.body.appendChild(popup);

    const rect = ref.getBoundingClientRect();
    popup.style.left = rect.left + window.scrollX + "px";
    popup.style.top = rect.bottom + window.scrollY + 8 + "px";
  }

  // ===== 14. textarea / meta input 자동 크기 =====
  function autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function resizeMetaInput(input) {
    input.style.width =
      Math.max(input.value.length + META_INPUT_PADDING, META_INPUT_MIN_WIDTH) + 'ch';
  }

  function setupAutoResizeTitle() {
    const titleInput = document.getElementById("title-input");
    if (!titleInput) return;

    const resize = () => {
      titleInput.style.height = "auto";
      titleInput.style.height = titleInput.scrollHeight + "px";
    };

    resize();
    titleInput.addEventListener("input", resize);
    titleInput.addEventListener("keydown", e => {
      if (e.key === "Enter") e.preventDefault();
    });
  }

  // ===== 15. 어드민 진입 가드 (admin.js의 isAdminMode / openAdminPopup 사용) =====
  function guardAddForm() {
    if (!window.isAdminMode()) {
      window.openAdminPopup();
      return;
    }
    showAddForm();
  }

  function guardKnowledgePage() {
    if (document.body.dataset.category === "KNOWLEDGE" && !window.isAdminMode()) {
      location.href = "index.html";
      return true;
    }
    return false;
  }

  // ===== 16. 부트스트랩 =====
  function bindGlobalEvents() {
    document.getElementById("image-input")
      ?.addEventListener("change", handleImageInputChange);

    document.getElementById("cover-input")
      ?.addEventListener("change", handleCoverInputChange);

    document.querySelectorAll('.add-form textarea').forEach(ta => {
      ta.addEventListener('input', () => autoResizeTextarea(ta));
    });

    document.querySelectorAll('.meta-grid input').forEach(input => {
      resizeMetaInput(input);
      input.addEventListener('input', () => resizeMetaInput(input));
    });

    document.addEventListener("click", handleImageBoxClick);
    document.addEventListener("click", handleFootnoteClick);
    document.addEventListener("click", handleColorDropdownOutsideClick);
    document.addEventListener("mousedown", handleImageResizeStart);
  }

  async function bootstrap() {
    // KNOWLEDGE 페이지는 어드민이 아니면 즉시 리다이렉트
    if (guardKnowledgePage()) return;

    const pageType = document.body.dataset.page;
    if (pageType === 'post') {
      await renderPost();
    } else if (document.body.dataset.category) {
      await renderList();

      const editId = new URLSearchParams(window.location.search).get('edit');
      if (editId) await loadEditPost(editId);
    }

    bindGlobalEvents();
    setupAutoResizeTitle();
  }

  document.addEventListener('DOMContentLoaded', bootstrap);

  // ===== 17. 인라인 onclick 노출 =====
  Object.assign(window, {
    // 검색 / 폼
    handleSearch,
    guardAddForm,
    showAddForm,
    hideAddForm,
    selectCoverImage,
    handleSubmit,

    // 상세
    editPost,
    deletePost,

    // 에디터 툴바
    formatText,
    setTextColor,
    setHighlight,
    removeHighlight,
    toggleColorDropdown,
    pickTextColor,
    pickHighlight,

    // 이미지 / 각주
    insertImage,
    insertImageNextToSelected,
    insertFootnote,
  });
})();