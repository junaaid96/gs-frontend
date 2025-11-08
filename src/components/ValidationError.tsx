import React from 'react';

interface ValidationErrorProps {
  error?: string;
  className?: string;
}

export const ValidationError: React.FC<ValidationErrorProps> = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <p className={`text-sm text-red-600 mt-1 ${className}`}>
      {error}
    </p>
  );
};

interface ValidationErrorsProps {
  errors: Record<string, string>;
  fieldName?: string;
  className?: string;
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({ 
  errors, 
  fieldName, 
  className = '' 
}) => {
  if (!errors || Object.keys(errors).length === 0) return null;

  // If fieldName is provided, show only that field's error
  if (fieldName && errors[fieldName]) {
    return <ValidationError error={errors[fieldName]} className={className} />;
  }

  // Otherwise, show all errors
  return (
    <div className={`space-y-1 ${className}`}>
      {Object.entries(errors).map(([field, message]) => {
        // Skip general errors here (they should be shown separately)
        if (field === '_general') return null;
        return (
          <ValidationError key={field} error={`${field}: ${message}`} />
        );
      })}
    </div>
  );
};

