import { useToastContext } from '../components/ui/ToastProvider';

export function useToast() {
  const context = useToastContext();
  return { toast: context };
}
