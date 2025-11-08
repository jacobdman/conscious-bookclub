import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload a profile picture to Firebase Storage
 * @param {string} userId - The user's ID
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} The download URL of the uploaded image
 */
export const uploadProfilePicture = async (userId, file) => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 5MB');
  }

  try {
    // Create a reference to the file location
    const storageRef = ref(storage, `profile-pictures/${userId}/${Date.now()}_${file.name}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw new Error('Failed to upload profile picture');
  }
};

/**
 * Delete a profile picture from Firebase Storage
 * @param {string} imageUrl - The URL of the image to delete
 */
export const deleteProfilePicture = async (imageUrl) => {
  try {
    // Extract the path from the URL
    // Firebase Storage URLs have a specific format
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    
    if (!pathMatch) {
      throw new Error('Invalid image URL');
    }
    
    // Decode the path (Firebase encodes special characters)
    const decodedPath = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storage, decodedPath);
    
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    // Don't throw - deletion is optional cleanup
  }
};

/**
 * Get download URL for any file in Firebase Storage
 * @param {string} filePath - Path to the file (e.g., "landing_images/dashboard.png")
 * @returns {Promise<string>} The download URL of the file
 */
export const getStorageFileUrl = async (filePath) => {
  try {
    const storageRef = ref(storage, filePath);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error(`Error getting storage file URL for ${filePath}:`, error);
    throw error;
  }
};

