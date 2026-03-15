"use client";

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface D3BackgroundProps {
  theme?: string;
}

export default function D3Background({ theme = 'dark' }: D3BackgroundProps) {
  const d3Container = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!d3Container.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select(d3Container.current)
      .attr('width', width)
      .attr('height', height);

    // Placeholder visualization: Floating green particles
    const numParticles = 80;
    const particles = Array.from({ length: numParticles }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 3 + 1,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.2
    }));

    const circles = svg.selectAll('circle')
      .data(particles)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('fill', theme === 'light' ? '#a855f7' : '#00FF41') // purple-500 for light mode
      .attr('opacity', d => d.opacity);

    const timer = d3.timer(() => {
      circles
        .attr('cx', d => {
          d.x += d.vx;
          if (d.x < 0 || d.x > width) d.vx *= -1;
          return d.x;
        })
        .attr('cy', d => {
          d.y += d.vy;
          if (d.y < 0 || d.y > height) d.vy *= -1;
          return d.y;
        });
    });

    return () => {
      timer.stop();
      svg.selectAll('*').remove();
    };
  }, []);

  return (
    <svg 
      className="absolute inset-0 pointer-events-none z-0" 
      ref={d3Container} 
      style={{ filter: "blur(1px)" }}
    />
  );
}
