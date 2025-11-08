/**
 * ImgBB Image Upload Service
 * Handles image uploads to ImgBB API
 */

const IMGBB_API_KEY = 'a39b374aeb31a61cbc079bef0e6daf80';
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

export interface ImgBBResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: number;
    height: number;
    size: number;
    time: number;
    expiration: number;
  };
  success: boolean;
  status: number;
}

export interface ImgBBError {
  error: {
    message: string;
    status_code: number;
  };
}

/**
 * Converts a file to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Uploads an image file to ImgBB
 * @param file - The image file to upload
 * @returns Promise with the image URL
 */
export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Image size must be less than 10MB');
    }

    // Convert file to base64
    const base64Image = await fileToBase64(file);

    // Create URL-encoded form data for base64 upload
    const formData = new URLSearchParams();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64Image);

    // Upload to ImgBB
    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData: ImgBBError = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload image');
    }

    const data: ImgBBResponse = await response.json();

    if (!data.success) {
      throw new Error('Failed to upload image to ImgBB');
    }

    return data.data.url;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while uploading the image');
  }
};

