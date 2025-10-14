import React, { useEffect, useState } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

// Auth core: init + token popup + cache
import { GoogleAuth, PopupGuardOptions } from '../../helper/googleAuthClient';

// Your single source of scopes + node mappings
import { getScopesForNode } from '../../helper/googleScopes';

// Optional toast helpers (keep or replace with your own)
import { showErrorToast, showSuccessToast } from '../Toast';

type Props = {
  clientId: string;                          // Google Web OAuth Client ID
  nodeType: string;                          // e.g. 'Gmail' | 'Google Sheets' | 'Google Docs' | 'Google Calendar'
  onConnected?: (email: string) => void;     // store to node.settings.authentication if you wish
};

const GoogleAuthPanel: React.FC<Props> = ({ clientId, nodeType, onConnected }) => {
  const [loading, setLoading] = useState(false);                    // simple busy flag
  const [email, setEmail] = useState<string | null>(GoogleAuth.getConnectedEmail()); // Gmail email if available

  // Initialize Google Identity Services with your client ID (no popup)
  useEffect(() => {
    (async () => {
      try {
        await GoogleAuth.init(clientId);                            // load GIS script & store client id
      } catch (e: any) {
        showErrorToast?.('Google Init Failed', e?.message ?? String(e));
      }
    })();
  }, [clientId]);

  // Handles "Connect to Google" / "Re-connect Google" click
  const handleConnect = async (force = false) => {
    if (loading) return;
    setLoading(true);

    try {
      // Read the union of scopes required for this node
      const scopes = getScopesForNode(nodeType);

      // Setup lightweight guards for popup lifecycle
      const guard: PopupGuardOptions = {
        onPopupOpen: () => setLoading(true),
        onPopupClosed: () => setLoading(false),
        timeoutMs: 25000,
      };

      // Only Gmail wants profile email (because it requests gmail.metadata)
      const shouldFetchGmailEmail = nodeType === 'Gmail';

      // One popup for this union of scopes; token cached by canonical scope key
      const { email: mail } = await GoogleAuth.getTokenInteractive(
        scopes,
        force,
        guard,
        { shouldFetchGmailEmail }
      );

      // Store/display email for Gmail; for other nodes mail will be null
      setEmail(mail ?? null);

      // Report back to Sidebar (keep contract: empty string allowed)
      onConnected?.(mail ?? '');

      // Tiny UX note
      showSuccessToast?.('Google Connected', mail ?? `Connected for ${nodeType}`);
    } catch (e: any) {
      const msg = (e?.message ?? '').toString();
      if (['popup_closed', 'popup_timeout', 'popup_abandoned'].includes(msg)) {
        showErrorToast?.('Google Sign-in Cancelled', 'You can try connecting again.');
      } else {
        showErrorToast?.('Google Auth Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handles "Change account": revoke + re‑prompt chooser/consent
  const handleChangeAccount = async () => {
    try {
      await GoogleAuth.disconnect();                                  // revoke grant + clear cache
      setEmail(null);
      await handleConnect(true);                                      // force chooser/consent
    } catch (e: any) {
      showErrorToast?.('Change Account Failed', e?.message ?? String(e));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Connect / Re-connect */}
      <ButtonComponent
        onClick={() => handleConnect(!email)}                         // if email exists (Gmail), treat click as re-connect
        disabled={loading}
        cssClass="e-primary"
      >
        {loading
          ? 'Connecting…'
          : email
            ? 'Re-connect Google'
            : 'Connect to Google'}
      </ButtonComponent>

      {/* Change account (only when connected w/ an email i.e. Gmail) */}
      {email && (
        <ButtonComponent
          onClick={handleChangeAccount}
          cssClass="flat-btn e-flat"
          disabled={loading}
        >
          Change account
        </ButtonComponent>
      )}

      {/* Gmail shows the email; other nodes show a small informational hint */}
      {nodeType === 'Gmail' ? (
        email && (
          <div className="textbox-info" style={{ marginTop: 4 }}>
            Connected Account: <b>{email}</b>
          </div>
        )
      ) : (
        <div className="textbox-info" style={{ marginTop: 4 }}>
          This connection requests only the scopes required for <b>{nodeType}</b>.
        </div>
      )}
    </div>
  );
};

export default GoogleAuthPanel;