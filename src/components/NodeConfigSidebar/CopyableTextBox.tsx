import React, { useEffect, useRef, useState } from 'react';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';

type CopyableTextBoxProps = {
  value: string;
  label?: string;
  cssClass?: string;
  readonly?: boolean
  announceMs?: number;
};

export const CopyableTextBox: React.FC<CopyableTextBoxProps> = ({
  value,
  label = 'Webhook URL',
  cssClass = 'config-input',
  readonly = false,
}) => {
  const textBoxRef = useRef<any>(null); 
  const iconRef = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);

  // Add suffix icon only after the EJ2 TextBox is created.
  const onCreated = () => {
    const textBoxInstance = textBoxRef.current;
    if (textBoxInstance && typeof textBoxInstance.addIcon === 'function') {
      // Append a clickable copy icon inside the input wrapper
      textBoxInstance.addIcon('append', 'copyable-textbox e-icons e-copy');

      // Grab the icon node that was appended
      const wrapper: HTMLElement | null = textBoxInstance.element?.parentElement ?? null;
      iconRef.current =
        wrapper?.querySelector('.copyable-textbox.e-icons.e-copy') ?? null;

      // Wire up click/keyboard handlers
      if (iconRef.current) {
        const handleCopy = async () => {
          try {
            // Prefer Clipboard API
            await navigator.clipboard.writeText(value);
            onCopySuccess();
          } catch {
            // Fallback for older/HTTP contexts
            console.error("Copy Failed.")
          }
        };

        iconRef.current.addEventListener('click', handleCopy);
        iconRef.current.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCopy();
          }
        });
      }
    }
  };

  // Called after a successful copy, switches the icon to a tick and shows a message
  const onCopySuccess = () => {
    setCopied(true);
    const icon = iconRef.current;

    if (icon) {
      icon.classList.remove('e-copy');
      icon.classList.add('e-check');
    }

    // Reset icon and message after a delay (e.g., 2 seconds)
    setTimeout(() => {
      setCopied(false);
      if (icon) {
        icon.classList.remove('e-check');
        icon.classList.add('e-copy');
      }
    }, 2000);
  };


  return (
    <div className="config-section">
      <label className="config-label">{label}</label>
      <TextBoxComponent
        ref={textBoxRef}
        value={value}
        readOnly={readonly}
        cssClass={cssClass}
        created={onCreated}
      />
      {/* Success helper text */}
      {copied && (
        <div className='textbox-info'>
          Webhook URL copied successfully.
        </div>
      )}
    </div>
  );
};
