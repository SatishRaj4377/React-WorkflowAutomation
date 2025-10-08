import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Draggable } from '@syncfusion/ej2-base';
import { AIAssistViewComponent  } from '@syncfusion/ej2-react-interactive-chat';
import { ensurePortalRoot } from '../../helper/variablePickerUtils';
import './ChatPopup.css';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

type ChatPopupProps = {
  open: boolean;
  onClose: () => void;
};

export const ChatPopup: React.FC<ChatPopupProps> = ({
  open,
  onClose,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Draggable | null>(null);
  const aiViewRef = useRef<any>(null);

  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = () => {
    if (!popupRef.current) return;
    if (popupRef.current.style.height === '0px'){
      popupRef.current.style.height = '400px'; // Restore height
      setIsMinimized(false);
    } else {
      popupRef.current.style.height = '0px'; // Minimize
      setIsMinimized(true);
    }
  };

  const handleUserInput = (args: any) => {
    const text = (args?.prompt || '').trim();
    if (text.length > 0 && typeof window !== 'undefined') {
      // Let the Editor decide whether to auto-start the workflow.
      window.dispatchEvent(new CustomEvent('wf:chat:prompt', {
        detail: { text, at: new Date().toISOString() }
      }));
    }
  }

  // Make the chat popup draggable by header
  useEffect(() => {
    if (!open || !popupRef.current) return;
    const el = popupRef.current;
    dragRef.current = new Draggable(el, {
      clone: false,
      handle: '.chat-popup-header', // drag only from header
      dragArea: '.editor-container'
    });
    return () => {
      (dragRef.current as any)?.destroy?.();
      dragRef.current = null;
    };
  }, [open]);

  // Update the response in the chat received from AI
  useEffect(() => {
    const onAssistantReply = (e: Event) => {
      const ce = e as CustomEvent<{ text?: string }>;
      const reply = (ce.detail?.text || '').trim();
      if (!reply) return;
      aiViewRef.current?.addPromptResponse?.(reply);
    };
    window.addEventListener('wf:chat:assistant-response', onAssistantReply as EventListener);
    return () => window.removeEventListener('wf:chat:assistant-response', onAssistantReply as EventListener);
  }, []);
  
  if (!open) return null;

  return createPortal(
    <div
      ref={popupRef}
      className="chat-popup"
    >
      {/* Header */}
      <div className="chat-popup-header" >
        <div className="chat-popup-title">Chat</div>
        <div className='chat-popup-btn-group'>
          <ButtonComponent
            className="chat-popup-btn"
            title='Refresh'
            iconCss='e-icons e-refresh'
            />
          <ButtonComponent
            className="chat-popup-btn"
            title={isMinimized ? 'Maximize' : 'Minimize'}
            iconCss={isMinimized ? 'e-icons e-expand' : 'e-icons e-collapse-2'}
            onClick={toggleMinimize}
          />
          <ButtonComponent
            className="chat-popup-btn"
            title='Close'
            iconCss='e-icons e-close'
            onClick={onClose}
          />
        </div>
      </div>

      {/* Body */}
      <div className="chat-popup-body">
        <AIAssistViewComponent
          id="workflow-chat"
          ref={aiViewRef}
          promptPlaceholder='Type a message...'
          promptRequest={handleUserInput}
        />
      </div>
    </div>,
    ensurePortalRoot()
  );
};
