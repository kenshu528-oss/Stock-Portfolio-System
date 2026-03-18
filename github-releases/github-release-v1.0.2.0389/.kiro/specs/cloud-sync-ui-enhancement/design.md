# Design Document

## Overview

This design enhances the Cloud Sync Settings modal by integrating connection status into the title bar and implementing a developer-friendly auto-fill mechanism. The solution focuses on improving user experience through better visual feedback and streamlined interface design while maintaining security and functionality.

## Architecture

### Component Structure
```
CloudSyncSettings
├── Enhanced Modal (with status in title)
├── GitHub Token Input Section
├── Sync Operations (Upload/Download)
├── Auto-fill Mechanism (dev mode)
└── Usage Instructions (with clickable help icon)
```

### State Management
- Connection status will be managed within the CloudSyncSettings component
- Auto-fill mechanism will be environment-aware (disabled in production)
- Title bar status will be derived from existing connection state

## Components and Interfaces

### Enhanced Modal Component

The Modal component will be extended to support status display in the title bar:

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  statusInfo?: {
    status: 'idle' | 'connected' | 'error';
    text: string;
    color: string;
  };
  children: React.ReactNode;
  className?: string;
  autoHeight?: boolean;
}
```

### Connection Status Icons

New icons will be added to the Icons component:

```typescript
// 連線狀態圖示
export const ConnectedIcon: React.FC<IconProps> = ({ className, size }) => (
  // Green wifi/connection icon
);

export const DisconnectedIcon: React.FC<IconProps> = ({ className, size }) => (
  // Gray wifi-off icon  
);

export const ErrorIcon: React.FC<IconProps> = ({ className, size }) => (
  // Red warning/error icon
);

export const InfoIcon: React.FC<IconProps> = ({ className, size }) => (
  // Blue info/help icon for auto-fill trigger
);
```

### Auto-fill Mechanism

```typescript
interface AutoFillState {
  clickCount: number;
  isEnabled: boolean;
  lastClickTime: number;
}

const AUTO_FILL_CONFIG = {
  REQUIRED_CLICKS: 5,
  CLICK_TIMEOUT: 2000, // Reset counter after 2 seconds
  DEV_TOKEN: 'github_pat_[REDACTED_FOR_SECURITY]',
  PRODUCTION_DISABLED: true
};
```

## Data Models

### Connection Status Model
```typescript
type ConnectionStatus = 'idle' | 'connected' | 'error';

interface StatusInfo {
  status: ConnectionStatus;
  text: string;
  color: string;
  icon: React.ComponentType<IconProps>;
}

const STATUS_CONFIG: Record<ConnectionStatus, StatusInfo> = {
  idle: {
    status: 'idle',
    text: '未連線',
    color: 'text-slate-400',
    icon: DisconnectedIcon
  },
  connected: {
    status: 'connected', 
    text: '已連線',
    color: 'text-green-400',
    icon: ConnectedIcon
  },
  error: {
    status: 'error',
    text: '連線失敗', 
    color: 'text-red-400',
    icon: ErrorIcon
  }
};
```

### Auto-fill Click Tracking
```typescript
interface ClickTracker {
  count: number;
  lastClickTime: number;
  isActive: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Status indicator consistency
*For any* connection status value (idle, connected, error), the title bar should display the corresponding icon color and text according to the STATUS_CONFIG mapping
**Validates: Requirements 1.2, 1.3, 1.4, 4.1**

Property 2: Status reactivity
*For any* connection status change, the title bar indicator should update immediately to reflect the new status
**Validates: Requirements 1.5**

Property 3: Auto-fill token population
*For any* auto-fill trigger event, the token input field should be populated with the predefined development token
**Validates: Requirements 2.2**

Property 4: Auto-fill connection test trigger
*For any* successful auto-fill action, the connection test function should be automatically invoked
**Validates: Requirements 2.3**

Property 5: Auto-fill notification display
*For any* auto-fill activation, a notification message should be displayed to inform the user of the action
**Validates: Requirements 2.4**

Property 6: Environment-based auto-fill control
*For any* production environment setting, the auto-fill mechanism should be disabled and non-functional
**Validates: Requirements 2.5**

Property 7: Functionality preservation
*For any* existing cloud sync operation (upload, download, test connection), the functionality should remain unchanged after UI reorganization
**Validates: Requirements 3.2**

Property 8: User information preservation
*For any* connected state with user information, the user details should be displayed in an appropriate location after status section removal
**Validates: Requirements 3.3**

Property 9: Responsive design maintenance
*For any* viewport size change, the modal and title bar should maintain proper layout and functionality
**Validates: Requirements 3.5**

Property 10: Close button functionality
*For any* status indicator display state, clicking the close button should successfully close the modal
**Validates: Requirements 4.4**

Property 11: Title bar layout stability
*For any* modal resize event, the title and status elements should maintain proper alignment and spacing
**Validates: Requirements 4.5**

## Error Handling

### Auto-fill Security
- Production environment detection to disable auto-fill
- Click timeout mechanism to prevent accidental activation
- Token validation before auto-fill execution

### Status Display Errors
- Fallback to default status if invalid status provided
- Graceful handling of missing status information
- Error boundary for status rendering failures

### UI State Management
- Proper cleanup of click tracking state
- Status synchronization between components
- Modal state consistency during status updates

## Testing Strategy

### Unit Testing
- Test status indicator rendering for each connection state
- Test auto-fill click counting and timeout logic
- Test environment-based feature toggling
- Test modal title bar layout with status information
- Test close button functionality with status display

### Property-Based Testing
The testing approach will use React Testing Library for component testing and Jest for property-based testing. Each correctness property will be implemented as a property-based test that verifies the behavior across multiple input scenarios.

**Property-based testing requirements:**
- Use Jest and React Testing Library for testing framework
- Configure each property-based test to run a minimum of 100 iterations
- Tag each property-based test with a comment referencing the correctness property
- Use the format: '**Feature: cloud-sync-ui-enhancement, Property {number}: {property_text}**'

**Unit testing requirements:**
- Test specific examples of status display states
- Test auto-fill mechanism with exact click sequences
- Test environment detection and feature toggling
- Verify UI layout and component integration

### Integration Testing
- Test complete auto-fill workflow from clicks to connection test
- Test status updates during actual connection attempts
- Test modal behavior with different status states
- Verify responsive design across different screen sizes