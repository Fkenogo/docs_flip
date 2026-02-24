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
  const viewerRef = useRef(null);
  const mountRef = useRef(null);
  const pageFlipRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewerError, setViewerError] = useState('');

  const handleFullscreen = async () => {
    const target = viewerRef.current;
    if (!target || !target.isConnected || !target.requestFullscreen) return;

    try {
      await target.requestFullscreen();
    } catch {
      // Ignore user-agent fullscreen rejections (gesture/policy related).
    }
  };

  // Initializes page-flip after images are available and cleans up on unmount.
  useEffect(() => {
    if (!mountRef.current || !pageUrls?.length) return undefined;

    let cancelled = false;
    mountRef.current.innerHTML = '';

    const initTimeout = window.setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 3000);

    const initializeViewer = async () => {
      try {
        const pageNodes = await Promise.all(
          pageUrls.map((url, index) => {
            return new Promise((resolve, reject) => {
              const page = document.createElement('div');
              page.className = 'flip-page';

              const image = document.createElement('img');
              image.src = url;
              image.alt = `${title || 'document'} page ${index + 1}`;
              image.loading = 'eager';
              image.className = 'flip-page-image';

              image.onload = () => {
                page.appendChild(image);
                resolve(page);
              };
              image.onerror = () => reject(new Error(`Failed to load page image ${index + 1}`));
            });
          })
        );

        if (cancelled || !mountRef.current) return;

        pageNodes.forEach((page) => mountRef.current.appendChild(page));

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

        pageFlip.loadFromHTML(pageNodes);
        pageFlip.on('flip', (event) => {
          const page = (event.data || 0) + 1;
          setCurrentPage(page);
          if (onPageTurn) onPageTurn(page);
        });
        pageFlip.on('init', () => {
          if (!cancelled) {
            window.clearTimeout(initTimeout);
            setViewerError('');
            setIsLoading(false);
          }
        });

        pageFlipRef.current = pageFlip;
      } catch (err) {
        if (!cancelled) {
          window.clearTimeout(initTimeout);
          setViewerError(err?.message || 'Failed to initialize flipbook viewer.');
          setIsLoading(false);
        }
      }
    };

    initializeViewer();

    return () => {
      cancelled = true;
      window.clearTimeout(initTimeout);
      if (pageFlipRef.current) {
        pageFlipRef.current.destroy();
        pageFlipRef.current = null;
      }
    };
  }, [pageUrls, title, onPageTurn]);

  return (
    <main
      ref={viewerRef}
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

      {!isLoading && viewerError ? (
        <p style={{ textAlign: 'center', marginBottom: '1rem' }}>{viewerError}</p>
      ) : null}

      <section
        ref={mountRef}
        style={{
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto',
          minHeight: '70vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
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
        <button type="button" onClick={handleFullscreen}>
          Fullscreen
        </button>
      </footer>

      <style jsx global>{`
        .stf__parent {
          margin: 0 auto;
        }

        .stf__item {
          background: #ffffff;
          overflow: hidden;
        }

        .stf__item img {
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
