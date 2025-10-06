import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Draggable } from '@syncfusion/ej2-base';
import { AIAssistViewComponent  } from '@syncfusion/ej2-react-interactive-chat';
import { ensurePortalRoot } from '../../helper/variablePickerUtils';
import './ChatPopup.css';

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

  // Make the chat popup draggable by header
  useEffect(() => {
    if (!open || !popupRef.current) return;
    const el = popupRef.current;
    dragRef.current = new Draggable(el, {
      clone: false,
      handle: '.chat-popup-header', // drag only from header
    });
    return () => {
      (dragRef.current as any)?.destroy?.();
      dragRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={popupRef}
      className="chat-popup"
    >
      {/* Header */}
      <div
        className="chat-popup-header"
      >
        <div className="chat-popup-title">
          Chat
        </div>
        <button
          className="chat-popup-close"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="chat-popup-body">
        <AIAssistViewComponent promptPlaceholder='Type a message...'/>

      </div>
    </div>,
    ensurePortalRoot()
  );
};
