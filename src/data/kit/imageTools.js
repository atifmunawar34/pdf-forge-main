// Image tools — all client-side canvas ops via the 'image' engine.
const fmtOpt = { key: 'format', label: 'Output format', type: 'select', options: ['png', 'jpg', 'webp'], default: 'png' };
const qOpt = { key: 'quality', label: 'Quality (0–1)', type: 'number', default: 0.85, min: 0.05, max: 1, step: 0.05 };

const T = (id, name, desc, def, extra = {}) => ({
  id, name, desc, engine: 'image', def, keywords: [name.toLowerCase(), 'free online', 'image tool'], ...extra,
});

export const IMAGE_TOOLS = [
  T('image-compressor', 'Image Compressor', 'Compress JPG, PNG and WebP images online free — reduce file size while keeping quality.', { op: 'compress', options: [fmtOpt, qOpt], action: 'Compress' }, { featured: true, popular: true }),
  T('image-resizer', 'Image Resizer', 'Resize images to exact pixel dimensions or a percentage — free online image resizer.', {
    op: 'resize', action: 'Resize',
    options: [
      { key: 'mode', label: 'Resize by', type: 'select', options: [{ value: 'pixels', label: 'Pixels' }, { value: 'percent', label: 'Percent' }], default: 'pixels' },
      { key: 'width', label: 'Width (px)', type: 'number', placeholder: 'e.g. 800' },
      { key: 'height', label: 'Height (px)', type: 'number', placeholder: 'blank = keep ratio' },
      { key: 'percent', label: 'Scale % (if percent mode)', type: 'number', default: 50, min: 1, max: 400 },
      fmtOpt,
    ],
  }, { featured: true }),
  T('image-cropper', 'Image Cropper', 'Crop images to a centered square region — pick the crop size and download instantly.', { op: 'crop', action: 'Crop', options: [
    { key: 'size', label: 'Crop size %', type: 'number', default: 80, min: 10, max: 100 },
    fmtOpt,
  ] }),
  T('image-rotator', 'Image Rotator', 'Rotate images 90°, 180°, 270° or any custom angle — free online.', { op: 'rotate', action: 'Rotate', options: [
    { key: 'angle', label: 'Rotation', type: 'select', options: [{ value: 90, label: '90° clockwise' }, { value: 180, label: '180°' }, { value: 270, label: '270°' }, { value: -90, label: '90° counter-clockwise' }], default: 90 },
    fmtOpt,
  ] }),
  T('image-converter', 'Image Converter', 'Convert images between JPG, PNG and WebP formats — free online image converter.', { op: 'convert', options: [fmtOpt, qOpt], action: 'Convert' }, { popular: true }),
  T('jpg-to-png', 'JPG to PNG', 'Convert JPG photos to lossless PNG format instantly in your browser.', { op: 'convert', fixed: { format: 'png' }, action: 'Convert to PNG' }),
  T('png-to-jpg', 'PNG to JPG', 'Convert PNG images to JPG to reduce file size — free and instant.', { op: 'convert', fixed: { format: 'jpg' }, options: [qOpt], action: 'Convert to JPG' }),
  T('jpg-to-webp', 'JPG to WebP', 'Convert JPG images to modern WebP format for smaller, faster files.', { op: 'convert', fixed: { format: 'webp' }, options: [qOpt], action: 'Convert to WebP' }),
  T('webp-to-jpg', 'WebP to JPG', 'Convert WebP images to widely-compatible JPG format.', { op: 'convert', fixed: { format: 'jpg' }, options: [qOpt], action: 'Convert to JPG' }),
  T('png-to-webp', 'PNG to WebP', 'Convert PNG to WebP — same transparency, much smaller files.', { op: 'convert', fixed: { format: 'webp' }, options: [qOpt], action: 'Convert to WebP' }),
  T('webp-to-png', 'WebP to PNG', 'Convert WebP images to PNG with transparency preserved.', { op: 'convert', fixed: { format: 'png' }, action: 'Convert to PNG' }),
  T('image-quality-reducer', 'Image Quality Reducer', 'Lower image quality deliberately to hit a target file size.', { op: 'compress', options: [{ key: 'quality', ...qOpt, default: 0.4 }, fmtOpt], action: 'Reduce Quality' }),
  T('background-remover', 'Background Remover', 'Remove solid-color backgrounds from images — chroma-key cutout, free.', { op: 'bgremove', action: 'Remove Background', options: [{ key: 'tolerance', label: 'Tolerance (0–255)', type: 'number', default: 32, min: 0, max: 255, hint: 'Higher = removes more similar colors' }] }, { featured: true }),
  T('image-watermark', 'Image Watermark', 'Add a text watermark to images — position, size and opacity controls.', { op: 'watermark', action: 'Add Watermark', options: [
    { key: 'text', label: 'Watermark text', type: 'text', default: '© PDF Forge' },
    { key: 'position', label: 'Position', type: 'select', options: ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'], default: 'bottom-right' },
    { key: 'opacity', label: 'Opacity (0–1)', type: 'number', default: 0.5, min: 0.05, max: 1, step: 0.05 },
  ] }),
  T('image-blur', 'Image Blur', 'Blur an image with adjustable strength — gaussian-style blur online.', { op: 'filter', action: 'Blur', options: [{ key: 'amount', label: 'Blur (px)', type: 'number', default: 5, min: 0, max: 40 }], runOpts: (o) => ({ filter: `blur(${o.amount || 5}px)` }) }),
  T('image-sharpen', 'Image Sharpen', 'Sharpen a soft image — boosts local contrast for crisper detail.', { op: 'filter', action: 'Sharpen', options: [{ key: 'amount', label: 'Strength (%)', type: 'number', default: 140, min: 100, max: 300 }], runOpts: (o) => ({ filter: `contrast(${o.amount || 140}%)` }) }),
  T('brightness-adjuster', 'Brightness Adjuster', 'Make an image brighter or darker with a simple slider.', { op: 'filter', action: 'Apply', options: [{ key: 'amount', label: 'Brightness (%)', type: 'number', default: 120, min: 0, max: 300 }], runOpts: (o) => ({ filter: `brightness(${o.amount || 100}%)` }) }),
  T('contrast-adjuster', 'Contrast Adjuster', 'Increase or decrease image contrast online free.', { op: 'filter', action: 'Apply', options: [{ key: 'amount', label: 'Contrast (%)', type: 'number', default: 130, min: 0, max: 300 }], runOpts: (o) => ({ filter: `contrast(${o.amount || 100}%)` }) }),
  T('saturation-adjuster', 'Saturation Adjuster', 'Boost or mute image colors — adjust saturation online.', { op: 'filter', action: 'Apply', options: [{ key: 'amount', label: 'Saturation (%)', type: 'number', default: 140, min: 0, max: 400 }], runOpts: (o) => ({ filter: `saturate(${o.amount || 100}%)` }) }),
  T('grayscale-converter', 'Grayscale Converter', 'Convert any image to black & white grayscale instantly.', { op: 'filter', fixed: {}, filter: 'grayscale(100%)', action: 'Convert to Grayscale' }),
  T('color-inverter', 'Color Inverter', 'Invert image colors — negative effect, free online.', { op: 'filter', fixed: {}, filter: 'invert(100%)', action: 'Invert Colors' }),
  T('image-metadata-viewer', 'Image Metadata Viewer', 'View image file metadata — size, type, dimensions, dates.', { op: 'metadata', action: 'Read Metadata' }),
  T('exif-viewer', 'EXIF Viewer', 'Inspect image metadata and embedded file information.', { op: 'metadata', action: 'View EXIF Data' }),
  T('metadata-remover', 'Metadata Remover', 'Strip EXIF and metadata from images for privacy — re-encodes clean.', { op: 'strip-meta', options: [fmtOpt], action: 'Remove Metadata' }),
  T('image-to-base64', 'Image to Base64', 'Convert an image to a Base64 data-URL string for HTML/CSS embedding.', { op: 'base64', action: 'Encode to Base64' }),
  T('base64-to-image', 'Base64 to Image', 'Decode a Base64 string back into a viewable, downloadable image.', { op: 'from-base64', action: 'Decode to Image' }),
  T('image-splitter', 'Image Splitter', 'Split one image into a grid of smaller pieces — downloads a ZIP.', { op: 'split', action: 'Split Image', options: [
    { key: 'cols', label: 'Columns', type: 'number', default: 2, min: 1, max: 10 },
    { key: 'rows', label: 'Rows', type: 'number', default: 2, min: 1, max: 10 },
    fmtOpt,
  ] }),
  T('image-merger', 'Image Merger', 'Combine multiple images side-by-side or stacked into one image.', { op: 'merge', action: 'Merge Images', options: [
    { key: 'direction', label: 'Direction', type: 'select', options: [{ value: 'horizontal', label: 'Side by side' }, { value: 'vertical', label: 'Stacked' }], default: 'horizontal' },
    fmtOpt,
  ] }),
  T('image-upscaler', 'Image Upscaler', 'Enlarge images 2×–4× with smooth interpolation — free online.', { op: 'upscale', action: 'Upscale', options: [
    { key: 'scale', label: 'Scale', type: 'select', options: [2, 3, 4], default: 2 },
    fmtOpt, qOpt,
  ] }),
  T('passport-photo-maker', 'Passport Photo Maker', 'Create passport-size photos (35×45mm) or a printable 4×6" sheet.', { op: 'passport', action: 'Make Passport Photo', options: [
    { key: 'copies', label: 'Copies on sheet', type: 'select', options: [1, 2, 4, 6, 8], default: 6 },
  ] }),
  T('image-color-picker', 'Image Color Picker', 'Click anywhere on an image to grab the exact HEX color.', { op: 'colorpick', action: 'Open Picker' }),
];
