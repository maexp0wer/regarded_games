// src/components/DataTable.tsx

import React from 'react';

// Define the possible breakpoint values
type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// A header can be a simple string or an object for more control
type Header = string | {
  label: string;
  showMobileLabel?: boolean;
};

// Define the types for our props
interface DataTableProps {
  headers: Header[];
  rows: (string | number | React.ReactNode)[][];
  caption?: string;
  className?: string;
  breakpoint?: Breakpoint; // Optional breakpoint prop
}

export default function DataTable({ headers, rows, caption, className, breakpoint = 'sm' }: DataTableProps) {
  
  // This lookup object contains all possible breakpoint-specific classes.
  // This is required for Tailwind's JIT compiler to detect and generate the necessary CSS.
  const desktopClasses = {
    thead: {
      sm: 'sm:table-header-group', md: 'md:table-header-group', lg: 'lg:table-header-group', xl: 'xl:table-header-group', '2xl': '2xl:table-header-group',
    },
    tbody: {
      sm: 'sm:table-row-group', md: 'md:table-row-group', lg: 'lg:table-row-group', xl: 'xl:table-row-group', '2xl': '2xl:table-row-group',
    },
    tr: {
      sm: 'sm:p-0 sm:table-row', md: 'md:p-0 md:table-row', lg: 'lg:p-0 lg:table-row', xl: 'xl:p-0 xl:table-row', '2xl': '2xl:p-0 2xl:table-row',
    },
    cell: { // For both <td> and <th>
      sm: 'sm:table-cell sm:text-left sm:px-6 sm:py-4 sm:before:content-none', md: 'md:table-cell md:text-left md:px-6 md:py-4 md:before:content-none', lg: 'lg:table-cell lg:text-left lg:px-6 lg:py-4 lg:before:content-none', xl: 'xl:table-cell xl:text-left xl:px-6 xl:py-4 xl:before:content-none', '2xl': '2xl:table-cell 2xl:text-left 2xl:px-6 2xl:py-4 2xl:before:content-none',
    },
    thScopeRow: { // Specific styles for the row header cell
      sm: 'sm:font-medium sm:text-text', md: 'md:font-medium md:text-text', lg: 'lg:font-medium lg:text-text', xl: 'xl:font-medium xl:text-text', '2xl': '2xl:font-medium 2xl:text-text',
    }
  };

  const normalizedHeaders = headers.map(header => 
    typeof header === 'string' ? { label: header, showMobileLabel: true } : { ...header, showMobileLabel: header.showMobileLabel ?? true }
  );

  return (
    <div className="rounded-lg border border-card overflow-hidden">
      <table className={`w-full text-sm text-left text-text ${className || ''}`}>
        {caption && (
          <caption className="p-4 text-lg font-semibold text-left text-text bg-card">{caption}</caption>
        )}

        <thead className={`hidden ${desktopClasses.thead[breakpoint]} text-xs uppercase bg-card`}>
          <tr>
            {normalizedHeaders.map((header, index) => (
              <th scope="col" key={index} className="px-6 py-3">{header.label}</th>
            ))}
          </tr>
        </thead>
        
        <tbody className={`block ${desktopClasses.tbody[breakpoint]}`}>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={`block border-b border-card p-4 bg-card2 ${desktopClasses.tr[breakpoint]}`}>
              {row.map((cell, cellIndex) => {
                const headerConfig = normalizedHeaders[cellIndex];
                const showLabelOnMobile = headerConfig.showMobileLabel;
                const mobileLayoutClasses = showLabelOnMobile ? 'text-right flex justify-between items-center before:content-[attr(data-label)] before:font-bold before:text-left before:mr-4' : 'text-left';
                
                if (cellIndex === 0) {
                  return (
                    <th scope="row" key={cellIndex} data-label={showLabelOnMobile ? headerConfig.label + ':' : ''}
                        className={`block py-2 px-1 ${mobileLayoutClasses} ${desktopClasses.cell[breakpoint]} ${desktopClasses.thScopeRow[breakpoint]}`}>
                      <span className="break-words">{cell}</span>
                    </th>
                  );
                }
                
                return (
                  <td key={cellIndex} data-label={showLabelOnMobile ? headerConfig.label + ':' : ''}
                      className={`block py-2 px-1 ${mobileLayoutClasses} ${desktopClasses.cell[breakpoint]}`}>
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