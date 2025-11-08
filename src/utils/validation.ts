// Validation utility functions for frontend

export interface ValidationErrors {
  [field: string]: string;
}

export const validateUsername = (username: string): string | null => {
  if (!username || username.trim().length === 0) {
    return 'Username is required';
  }
  if (username.length < 3 || username.length > 50) {
    return 'Username must be between 3 and 50 characters';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
};

export const validatePassword = (password: string, isRequired: boolean = true): string | null => {
  if (isRequired && (!password || password.trim().length === 0)) {
    return 'Password is required';
  }
  if (password && password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (password && password.length > 100) {
    return 'Password must be less than 100 characters';
  }
  return null;
};

export const validateName = (name: string, fieldName: string = 'Name'): string | null => {
  if (!name || name.trim().length === 0) {
    return `${fieldName} is required`;
  }
  if (name.length > 255) {
    return `${fieldName} must not exceed 255 characters`;
  }
  return null;
};

export const validateDescription = (description: string, maxLength: number = 1000): string | null => {
  if (description && description.length > maxLength) {
    return `Description must not exceed ${maxLength} characters`;
  }
  return null;
};

export const validatePrice = (price: number, fieldName: string = 'Price'): string | null => {
  if (price === undefined || price === null) {
    return `${fieldName} is required`;
  }
  if (price < 0.01) {
    return `${fieldName} must be greater than 0`;
  }
  return null;
};

export const validateStock = (stock: number): string | null => {
  if (stock === undefined || stock === null) {
    return 'Stock is required';
  }
  if (stock < 0) {
    return 'Stock must be non-negative';
  }
  return null;
};

export const validateQuantity = (quantity: number): string | null => {
  if (quantity === undefined || quantity === null) {
    return 'Quantity is required';
  }
  if (quantity < 1) {
    return 'Quantity must be at least 1';
  }
  return null;
};

export const validateImageUrl = (url: string): string | null => {
  if (!url || url.trim().length === 0) {
    return null; // Optional field
  }
  if (url.length > 500) {
    return 'Image URL must not exceed 500 characters';
  }
  if (!/^$|^https?:\/\/.+/.test(url)) {
    return 'Image URL must be empty or a valid HTTP/HTTPS URL';
  }
  return null;
};

export const validateOrigin = (origin: string): string | null => {
  if (origin && origin.length > 100) {
    return 'Origin must not exceed 100 characters';
  }
  return null;
};

export const validateContactNumber = (contactNumber: string): string | null => {
  if (!contactNumber || contactNumber.trim().length === 0) {
    return null; // Optional field
  }
  if (contactNumber.length > 20) {
    return 'Contact number must not exceed 20 characters';
  }
  if (!/^$|^[+]?[0-9\s\-()]+$/.test(contactNumber)) {
    return 'Contact number format is invalid';
  }
  return null;
};

export const validateAddress = (address: string): string | null => {
  if (address && address.length > 500) {
    return 'Address must not exceed 500 characters';
  }
  return null;
};

export const validateId = (id: number | undefined, fieldName: string = 'ID'): string | null => {
  if (id !== undefined && id !== null && id <= 0) {
    return `${fieldName} must be a positive number`;
  }
  return null;
};

// Parse validation errors from API response
export const parseValidationErrors = (error: any): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Handle different error response formats
  if (error.response?.data) {
    const errorData = error.response.data;

    // If error.data is an object with field names as keys
    if (errorData.data && typeof errorData.data === 'object') {
      Object.keys(errorData.data).forEach((field) => {
        errors[field] = errorData.data[field];
      });
    }

    // If error.message contains validation errors
    if (errorData.message && typeof errorData.message === 'string') {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(errorData.message);
        if (typeof parsed === 'object') {
          Object.assign(errors, parsed);
        }
      } catch {
        // If not JSON, check if it's a validation error message
        if (errorData.message.includes('Validation failed')) {
          // Extract field errors from message
          const match = errorData.message.match(/\{([^}]+)\}/);
          if (match) {
            try {
              const fieldErrors = JSON.parse(match[0]);
              Object.assign(errors, fieldErrors);
            } catch {
              errors._general = errorData.message;
            }
          } else {
            errors._general = errorData.message;
          }
        } else {
          errors._general = errorData.message;
        }
      }
    }

    // If no specific errors found, use the general message
    if (Object.keys(errors).length === 0 && errorData.message) {
      errors._general = errorData.message;
    }
  } else if (error.message) {
    errors._general = error.message;
  } else {
    errors._general = 'An error occurred. Please try again.';
  }

  return errors;
};

// Get field error from validation errors
export const getFieldError = (errors: ValidationErrors, fieldName: string): string | undefined => {
  return errors[fieldName];
};

// Get general error (non-field specific)
export const getGeneralError = (errors: ValidationErrors): string | undefined => {
  return errors._general;
};

