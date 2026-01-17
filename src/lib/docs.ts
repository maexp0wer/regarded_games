import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { DocMetadata } from './docs-structure';
import { getHeadingsFromMarkdown } from './toc';

// Define the path to your MDX files
const docsDirectory = path.join(process.cwd(), 'src/content/docs');

interface HeadingNode {
  title: string;
  level: number;
  id?: string;             // Optional because you check 'if (node.id)'
  children?: HeadingNode[]; // Recursive array
}

export type SearchIndexItem = {
  docSlug: string;
  docTitle: string;
  headingTitle: string;
  headingId: string;
  level: number; // 1 = Page Title, 2 = H2, 3 = H3
};

/**
 * 1. Get a list of all documentation files (Chapters)
 * Used for Sidebar navigation and Static Path generation
 */
export function getDocsList(): DocMetadata[] {
  // Check if directory exists to prevent crash on fresh clone
  if (!fs.existsSync(docsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(docsDirectory);

  const allDocsData = fileNames
    .filter((f) => f.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, '');
      const fullPath = path.join(docsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      
      // Parse Frontmatter
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title || slug,
        order: data.order || 99,
        // We aren't using 'parent' anymore in the new architecture, 
        // but keeping it in the type doesn't hurt.
        parent: data.parent || null, 
      };
    });

  // Sort by 'order' field defined in MDX frontmatter
  return allDocsData.sort((a, b) => a.order - b.order);
}

/**
 * 2. Get the content of a specific documentation file
 * Used by the Page renderer
 */
export function getDocContent(slug: string) {
  const fullPath = path.join(docsDirectory, `${slug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { content, data } = matter(fileContents);

  return { content, meta: data };
}



/**
 * 3. Build the Global Search Index
 * Scans ALL files and extracts H2/H3 headings for the Search Bar
 */
export function getGlobalSearchIndex(): SearchIndexItem[] {
  const docs = getDocsList();
  const index: SearchIndexItem[] = [];

  docs.forEach((doc) => {
    // A. Add the Page Title itself (Level 1 match)
    index.push({
      docSlug: doc.slug,
      docTitle: doc.title,
      headingTitle: doc.title,
      headingId: '', // Top of page
      level: 1,
    });

    // B. Read content to find internal headings
    const fullPath = path.join(docsDirectory, `${doc.slug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { content } = matter(fileContents);
    
    // Extract H1/H2/H3 tree
    const headings = getHeadingsFromMarkdown(content);

    // Recursive helper to flatten the tree
    const traverse = (nodes: HeadingNode[]) => {
      nodes.forEach((node) => {
        // We skip Level 1 (H1) inside content if it duplicates the page title,
        // but since we allow multiple H1s now, we generally include them if they have IDs.
        if (node.id) {
          index.push({
            docSlug: doc.slug,
            docTitle: doc.title,
            headingTitle: node.title,
            headingId: node.id,
            level: node.level,
          });
        }
        
        // Recursive call now works because TypeScript knows 'children' is also HeadingNode[]
        if (node.children) traverse(node.children);
      });
    };

    traverse(headings);
  });

  return index;
}