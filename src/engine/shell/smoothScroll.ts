import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling with Lenis synchronized with ScrollTrigger (the official recipe of both libraries).
 * With reduced motion Lenis is not installed: native scrolling is already the right behavior.
 * By default the browser's scroll restoration is turned off and the page starts at the top;
 * with `resetToTop: false` the anchor and the restoration are respected (the playground's deep links),
 * and clicks on the page's anchors also go through Lenis.
 */
export function setupSmoothScroll({ resetToTop = true }: { resetToTop?: boolean } = {}): () => void {
  if (resetToTop) {
    // Every visit starts on the desktop: the boot and the reveal are the first screen.
    history.scrollRestoration = 'manual';
    // ScrollTrigger remembers the mode in place when it was registered ('auto') and restores it on
    // every refresh: without this, reloading sent the browser back to the previous position.
    ScrollTrigger.clearScrollMemory('manual');
    window.scrollTo(0, 0);
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const lenis = new Lenis(resetToTop ? { lerp: 0.12 } : { lerp: 0.12, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  // Development only: automated captures need to jump without animation (lenis.scrollTo immediate).
  if (import.meta.env.DEV) Object.assign(window, { __lenis: lenis });

  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}
