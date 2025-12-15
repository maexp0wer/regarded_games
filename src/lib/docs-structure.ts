// Pure TypeScript logic - Safe for Client Components

export type DocMetadata = {
  slug: string;
  title: string;
  order: number;
  parent?: string | null;
};

export type DocTreeNode = DocMetadata & {
  children: DocTreeNode[];
};

export function buildDocsTree(docs: DocMetadata[]): DocTreeNode[] {
  const docMap: Record<string, DocTreeNode> = {};
  const tree: DocTreeNode[] = [];

  // 1. Initialize
  docs.forEach(doc => {
    docMap[doc.slug] = { ...doc, children: [] };
  });

  // 2. Build Hierarchy
  docs.forEach(doc => {
    const node = docMap[doc.slug];
    if (doc.parent && docMap[doc.parent]) {
      docMap[doc.parent].children.push(node);
    } else {
      tree.push(node);
    }
  });

  // 3. Sort
  const sortNodes = (nodes: DocTreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach(node => sortNodes(node.children));
  };
  sortNodes(tree);

  return tree;
}