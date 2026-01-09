# Technology Stack

## Frontend Framework
- **React 18** with TypeScript
- **Vite** as build tool and development server
- **Tailwind CSS** for styling with custom responsive breakpoints

## State Management
- **Zustand** for lightweight state management

## Testing
- **Vitest** for unit testing
- **@testing-library/react** for component testing
- **jsdom** as test environment
- **fast-check** for property-based testing

## Development Tools
- **ESLint** with TypeScript and React plugins
- **TypeScript 5.0+** with strict mode enabled
- **PostCSS** with Autoprefixer

## Build Configuration
- **ES2020** target with modern module resolution
- **Bundler mode** module resolution for optimal tree-shaking
- Strict TypeScript configuration with unused variable detection

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production (TypeScript + Vite)
npm run preview      # Preview production build
```

### Testing
```bash
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
```

### Code Quality
```bash
npm run lint         # Run ESLint with TypeScript rules
```

## Responsive Design
- **Mobile-first approach** with Tailwind breakpoints
- Custom breakpoints: `mobile` (max-width: 767px), `desktop` (768px+)
- Touch-optimized UI for mobile devices
- Collapsible sidebar/menu system