// src/app/docs/[slug]/page.tsx
import { getDocContent, getDocsList, getGlobalSearchIndex } from '@/lib/docs'; // <-- Import new fn
import { getHeadingsFromMarkdown } from '@/lib/toc';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import rehypeSlug from 'rehype-slug';
import DocsShell from '@/components/DocsShell';
import MDXTableWrapper from '@/components/MDXTable';
import { Fragment } from 'react';
import remarkGfm from 'remark-gfm';

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
    
    // Define the custom components map
    const components = {
      table: MDXTableWrapper,
    };

    return (
      <DocsShell 
        docs={docsList} 
        currentHeadings={headings}
        searchIndex={searchIndex}
      >
        <article className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none w-full">
           <MDXRemote 
             source={content} 
             options={{
               mdxOptions: {
                 // --- ADD REMARK-GFM HERE ---
                 remarkPlugins: [remarkGfm], 
                 rehypePlugins: [rehypeSlug],
               },
             }}
             components={components} 
           />
        </article>
      </DocsShell>
    );
  } catch (error) {
    console.error(`Error loading doc: ${slug}`, error);
    notFound();
  }
}