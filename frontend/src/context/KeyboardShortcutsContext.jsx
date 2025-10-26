import { createContext, useContext, useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';

/**
 * Keyboard Shortcuts Context
 * Provides global keyboard shortcuts functionality
 */

const KeyboardShortcutsContext = createContext(null);

// Keyboard shortcuts configuration
export const SHORTCUTS = {
  // Navigation
  DASHBOARD: { key: 'ctrl+shift+d', description: 'Go to Dashboard', action: 'navigate', path: '/dashboard' },
  TRANSACTIONS: { key: 'ctrl+shift+t', description: 'Go to Transactions', action: 'navigate', path: '/transactions' },
  ANALYTICS: { key: 'ctrl+shift+a', description: 'Go to Analytics', action: 'navigate', path: '/analytics' },
  PROFILE: { key: 'ctrl+shift+p', description: 'Go to Profile', action: 'navigate', path: '/profile' },
  EMI: { key: 'ctrl+shift+e', description: 'Go to EMI Tracker', action: 'navigate', path: '/emi' },
  
  // Actions
  NEW_TRANSACTION: { key: 'ctrl+n', description: 'Add New Transaction', action: 'modal', modal: 'addTransaction' },
  SEARCH: { key: 'ctrl+k', description: 'Search', action: 'modal', modal: 'search' },
  HELP: { key: '?', description: 'Show Keyboard Shortcuts', action: 'modal', modal: 'help' },
  CLOSE_MODAL: { key: 'escape', description: 'Close Modal/Dialog', action: 'closeModal' },
  
  // General
  SAVE: { key: 'ctrl+s', description: 'Save (in forms)', action: 'save' },
  REFRESH: { key: 'ctrl+r', description: 'Refresh Page', action: 'refresh' },
  TOGGLE_THEME: { key: 'ctrl+shift+l', description: 'Toggle Dark/Light Mode', action: 'toggleTheme' },
  
  // List Navigation
  NEXT_ITEM: { key: 'j', description: 'Next Item (in lists)', action: 'navigation', direction: 'next' },
  PREV_ITEM: { key: 'k', description: 'Previous Item (in lists)', action: 'navigation', direction: 'prev' },
};

export const KeyboardShortcutsProvider = ({ children }) => {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Navigation shortcuts
  Object.entries(SHORTCUTS).forEach(([key, shortcut]) => {
    if (shortcut.action === 'navigate') {
      useHotkeys(
        shortcut.key,
        (e) => {
          e.preventDefault();
          navigate(shortcut.path);
        },
        [navigate]
      );
    }
  });

  // Search shortcut
  useHotkeys('ctrl+k', (e) => {
    e.preventDefault();
    setActiveModal('search');
  });

  // Help shortcut
  useHotkeys('shift+/', (e) => {
    e.preventDefault();
    setIsHelpModalOpen(true);
  });

  // Close modal shortcut
  useHotkeys('escape', (e) => {
    if (activeModal || isHelpModalOpen) {
      e.preventDefault();
      setActiveModal(null);
      setIsHelpModalOpen(false);
    }
  });

  // New transaction shortcut
  useHotkeys('ctrl+n', (e) => {
    e.preventDefault();
    setActiveModal('addTransaction');
  });

  // Toggle theme shortcut
  useHotkeys('ctrl+shift+l', (e) => {
    e.preventDefault();
    // Trigger custom event for theme toggle
    window.dispatchEvent(new CustomEvent('toggleTheme'));
  });

  // Prevent default refresh on Ctrl+R
  useHotkeys('ctrl+r', (e) => {
    e.preventDefault();
    window.location.reload();
  });

  const value = {
    activeModal,
    setActiveModal,
    isHelpModalOpen,
    setIsHelpModalOpen,
    shortcuts: SHORTCUTS
  };

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
};

// Custom hook for list navigation
export const useListNavigation = (items, onSelect) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useHotkeys('j', () => {
    setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
  }, [items.length]);

  useHotkeys('k', () => {
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  useHotkeys('enter', () => {
    if (items[selectedIndex]) {
      onSelect(items[selectedIndex]);
    }
  }, [items, selectedIndex, onSelect]);

  return { selectedIndex, setSelectedIndex };
};

export default KeyboardShortcutsContext;
