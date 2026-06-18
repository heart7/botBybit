import {
  extFromMime,
  kindFromMime,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  validateMedia,
} from './mediaValidation';

describe('kindFromMime', () => {
  it('classifies images and videos', () => {
    expect(kindFromMime('image/jpeg')).toBe('photo');
    expect(kindFromMime('video/mp4')).toBe('video');
  });
  it('rejects unknown types', () => {
    expect(kindFromMime('application/pdf')).toBeNull();
  });
});

describe('extFromMime', () => {
  it('maps known types', () => {
    expect(extFromMime('image/jpeg')).toBe('jpg');
    expect(extFromMime('video/quicktime')).toBe('mov');
  });
  it('falls back to bin', () => expect(extFromMime('application/zip')).toBe('bin'));
});

describe('validateMedia', () => {
  it('accepts an in-bounds image', () => {
    expect(validateMedia('image/png', 1024)).toBeNull();
  });
  it('rejects a missing or unsupported type', () => {
    expect(validateMedia(null, 1024)).toMatch(/unknown/i);
    expect(validateMedia('application/pdf', 1024)).toMatch(/unsupported/i);
  });
  it('enforces the image size cap', () => {
    expect(validateMedia('image/jpeg', MAX_IMAGE_BYTES + 1)).toMatch(/too large/i);
  });
  it('enforces the (larger) video size cap', () => {
    expect(validateMedia('video/mp4', MAX_IMAGE_BYTES + 1)).toBeNull();
    expect(validateMedia('video/mp4', MAX_VIDEO_BYTES + 1)).toMatch(/too large/i);
  });
  it('passes when size is unknown', () => {
    expect(validateMedia('image/webp', null)).toBeNull();
  });
});
