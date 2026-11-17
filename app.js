/*
  DATAEXCHANGE FRONTEND
  Sua API ASP.NET Core can cung cap cac endpoint trong README.md.
  Sua API_BASE theo dia chi Backend cua ban.
*/
const API_BASE = "https://editions-trainers-medium-fruits.trycloudflare.com"; // TODO: thay bang URL REST API cua ban

const els = {
  authView: document.getElementById("authView"),
  dashboardView: document.getElementById("dashboardView"),
  loginForm: document.getElementById("loginForm"),
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  loginMessage: document.getElementById("loginMessage"),
  connectionText: document.getElementById("connectionText"),
  avatarButton: document.getElementById("avatarButton"),
  logoutButton: document.getElementById("logoutButton"),
  dataForm: document.getElementById("dataForm"),
  recordId: document.getElementById("recordId"),
  dataTitle: document.getElementById("dataTitle"),
  dataContent: document.getElementById("dataContent"),
  charCount: document.getElementById("charCount"),
  editorHeading: document.getElementById("editorHeading"),
  saveButton: document.getElementById("saveButton"),
  cancelEditButton: document.getElementById("cancelEditButton"),
  dataMessage: document.getElementById("dataMessage"),
  recordsList: document.getElementById("recordsList"),
  totalCount: document.getElementById("totalCount"),
  listCount: document.getElementById("listCount"),
  listFooterText: document.getElementById("listFooterText"),
  searchInput: document.getElementById("searchInput"),
  refreshButton: document.getElementById("refreshButton"),
  toast: document.getElementById("toast")
};

let accessToken = sessionStorage.getItem("accessToken");
let records = [];
let toastTimer;

function setConnection(connected) {
  els.connectionText.textContent = connected ? "Đã kết nối" : "Chưa kết nối";
  els.connectionText.previousElementSibling.style.background = connected ? "#58d6a6" : "#f4b85e";
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

function showDashboard() {
  els.authView.classList.add("hidden");
  els.dashboardView.classList.remove("hidden");
  els.avatarButton.textContent = (els.username.value.trim()[0] || "U").toUpperCase();
}

function showLogin() {
  els.dashboardView.classList.add("hidden");
  els.authView.classList.remove("hidden");
  setConnection(false);
}

function authHeaders() {
  return accessToken ? { "Authorization": `Bearer ${accessToken}` } : {};
}

async function apiRequest(path, options = {}) {
  const headers = {
    ...authHeaders(),
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error("Không thể kết nối Backend. Hãy kiểm tra API_BASE, server và CORS.");
  }

  if (response.status === 401) {
    logout(false);
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  if (!response.ok) {
    let detail = `Yêu cầu thất bại (${response.status}).`;
    try {
      const body = await response.json();
      detail = body.message || body.title || body.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : null;
}

// POST /api/auth/login
els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(els.loginMessage, "Đang đăng nhập...");
  const button = els.loginForm.querySelector("button[type=submit]");
  button.disabled = true;

  try {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: els.username.value.trim(),
        password: els.password.value
      })
    });

    // Backend can tra ve { "token": "..." }
    if (!result || !result.token) {
      throw new Error('API đăng nhập cần trả JSON có thuộc tính "token".');
    }

    accessToken = result.token;
    sessionStorage.setItem("accessToken", accessToken);
    showDashboard();
    setConnection(true);
    await loadRecords();
  } catch (error) {
    setMessage(els.loginMessage, error.message);
    setConnection(false);
  } finally {
    button.disabled = false;
  }
});

// GET /api/data
async function loadRecords() {
  try {
    const result = await apiRequest("/api/data", { method: "GET" });
    // API có thể trả trực tiếp một mảng hoặc { data: [...] }
    records = Array.isArray(result) ? result : (result?.data || []);
    setConnection(true);
    renderRecords();
  } catch (error) {
    setConnection(false);
    showToast(error.message);
    if (error.message.includes("đăng nhập lại")) showLogin();
  }
}

// POST /api/data hoặc PUT /api/data/{id}
els.dataForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = els.recordId.value;
  const payload = {
    title: els.dataTitle.value.trim(),
    content: els.dataContent.value
  };

  if (!payload.title || !payload.content.trim()) {
    setMessage(els.dataMessage, "Vui lòng nhập tiêu đề và nội dung.");
    return;
  }

  els.saveButton.disabled = true;
  setMessage(els.dataMessage, "Đang gửi dữ liệu lên máy chủ...");

  try {
    const path = id ? `/api/data/${encodeURIComponent(id)}` : "/api/data";
    await apiRequest(path, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    resetEditor();
    setMessage(els.dataMessage, "Dữ liệu đã được lưu.", true);
    showToast(id ? "Đã cập nhật dữ liệu" : "Đã thêm dữ liệu mới");
    await loadRecords();
  } catch (error) {
    setMessage(els.dataMessage, error.message);
  } finally {
    els.saveButton.disabled = false;
  }
});

function resetEditor() {
  els.dataForm.reset();
  els.recordId.value = "";
  els.editorHeading.textContent = "Thêm dữ liệu mới";
  els.saveButton.innerHTML = 'Lưu dữ liệu <span>↑</span>';
  els.cancelEditButton.classList.add("hidden");
  els.charCount.textContent = "0 ký tự";
}

els.cancelEditButton.addEventListener("click", resetEditor);
els.dataContent.addEventListener("input", () => {
  els.charCount.textContent = `${els.dataContent.value.length.toLocaleString("vi-VN")} ký tự`;
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "Vừa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Vừa cập nhật" :
    date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

function renderRecords() {
  const keyword = els.searchInput.value.trim().toLocaleLowerCase("vi");
  const filtered = records.filter(item =>
    String(item.title || "").toLocaleLowerCase("vi").includes(keyword) ||
    String(item.content || "").toLocaleLowerCase("vi").includes(keyword)
  );

  els.totalCount.textContent = records.length;
  els.listCount.textContent = records.length;
  els.listFooterText.textContent = `Đang hiển thị ${filtered.length} / ${records.length} mục`;

  if (!filtered.length) {
    els.recordsList.innerHTML = `<div class="empty-state"><div class="empty-icon">⌕</div><b>${records.length ? "Không tìm thấy dữ liệu" : "Chưa có dữ liệu"}</b><p>${records.length ? "Thử từ khóa khác." : "Thêm nội dung đầu tiên ở khung bên trái."}</p></div>`;
    return;
  }

  els.recordsList.innerHTML = filtered.map(item => {
    const id = escapeHtml(item.id);
    const title = escapeHtml(item.title || "Không có tiêu đề");
    const content = escapeHtml(item.content || "");
    const date = escapeHtml(formatDate(item.updatedAt || item.createdAt));
    return `
      <article class="record-card" data-id="${id}">
        <div class="record-top"><div><div class="record-title">${title}</div><div class="record-date">${date}</div></div></div>
        <div class="record-preview">${content}</div>
        <div class="record-actions">
          <button class="small-action edit-action" type="button" data-action="edit">Chỉnh sửa</button>
          <button class="small-action delete delete-action" type="button" data-action="delete">Xóa</button>
          <button class="small-action copy-action" type="button" data-action="copy">Sao chép nội dung&nbsp; ⧉</button>
        </div>
      </article>`;
  }).join("");
}

// Delegated click handlers for record cards
els.recordsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".record-card");
  const id = card?.dataset.id;
  const item = records.find(record => String(record.id) === String(id));
  if (!item) return;

  if (button.dataset.action === "copy") {
    try {
      await navigator.clipboard.writeText(item.content || "");
      showToast("Đã sao chép nội dung");
    } catch {
      showToast("Không thể sao chép. Hãy kiểm tra quyền Clipboard của trình duyệt.");
    }
  }

  if (button.dataset.action === "edit") {
    els.recordId.value = item.id;
    els.dataTitle.value = item.title || "";
    els.dataContent.value = item.content || "";
    els.charCount.textContent = `${els.dataContent.value.length.toLocaleString("vi-VN")} ký tự`;
    els.editorHeading.textContent = "Chỉnh sửa dữ liệu";
    els.saveButton.innerHTML = 'Cập nhật dữ liệu <span>↑</span>';
    els.cancelEditButton.classList.remove("hidden");
    els.dataTitle.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Bạn có chắc muốn xóa "${item.title}"?`)) return;
    try {
      await apiRequest(`/api/data/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      showToast("Đã xóa dữ liệu");
      await loadRecords();
    } catch (error) {
      showToast(error.message);
    }
  }
});

els.searchInput.addEventListener("input", renderRecords);
els.refreshButton.addEventListener("click", loadRecords);

function logout(showMessage = true) {
  accessToken = null;
  records = [];
  sessionStorage.removeItem("accessToken");
  resetEditor();
  renderRecords();
  showLogin();
  if (showMessage) showToast("Bạn đã đăng xuất");
}

els.logoutButton.addEventListener("click", () => logout(true));

// Khoi phuc phien trong tab hien tai neu token van con hieu luc
async function initialize() {
  if (!accessToken) return;
  showDashboard();
  setConnection(true);
  await loadRecords();
}
initialize();
