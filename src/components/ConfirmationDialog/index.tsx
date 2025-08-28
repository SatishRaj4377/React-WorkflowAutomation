import React from 'react';
import { DialogComponent, ButtonPropsModel } from '@syncfusion/ej2-react-popups';
import './ConfirmationDialog.css';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  content: string;
  onDismiss?: () => void
  buttonContent?: {
    primary: string;
    secondary: string;
  };
  title?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  content,
  onDismiss,
  buttonContent = {
    primary: 'Delete',
    secondary: 'Cancel'
  },
  title = "Are you sure?"
}) => {

  const dialogButtons: ButtonPropsModel[] = [
    {
      click: onClose,
      buttonModel: {
        content: buttonContent.secondary,
        cssClass: 'e-flat cancel-btn',
      },
    },
    {
      click: onConfirm,
      buttonModel: {
        content: buttonContent.primary,
        cssClass: 'e-danger delete-btn',
        isPrimary: true,
      },
    },
  ];

  
  const handleDismiss = () => {
    if (onDismiss) onDismiss();
    else onClose();
  };


  return (
    <DialogComponent
      id="delete-confirmation-dialog"
      header={title}
      visible={isOpen}
      showCloseIcon={true}
      close={handleDismiss}
      overlayClick={handleDismiss}
      buttons={dialogButtons}
      width="400px"
      target={document.body}
      isModal={true}
      cssClass="delete-dialog-container"
      animationSettings={{ effect: 'None' }}
    >
      <div className="delete-dialog-content">
        <p>{content}</p>
      </div>
    </DialogComponent>
  );
};

export default ConfirmationDialog;