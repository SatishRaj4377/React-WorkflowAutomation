import React, { useRef, useEffect } from 'react';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { ToastMessage, ToastType } from '../../types';
import './Toast.css';

interface ToastProps {
  position?: { X: string; Y: string };
}

const Toast: React.FC<ToastProps> = ({
  position = { X: 'Right', Y: 'Bottom' }
}) => {
  const toastRef = useRef<ToastComponent>(null);

  useEffect(() => {
    // Expose the show method globally
    if (toastRef.current) {
      (window as any).showToast = (message: ToastMessage) => {
        showToastMessage(message);
      };
    }

    return () => {
      delete (window as any).showToast;
    };
  }, []);

  const showToastMessage = (message: ToastMessage) => {
    if (!toastRef.current) return;

    // Prepare toast configuration
    const toastConfig = {
      title: message.title,
      content: message.content,
      cssClass: `toast-${message.type}`,
      icon: getIconForType(message.type),
      timeOut: message.duration || getDefaultDuration(message.type),
    };

    // Show the toast
    toastRef.current.show(toastConfig);
  };

  const getIconForType = (type: ToastType): string => {
    switch (type) {
      case 'success': return 'e-success toast-icons';
      case 'error': return 'e-error toast-icons';
      case 'warning': return 'e-warning toast-icons';
      case 'info': return 'e-info toast-icons';
      default: return 'e-info toast-icons';
    }
  };

  const getDefaultDuration = (type: ToastType): number => {
    switch (type) {
      case 'success': return 3000;
      case 'error': return 5000;
      case 'warning': return 4000;
      case 'info': return 3000;
      default: return 3000;
    }
  };

  return (
    <ToastComponent
      ref={toastRef}
      id="workflow-toast"
      position={position}
      showCloseButton={true}
      animation={{
        show: { effect: 'SlideRightIn', duration: 400, easing: 'ease' },
        hide: { effect: 'SlideRightOut', duration: 300, easing: 'ease' }
      }}
      newestOnTop={true}
      showProgressBar={true}
      cssClass="workflow-toast-container"
    />
  );
};

// Utility functions for showing toasts from anywhere in the app
export const showToast = (message: ToastMessage) => {
  if ((window as any).showToast) {
    (window as any).showToast(message);
  } else {
    console.warn('Toast component not initialized');
  }
};

export const showSuccessToast = (title: string, content: string) => {
  showToast({
    id: `success-${Date.now()}`,
    title,
    content,
    type: 'success'
  });
};

export const showErrorToast = (title: string, content: string) => {
  showToast({
    id: `error-${Date.now()}`,
    title,
    content,
    type: 'error'
  });
};

export const showInfoToast = (title: string, content: string) => {
  showToast({
    id: `info-${Date.now()}`,
    title,
    content,
    type: 'info'
  });
};

export const showWarningToast = (title: string, content: string) => {
  showToast({
    id: `warning-${Date.now()}`,
    title,
    content,
    type: 'warning'
  });
};

export default Toast;