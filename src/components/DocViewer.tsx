// src/components/DocViewer.tsx
'use client';

import { Document, Page, pdfjs } from 'react-pdf';

// Required imports for react-pdf


pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

// Configure the worker for PDF.js


// Define the types for the component's props
interface DocViewerProps {
  fileUrl: string;
  pageNumber: number;
  onClose: () => void; // A function to close the viewer
}

export default function DocViewer({ fileUrl, pageNumber, onClose }: DocViewerProps) {
  return (
    // This creates a modal-like overlay
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{ position: 'relative', width: '80%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Close button inside the viewer */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '8px 12px',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: 1001,
            fontWeight: 'bold',
          }}
        >
          X
        </button>

        <Document
          file={fileUrl}
          onLoadError={console.error}
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
}