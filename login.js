"use strict";

// Только локальная заглушка: настоящую авторизацию выполняет сервер.
const LOGIN_USERNAME = "teacher";
const LOGIN_PASSWORD = "1234";
const SESSION_KEY = "omni_teacher_session";

const loginForm = document.querySelector("#login-form");
const usernameField = document.querySelector("#login-username");
const passwordField = document.querySelector("#login-password");
const loginError = document.querySelector("#login-error");
const togglePasswordButton = document.querySelector("#toggle-password");

if (sessionStorage.getItem(SESSION_KEY) === "1") {
  window.location.replace("main.html");
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = usernameField.value.trim();
  const password = passwordField.value;

  if (username !== LOGIN_USERNAME || password !== LOGIN_PASSWORD) {
    loginError.hidden = false;
    return;
  }

  sessionStorage.setItem(SESSION_KEY, "1");
  window.location.replace("main.html");
});

usernameField.addEventListener("input", () => {
  loginError.hidden = true;
});

passwordField.addEventListener("input", () => {
  loginError.hidden = true;
});

togglePasswordButton.addEventListener("click", () => {
  const isVisible = passwordField.type === "text";
  passwordField.type = isVisible ? "password" : "text";
  togglePasswordButton.textContent = isVisible ? "Показать" : "Скрыть";
  togglePasswordButton.setAttribute(
    "aria-label",
    isVisible ? "Показать пароль" : "Скрыть пароль"
  );
});
