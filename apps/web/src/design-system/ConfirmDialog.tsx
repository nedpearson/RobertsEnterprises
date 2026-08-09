
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  isLoading = false,
}: ConfirmDialogProps) => {
  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isLoading}>
        {cancelText}
      </Button>
      <Button 
        variant={isDanger ? 'danger' : 'primary'} 
        onClick={onConfirm} 
        isLoading={isLoading}
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <p className="text-gray-300">{message}</p>
    </Modal>
  );
};
