import React, { useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7, Brightness2 } from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ sx = {} }) => {
  const { mode, toggleTheme } = useTheme();

  // Listen for keyboard shortcut event
  useEffect(() => {
    const handleToggleTheme = () => {
      toggleTheme();
    };

    window.addEventListener('toggleTheme', handleToggleTheme);
    return () => window.removeEventListener('toggleTheme', handleToggleTheme);
  }, [toggleTheme]);

  const getThemeIcon = () => {
    if (mode === 'light') return <Brightness7 />;
    if (mode === 'dark') return <Brightness4 />;
    return <Brightness2 />; // Moon icon for black theme
  };

  const getThemeLabel = () => {
    if (mode === 'light') return 'Light';
    if (mode === 'dark') return 'Dark';
    return 'Black';
  };

  const getNextTheme = () => {
    if (mode === 'light') return 'Dark';
    if (mode === 'dark') return 'Black';
    return 'Light';
  };

  return (
    <Tooltip title={`Current: ${getThemeLabel()} → Switch to ${getNextTheme()} (Ctrl+Shift+L)`}>
      <IconButton
        onClick={toggleTheme}
        color="inherit"
        sx={{
          ...sx,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.1)',
          },
        }}
        aria-label="toggle theme"
      >
        {getThemeIcon()}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
