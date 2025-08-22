// src/components/ScreenshotCarousel.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

const screenshots = [
  { src: "/screenshots/dashboard.png", alt: "Smelinx Dashboard" },
  { src: "/screenshots/api-details.png", alt: "API Detail and Notifications" },
];

export default function ScreenshotCarousel() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((current - 1 + screenshots.length) % screenshots.length);
  const next = () => setCurrent((current + 1) % screenshots.length);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="overflow-hidden rounded-2xl shadow-lg">
        <Image
          src={screenshots[current].src}
          alt={screenshots[current].alt}
          width={1200}
          height={700}
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Controls */}
      <button
        onClick={prev}
        className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/50 text-white px-3 py-1 rounded-full"
      >
        ‹
      </button>
      <button
        onClick={next}
        className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/50 text-white px-3 py-1 rounded-full"
      >
        ›
      </button>

      {/* Dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {screenshots.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full ${
              i === current ? "bg-blue-500" : "bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
