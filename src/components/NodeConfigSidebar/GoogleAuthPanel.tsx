// components/GoogleAuthPanel.tsx
import React, { useEffect, useState } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import {
  initGoogleAuth, getTokenInteractive, disconnectGoogle, getConnectedGoogleEmail
} from '../../helper/googleClientUtils';
import { showErrorToast, showSuccessToast } from '../Toast';

type Props = {
  clientId: string;                              // REACT_APP_GOOGLE_CLIENT_ID
  onConnected?: (email: string) => void;         // store email in node.settings.authentication
};

const GoogleAuthPanel: React.FC<Props> = ({ clientId, onConnected }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(getConnectedGoogleEmail());

  useEffect(() => {
    (async () => {
      try {
        await initGoogleAuth({ clientId });
      } catch (e: any) {
        showErrorToast('Google Init Failed', e?.message ?? String(e));
      }
    })();
  }, [clientId]);

  const handleConnect = async (force = false) => {
    if (loading) return;
    setLoading(true);
    try {
        const { email: mail } = await getTokenInteractive(force, {
        onPopupOpen: () => setLoading(true),
        onPopupClosed: (_reason) => {
            // Popup was closed / failed / timed out / abandoned -> re-enable button
            setLoading(false);
        },
        timeoutMs: 25000,
        });
        setEmail(mail);
        onConnected?.(mail);
        showSuccessToast('Google Connected', mail);
    } catch (e: any) {
        // Re-enable in error path as well
        setLoading(false);
        const msg = (e?.message ?? '').toString();
        if (msg === 'popup_closed' || msg === 'popup_timeout' || msg === 'popup_abandoned') {
        showErrorToast('Google Sign-in Cancelled', 'You can try connecting again.');
        } else {
        showErrorToast('Google Auth Error', msg);
        }
    }
  };

  const handleChangeAccount = async () => {
    try {
      await disconnectGoogle(); // revoke + clear cache
      setEmail(null);
      await handleConnect(true); // force chooser/consent
    } catch (e: any) {
      showErrorToast('Change Account Failed', e?.message ?? String(e));
    }
  };

  return (
    <div className="config-tab-content">
      <div className="config-section">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ButtonComponent isPrimary disabled={loading} onClick={() => handleConnect(!email)}>
            {email ? 'Re-connect Google' : 'Connect Google'}
          </ButtonComponent>
          {email && (
            <ButtonComponent cssClass="e-flat" disabled={loading} onClick={handleChangeAccount}>
              Change account
            </ButtonComponent>
          )}
        </div>
      </div>

      {email && (
        <div className="config-section">
          <label className="config-label">Connected Account</label>
          <TextBoxComponent value={email} readonly cssClass="config-input" />
        </div>
      )}
    </div>
  );
};

export default GoogleAuthPanel;