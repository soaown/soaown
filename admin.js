/**
 * 어드민 모드 + 비밀번호 팝업
 * - DB 의존성 없음. 모든 페이지에서 공유.
 * - script.js 보다 먼저 로드되어야 함 (script.js에서 guardAddForm → openAdminPopup 사용).
 */
(() => {
    'use strict';

    const ADMIN_PASSWORD = "0310";
    const STORAGE_KEY = "adminMode";

    function isAdminMode() {
        return localStorage.getItem(STORAGE_KEY) === "true";
    }

    function applyAdminMode() {
        document.body.classList.toggle("admin-mode", isAdminMode());
    }

    function openAdminPopup() {
        const popup = document.getElementById("admin-popup")
            || document.getElementById("password-popup");

        if (!popup) {
            alert("ADMIN");
            return;
        }

        popup.style.display = "flex";

        const input = document.getElementById("admin-password-input");
        if (input) input.focus();
    }

    function closeAdminPopup() {
        const popup = document.getElementById("admin-popup")
            || document.getElementById("password-popup");

        if (popup) popup.style.display = "none";
    }

    function openErrorPopup() {
        const popup = document.getElementById("error-popup");
        if (popup) popup.style.display = "flex";
    }

    function closeErrorPopup() {
        const popup = document.getElementById("error-popup");
        if (popup) popup.style.display = "none";
    }

    function submitAdminPassword() {
        const input = document.getElementById("admin-password-input");
        const password = input ? input.value : "";

        if (password === ADMIN_PASSWORD) {
            localStorage.setItem(STORAGE_KEY, "true");
            applyAdminMode();
            closeAdminPopup();
        } else {
            openErrorPopup();
        }
    }

    function guardKnowledge(event) {
        if (!isAdminMode()) {
            event.preventDefault();
            openAdminPopup();
        }
    }

    document.addEventListener("DOMContentLoaded", applyAdminMode);

    // 인라인 onclick 핸들러에서 호출되는 함수 노출
    Object.assign(window, {
        isAdminMode,
        applyAdminMode,
        openAdminPopup,
        closeAdminPopup,
        openErrorPopup,
        closeErrorPopup,
        submitAdminPassword,
        guardKnowledge,
    });
})();
