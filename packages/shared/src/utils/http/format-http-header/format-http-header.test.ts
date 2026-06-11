import { describe, expect, it } from "vitest";

import {
  CACHE_CONTROL,
  CONTENT_DISPOSITION,
  CONTENT_TYPE,
  HTTP_HEADER,
} from "../constants";
import { formatHttpHeader } from "./format-http-header";

describe("formatHttpHeader", () => {
  describe("happy path", () => {
    it("should return a Headers object with default values when called with empty options", () => {
      const headers = formatHttpHeader({});
      expect(headers).toBeInstanceOf(Headers);
      expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBe(CONTENT_TYPE.TEXT);
      expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBe(
        CACHE_CONTROL.NO_CACHE
      );
    });

    it("should set Content-Type header when contentType is provided", () => {
      const headers = formatHttpHeader({ contentType: CONTENT_TYPE.JSON });
      expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBe(CONTENT_TYPE.JSON);
    });

    it("should set Content-Type to PDF correctly", () => {
      const headers = formatHttpHeader({ contentType: CONTENT_TYPE.PDF });
      expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBe("application/pdf");
    });

    it("should set Content-Type to OCTET_STREAM correctly", () => {
      const headers = formatHttpHeader({
        contentType: CONTENT_TYPE.OCTET_STREAM,
      });
      expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBe(
        "application/octet-stream"
      );
    });

    it("should set Content-Type to FOUNTAIN correctly", () => {
      const headers = formatHttpHeader({ contentType: CONTENT_TYPE.FOUNTAIN });
      expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBe(
        "application/vnd.fountain"
      );
    });

    it("should set Cache-Control header when cacheControl is provided", () => {
      const headers = formatHttpHeader({
        cacheControl: CACHE_CONTROL.NO_STORE,
      });
      expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBe(
        CACHE_CONTROL.NO_STORE
      );
    });

    it("should set Cache-Control to PRIVATE correctly", () => {
      const headers = formatHttpHeader({ cacheControl: CACHE_CONTROL.PRIVATE });
      expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBe("private");
    });

    it("should set Cache-Control to PUBLIC correctly", () => {
      const headers = formatHttpHeader({ cacheControl: CACHE_CONTROL.PUBLIC });
      expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBe("public");
    });

    it("should set Content-Disposition header when contentDisposition is provided with type", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "test.txt",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain("attachment");
      expect(disposition).toContain("test.txt");
    });

    it("should set Content-Disposition header with inline type", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "preview.pdf",
          type: CONTENT_DISPOSITION.INLINE,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain("inline");
      expect(disposition).toContain("preview.pdf");
    });

    it("should handle all options together", () => {
      const headers = formatHttpHeader({
        contentType: CONTENT_TYPE.ZIP,
        cacheControl: CACHE_CONTROL.MUST_REVALIDATE,
        contentDisposition: {
          filename: "archive.zip",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBe("application/zip");
      expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBe("must-revalidate");
      expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toContain(
        "attachment"
      );
      expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toContain(
        "archive.zip"
      );
    });

    it("should properly encode non-ASCII filenames in Content-Disposition", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "story😀.fountain",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain("UTF-8''story%F0%9F%98%80.fountain");
      // Non-ASCII replaced with underscore in fallback
      expect(disposition).toContain('filename="story_.fountain"');
    });

    it("should escape double quotes in filenames", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: 'file"with"quotes.txt',
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain('filename="file\\"with\\"quotes.txt"');
    });

    it("should escape backslashes in filenames", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "file\\with\\backslashes.txt",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain(
        'filename="file\\\\with\\\\backslashes.txt"'
      );
    });
  });

  describe("error cases", () => {
    it("should return empty Headers when options is null", () => {
      const headers = formatHttpHeader(null as unknown as object);
      expect(headers).toBeInstanceOf(Headers);
      expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBeNull();
    });

    it("should return empty Headers when options is undefined", () => {
      const headers = formatHttpHeader(undefined as unknown as object);
      expect(headers).toBeInstanceOf(Headers);
      expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBeNull();
    });
  });

  describe("invalid arguments", () => {
    describe("contentType", () => {
      // Implementation silently ignores invalid contentType but still sets default
      it("should not set Content-Type header for invalid contentType value", () => {
        const headers = formatHttpHeader({
          contentType: "invalid/type" as unknown as typeof CONTENT_TYPE.TEXT,
        });
        // Due to default, it still has text/plain from earlier destructuring
        // BUT the conditional check should skip setting it
        // Actually looking at implementation: contentType defaults, then checks CONTENT_TYPE_VALUES
        // Invalid type won't pass the check, so nothing gets set
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      });

      it("should ignore contentType when it is a number", () => {
        const headers = formatHttpHeader({
          contentType: 123 as unknown as typeof CONTENT_TYPE.TEXT,
        });
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      });

      it("should ignore contentType when it is a boolean", () => {
        const headers = formatHttpHeader({
          contentType: true as unknown as typeof CONTENT_TYPE.TEXT,
        });
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      });

      it("should ignore contentType when it is an object", () => {
        const headers = formatHttpHeader({
          contentType: { type: "json" } as unknown as typeof CONTENT_TYPE.TEXT,
        });
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      });

      it("should ignore contentType when it is an array", () => {
        const headers = formatHttpHeader({
          contentType: [
            "application/json",
          ] as unknown as typeof CONTENT_TYPE.TEXT,
        });
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      });

      it("should ignore contentType when it is null", () => {
        const headers = formatHttpHeader({
          contentType: null as unknown as typeof CONTENT_TYPE.TEXT,
        });
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      });

      it("should ignore contentType when it is NaN", () => {
        const headers = formatHttpHeader({
          contentType: NaN as unknown as typeof CONTENT_TYPE.TEXT,
        });
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      });

      it("should ignore contentType when it is Symbol", () => {
        const headers = formatHttpHeader({
          contentType: Symbol("test") as unknown as typeof CONTENT_TYPE.TEXT,
        });
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      });

      it("should ignore contentType when it is a function", () => {
        const headers = formatHttpHeader({
          contentType: (() =>
            "text/plain") as unknown as typeof CONTENT_TYPE.TEXT,
        });
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      });

      it("should ignore contentType when it is BigInt", () => {
        const headers = formatHttpHeader({
          contentType: BigInt(123) as unknown as typeof CONTENT_TYPE.TEXT,
        });
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBeNull();
      });
    });

    describe("cacheControl", () => {
      it("should not set Cache-Control for invalid cacheControl value", () => {
        const headers = formatHttpHeader({
          cacheControl:
            "invalid-cache" as unknown as typeof CACHE_CONTROL.NO_CACHE,
        });
        expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBeNull();
      });

      it("should ignore cacheControl when it is a number", () => {
        const headers = formatHttpHeader({
          cacheControl: 123 as unknown as typeof CACHE_CONTROL.NO_CACHE,
        });
        expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBeNull();
      });

      it("should ignore cacheControl when it is a boolean", () => {
        const headers = formatHttpHeader({
          cacheControl: false as unknown as typeof CACHE_CONTROL.NO_CACHE,
        });
        expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBeNull();
      });

      it("should ignore cacheControl when it is an object", () => {
        const headers = formatHttpHeader({
          cacheControl: {} as unknown as typeof CACHE_CONTROL.NO_CACHE,
        });
        expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBeNull();
      });

      it("should ignore cacheControl when it is null", () => {
        const headers = formatHttpHeader({
          cacheControl: null as unknown as typeof CACHE_CONTROL.NO_CACHE,
        });
        expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBeNull();
      });

      it("should ignore cacheControl when it is undefined (uses default)", () => {
        const headers = formatHttpHeader({
          cacheControl: undefined,
        });
        expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBe(
          CACHE_CONTROL.NO_CACHE
        );
      });
    });

    describe("contentDisposition", () => {
      it("should not set Content-Disposition when type is missing", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: "test.txt",
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when filename is a number", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: 123 as unknown as string,
            type: CONTENT_DISPOSITION.ATTACHMENT,
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when filename is null", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: null as unknown as string,
            type: CONTENT_DISPOSITION.ATTACHMENT,
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when filename is undefined", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: undefined as unknown as string,
            type: CONTENT_DISPOSITION.ATTACHMENT,
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when filename is an object", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: { name: "test" } as unknown as string,
            type: CONTENT_DISPOSITION.ATTACHMENT,
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when filename is an array", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: ["test.txt"] as unknown as string,
            type: CONTENT_DISPOSITION.ATTACHMENT,
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when filename is a boolean", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: true as unknown as string,
            type: CONTENT_DISPOSITION.ATTACHMENT,
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when filename is a function", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: (() => "test") as unknown as string,
            type: CONTENT_DISPOSITION.ATTACHMENT,
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when filename is a Symbol", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: Symbol("test") as unknown as string,
            type: CONTENT_DISPOSITION.ATTACHMENT,
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when type is invalid", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: "test.txt",
            type: "invalid" as unknown as typeof CONTENT_DISPOSITION.ATTACHMENT,
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when type is a number", () => {
        const headers = formatHttpHeader({
          contentDisposition: {
            filename: "test.txt",
            type: 123 as unknown as typeof CONTENT_DISPOSITION.ATTACHMENT,
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when contentDisposition is null", () => {
        const headers = formatHttpHeader({
          contentDisposition: null as unknown as {
            filename: string;
            type: typeof CONTENT_DISPOSITION.ATTACHMENT;
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when contentDisposition is undefined", () => {
        const headers = formatHttpHeader({
          contentDisposition: undefined,
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });

      it("should not set Content-Disposition when contentDisposition is an empty object", () => {
        const headers = formatHttpHeader({
          contentDisposition: {} as unknown as {
            filename: string;
            type: typeof CONTENT_DISPOSITION.ATTACHMENT;
          },
        });
        expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toBeNull();
      });
    });
  });

  describe("boundary conditions", () => {
    it("should handle empty string filename when type is provided", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain('filename=""');
    });

    it("should handle extremely long filename", () => {
      const longFilename = "a".repeat(10000) + ".txt";
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: longFilename,
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain(longFilename);
    });

    it("should handle filename with special characters", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "file<>:?*|.txt",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain("attachment");
    });

    it("should handle filename with unicode characters", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "文件.txt",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain("UTF-8''%E6%96%87%E4%BB%B6.txt");
      // Consecutive non-ASCII chars replaced with single underscore
      expect(disposition).toContain('filename="_.txt"');
    });

    it("should handle filename with only whitespace", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "   ",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain('filename="   "');
    });

    it("should handle filename with newline characters", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "file\nname.txt",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain("file");
    });

    it("should handle filename with tab characters", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "file\tname.txt",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain("file");
    });

    it("should handle all content types from CONTENT_TYPE constant", () => {
      const contentTypes = [
        CONTENT_TYPE.JSON,
        CONTENT_TYPE.JAVASCRIPT,
        CONTENT_TYPE.PDF,
        CONTENT_TYPE.ZIP,
        CONTENT_TYPE.OCTET_STREAM,
        CONTENT_TYPE.XML,
        CONTENT_TYPE.FORM_URLENCODED,
        CONTENT_TYPE.GZIP,
        CONTENT_TYPE.TEXT,
        CONTENT_TYPE.HTML,
        CONTENT_TYPE.CSS,
        CONTENT_TYPE.CSV,
        CONTENT_TYPE.MARKDOWN,
        CONTENT_TYPE.JPEG,
        CONTENT_TYPE.PNG,
        CONTENT_TYPE.GIF,
        CONTENT_TYPE.SVG,
        CONTENT_TYPE.WEBP,
        CONTENT_TYPE.ICO,
        CONTENT_TYPE.MPEG,
        CONTENT_TYPE.MP3,
        CONTENT_TYPE.WAV,
        CONTENT_TYPE.WEBA,
        CONTENT_TYPE.AAC,
        CONTENT_TYPE.M4A,
        CONTENT_TYPE.OGG_AUDIO,
        CONTENT_TYPE.MP4,
        CONTENT_TYPE.WEBM,
        CONTENT_TYPE.OGV,
        CONTENT_TYPE.QUICKTIME,
        CONTENT_TYPE.FORM_DATA,
        CONTENT_TYPE.BYTERANGES,
        CONTENT_TYPE.FOUNTAIN,
      ];

      for (const type of contentTypes) {
        const headers = formatHttpHeader({ contentType: type });
        expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBe(type);
      }
    });

    it("should handle all cache control values from CACHE_CONTROL constant", () => {
      const cacheControls = [
        CACHE_CONTROL.NO_CACHE,
        CACHE_CONTROL.NO_STORE,
        CACHE_CONTROL.MAX_AGE,
        CACHE_CONTROL.PUBLIC,
        CACHE_CONTROL.PRIVATE,
        CACHE_CONTROL.MUST_REVALIDATE,
        CACHE_CONTROL.PROXY_REVALIDATE,
        CACHE_CONTROL.S_MAXAGE,
      ];

      for (const cache of cacheControls) {
        const headers = formatHttpHeader({ cacheControl: cache });
        expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBe(cache);
      }
    });

    it("should handle mixed valid and invalid options", () => {
      const headers = formatHttpHeader({
        contentType: CONTENT_TYPE.JSON,
        cacheControl: "invalid" as unknown as typeof CACHE_CONTROL.NO_CACHE,
        contentDisposition: {
          filename: "test.txt",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      expect(headers.get(HTTP_HEADER.CONTENT_TYPE)).toBe(CONTENT_TYPE.JSON);
      expect(headers.get(HTTP_HEADER.CACHE_CONTROL)).toBeNull();
      expect(headers.get(HTTP_HEADER.CONTENT_DISPOSITION)).toContain(
        "attachment"
      );
    });

    it("should return a new Headers instance each time", () => {
      const headers1 = formatHttpHeader({ contentType: CONTENT_TYPE.JSON });
      const headers2 = formatHttpHeader({ contentType: CONTENT_TYPE.JSON });
      expect(headers1).not.toBe(headers2);
    });

    it("should handle filename with control characters (non-printable ASCII)", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "file\x00\x01\x02.txt",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      // Consecutive non-printable chars replaced with single underscore
      expect(disposition).toContain('filename="file_.txt"');
    });

    it("should handle filename that is only emoji", () => {
      const headers = formatHttpHeader({
        contentDisposition: {
          filename: "🎉🎊🎈",
          type: CONTENT_DISPOSITION.ATTACHMENT,
        },
      });
      const disposition = headers.get(HTTP_HEADER.CONTENT_DISPOSITION);
      expect(disposition).toContain('filename="_"');
      expect(disposition).toContain("UTF-8''");
    });
  });
});
