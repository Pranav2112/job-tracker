import { gsap } from 'gsap'

/** Staggered fade-up entrance for a list of elements */
export function animateListIn(selector: string, container?: Element) {
  const ctx = container ?? document
  const els = ctx.querySelectorAll(selector)
  if (!els.length) return
  gsap.fromTo(els,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 0.42, ease: 'power2.out', stagger: 0.06, clearProps: 'transform' }
  )
}

/** Single element fade-up */
export function animateIn(el: Element | null, delay = 0) {
  if (!el) return
  gsap.fromTo(el,
    { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out', delay, clearProps: 'transform' }
  )
}

/** Slide in from left (sidebar entrance) */
export function animateSidebarIn(el: Element | null) {
  if (!el) return
  gsap.fromTo(el,
    { x: -20, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out', clearProps: 'transform' }
  )
}

/** Scale pop for a modal or card */
export function animatePopIn(el: Element | null) {
  if (!el) return
  gsap.fromTo(el,
    { scale: 0.94, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)', clearProps: 'transform' }
  )
}

/** Animated number counter */
export function animateCounter(el: HTMLElement | null, target: number, duration = 1.1) {
  if (!el) return
  const obj = { val: 0 }
  gsap.to(obj, {
    val: target,
    duration,
    ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(obj.val).toString() },
  })
}

/** Hover lift — attach to onMouseEnter/Leave */
export function hoverLift(el: Element | null) {
  if (!el) return
  gsap.to(el, { y: -3, duration: 0.2, ease: 'power2.out' })
}
export function hoverDrop(el: Element | null) {
  if (!el) return
  gsap.to(el, { y: 0, duration: 0.2, ease: 'power2.inOut' })
}

/** Slide a floating bar in/out */
export function animateBarIn(el: Element | null) {
  if (!el) return
  gsap.fromTo(el,
    { y: 60, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out', clearProps: 'transform' }
  )
}
export function animateBarOut(el: Element | null, onComplete?: () => void) {
  if (!el) return
  gsap.to(el, { y: 60, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete })
}
