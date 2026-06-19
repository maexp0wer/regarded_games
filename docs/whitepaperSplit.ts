import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';

// Single source of truth, authored as one file. Kept OUTSIDE content/docs so the
// main docs plugin (which scans content/docs) never renders it as a stray page.
export const WHITEPAPER_SOURCE = path.resolve(__dirname, '..', 'content', 'Whitepaper.md');
// Generated per-Part pages consumed by the whitepaper docs plugin. Gitignored.
// Also kept outside content/docs so only the whitepaper plugin picks them up.
export const GENERATED_DIR = path.resolve(__dirname, '..', 'content', 'whitepaper-pages');

const TOC_MIN_HEADING_LEVEL = 2;
const TOC_MAX_HEADING_LEVEL = 3;

interface Segment {
  title: string;
  bodyLines: string[];
}

export interface Part {
  id: string;
  label: string;
  slug: string;
}

interface Heading {
  level: number;
  text: string;
  anchor: string;
}

// Split the document on top-level (H1) headings. Each H1 becomes its own
// Docusaurus page; the H2/H3 within it populate that page's right-side TOC.
function splitOnH1(content: string): Segment[] {
  const lines = content.split(/\r?\n/);
  const segments: Segment[] = [];
  let current: Segment | null = null;
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    const h1 = !inFence ? /^# (.+?)\s*$/.exec(line) : null;
    if (h1) {
      current = {title: h1[1].trim(), bodyLines: []};
      segments.push(current);
      continue;
    }
    if (current) current.bodyLines.push(line);
  }

  return segments;
}

// Replace the manual "## Table of Contents" subsection on the index page. Its
// hand-authored links target anchors that, after the split, live on other pages
// and are therefore broken. We drop the authored block and remember where it was
// so generateWhitepaperPages can re-insert a freshly generated overview whose
// links point at the correct split page + anchor.
function stripTableOfContents(lines: string[]): {lines: string[]; tocAt: number} {
  const out: string[] = [];
  let skipping = false;
  let inFence = false;
  let tocAt = -1;

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    const heading = !inFence ? /^#{1,6}\s+(.+?)\s*$/.exec(line) : null;
    if (heading) {
      if (/^table of contents$/i.test(heading[1].trim())) {
        skipping = true;
        if (tocAt < 0) tocAt = out.length; // splice point for the generated overview
        continue;
      }
      if (skipping) skipping = false; // the next heading ends the TOC block
    }
    if (!skipping) out.push(line);
  }

  return {lines: out, tocAt};
}

// Collect the H2/H3 headings of a single Part's body, slugged the same way
// Docusaurus does (github-slugger, fresh per page) so the anchors match the
// rendered page exactly.
function extractHeadings(bodyLines: string[]): Heading[] {
  const headings: Heading[] = [];
  const slugger = new GithubSlugger();
  let inFence = false;

  for (const line of bodyLines) {
    if (/^```/.test(line)) inFence = !inFence;
    const m = !inFence ? /^(#{2,3})\s+(.+?)\s*$/.exec(line) : null;
    if (!m) continue;
    const text = m[2].trim();
    headings.push({level: m[1].length, text, anchor: slugger.slug(text)});
  }

  return headings;
}

// Strip the markdown escaping the source uses for literal characters (e.g. `\$`)
// so the TOC link text reads naturally; the anchor is slugged separately.
function displayText(text: string): string {
  return text.replace(/\\([$*_`])/g, '$1');
}

// Build a full-document overview, grouped by Part, with each section linking to
// its destination page + anchor (/whitepaper/<slug>#<anchor>). Replaces the
// stale hand-authored TOC on the index page.
function buildOverviewToc(parts: {part: Part; headings: Heading[]}[]): string {
  const lines: string[] = ['## Table of Contents', ''];

  for (const {part, headings} of parts) {
    const isIndex = part.slug === '/';
    const base = isIndex ? '/whitepaper/' : `/whitepaper/${part.slug}`;
    // The index page's own sections (e.g. Introduction) are listed flat at the
    // top; every other Part gets a bold group header.
    if (!isIndex) lines.push(`- **${displayText(part.label)}**`);
    for (const h of headings) {
      const indent = isIndex ? '' : h.level === 2 ? '  ' : '    ';
      lines.push(`${indent}- [${displayText(h.text)}](${base}#${h.anchor})`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start++;
  while (end > start && lines[end - 1].trim() === '') end--;
  return lines.slice(start, end);
}

// JSON.stringify produces valid YAML flow scalars, which safely escapes the
// colons and quotes that appear in Part titles.
function frontmatter(fields: Record<string, string | number>): string {
  const body = Object.entries(fields)
    .map(([key, value]) => `${key}: ${typeof value === 'number' ? value : JSON.stringify(value)}`)
    .join('\n');
  return `---\n${body}\n---\n`;
}

export function generateWhitepaperPages(): Part[] {
  const raw = fs.readFileSync(WHITEPAPER_SOURCE, 'utf8');
  const {content} = matter(raw);
  const segments = splitOnH1(content);
  const slugger = new GithubSlugger();

  // First pass: resolve each segment's page identity and headings up front so
  // the index page can render an overview that links into the other pages.
  const pages = segments.map((segment, index) => {
    const isIndex = index === 0;
    const id = isIndex ? 'index' : slugger.slug(segment.title);
    const part: Part = {id, label: segment.title, slug: isIndex ? '/' : id};
    return {segment, isIndex, part, position: index + 1, headings: extractHeadings(segment.bodyLines)};
  });

  // Overview lists the index page's own sections first (linked to in-page
  // anchors), then every other Part.
  const overview = buildOverviewToc(pages.map(({part, headings}) => ({part, headings})));

  fs.rmSync(GENERATED_DIR, {recursive: true, force: true});
  fs.mkdirSync(GENERATED_DIR, {recursive: true});

  // Second pass: write each page, injecting the generated overview into the index.
  return pages.map(({segment, isIndex, part, position}) => {
    let bodyLines = segment.bodyLines;
    if (isIndex) {
      const {lines, tocAt} = stripTableOfContents(bodyLines);
      const at = tocAt >= 0 ? tocAt : lines.length;
      bodyLines = [...lines.slice(0, at), '', overview, '', ...lines.slice(at)];
    }
    const body = trimBlankEdges(bodyLines).join('\n');

    const fm = frontmatter({
      id: part.id,
      title: segment.title,
      sidebar_label: segment.title,
      sidebar_position: position,
      slug: part.slug,
      toc_min_heading_level: TOC_MIN_HEADING_LEVEL,
      toc_max_heading_level: TOC_MAX_HEADING_LEVEL,
    });

    const filename = `${String(position).padStart(2, '0')}-${part.id}.md`;
    fs.writeFileSync(path.join(GENERATED_DIR, filename), `${fm}\n${body}\n`);

    return part;
  });
}
