// src/app/docs/[slug]/page.tsx
import { getDocContent, getDocsList, getGlobalSearchIndex } from '@/lib/docs';
import { getHeadingsFromMarkdown } from '@/lib/toc';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import rehypeSlug from 'rehype-slug';
import DocsShell from '@/components/DocsShell';
import MDXTableWrapper from '@/components/MDXTable';
import remarkGfm from 'remark-gfm';

// --- CUSTOM STYLING COMPONENTS ---
// These control exactly how your MDX renders (Size, Color, Scroll Offset)
const customComponents = {
  // 1. HEADINGS (With scroll-mt-24 to fix sticky header overlap)
  h1: (props: any) => (
    <h1 {...props} className="text-3xl md:text-3xl font-bold mt-10 mb-6 text-primary tracking-tight scroll-mt-24">
      {props.children}
    </h1>
  ),
  h2: (props: any) => (
    <h2 {...props} className="text-xl md:text-2xl font-semibold mt-12 mb-4 text-text border-b border-card pb-2 scroll-mt-24">
      {props.children}
    </h2>
  ),
  h3: (props: any) => (
    <h3 {...props} className="text-lg md:text-xl font-semibold mt-8 mb-3 text-text scroll-mt-24">
      {props.children}
    </h3>
  ),
  h4: (props: any) => (
    <h4 {...props} className="text-lg font-semibold mt-6 mb-2 text-text scroll-mt-24">
      {props.children}
    </h4>
  ),
  
  // 2. TEXT & LISTS
  p: (props: any) => (
    <p {...props} className="mb-6 text-base md:text-base leading-7 text-text/90">
      {props.children}
    </p>
  ),
  ul: (props: any) => (
    <ul {...props} className="list-disc list-outside ml-6 mb-6 space-y-2 text-text/90">
      {props.children}
    </ul>
  ),
  ol: (props: any) => (
    <ol {...props} className="list-decimal list-outside ml-6 mb-6 space-y-2 text-text/90">
      {props.children}
    </ol>
  ),
  blockquote: (props: any) => (
    <blockquote {...props} className="border-l-4 border-primary/50 pl-4 italic my-6 text-text/80 bg-card/30 py-2 rounded-r-md">
      {props.children}
    </blockquote>
  ),
  code: (props: any) => (
    <code {...props} className="bg-card text-primary px-1.5 py-0.5 rounded text-sm font-mono border border-text/10">
      {props.children}
    </code>
  ),
  pre: (props: any) => (
    <div className="overflow-x-auto rounded-md bg-card border border-text/10 p-4 mb-6">
      <pre {...props} className="text-sm font-mono text-text">
        {props.children}
      </pre>
    </div>
  ),
  hr: (props: any) => (
    <hr {...props} className="my-8 border-card" />
  ),

  // 3. SMART LINKS
  a: (props: any) => {
    const { href, children, ...rest } = props;
    const isInternal = href && (href.startsWith('/') || href.startsWith('#'));

    if (isInternal) {
      return (
        <Link 
          href={href} 
          className="text-primary font-medium underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-all" 
          {...rest}
        >
          {children}
        </Link>
      );
    }
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-primary font-medium underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-all" 
        {...rest}
      >
        {children}
      </a>
    );
  },

  // 4. COMPLEX ELEMENTS
  table: MDXTableWrapper,
};


export async function generateStaticParams() {
  const docs = getDocsList();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  
  try {
    const { content, meta } = getDocContent(slug);
    const docsList = getDocsList();
    const headings = getHeadingsFromMarkdown(content);
    const searchIndex = getGlobalSearchIndex(); 

    return (
      <DocsShell 
        docs={docsList} 
        currentHeadings={headings}
        searchIndex={searchIndex}
      >
        {/* REMOVED 'prose' CLASS. We rely entirely on customComponents now. */}
        <article className="w-full max-w-none">
           <MDXRemote 
             source={content} 
             options={{
               mdxOptions: {
                 remarkPlugins: [remarkGfm], 
                 rehypePlugins: [rehypeSlug],
               },
             }}
             components={customComponents} 
           />
        </article>
      </DocsShell>
    );
  } catch (error) {
    console.error(`Error loading doc: ${slug}`, error);
    notFound();
  }
}