"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Note: SplitText is a GSAP Club plugin.
// If you have it, you can import and register it here.
// For now, we are using ScrollTrigger as requested.
gsap.registerPlugin(ScrollTrigger);

interface TextBlockAnimationProps {
  children: React.ReactNode;
  blockColor?: string;
  duration?: number;
  stagger?: number;
  delay?: number;
  animateOnScroll?: boolean;
  stayActive?: boolean;
}

const TextBlockAnimation: React.FC<TextBlockAnimationProps> = ({
  children,
  blockColor = "#eab308", // Yellow theme matching HikePAD
  duration = 0.8,
  stagger = 0.05,
  delay = 0,
  animateOnScroll = true,
  stayActive = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current || !blockRef.current || !contentRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: animateOnScroll
        ? {
            trigger: containerRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          }
        : undefined,
      delay,
    });

    // Resetting states
    gsap.set(contentRef.current, { opacity: 0 });
    gsap.set(blockRef.current, { scaleX: 0, transformOrigin: "left" });

    // Build timeline: Block reveal animation
    const animation = tl.to(blockRef.current, {
      scaleX: 1,
      duration: duration * 0.4,
      ease: "power2.inOut",
    })
    .set(contentRef.current, { opacity: 1 });

    if (!stayActive) {
      animation.to(blockRef.current, {
        scaleX: 0,
        transformOrigin: "right",
        duration: duration * 0.6,
        ease: "power2.inOut",
      });
    }

  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden inline-block align-bottom px-1"
    >
      <div ref={contentRef} className="relative z-0">
        {children}
      </div>
      <div
        ref={blockRef}
        className="absolute inset-x-0 bottom-0 top-0 z-10 pointer-events-none"
        style={{ backgroundColor: blockColor }}
      />
    </div>
  );
};

export default TextBlockAnimation;
