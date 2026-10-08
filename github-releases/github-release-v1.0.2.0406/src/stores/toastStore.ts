import { create } from 'zustand';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  
  addToast: (toastData) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastData = {
      id,
      duration: 5000, // 預設 5 秒
      ...toastData
    };
    
    set((state) => ({
      toasts: [...state.toasts, toast]
    }));
    
    // 限制最多顯示 5 個 Toast
    const { toasts } = get();
    if (toasts.length > 5) {
      set((state) => ({
        toasts: state.toasts.slice(-5)
      }));
    }
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },
  
  clearAllToasts: () => {
    set({ toasts: [] });
  }
}));

// 便利函數
export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'success', title, message, duration });
  },
  
  error: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'error', title, message, duration });
  },
  
  warning: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'warning', title, message, duration });
  },
  
  info: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'info', title, message, duration });
  }
};