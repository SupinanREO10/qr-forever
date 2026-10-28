const config = window.QR_FOREVER_CONFIG || {};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
let pendingEmail = "", authMode = "register", logoImage = null;

function ensureQrLibrary() {
  if (window.QRCode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
    script.onload = () => window.QRCode ? resolve() : reject(new Error("โหลดระบบ QR ไม่สำเร็จ"));
    script.onerror = () => reject(new Error("โหลดระบบ QR ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต"));
    document.head.appendChild(script);
  });
}
const qrReady = ensureQrLibrary();

function makeQr(target, text, size = 260, dark = "#173d37", light = "#ffffff") {
  target.innerHTML = "";
  return new window.QRCode(target, { text: text || "https://example.com", width: size, height: size, colorDark: dark, colorLight: light, correctLevel: window.QRCode.CorrectLevel.H });
}
function api(action, data = {}) {
  if (config.DEMO_MODE || !config.API_URL) return demoApi(action, data);
  return fetch(config.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, ...data }) })
    .then((response) => response.json()).then((result) => { if (!result.ok) throw new Error(result.error || "เกิดข้อผิดพลาด"); return result; });
}
async function demoApi(action, data) {
  await new Promise((resolve) => setTimeout(resolve, 350));
  if (action === "requestOtp") return { ok: true, demoOtp: "123456" };
  if (action === "verifyOtp") {
    if (data.otp !== "123456") throw new Error("รหัสไม่ถูกต้อง (โหมดตัวอย่างใช้ 123456)");
    return { ok: true, token: "demo-token", email: data.email, fullName: "ผู้ใช้งานตัวอย่าง" };
  }
  if (action === "saveQr") return { ok: true, id: crypto.randomUUID() };
  return { ok: true };
}
function showStatus(element, message, isError = false) { element.textContent = message; element.style.color = isError ? "#b43c30" : "#42645d"; }
function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === "register";
  $("#registerTab").classList.toggle("active", registering); $("#loginTab").classList.toggle("active", !registering);
  $("#profileFields").hidden = !registering;
  ["#fullName", "#department", "#officeName"].forEach((selector) => { $(selector).required = registering; });
  $("#authTitle").textContent = registering ? "สมัครใช้งาน QR Forever" : "เข้าสู่ระบบ QR Forever";
  $("#authSubtitle").textContent = registering ? "สำหรับบุคลากรในสำนักงาน ยืนยันตัวตนด้วย OTP ทางอีเมล" : "กรอกอีเมลที่ลงทะเบียนไว้เพื่อรับรหัส OTP";
  $("#requestOtpButton").textContent = registering ? "สมัครและส่งรหัส OTP" : "ส่งรหัส OTP";
  $("#otpForm").hidden = true; $("#emailForm").hidden = false; showStatus($("#authStatus"), "");
}
function drawLogo() {
  const canvas = $("#qrOutput canvas"); if (!canvas || !logoImage) return;
  const ctx = canvas.getContext("2d"), ratio = Number($("#logoSize").value) / 100, width = canvas.width * ratio, x = (canvas.width - width) / 2, pad = width * .14;
  ctx.fillStyle = $("#lightColor").value; ctx.beginPath(); ctx.roundRect(x - pad, x - pad, width + pad * 2, width + pad * 2, pad * .7); ctx.fill(); ctx.drawImage(logoImage, x, x, width, width);
}
async function refreshQr() {
  try { await qrReady; makeQr($("#qrOutput"), $("#qrText").value, 260, $("#darkColor").value, $("#lightColor").value); setTimeout(drawLogo, 40); }
  catch (error) { $("#qrOutput").textContent = error.message; }
}
function openCreator() { $("#userEmail").textContent = localStorage.getItem("qrf_name") || localStorage.getItem("qrf_email") || pendingEmail; $("#creator").hidden = false; document.body.style.overflow = "hidden"; refreshQr(); }
async function saveQr() {
  const status = $("#saveStatus"); showStatus(status, "กำลังบันทึก…");
  try { await api("saveQr", { token: localStorage.getItem("qrf_token"), name: $("#qrName").value.trim() || "ไม่มีชื่อ", content: $("#qrText").value, darkColor: $("#darkColor").value, lightColor: $("#lightColor").value, hasLogo: Boolean(logoImage) }); showStatus(status, config.DEMO_MODE ? "บันทึกตัวอย่างแล้ว — ตั้งค่า Apps Script เพื่อบันทึกลง Drive" : "บันทึกลง Google Drive แล้ว"); }
  catch (error) { showStatus(status, error.message, true); }
}
document.addEventListener("DOMContentLoaded", () => {
  $$('[data-open-auth]').forEach((button) => button.onclick = () => { if (localStorage.getItem("qrf_token")) return openCreator(); setAuthMode("register"); $("#authDialog").showModal(); });
  $("[data-close]").onclick = () => $("#authDialog").close(); $("#registerTab").onclick = () => setAuthMode("register"); $("#loginTab").onclick = () => setAuthMode("login");
  $("#emailForm").onsubmit = async (event) => {
    event.preventDefault(); pendingEmail = $("#email").value.trim(); showStatus($("#authStatus"), "กำลังส่งรหัส…");
    try { const result = await api("requestOtp", { email: pendingEmail, mode: authMode, fullName: $("#fullName").value.trim(), department: $("#department").value.trim(), officeName: $("#officeName").value.trim() }); $("#emailForm").hidden = true; $("#otpForm").hidden = false; showStatus($("#authStatus"), result.demoOtp ? "โหมดตัวอย่าง: ใช้รหัส 123456" : "ส่งรหัสแล้ว กรุณาตรวจสอบอีเมล"); }
    catch (error) { showStatus($("#authStatus"), error.message, true); }
  };
  $("#otpForm").onsubmit = async (event) => {
    event.preventDefault();
    try { const result = await api("verifyOtp", { email: pendingEmail, otp: $("#otp").value }); localStorage.setItem("qrf_token", result.token); localStorage.setItem("qrf_email", result.email); localStorage.setItem("qrf_name", result.fullName || result.email); $("#authDialog").close(); openCreator(); }
    catch (error) { showStatus($("#authStatus"), error.message, true); }
  };
  $("#changeEmail").onclick = () => { $("#otpForm").hidden = true; $("#emailForm").hidden = false; };
  ["#qrText", "#darkColor", "#lightColor"].forEach((selector) => $(selector).addEventListener("input", refreshQr));
  $("#logoSize").oninput = (event) => { $("#logoSizeLabel").textContent = event.target.value + "%"; refreshQr(); };
  $("#logoInput").onchange = (event) => { const file = event.target.files[0]; if (!file) return; if (file.size > 2e6) return alert("ไฟล์ต้องไม่เกิน 2 MB"); const reader = new FileReader(); reader.onload = () => { logoImage = new Image(); logoImage.onload = refreshQr; logoImage.src = reader.result; }; reader.readAsDataURL(file); };
  $("#downloadPng").onclick = () => { drawLogo(); const anchor = document.createElement("a"); anchor.download = ($("#qrName").value.trim() || "qr-forever") + ".png"; anchor.href = $("#qrOutput canvas").toDataURL("image/png"); anchor.click(); };
  $("#saveQr").onclick = saveQr;
  $("#logout").onclick = () => { ["qrf_token", "qrf_email", "qrf_name"].forEach((key) => localStorage.removeItem(key)); $("#creator").hidden = true; document.body.style.overflow = ""; };
  qrReady.then(() => makeQr($("#heroQr"), location.origin, 210)).catch(() => { $("#heroQr").innerHTML = '<span class="qr-fallback">QR</span>'; });
});
