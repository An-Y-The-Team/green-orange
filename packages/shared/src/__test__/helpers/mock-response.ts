import { Mock, vi } from "vitest";

export const createMockResponseWithBody = (
  chunks: Uint8Array[]
): { response: Response; mockReader: { read: Mock } } => {
  let chunkIndex = 0;
  const mockReader = {
    read: vi.fn().mockImplementation(async () => {
      if (chunkIndex < chunks.length) {
        const value = chunks[chunkIndex];
        chunkIndex++;
        return { done: false, value };
      }
      return { done: true, value: undefined };
    }),
  };

  const response = {
    body: {
      getReader: vi.fn().mockReturnValue(mockReader),
    },
    blob: vi.fn(),
    headers: new Headers(),
    ok: true,
    status: 200,
    statusText: "OK",
    type: "basic",
    url: "http://test.com",
    redirected: false,
    bodyUsed: false,
    clone: vi.fn(),
    arrayBuffer: vi.fn(),
    formData: vi.fn(),
    json: vi.fn(),
    text: vi.fn(),
  } as unknown as Response;

  return { response, mockReader };
};

export const createMockResponseWithoutBody = (
  blobSize: number
): { response: Response; mockBlob: Mock } => {
  const mockBlob = vi.fn().mockResolvedValue(new Blob(["x".repeat(blobSize)]));

  const response = {
    body: null,
    blob: mockBlob,
    headers: new Headers(),
    ok: true,
    status: 200,
    statusText: "OK",
    type: "basic",
    url: "http://test.com",
    redirected: false,
    bodyUsed: false,
    clone: vi.fn(),
    arrayBuffer: vi.fn(),
    formData: vi.fn(),
    json: vi.fn(),
    text: vi.fn(),
  } as unknown as Response;

  return { response, mockBlob };
};
