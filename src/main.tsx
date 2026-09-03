import "core-js/stable";

function showStartupError() {
  const message = document.getElementById("startup-message");
  if (message) {
    message.textContent = "DartStat could not start on this device. Reload the page and try again.";
    message.setAttribute("data-state", "error");
  }
}

void import("./bootstrap").catch((error: unknown) => {
  console.error("DartStat startup failed", error);
  showStartupError();
});
