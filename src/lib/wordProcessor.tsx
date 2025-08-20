// lib/wordProcessor.tsx

import React from 'react';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

interface NavLink { id: string; label: string; }
interface TableData { rows: string[][]; }
interface SectionData { id: string; title: string; contentHtml: string; }
interface ProcessedContent { navLinks: NavLink[]; tables: TableData[]; sections: SectionData[]; }

const slugify = (text: string): string => {
  const cleanedText = text.replace(/^[0-9\.\s]+|[^a-zA-Z0-9\s]/g, '').trim();
  const words = cleanedText.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const camelCase = words.map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
  return `section${camelCase.charAt(0).toUpperCase() + camelCase.slice(1)}`;
};

export async function processWordDocument(filePath: string): Promise<ProcessedContent> {
  const docxPath = path.join(process.cwd(), filePath);
  const buffer = await fs.readFile(docxPath);
  const { value: rawHtml } = await mammoth.convertToHtml({ buffer });

  const $ = cheerio.load(rawHtml);
  const firstHeading = $('h1, h2').first();
  firstHeading.prevAll().remove();

  const navLinks: NavLink[] = [];
  const tables: TableData[] = [];
  const sections: SectionData[] = [];
  let tableCounter = 0;

  $('h1, h2').each((index, el) => {
    const headingEl = $(el);
    const title = headingEl.text();
    const label = title.replace(/^[0-9\.\s]+/, '').trim();
    const id = slugify(label);
    navLinks.push({ id, label });

    const contentNodes = headingEl.nextUntil('h1, h2');
    let contentHtml = '';

    contentNodes.each((i, node) => {
      const nodeEl = $(node);
      if (nodeEl.is('table')) {
        // FIX: We ONLY extract the rows now. Headers are ignored.
        const rows: string[][] = [];
        nodeEl.find('tbody tr, tr:not(:first-child)').each((i, tr) => {
          const row: string[] = [];
          $(tr).find('td, th').each((j, cell) => {
            row.push($(cell).html() || '');
          });
          if (row.length > 0) rows.push(row);
        });
        tables.push({ rows });
        contentHtml += `<!--dataTableIndex=${tableCounter}-->`;
        tableCounter++;
      } else {
        contentHtml += $.html(nodeEl);
      }
    });
    sections.push({ id, title, contentHtml });
  });

  return { navLinks, tables, sections };
}