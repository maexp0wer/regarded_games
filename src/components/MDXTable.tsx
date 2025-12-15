import React, { Children, isValidElement, ReactNode } from 'react';
import ResponsiveMDXTable from './ResponsiveMDXTable';

// A strict type guard for a ReactElement that has a children prop.
type ElementWithChildren = React.ReactElement<{ children: ReactNode }>;

// Utility function to check if a ReactNode is a valid element with props.children
function isElementWithChildren(node: ReactNode): node is ElementWithChildren {
    return (
        isValidElement(node) && 
        'props' in node && 
        typeof node.props === 'object' && 
        node.props !== null && 
        'children' in node.props
    );
}

// Helper to extract content from a cell's children
function extractContent(node: ReactNode): ReactNode {
    if (isElementWithChildren(node)) {
        return node.props.children;
    }
    return node;
}

function extractTableData(children: React.ReactNode): { headers: string[], rows: (string | number | React.ReactNode)[][], caption?: string } {
  let headers: string[] = [];
  let rows: (string | number | React.ReactNode)[][] = [];
  let caption: string | undefined = undefined;

  Children.forEach(children, tablePart => {
    if (!isElementWithChildren(tablePart)) return;

    // --- CAPTION ---
    if (tablePart.type === 'caption') {
        caption = String(extractContent(tablePart));
    }
    
    // --- HEADERS (THEAD) ---
    else if (tablePart.type === 'thead') {
      const thead = tablePart as ElementWithChildren;
      
      Children.forEach(thead.props.children, row => { // <tr>
        if (!isElementWithChildren(row) || row.type !== 'tr') return;
        
        Children.forEach(row.props.children, cell => { // <th>
          if (!isElementWithChildren(cell) || cell.type !== 'th') return;
          
          headers.push(String(extractContent(cell)));
        });
      });
    } 
    
    // --- ROWS (TBODY) ---
    else if (tablePart.type === 'tbody') {
      const tbody = tablePart as ElementWithChildren;
      
      Children.forEach(tbody.props.children, row => { // <tr>
        if (!isElementWithChildren(row) || row.type !== 'tr') return;
        
        const newRow: (string | number | React.ReactNode)[] = [];
        
        Children.forEach(row.props.children, cell => { // <td> or <th>
          if (!isElementWithChildren(cell) || (cell.type !== 'td' && cell.type !== 'th')) return; 

          newRow.push(extractContent(cell));
        });
        rows.push(newRow);
      });
    }
  });

  return { headers, rows, caption };
}

interface MDXTableWrapperProps {
  children: React.ReactNode;
}

export default function MDXTableWrapper({ children }: MDXTableWrapperProps) {
  const { headers, rows, caption } = extractTableData(children);

  if (headers.length === 0 || rows.length === 0) {
    return <div className="p-4 bg-red-100 text-red-800 border border-red-300 rounded-md my-4">Error: Table data missing or incorrectly formatted.</div>
  }

  return (
    <div className="my-6">
      <ResponsiveMDXTable 
        // Ensure headers are strictly string[]
        headers={headers.map(h => String(h))} 
        rows={rows} 
        caption={caption}
      />
    </div>
  );
}