import React, { Children, isValidElement, ReactNode } from 'react';

// Simplified type definitions for this specific component
interface ResponsiveMDXTableProps {
  headers: string[]; // Now strictly requires a string array (which MDX extraction provides)
  rows: (string | number | React.ReactNode)[][];
  caption?: string;
}

// This component directly applies the classes from your original DataTable
export default function ResponsiveMDXTable({ headers, rows, caption }: ResponsiveMDXTableProps) {
  
  // Normalized Headers: Simple string array is sufficient
  const headerLabels = headers; // The list of column titles

  return (
    <div className="rounded-lg border border-card overflow-hidden my-6">
      <table className="w-full text-sm text-left text-text">

        {caption && (
          <caption className="p-4 text-lg font-semibold text-left text-text bg-card">{caption}</caption>
        )}

        {/* Thead: Hidden on mobile, table-header-group on small screens and up (sm:) */}
        <thead className="hidden sm:table-header-group text-xs uppercase bg-card">
          <tr>
            {headerLabels.map((label, index) => (
              <th scope="col" key={index} className="px-6 py-3">{label}</th>
            ))}
          </tr>
        </thead>
        
        {/* Tbody: Block on mobile, table-row-group on small screens and up (sm:) */}
        <tbody className="block sm:table-row-group">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} 
                // TR: Block/padding on mobile, table-row/no-padding on small screens (sm:)
                className="block border-b border-card p-4 bg-card2 sm:p-0 sm:table-row"
            >
              {row.map((cell, cellIndex) => {
                // Get the label for the current column
                const label = headerLabels[cellIndex] || ''; 
                
                // Mobile Layout Classes (Assumes mobile label is always visible for simplicity)
                const mobileLayoutClasses = 'text-right flex justify-between items-center before:content-[attr(data-label)] before:font-bold before:text-left before:mr-4';
                
                // Common classes: Block/padding on mobile, table-cell/reset-padding on small screens (sm:)
                const cellBaseClasses = `block py-2 px-1 sm:table-cell sm:text-left sm:px-6 sm:py-4 sm:before:content-none`;
                
                if (cellIndex === 0) {
                  return (
                    <th scope="row" key={cellIndex} data-label={label + ':'}
                        className={`${cellBaseClasses} ${mobileLayoutClasses} sm:font-medium sm:text-text`}>
                      <span className="break-words">{cell}</span>
                    </th>
                  );
                }
                
                return (
                  <td key={cellIndex} data-label={label + ':'}
                      className={`${cellBaseClasses} ${mobileLayoutClasses}`}>
                    <span className="break-words">{cell}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}