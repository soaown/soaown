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
  document.getElementById('add-form').style.display = 'flex';
  document.getElementById('add-btn').style.display = 'none';

  // 글쓰기 화면일 때는 다른 요소들 숨김
  const pageTitle = document.querySelector('.page-title');
  const searchSection = document.querySelector('.search-section');
  const itemList = document.querySelector('.item-list');
  if (pageTitle) pageTitle.style.display = 'none';
  if (searchSection) searchSection.style.display = 'none';
  if (itemList) itemList.style.display = 'none';

  document.getElementById('title-input').focus();
  window.scrollTo(0, 0);
}

function hideAddForm() {
  document.getElementById('add-form').style.display = 'none';
  document.getElementById('add-btn').style.display = 'inline-block';
  document.getElementById('add-form').reset();

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
  const content = document.getElementById('content-input').value.trim();
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
        content
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
      content
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

  // 본문 - 줄바꿈을 문단으로 변환
  contentEl.innerHTML = '';
  post.content.split(/\n\n+/).forEach(paragraph => {
    if (paragraph.trim()) {
      const p = document.createElement('p');
      paragraph.split('\n').forEach((line, i) => {
        if (i > 0) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(line));
      });
      contentEl.appendChild(p);
    }
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

  showAddForm();

  document.getElementById('title-input').value = post.title || '';
  document.getElementById('date-input').value = '';
  document.getElementById('category-input').value = post.subcategory || '';
  document.getElementById('link-input').value = post.link || '';
  document.getElementById('author-input').value = post.author || '';
  document.getElementById('publisher-input').value = post.publisher || '';
  document.getElementById('details-input').value = post.details || '';
  document.getElementById('content-input').value = post.content || '';
  document.querySelectorAll('.add-form textarea').forEach(autoResizeTextarea);

  window.currentEditingId = id;
}

// knowledge 페이지 잠금
function openPasswordPopup() {
  const popup = document.getElementById("password-popup");
  popup.style.display = "flex";
}
function closePasswordPopup() {
  const popup = document.getElementById("password-popup");
  popup.style.display = "none";
}
function openErrorPopup() {
  const popup = document.getElementById("error-popup");
  if (popup) popup.style.display = "flex";
}

function closeErrorPopup() {
  const popup = document.getElementById("error-popup");
  if (popup) popup.style.display = "none";
}
// 🔐 비밀번호 체크
function submitPassword() {
  const input = document.getElementById("password-input");
  const password = input ? input.value : '';

  if (password === "0310") {
    sessionStorage.setItem("knowledgeUnlocked", "true");
    closePasswordPopup();
    if (document.body.dataset.category == "KNOWLEDGE") {
      unlockPage();
    } else {
      showAddForm();
    }
  } else {
    openErrorPopup();
  }
}
// 🔒 KNOWLEDGE 잠금/해제
function lockPage() {
  const main = document.querySelector("main");
  if (main) main.style.display = "none";
}

function unlockPage() {
  const main = document.querySelector("main");
  if (main) main.style.display = "block";
}
// 🚀 페이지 로딩 시 실행
document.addEventListener("DOMContentLoaded", () => {

  const isKnowledge =
    document.body.dataset.category === "KNOWLEDGE";

  if (isKnowledge) {

    const unlocked =
      sessionStorage.getItem("knowledgeUnlocked");

    if (unlocked === "true") {

      unlockPage();

    } else {

      lockPage();

      setTimeout(() => {
        openPasswordPopup();
      }, 50);

    }
  }
});

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