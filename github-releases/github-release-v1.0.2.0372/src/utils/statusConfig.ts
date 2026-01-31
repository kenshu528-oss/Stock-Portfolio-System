import React from 'react';
import { ConnectedIcon, DisconnectedIcon, ErrorIcon } from '../components/ui/Icons';

// Connection status type
export type ConnectionStatus = 'idle' | 'connected' | 'error';

// Status information interface
export interface StatusInfo {
  status: ConnectionStatus;
  text: string;
  color: string;
  icon: React.ComponentType<{ className?: string; size?: 'sm' | 'md' | 'lg' }>;
}

// Status configuration mapping with consistent color coding
export const STATUS_CONFIG: Record<ConnectionStatus, StatusInfo> = {
  idle: {
    status: 'idle',
    text: '未連線',
    color: 'text-slate-400', // Gray for idle state
    icon: DisconnectedIcon
  },
  connected: {
    status: 'connected',
    text: '已連線',
    color: 'text-green-400', // Green for connected state
    icon: ConnectedIcon
  },
  error: {
    status: 'error',
    text: '連線失敗',
    color: 'text-red-400', // Red for error state
    icon: ErrorIcon
  }
};

// Helper function to get status information with fallback handling
export const getStatusInfo = (status: ConnectionStatus | string | null | undefined): StatusInfo => {
  // Handle null, undefined, or invalid status values
  if (!status || typeof status !== 'string') {
    console.warn('Invalid status provided to getStatusInfo:', status, 'falling back to idle');
    return STATUS_CONFIG.idle;
  }
  
  // Validate and return status info
  const validStatus = getValidStatus(status);
  return STATUS_CONFIG[validStatus];
};

// Helper function to get status text with fallback
export const getStatusText = (status: ConnectionStatus | string | null | undefined): string => {
  try {
    const statusInfo = getStatusInfo(status);
    return statusInfo.text;
  } catch (error) {
    console.error('Error getting status text:', error);
    return STATUS_CONFIG.idle.text;
  }
};

// Helper function to get status color with fallback
export const getStatusColor = (status: ConnectionStatus | string | null | undefined): string => {
  try {
    const statusInfo = getStatusInfo(status);
    return statusInfo.color;
  } catch (error) {
    console.error('Error getting status color:', error);
    return STATUS_CONFIG.idle.color;
  }
};

// Helper function to get status icon with fallback
export const getStatusIcon = (status: ConnectionStatus | string | null | undefined) => {
  try {
    const statusInfo = getStatusInfo(status);
    return statusInfo.icon;
  } catch (error) {
    console.error('Error getting status icon:', error);
    return STATUS_CONFIG.idle.icon;
  }
};

// Helper function to validate status with detailed logging
export const isValidStatus = (status: any): status is ConnectionStatus => {
  if (typeof status !== 'string') {
    console.warn('Status is not a string:', typeof status, status);
    return false;
  }
  
  const validStatuses = ['idle', 'connected', 'error'];
  const isValid = validStatuses.includes(status);
  
  if (!isValid) {
    console.warn('Invalid status value:', status, 'Valid values are:', validStatuses);
  }
  
  return isValid;
};

// Helper function to get default status for invalid values with logging
export const getValidStatus = (status: any): ConnectionStatus => {
  if (isValidStatus(status)) {
    return status;
  }
  
  console.warn('Invalid status detected, falling back to idle:', status);
  return 'idle';
};
// Status update callback type
export type StatusUpdateCallback = (status: ConnectionStatus) => void;

// Status manager class for handling status updates and synchronization
export class StatusManager {
  private status: ConnectionStatus = 'idle';
  private callbacks: Set<StatusUpdateCallback> = new Set();

  constructor(initialStatus: ConnectionStatus = 'idle') {
    this.status = getValidStatus(initialStatus);
  }

  // Get current status
  getCurrentStatus(): ConnectionStatus {
    return this.status;
  }

  // Update status with validation and immediate callback execution
  updateStatus(newStatus: string | ConnectionStatus): void {
    const validStatus = getValidStatus(newStatus);
    
    // Only update if status actually changed
    if (this.status !== validStatus) {
      const previousStatus = this.status;
      this.status = validStatus;
      
      // Immediately notify all callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(validStatus);
        } catch (error) {
          console.error('Status update callback error:', error);
        }
      });
      
      // Log status change for debugging
      console.log(`Status changed: ${previousStatus} → ${validStatus}`);
    }
  }

  // Subscribe to status changes
  subscribe(callback: StatusUpdateCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // Get status info with fallback handling
  getStatusInfo(): StatusInfo {
    return getStatusInfo(this.status);
  }

  // Reset to idle status
  reset(): void {
    this.updateStatus('idle');
  }

  // Handle connection success
  setConnected(): void {
    this.updateStatus('connected');
  }

  // Handle connection error
  setError(): void {
    this.updateStatus('error');
  }

  // Handle connection idle/disconnected
  setIdle(): void {
    this.updateStatus('idle');
  }
}

// Create a default status manager instance
export const defaultStatusManager = new StatusManager();

// Hook for React components to use status manager
export const useStatusManager = (initialStatus?: ConnectionStatus) => {
  const [status, setStatus] = React.useState<ConnectionStatus>(
    initialStatus || defaultStatusManager.getCurrentStatus()
  );

  React.useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = defaultStatusManager.subscribe(setStatus);
    
    // Set initial status
    setStatus(defaultStatusManager.getCurrentStatus());
    
    return unsubscribe;
  }, []);

  const updateStatus = React.useCallback((newStatus: ConnectionStatus) => {
    defaultStatusManager.updateStatus(newStatus);
  }, []);

  return {
    status,
    updateStatus,
    statusInfo: getStatusInfo(status),
    setConnected: defaultStatusManager.setConnected.bind(defaultStatusManager),
    setError: defaultStatusManager.setError.bind(defaultStatusManager),
    setIdle: defaultStatusManager.setIdle.bind(defaultStatusManager),
    reset: defaultStatusManager.reset.bind(defaultStatusManager)
  };
};