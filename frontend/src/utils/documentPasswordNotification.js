import { toast } from 'react-toastify';

/**
 * Show document password notification
 * @param {string} password - The document password to display
 * @param {string} filename - Optional filename for context
 */
export const showPasswordNotification = (password, filename = 'document') => {
  if (!password) return;

  // Create a simple text message instead of JSX
  const message = `🔐 Document Password Required\n\nYour ${filename} has been downloaded and is password-protected.\n\nPassword: ${password}\n\n💡 Click this notification to copy the password`;

  const toastId = toast.info(message, {
    position: 'top-center',
    autoClose: 15000,
    hideProgressBar: false,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    style: {
      whiteSpace: 'pre-line',
      fontFamily: 'monospace',
      fontSize: '14px',
      maxWidth: '500px',
      backgroundColor: '#eff6ff',
      color: '#1e40af',
      border: '2px solid #3b82f6'
    },
    onClick: () => {
      // Copy password to clipboard
      navigator.clipboard.writeText(password).then(() => {
        toast.dismiss(toastId);
        toast.success('Password copied to clipboard!', {
          position: 'top-right',
          autoClose: 2000
        });
      }).catch(() => {
        toast.error('Failed to copy password', {
          position: 'top-right',
          autoClose: 2000
        });
      });
    }
  });
};

/**
 * Extract password from response headers
 * @param {Object} response - Axios response object
 * @returns {string|null} - Password if found, null otherwise
 */
export const extractPasswordFromResponse = (response) => {
  return response.headers['x-document-password'] || null;
};

/**
 * Handle document download with password notification
 * @param {Blob} blob - The file blob
 * @param {string} filename - The filename for download
 * @param {string} password - Optional password
 */
export const downloadFileWithPassword = (blob, filename, password = null) => {
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  // Show password notification if available
  if (password) {
    showPasswordNotification(password, filename);
  }
};
