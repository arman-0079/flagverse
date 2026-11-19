export function computeEarthTextureDimensions(
  maxTextureSize: number,
  highQuality: boolean
): { width: number; height: number } {
  const desiredWidth = highQuality ? 8192 : 4096;
  const safeMax = Math.max(2048, maxTextureSize || 4096);
  const width = Math.min(desiredWidth, safeMax);
  return { width, height: Math.floor(width / 2) };
}
