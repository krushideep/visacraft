
import React from 'react';
import { AppBar, Toolbar, Box, Typography, Avatar } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Header: React.FC = () => {
  const theme = useTheme();

  return (
    <AppBar position="sticky" className="no-print">
      <Toolbar>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flex: 1,
          }}
        >
          <Avatar
            sx={{
              bgcolor: theme.palette.primary.main,
              width: 40,
              height: 40,
              fontSize: '1.25rem',
            }}
          >
            ✈
          </Avatar>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              letterSpacing: '-0.02em',
              display: { xs: 'none', sm: 'block' },
              color: theme.palette.text.primary,
            }}
          >
            VisaCraft
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
