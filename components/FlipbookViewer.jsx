'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { PageFlip } from 'page-flip';

// Renders the interactive flipbook and exposes page turn callbacks for analytics.
export default function FlipbookViewer({
  pageUrls,
  title,
  logoUrl,
  brandColor,
  showBranding,
  onPageTurn,
}) {
  const mountRef = useRef(null);
  const pageFlipRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Initializes page-flip after images are available and cleans up on unmount.
  useEffect(() => {
    if (!mountRef.current || !pageUrls?.length) return undefined;

    mountRef.current.innerHTML = '';
    const pages = pageUrls.map((url, index) => {
      const page = document.createElement('div');
      page.className = 'flip-page';

      const image = document.createElement('img');
      image.src = url;
      image.alt = `${title || 'document'} page ${index + 1}`;
      image.loading = 'lazy';
      image.className = 'flip-page-image';

      page.appendChild(image);
      return page;
    });

    pages.forEach((page) => mountRef.current.appendChild(page));

    const pageFlip = new PageFlip(mountRef.current, {
      width: 550,
      height: 733,
      size: 'stretch',
      minWidth: 280,
      maxWidth: 1200,
      minHeight: 360,
      maxHeight: 1550,
      usePortrait: true,
      showCover: false,
      mobileScrollSupport: true,
      drawShadow: true,
      flippingTime: 650,
    });

    pageFlip.loadFromHTML(pages);
    pageFlip.on('flip', (event) => {
      const page = (event.data || 0) + 1;
      setCurrentPage(page);
      if (onPageTurn) onPageTurn(page);
    });

    const initTimeout = window.setTimeout(() => {
      setIsLoading(false);
    }, 600);

    pageFlip.on('init', () => {
      window.clearTimeout(initTimeout);
      setIsLoading(false);
    });

    pageFlipRef.current = pageFlip;

    return () => {
      window.clearTimeout(initTimeout);
      if (pageFlipRef.current) {
        pageFlipRef.current.destroy();
        pageFlipRef.current = null;
      }
    };
  }, [pageUrls, title, onPageTurn]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: brandColor || '#1B4F8A',
        color: '#fff',
        padding: '1rem',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Brand logo"
            width={120}
            height={40}
            style={{ height: '2.5rem', width: 'auto', objectFit: 'contain' }}
          />
        ) : null}
        <strong>{title}</strong>
        {showBranding ? <span>Powered by Docsflip</span> : null}
      </header>

      {isLoading ? (
        <div
          style={{
            height: '60vh',
            borderRadius: '12px',
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.12) 25%, rgba(255,255,255,0.22) 37%, rgba(255,255,255,0.12) 63%)',
            backgroundSize: '400% 100%',
            animation: 'docsflip-skeleton 1.2s ease-in-out infinite',
            marginBottom: '1rem',
          }}
        />
      ) : null}

      <section
        ref={mountRef}
        style={{
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto',
          minHeight: '60vh',
        }}
      />

      <footer
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <button type="button" onClick={() => pageFlipRef.current?.flipPrev()}>
          Previous
        </button>
        <span>
          {currentPage} / {pageUrls?.length || 0}
        </span>
        <button type="button" onClick={() => pageFlipRef.current?.flipNext()}>
          Next
        </button>
        <button type="button" onClick={() => mountRef.current?.requestFullscreen()}>
          Fullscreen
        </button>
      </footer>

      <style jsx global>{`
        .flip-page {
          background: #ffffff;
          overflow: hidden;
        }

        .flip-page-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          background: #ffffff;
        }

        @keyframes docsflip-skeleton {
          0% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0 50%;
          }
        }
      `}</style>
    </main>
  );
}
