export type PwaInstallChoice = 'accepted' | 'dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: PwaInstallChoice }>;
};

export type PwaInstallState = {
  installed: boolean;
  promptAvailable: boolean;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
let state: PwaInstallState = { installed: false, promptAvailable: false };
const listeners = new Set<(nextState: PwaInstallState) => void>();

function isStandalone(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function publishState() {
  state = { installed: isStandalone() || state.installed, promptAvailable: Boolean(deferredPrompt) };
  listeners.forEach((listener) => listener(state));
}

export function initializePwaInstall() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  state = { ...state, installed: isStandalone() };

  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    publishState();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    state = { installed: true, promptAvailable: false };
    listeners.forEach((listener) => listener(state));
  });
}

export function getPwaInstallState(): PwaInstallState {
  return state;
}

export function subscribeToPwaInstallState(listener: (nextState: PwaInstallState) => void) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export async function promptPwaInstall(): Promise<PwaInstallChoice | null> {
  const promptEvent = deferredPrompt;
  if (!promptEvent) return null;

  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (deferredPrompt === promptEvent) {
      deferredPrompt = null;
      state = { installed: outcome === 'accepted' || isStandalone(), promptAvailable: false };
      listeners.forEach((listener) => listener(state));
    }
    return outcome;
  } catch (error) {
    if (deferredPrompt === promptEvent) {
      deferredPrompt = null;
      publishState();
    }
    throw error;
  }
}
