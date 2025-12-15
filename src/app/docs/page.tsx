import { getDocsList } from '@/lib/docs';
import { redirect } from 'next/navigation';

export default function DocsIndex() {
  const docs = getDocsList();
  
  if (docs.length > 0) {
    // Redirect to the first file found (e.g. "getting-started")
    // Note: We redirect to the slug directly. The middleware handles the rest.
    redirect(`/${docs[0].slug}`); 
  }

  return (
    <div className="p-10 text-center">
      <h1 className="text-2xl font-bold">No Documentation Found</h1>
      <p>Please create a .mdx file in src/content/docs/</p>
    </div>
  );
}