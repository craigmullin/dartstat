import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { auth } from "./firebase";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export function isLocalDevelopmentHost(hostname = window.location.hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function prefersRedirect(
  viewportIsNarrow = window.matchMedia("(max-width: 760px)").matches,
  userAgent = navigator.userAgent,
  hostname = window.location.hostname,
) {
  if (isLocalDevelopmentHost(hostname)) return false;
  return viewportIsNarrow || /Android|iPhone|iPad|iPod/i.test(userAgent);
}

export async function signInWithGoogle() {
  if (prefersRedirect()) {
    await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
    return;
  }
  await signInWithPopup(auth, provider, browserPopupRedirectResolver);
}

export function finishGoogleRedirect() {
  return getRedirectResult(auth, browserPopupRedirectResolver);
}
