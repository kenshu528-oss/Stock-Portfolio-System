# Project Structure

## Root Directory
```
├── src/                    # Source code
├── dist/                   # Build output
├── node_modules/           # Dependencies
├── .kiro/                  # Kiro configuration and specs
├── .vscode/                # VS Code settings
├── index.html              # Entry HTML file
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── requirements.md         # Product requirements document
```

## Source Code Organization

### `/src` Structure
```
src/
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   │   ├── Button.tsx     # Button component with variants
│   │   ├── Input.tsx      # Input component
│   │   └── Modal.tsx      # Modal dialog component
│   ├── Header.tsx         # Main header with menu toggle
│   └── Sidebar.tsx        # Collapsible sidebar menu
├── types/                 # TypeScript type definitions
│   └── index.ts           # Shared types and interfaces
├── test/                  # Test configuration
│   └── setup.ts           # Vitest setup file
├── App.tsx                # Main application component
├── main.tsx               # Application entry point
└── index.css              # Global styles and Tailwind imports
```

## Component Architecture

### UI Components (`/src/components/ui/`)
- **Reusable, generic components** with consistent API
- Support for variants, sizes, and custom styling
- TypeScript interfaces for all props
- Tailwind CSS for styling with design system consistency

### Feature Components (`/src/components/`)
- **Application-specific components** like Header, Sidebar
- Handle business logic and state management
- Integrate with Zustand stores
- Responsive design with mobile/desktop adaptations

## Naming Conventions

### Files
- **PascalCase** for React components (`Button.tsx`, `Header.tsx`)
- **camelCase** for utilities and hooks
- **kebab-case** for configuration files

### Components
- **Functional components** with TypeScript interfaces
- **Props interfaces** named `ComponentNameProps`
- **Export default** for main component, named exports for utilities

## Testing Structure
- **Co-located tests** with `.test.tsx` suffix
- **Test setup** in `/src/test/setup.ts`
- **Component testing** with React Testing Library
- **Property-based testing** with fast-check for complex logic

## State Management
- **Zustand stores** for global state (to be implemented)
- **Local component state** with useState for UI-only state
- **Props drilling** minimized through proper state architecture