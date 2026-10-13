import { useEffect, useState } from "react";

const FRAMES = ["rink/one.jpg", "rink/two.jpg", "rink/three.jpg"];

export function RinkBackdrop() {
  const [frame, setFrame] = useState(0);
  const base = import.meta.env.BASE_URL ?? "/";
  useEffect(() => {
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % FRAMES.length), 7000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {FRAMES.map((file, index) => (
        <img
          key={file}
          src={`${base}${file}`}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ${index === frame ? "opacity-100" : "opacity-0"}`}
          style={{ filter: "blur(14px) saturate(1.2) brightness(0.42)" }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(8,20,40,0.15),rgba(5,8,18,0.72)_70%)]" />
    </div>
  );
}
