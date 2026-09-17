import { Modal } from './Modal';
import type { ModalProps } from './Modal';
export function Sheet(props: Omit<ModalProps, 'sheet'>) { return <Modal {...props} sheet />; }
export default Sheet;
