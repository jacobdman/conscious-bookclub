// Shared API helper functions
// Determine API base URL based on environment
const getApiBase = () => {
  // Check if we're in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Use local emulator URL
    return 'http://localhost:5001/conscious-bookclub-87073-9eb71/us-central1/api';
  }
  
  // Production: use relative path which will be proxied by Firebase Hosting
  // This hides the actual Firebase Functions URL for security
  return '/api';
};

const API_BASE = getApiBase();
const DEFAULT_TIMEOUT_MS = 15000;

// Global error notification handler (will be set by ErrorNotificationProvider)
let globalErrorHandler = null;

export const setGlobalErrorHandler = (handler) => {
  globalErrorHandler = handler;
};

// Helper function to make API calls
export const apiCall = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      // Try to extract error message from response
      let errorMessage = `API call failed: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If response is not JSON, use default message
      }

      // Show global error notification
      if (globalErrorHandler) {
        globalErrorHandler(errorMessage);
      }

      throw new Error(errorMessage);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    if (error && error.name === 'AbortError') {
      const errorMessage = 'Request timed out. Please check your connection.';
      if (globalErrorHandler) {
        globalErrorHandler(errorMessage);
      }
      throw new Error(errorMessage);
    }
    // If it's already an Error with message, re-throw it
    if (error instanceof Error) {
      throw error;
    }
    // Otherwise, create a new error
    const errorMessage = error.message || 'An unexpected error occurred';
    if (globalErrorHandler) {
      globalErrorHandler(errorMessage);
    }
    throw new Error(errorMessage);
  } finally {
    clearTimeout(timeoutId);
  }
};

