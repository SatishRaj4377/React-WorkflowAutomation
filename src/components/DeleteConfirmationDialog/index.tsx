import React from 'react';
import { DialogComponent, ButtonPropsModel } from '@syncfusion/ej2-react-popups';
import './DeleteConfirmationDialog.css';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  title?: string;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  title = "Are you sure?"
}) => {

  const dialogButtons: ButtonPropsModel[] = [
    {
      click: onClose,
      buttonModel: {
        content: 'Cancel',
        cssClass: 'e-flat cancel-btn',
      },
    },
    {
      click: onConfirm,
      buttonModel: {
        content: 'Delete',
        cssClass: 'e-danger delete-btn',
        isPrimary: true,
      },
    },
  ];

  const content = `Are you sure you want to delete ${itemName ? `"${itemName}"` : 'this item'}? This action cannot be undone.`;

  return (
    <DialogComponent
      id="delete-confirmation-dialog"
      header={title}
      visible={isOpen}
      showCloseIcon={true}
      close={onClose}
      overlayClick={onClose}
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

export default DeleteConfirmationDialog;