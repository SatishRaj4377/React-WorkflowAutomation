import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import {
  renderGoogleSignInButton, initGoogle,
  getConnectedGoogleEmail, ensureGmailToken, disconnectGoogle
} from '../../services/GoogleClientService';
import { showErrorToast, showSuccessToast } from '../Toast';
import { useEffect, useRef, useState } from 'react';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';

type Props = {
  clientId: string;
  onConnected?: (email: string) => void;
};

const GoogleAuthPanel: React.FC<Props> = ({ clientId, onConnected }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [connected, setConnected] = useState<string | null>(getConnectedGoogleEmail());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await initGoogle({ clientId });
        setReady(true);
        if (hostRef.current) {
          await renderGoogleSignInButton(hostRef.current, { theme: 'filled_blue', size: 'large', type: 'standard' }, async (email) => {
            if (!mounted) return;
            setConnected(email || null);
            onConnected?.(email || '');
            showSuccessToast('Google Connected', email || 'Connected');
          });
        }
      } catch (e: any) {
        showErrorToast('Google Init Failed', e?.message ?? String(e));
      }
    })();
    return () => { mounted = false; };
  }, [clientId, onConnected]);

  const handleChangeAccount = async () => {
    try {
      await disconnectGoogle();           // revoke + clear cache
      setConnected(null);
      // Re-render button so the user can pick another account
      if (hostRef.current && ready) {
        hostRef.current.innerHTML = '';
        await renderGoogleSignInButton(hostRef.current, { theme: 'filled_blue', size: 'large', type: 'standard' }, (email) => {
          setConnected(email || null);
          onConnected?.(email || '');
        });
      }
    } catch (e: any) {
      showErrorToast('Change Account Failed', e?.message ?? String(e));
    }
  };

  return (
    <div className="config-tab-content">
      <div className="config-section"><div ref={hostRef} /></div>

      {connected && (
        <div className="config-section">
          <label className="config-label">Connected Account</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <TextBoxComponent value={connected} readOnly/>
            <span>
            <ButtonComponent cssClass="e-flat" onClick={handleChangeAccount}>Change account</ButtonComponent>
            <ButtonComponent cssClass="e-flat" onClick={async () => { await handleChangeAccount(); }}>
              Disconnect
            </ButtonComponent>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleAuthPanel;