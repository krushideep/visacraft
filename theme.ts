import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#005fb0',
      light: '#d6e3ff',
      dark: '#003d7a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#565e71',
      light: '#dae2f9',
      dark: '#3a4150',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fdfcff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1c1e',
      secondary: '#44474e',
    },
    divider: '#e0e2ec',
    success: {
      main: '#16a34a',
      light: '#dcfce7',
      dark: '#15803d',
    },
    error: {
      main: '#dc2626',
      light: '#fee2e2',
      dark: '#b91c1c',
    },
    warning: {
      main: '#ea580c',
      light: '#fed7aa',
      dark: '#c2410c',
    },
    info: {
      main: '#0284c7',
      light: '#cffafe',
      dark: '#0c4a6e',
    },
  },
  typography: {
    fontFamily: "'Helvetica Neue', 'Helvetica', system-ui, -apple-system, sans-serif",
    h1: {
      fontFamily: "'Helvetica Neue', 'Helvetica', sans-serif",
      fontSize: '2.5rem',
      fontWeight: 800,
      letterSpacing: '-0.03em',
      lineHeight: 1.1,
    },
    h2: {
      fontFamily: "'Helvetica Neue', 'Helvetica', sans-serif",
      fontSize: '2rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h3: {
      fontFamily: "'Helvetica Neue', 'Helvetica', sans-serif",
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: "'Helvetica Neue', 'Helvetica', sans-serif",
      fontSize: '1.25rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontFamily: "'Helvetica Neue', 'Helvetica', sans-serif",
      fontSize: '1.1rem',
      fontWeight: 600,
    },
    h6: {
      fontFamily: "'Helvetica Neue', 'Helvetica', sans-serif",
      fontSize: '0.9rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0.01em',
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0.01em',
    },
    button: {
      fontFamily: "'Helvetica Neue', 'Helvetica', sans-serif",
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.02em',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '0.95rem',
          fontWeight: 700,
          textTransform: 'none',
          transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
          '&:active': {
            transform: 'scale(0.97)',
          },
        },
        containedPrimary: {
          backgroundColor: '#005fb0',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#003d7a',
            boxShadow: '0 4px 12px rgba(0, 95, 176, 0.3)',
          },
        },
        containedSecondary: {
          backgroundColor: '#565e71',
          '&:hover': {
            backgroundColor: '#3a4150',
          },
        },
        outlined: {
          borderColor: '#e0e2ec',
          color: '#1a1c1e',
          '&:hover': {
            borderColor: '#005fb0',
            backgroundColor: 'rgba(0, 95, 176, 0.04)',
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.875rem',
        },
        sizeLarge: {
          padding: '14px 32px',
          fontSize: '1rem',
          height: '50px',
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#f8f9fa',
            borderRadius: 12,
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: '#ffffff',
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              '& fieldset': {
                borderColor: '#005fb0',
                borderWidth: 2,
              },
            },
          },
          '& .MuiOutlinedInput-input': {
            padding: '16px 14px',
            fontSize: '1rem',
            fontWeight: 500,
          },
        },
      },
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#f8f9fa',
          borderRadius: 12,
          '&:hover': {
            backgroundColor: '#ffffff',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #e0e2ec',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
          '&:hover': {
            boxShadow: '0 3px 12px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          border: '1px solid #e0e2ec',
          borderRadius: 12,
          marginBottom: 12,
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '0 0 12px 0',
          },
          '&:hover': {
            borderColor: '#005fb0',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
          backgroundColor: '#f8f9fa',
          '&:hover': {
            backgroundColor: '#f0f2f5',
          },
          '&.Mui-expanded': {
            backgroundColor: '#f8f9fa',
            minHeight: 'auto',
          },
        },
        content: {
          margin: '12px 0',
          '&.Mui-expanded': {
            margin: '12px 0',
          },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          padding: '20px',
          borderTop: '1px solid #e0e2ec',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1a1c1e',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid #e0e2ec',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 64,
          padding: '0 24px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        colorPrimary: {
          backgroundColor: '#d6e3ff',
          color: '#005fb0',
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          '@media (min-width:600px)': {
            paddingLeft: 24,
            paddingRight: 24,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontSize: '0.95rem',
          fontWeight: 500,
          border: 'none',
        },
        standardError: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
        },
        standardSuccess: {
          backgroundColor: '#dcfce7',
          color: '#166534',
        },
        standardInfo: {
          backgroundColor: '#cffafe',
          color: '#0c4a6e',
        },
        standardWarning: {
          backgroundColor: '#fed7aa',
          color: '#92400e',
        },
      },
    },
  },
});
