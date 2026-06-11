/**
 * Generic DOM scrolling utilities
 */

type WaitAndScrollOptions = {
  elementId: string;
  scrollFn: (element: HTMLElement) => void;
};

const DATA_RADIX_SCROLL_AREA_VIEWPORT = "[data-radix-scroll-area-viewport]";

/**
 * Generic utility to wait for an element to exist and then scroll to it
 *
 * IMPORTANT: This function waits for layout stability before scrolling.
 * On initial page load, React may still be rendering content above the target element,
 * which causes the element's position to shift after we calculate the scroll position.
 *
 * Strategy:
 * 1. Check if element exists in DOM
 * 2. Check if element has rendered dimensions (height > 0)
 * 3. Wait for scrollHeight to stabilize (no changes for consecutive frames)
 * 4. Only then execute scroll with accurate position calculation
 *
 * Uses requestAnimationFrame to efficiently check on each browser paint cycle.
 */
const waitForElementAndScroll = ({
  elementId,
  scrollFn,
}: WaitAndScrollOptions) => {
  let lastScrollHeight = 0;
  let stableFrames = 0;

  // Wait for 6 consecutive frames (~50ms at 60fps) with the same scrollHeight
  // This ensures all content above the target element has finished rendering
  // - If small (1-2): Risk scrolling while content still loading
  // - 6 frames: Sweet spot for reliability vs speed
  const REQUIRED_STABLE_FRAMES = 6;

  const attemptScroll = () => {
    const element = document.getElementById(elementId);

    if (!element) {
      // Element not in DOM yet, wait for next frame
      requestAnimationFrame(attemptScroll);
      return;
    }

    // Check if element has been rendered with stable dimensions
    // If height is 0 or very small, React hasn't finished laying it out yet
    const rect = element.getBoundingClientRect();
    if (rect.height < 1) {
      // Element exists but hasn't been laid out yet, wait for next frame
      requestAnimationFrame(attemptScroll);
      return;
    }

    // Check if the scroll container has stabilized
    // This ensures all content above the element has finished rendering.
    // Without this check, on initial load the element might be at position 10000px,
    // but as more content renders above it, its position shifts to 15000px,
    // making our scroll calculation incorrect.
    const scrollContainer = element.closest(DATA_RADIX_SCROLL_AREA_VIEWPORT);
    const currentScrollHeight =
      scrollContainer?.scrollHeight || document.documentElement.scrollHeight;

    if (currentScrollHeight === lastScrollHeight) {
      // scrollHeight unchanged from last frame, increment stability counter
      stableFrames++;
    } else {
      // scrollHeight changed, content still rendering - reset counter
      stableFrames = 0;
      lastScrollHeight = currentScrollHeight;
    }

    if (stableFrames < REQUIRED_STABLE_FRAMES) {
      // Not stable yet, wait for next frame
      requestAnimationFrame(attemptScroll);
      return;
    }

    // All checks passed: element exists, has dimensions, and layout is stable
    // Safe to execute scroll with accurate position calculation
    scrollFn(element);
  };

  attemptScroll();
};

/**
 * Scrolls to center an element within a specific viewport container
 * Works with Radix ScrollArea components or falls back to native scrollIntoView
 */
export const scrollToElement = ({
  elementId,
  viewportRef,
}: {
  elementId: string;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
}) => {
  waitForElementAndScroll({
    elementId,
    scrollFn: (element) => {
      const viewport = viewportRef?.current?.querySelector(
        DATA_RADIX_SCROLL_AREA_VIEWPORT
      );

      if (viewport) {
        const elementRect = element.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();
        const scrollTop = viewport.scrollTop;

        // Calculate position to center the element in viewport
        const elementTop = elementRect.top - viewportRect.top + scrollTop;
        const viewportHeight = viewportRect.height;
        const elementHeight = elementRect.height;
        const centerPosition =
          elementTop - viewportHeight / 2 + elementHeight / 2;

        viewport.scrollTo({
          top: Math.max(0, centerPosition),
          behavior: "smooth",
        });
      } else {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    },
  });
};

/**
 * Scrolls to a primary element first, then chains to a secondary element
 * Uses Intersection Observer to detect when primary scroll is complete
 */
export const scrollToElementWithChain = ({
  primaryElementId,
  secondaryElementId,
  viewportRef,
}: {
  primaryElementId: string;
  secondaryElementId: string;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
}) => {
  // Step 1: Scroll to primary element
  scrollToElement({
    elementId: primaryElementId,
    viewportRef,
  });

  // Step 2: Use Intersection Observer to detect when primary element is centered
  const primaryElement = document.getElementById(primaryElementId);
  if (primaryElement) {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries?.[0];
        if (entry?.isIntersecting && entry.intersectionRatio > 0.5) {
          // Primary element is centered, now scroll to secondary element
          scrollToElement({
            elementId: secondaryElementId,
          });
          observer.disconnect();
        }
      },
      {
        root: viewportRef?.current?.querySelector(
          DATA_RADIX_SCROLL_AREA_VIEWPORT
        ),
        threshold: 0.5, // When 50% of primary element is visible
      }
    );
    observer.observe(primaryElement);
  }
};
