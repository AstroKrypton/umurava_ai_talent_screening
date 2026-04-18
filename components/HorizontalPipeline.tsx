"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function HorizontalPipeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const svgLineRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!containerRef.current || !trackRef.current) return;

    // We animate the track wrapper, which contains the panels.
    // The glass cards themselves don't have will-change-transform, 
    // ensuring backdrop-filter performance remains smooth.
    const sections = gsap.utils.toArray(".pipeline-panel");

    // Horizontal Scroll Timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        pin: true,
        scrub: 1,
        // The total scroll distance determines the speed. 
        // 200vw means the user scrolls 2 screens worth to see all 3 panels.
        end: "+=2000",
      },
    });

    // Move the track to the left. Since we have 3 panels of 100vw each, 
    // we need to move exactly -66.66% to reveal the final panel.
    tl.to(trackRef.current, {
      xPercent: -66.66,
      ease: "none",
    });

    // SVG Line drawing animation tied to scroll progress
    if (svgLineRef.current) {
      const length = svgLineRef.current.getTotalLength();
      gsap.set(svgLineRef.current, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });

      tl.to(
        svgLineRef.current,
        {
          strokeDashoffset: 0,
          ease: "none",
        },
        0 // Start line drawing at the same time as scrolling
      );
    }

    // Refresh ScrollTrigger when components mount to recalculate heights
    ScrollTrigger.refresh();

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="pipeline-container relative bg-[#F5F5F7]">
      {/* Background SVG Line that spans the whole track width */}
      <div className="absolute top-1/2 left-0 w-[300vw] h-[2px] -translate-y-1/2 z-0 pointer-events-none px-[50vw]">
        <svg width="100%" height="2px" preserveAspectRatio="none">
          <line
            x1="0"
            y1="1"
            x2="100%"
            y2="1"
            stroke="#E5E7EB"
            strokeWidth="2"
          />
          <path
            ref={svgLineRef}
            d="M 0,1 L 10000,1" /* Path is long enough to cover 300vw */
            stroke="#007AFF"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      <div ref={trackRef} className="pipeline-track z-10 flex">
        {/* =========================================
            STAGE 1: SOURCE
            ========================================= */}
        <section className="pipeline-panel w-screen h-screen flex-shrink-0">
          <div className="glass-card w-full max-w-4xl p-12 relative flex flex-col md:flex-row items-center gap-12">
            
            <div className="flex-1 space-y-6">
              <div className="inline-block px-3 py-1 bg-[#E8F3FC] text-[#0B4F8A] text-sm font-semibold rounded-full tracking-tight">
                Stage 1 — Intelligent sourcing
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                Intelligent <br /> Sourcing
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed max-w-md">
                Our AI continuously scans thousands of professional profiles, aggregating data points to build a comprehensive talent graph tailored to your specific needs.
              </p>
            </div>

            <div className="flex-1 relative w-full h-[400px] flex items-center justify-center">
              {/* Central AI Node */}
              <div className="absolute w-24 h-24 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center z-10">
                <div className="w-12 h-12 rounded-full bg-[#0B4F8A]/20 flex items-center justify-center pulse-dot">
                   <div className="w-6 h-6 rounded-full bg-[#0B4F8A]"></div>
                </div>
              </div>

              {/* Floating Talent Cards */}
              <div className="absolute top-10 right-10 w-48 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-100 float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E8F3FC] rounded-full flex items-center justify-center text-xs font-bold text-[#0B4F8A]">AU</div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Amina Uwase</div>
                    <div className="text-[10px] text-slate-400">Backend Engineer</div>
                  </div>
                  <div className="ml-auto text-sm font-bold text-[#1A8C4E]">87</div>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <span className="text-[9px] bg-[#E8F3FC] text-[#0B4F8A] px-2 py-0.5 rounded-full font-medium">Node.js</span>
                  <span className="text-[9px] bg-[#E6F6EE] text-[#1A8C4E] px-2 py-0.5 rounded-full font-medium">Expert</span>
                </div>
              </div>

              <div className="absolute bottom-10 left-10 w-48 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-100 float float-delay-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E6F6EE] rounded-full flex items-center justify-center text-xs font-bold text-[#1A8C4E]">JM</div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Jean Mugisha</div>
                    <div className="text-[10px] text-slate-400">Full-Stack Engineer</div>
                  </div>
                  <div className="ml-auto text-sm font-bold text-[#1A8C4E]">74</div>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <span className="text-[9px] bg-[#E8F3FC] text-[#0B4F8A] px-2 py-0.5 rounded-full font-medium">React</span>
                  <span className="text-[9px] bg-[#FEF8E1] text-[#7A5C00] px-2 py-0.5 rounded-full font-medium">Advanced</span>
                </div>
              </div>

              <div className="absolute bottom-24 right-4 w-40 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-100 float float-delay-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FEF8E1] rounded-full flex items-center justify-center text-xs font-bold text-[#7A5C00]">GN</div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Grace Nkurunziza</div>
                    <div className="text-[10px] text-slate-400">Backend Engineer</div>
                  </div>
                  <div className="ml-auto text-sm font-bold text-slate-400">61</div>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <span className="text-[9px] bg-[#E8F3FC] text-[#0B4F8A] px-2 py-0.5 rounded-full font-medium">Python</span>
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Intermediate</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* =========================================
            STAGE 2: SCREEN
            ========================================= */}
        <section className="pipeline-panel w-screen h-screen flex-shrink-0">
          <div className="glass-card w-full max-w-4xl p-12 relative flex flex-col md:flex-row-reverse items-center gap-12">
            
            <div className="flex-1 space-y-6">
              <div className="inline-block px-3 py-1 bg-[#34C759]/10 text-[#34C759] text-sm font-semibold rounded-full tracking-tight">
                Stage 2 — Precision screening
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                Precision <br /> Screening
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed max-w-md">
                Every candidate is evaluated against deep technical parameters, cultural fit markers, and projected growth potential with extreme accuracy.
              </p>
            </div>

            <div className="flex-1 w-full flex flex-col items-center justify-center">
              {/* Massive Progress Ring */}
              <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {/* Background Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="4"
                  />
                  {/* Animated Progress Ring */}
                  {/* 2 * pi * r = 2 * 3.14159 * 90 = 565 */}
                  <circle
                    className="progress-ring-circle animate"
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#1A8C4E"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="565"
                    strokeDashoffset="11.3" /* 98% Match (565 * 0.02) */
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                  <span className="text-6xl font-light text-slate-900 tracking-tighter">98<span className="text-4xl text-slate-400">%</span></span>
                  <span className="text-sm font-medium text-slate-500 mt-2 uppercase tracking-widest">Match</span>
                </div>
              </div>
              <div className="w-full space-y-2 mt-2">
                {[
                  { label: "Skills", value: 92, color: "#1A8C4E" },
                  { label: "Experience", value: 80, color: "#1A8C4E" },
                  { label: "Education", value: 75, color: "#F5C518" },
                  { label: "Relevance", value: 88, color: "#1A8C4E" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 w-20 shrink-0">{item.label}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${item.value}%`, background: item.color }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 w-7 text-right">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* iOS Pill Tags for Skills */}
              <div className="flex flex-wrap justify-center gap-2 max-w-[280px]">
                <span className="pill-tag bg-slate-100 text-slate-700">
                  <svg className="w-3 h-3 text-[#1A8C4E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  React Architecture
                </span>
                <span className="pill-tag bg-slate-100 text-slate-700">
                  <svg className="w-3 h-3 text-[#1A8C4E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  System Design
                </span>
                <span className="pill-tag bg-slate-100 text-slate-700">
                  <svg className="w-3 h-3 text-[#1A8C4E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Team Leadership
                </span>
                <span className="pill-tag bg-slate-100 text-slate-700">TypeScript</span>
                <span className="pill-tag bg-slate-100 text-slate-700">Next.js 14</span>
              </div>
            </div>

          </div>
        </section>

        {/* =========================================
            STAGE 3: ANALYZE
            ========================================= */}
        <section className="pipeline-panel w-screen h-screen flex-shrink-0">
          <div className="glass-card w-full max-w-4xl p-12 relative flex flex-col md:flex-row items-center gap-12">
            
            <div className="flex-1 space-y-6">
              <div className="inline-block px-3 py-1 bg-purple-500/10 text-purple-600 text-sm font-semibold rounded-full tracking-tight">
                Stage 3 — In-depth analysis
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                In-Depth <br /> Analysis
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed max-w-md">
                We synthesize the screening data into actionable intelligence, highlighting key strengths, potential risk factors, and clear hiring recommendations.
              </p>
            </div>

            <div className="flex-1 w-full space-y-4">
              {/* Strengths Box */}
              <div className="bg-white/80 rounded-2xl p-6 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                 <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[#1A8C4E]"></div>
                   Core Strengths
                 </h3>
                 <ul className="space-y-3">
                   <li className="flex items-start gap-3">
                     <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                     <span className="text-slate-600 text-sm">Exceptional problem-solving capabilities demonstrated in coding assessment.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                     <span className="text-slate-600 text-sm">Strong communication skills and cultural alignment.</span>
                   </li>
                 </ul>
              </div>

               {/* Risk / Gap Flags */}
               <div className="bg-[#FAF0ED] rounded-2xl p-6 border-l-4 border-[#C8401E] shadow-sm transition-all hover:shadow-md">
                 <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[#C8401E]"></div>
                   Risk & Growth Areas
                 </h3>
                 <p className="text-slate-600 text-sm pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-slate-300 border-l-2 border-transparent">
                   Limited experience with massive scale microservices. Will need onboarding support for internal CI/CD pipelines.
                 </p>
              </div>

              {/* AI Recommendation (Blue Tint) */}
              <div className="bg-[#E8F3FC] rounded-2xl p-6 border border-[#0B4F8A]/20 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-[#0B4F8A] rounded-tl-2xl rounded-tr-2xl"></div>
                 <h3 className="text-sm font-semibold text-[#0B4F8A] uppercase tracking-wider mb-2">
                   AI Recommendation
                 </h3>
                 <div className="flex items-end gap-4">
                    <p className="text-slate-800 font-medium text-lg flex-1">
                      Strong Hire. Proceed to final interview.
                    </p>
                    <button className="bg-[#0B4F8A] hover:bg-[#093d6e] text-white px-5 py-2 rounded-full text-sm font-medium transition-colors shadow-sm">
                       View Profile
                    </button>
                 </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
