import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import {
  getPwaInstallState,
  promptPwaInstall,
  subscribeToPwaInstallState,
} from '@/lib/pwa-install';

function isAppleMobileDevice(): boolean {
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function PwaInstallCard() {
  const [installState, setInstallState] = useState(getPwaInstallState);
  const [appleMobile, setAppleMobile] = useState(false);
  const [installMessage, setInstallMessage] = useState('');

  useEffect(() => {
    setAppleMobile(isAppleMobileDevice());
    return subscribeToPwaInstallState(setInstallState);
  }, []);

  const install = async () => {
    try {
      const outcome = await promptPwaInstall();
      if (outcome === 'accepted') {
        setInstallMessage('Solo Studio is installed on this device.');
      } else if (outcome === 'dismissed') {
        setInstallMessage('You can install Solo Studio later from your browser menu.');
      }
    } catch {
      setInstallMessage('Installation could not start. Open your browser menu to install Solo Studio.');
    }
  };

  return (
    <section className="card section pwa-install-card" data-testid="section-install-app">
      <div className="pwa-install-heading">
        <span className="pwa-install-icon" aria-hidden="true">
          <Smartphone size={21} />
        </span>
        <div>
          <div className="eyebrow">Take it with you</div>
          <h2 className="card-title">Install Solo Studio</h2>
        </div>
      </div>
      <p className="small-muted">
        Add a private, full-screen Solo Studio shortcut to your phone. Your CRM records stay in your account and are not stored for offline access.
      </p>
      {installState.installed ? (
        <p className="pwa-install-status" role="status" data-testid="status-app-installed">
          {installMessage || 'Solo Studio is installed on this device.'}
        </p>
      ) : installState.promptAvailable ? (
        <button
          className="button primary pwa-install-button"
          type="button"
          onClick={install}
          data-testid="button-install-app"
        >
          <Download size={16} />
          Install Solo Studio
        </button>
      ) : appleMobile ? (
        <p className="pwa-install-instructions" data-testid="text-ios-install-instructions">
          On iPhone or iPad, tap Share in Safari, then choose Add to Home Screen.
        </p>
      ) : (
        <p className="pwa-install-instructions" data-testid="text-browser-install-instructions">
          Open your browser menu and choose Install app or Add to Home screen.
        </p>
      )}
    </section>
  );
}
