import React, { useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
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

  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode (Ctrl+Shift+L)`}>
      <IconButton
        onClick={toggleTheme}
        color="inherit"
        sx={{
          ...sx,
        }}
        aria-label="toggle theme"
      >
        {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
