# Public Assets

This directory contains static assets served by Next.js.

## Structure

- `images/` - Store all image assets here
  - Access images via `/images/your-image.png` in your components
  - Example: `<Image src="/images/logo.png" alt="Logo" />`

- `favicon.ico` - Place your favicon file here
  - Next.js will automatically serve it at `/favicon.ico`
  - The favicon is referenced in `src/app/layout.tsx`

## Usage in Components

### Images
```tsx
import Image from 'next/image'

<Image 
  src="/images/your-image.png" 
  alt="Description" 
  width={500} 
  height={300} 
/>
```

### Static Images (img tag)
```tsx
<img src="/images/your-image.png" alt="Description" />
```

## Note

- All files in the `public` folder are served from the root URL (`/`)
- Keep file names lowercase and use hyphens for spaces
- Optimize images before adding them to reduce bundle size

