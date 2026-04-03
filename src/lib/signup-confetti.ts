const SIGNUP_CONFETTI_KEY = "playSignupConfetti";

export function triggerSignupConfetti() {
  sessionStorage.setItem(SIGNUP_CONFETTI_KEY, "true");
}

export function shouldPlaySignupConfetti(): boolean {
  return sessionStorage.getItem(SIGNUP_CONFETTI_KEY) === "true";
}

export function clearSignupConfettiFlag() {
  sessionStorage.removeItem(SIGNUP_CONFETTI_KEY);
}
