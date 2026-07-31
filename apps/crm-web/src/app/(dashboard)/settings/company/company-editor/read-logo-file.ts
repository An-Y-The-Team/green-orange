/** Longest edge kept, in px — plenty for a letterhead mark at print DPI. */
const MAX_EDGE = 600;
/** Refuse absurd uploads before decoding them. */
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được tệp ảnh."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

/**
 * Read a picked logo into a data URL, downscaled so it stays small enough to
 * live in the single company row (the API caps the field as a backstop).
 *
 * SVG is passed through untouched: it is already tiny and rasterising it would
 * throw away the resolution that makes it worth using on a printed page.
 */
export async function readLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Vui lòng chọn một tệp ảnh (PNG, JPG, WEBP hoặc SVG).");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Ảnh quá lớn (tối đa 8 MB).");
  }
  if (file.type === "image/svg+xml") return readAsDataUrl(file);

  const dataUrl = await readAsDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Tệp ảnh không hợp lệ."));
    img.onload = () => resolve(img);
    img.src = dataUrl;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  if (scale === 1) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return dataUrl; // no 2d context — keep the original
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  // PNG keeps transparency, which a logo on white paper usually relies on.
  return canvas.toDataURL("image/png");
}
