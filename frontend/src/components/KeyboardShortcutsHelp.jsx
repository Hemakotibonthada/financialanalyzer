import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { useKeyboardShortcuts, SHORTCUTS } from '../context/KeyboardShortcutsContext';

const KeyboardShortcutsHelp = () => {
  const { isHelpModalOpen, setIsHelpModalOpen } = useKeyboardShortcuts();

  const shortcutCategories = {
    'Navigation': Object.entries(SHORTCUTS).filter(([, s]) => s.action === 'navigate'),
    'Actions': Object.entries(SHORTCUTS).filter(([, s]) => s.action === 'modal' || s.action === 'save'),
    'General': Object.entries(SHORTCUTS).filter(([, s]) => s.action === 'toggleTheme' || s.action === 'refresh' || s.action === 'closeModal'),
    'List Navigation': Object.entries(SHORTCUTS).filter(([, s]) => s.action === 'navigation'),
  };

  const formatKey = (key) => {
    return key
      .split('+')
      .map(k => k.charAt(0).toUpperCase() + k.slice(1))
      .join(' + ');
  };

  return (
    <Dialog
      open={isHelpModalOpen}
      onClose={() => setIsHelpModalOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <KeyboardIcon />
            <Typography variant="h6">Keyboard Shortcuts</Typography>
          </Box>
          <IconButton
            onClick={() => setIsHelpModalOpen(false)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {Object.entries(shortcutCategories).map(([category, shortcuts]) => (
          shortcuts.length > 0 && (
            <Box key={category} mb={3}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                {category}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {shortcuts.map(([key, shortcut]) => (
                  <Grid item xs={12} key={key}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      p={1}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          borderRadius: 1
                        }
                      }}
                    >
                      <Typography variant="body2">
                        {shortcut.description}
                      </Typography>
                      <Chip
                        label={formatKey(shortcut.key)}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          minWidth: '100px'
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )
        ))}

        <Box mt={3} p={2} sx={{ backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            💡 Tip: Press <strong>Shift + /</strong> anytime to see this help dialog
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;
