import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Divider,
  CircularProgress,
  Button,
  TextField,
  IconButton,
  Alert,
  Input,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Edit, Save, Cancel, PhotoCamera } from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import { getUserDocument, updateUserProfile } from 'services/users/users.service';
import { uploadProfilePicture } from 'services/storage/storage.service';
import { updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { auth } from '../../firebase';
import NotificationSettings from './NotificationSettings';
import Layout from 'components/Layout';

const Profile = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const data = await getUserDocument(user.uid);
      setUserData(data);
      setDisplayName(data?.displayName || user?.displayName || '');
      setPhotoPreview(data?.photoUrl || user?.photoURL || null);
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setDisplayName(userData?.displayName || user?.displayName || '');
    setPhotoFile(null);
    setPhotoPreview(userData?.photoUrl || user?.photoURL || null);
    setError(null);
    setSuccess(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDisplayName(userData?.displayName || user?.displayName || '');
    setPhotoFile(null);
    setPhotoPreview(userData?.photoUrl || user?.photoURL || null);
    setError(null);
    setSuccess(null);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      let photoUrl = userData?.photoUrl || user?.photoURL || null;

      // Upload new photo if one was selected
      if (photoFile) {
        photoUrl = await uploadProfilePicture(user.uid, photoFile);
      }

      // Update database
      const updatedUser = await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        photoUrl: photoUrl,
      });

      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: displayName.trim(),
          photoURL: photoUrl,
        });
      }

      // Update local state
      setUserData(updatedUser);
      setIsEditing(false);
      setPhotoFile(null);
      setSuccess('Profile updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const currentDisplayName = userData?.displayName || user?.displayName || 'User';
  const currentPhotoUrl = userData?.photoUrl || user?.photoURL;
  const currentEmail = user?.email || userData?.email;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'flex-start' },
            gap: 2, 
            mb: 3 
          }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={isEditing ? photoPreview : currentPhotoUrl}
                alt={isEditing ? displayName : currentDisplayName}
                sx={{ width: 80, height: 80 }}
              >
                {(isEditing ? displayName : currentDisplayName || currentEmail || '').charAt(0).toUpperCase()}
              </Avatar>
              {isEditing && (
                <IconButton
                  component="label"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: 32,
                    height: 32,
                  }}
                >
                  <PhotoCamera sx={{ fontSize: 18 }} />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    sx={{ display: 'none' }}
                  />
                </IconButton>
              )}
            </Box>
            <Box sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}>
              {isEditing ? (
                <TextField
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  fullWidth
                  required
                  sx={{ mb: 1 }}
                  error={!displayName.trim()}
                  helperText={!displayName.trim() ? 'Display name is required' : ''}
                />
              ) : (
                <Typography variant="h5">
                  {currentDisplayName}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {currentEmail}
              </Typography>
            </Box>
            <Box sx={{ 
              width: { xs: '100%', sm: 'auto' },
              display: 'flex',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' }
            }}>
              {isEditing ? (
                <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                    onClick={handleSave}
                    disabled={saving || !displayName.trim()}
                    fullWidth={isMobile}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={handleCancel}
                    disabled={saving}
                    fullWidth={isMobile}
                  >
                    Cancel
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={handleEdit}
                  fullWidth={isMobile}
                >
                  Edit Profile
                </Button>
              )}
            </Box>
          </Box>

          {isEditing && photoFile && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                New photo preview:
              </Typography>
              <Box
                component="img"
                src={photoPreview}
                alt="Preview"
                sx={{
                  maxWidth: 200,
                  maxHeight: 200,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <NotificationSettings />
        </Paper>
      </Box>
    </Layout>
  );
};

export default Profile;

