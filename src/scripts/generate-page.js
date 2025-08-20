const mammoth = require('mammoth');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

// --- CONFIGURATION (UPDATED) ---
const DOCX_INPUT_PATH = path.join(__dirname, 'litepaper.docx');
const TEMPLATE_PATH = path.join(__dirname, 'template.tsx');
// This path now points inside the 'src' directory.
const OUTPUT_PATH = path.join(__dirname, '../app/test/page.tsx');

// --- HELPER FUNCTIONS ---

/**
 * Converts a heading title into a camelCase ID.
 * Example: "Executive Summary" -> "sectionExecutiveSummary"
 * Example: "DAO Overview & Core Principles" -> "sectionDAOOverviewCorePrinciples"
 * @param {string} text The heading text.
 * @returns {string} The generated ID.
 */
function createSectionId(text) {
  const titleCase = text
    .replace(/^\d+\.\s*/, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  return `section${titleCase}`;
}

/**
 * Converts an HTML element from Cheerio into a JSX string with appropriate classes.
 * @param {cheerio.CheerioAPI} $ The Cheerio instance.
 * @param {cheerio.Element} el The element to convert.
 * @param {object} tableVarsMap A map of table hashes to variable names.
 * @returns {string} The resulting JSX string.
 */
function elementToJsx($, el, tableVarsMap) {
  const tagName = el.tagName;

  switch (tagName) {
    case 'p':
        const innerHtml = $(el).html();
        if ($(el).find('strong').length > 0 && $(el).text().trim() === $(el).find('strong').text().trim()) {
            return `<h3 className="text-xl font-semibold mt-6 mb-4">${$(el).text()}</h3>`;
        }
        return `<p className='mb-4'>${innerHtml}</p>`;
    case 'ul':
        const listItems = $(el).find('li').map((_, li) => `<li>${$(li).html()}</li>`).get().join('\n              ');
        return `<ul className="list-disc ml-8 space-y-2">\n              ${listItems}\n            </ul>`;
    case 'table':
        const tableHtml = $.html(el);
        const tableId = tableVarsMap[tableHtml];
        if (tableId) {
            return `<DataTable 
              headers={${tableId}_headers} 
              rows={${tableId}_rows} 
              caption=""
            />`;
        }
        return '<!-- Could not process table -->';
    default:
        return $.html(el);
  }
}

// --- MAIN EXECUTION LOGIC (Unchanged) ---

async function main() {
  console.log('Starting page generation...');

  const { value: html } = await mammoth.convertToHtml({ path: DOCX_INPUT_PATH });
  const $ = cheerio.load(html);

  const navLinks = [];
  const sections = [];
  const dataTables = [];
  let tableCounter = 1;
  const tableVarsMap = {};

  $('table').each((i, table) => {
    const tableHtml = $.html(table);
    const varName = `tableData${tableCounter++}`;
    tableVarsMap[tableHtml] = varName;

    const headers = [];
    $(table).find('tr:first-child th, tr:first-child td').each((_, cell) => {
        headers.push($(cell).text());
    });
    
    const rows = [];
    $(table).find('tr').slice(1).each((_, row) => {
        const rowData = [];
        $(row).find('td').each((_, cell) => {
            rowData.push($(cell).text());
        });
        rows.push(rowData);
    });

    dataTables.push({
      varName: varName,
      headers: headers,
      rows: rows,
    });
  });

  const headingTags = 'h1, h2';
  const $headings = $(headingTags);

  $headings.each((index, heading) => {
    const titleText = $(heading).text().replace(/^\d+\.\s*/, '').trim();
    if (!titleText || titleText.toLowerCase() === 'table of contents') return;
    const sectionId = createSectionId($(heading).text());
    navLinks.push({ id: sectionId, label: titleText });
    const $contentNodes = $(heading).nextUntil(headingTags);
    const contentJsx = $contentNodes
      .map((_, el) => elementToJsx($, el, tableVarsMap))
      .get()
      .join('\n            ');
    const sectionJsx = `
          {/* ${$(heading).text()} */}
          <section id="${sectionId}" className="min-h-screen py-16">
            <h2 className="text-3xl font-bold text-center mb-8">${$(heading).text()}</h2>
            ${contentJsx}
          </section>`;
    sections.push(sectionJsx);
  });

  const navLinksString = `const navLinks = ${JSON.stringify(navLinks, null, 4)};`;
  const dataTablesString = dataTables.map(table => {
    const headersString = `const ${table.varName}_headers = ${JSON.stringify(table.headers, null, 2)};`;
    const rowsString = `const ${table.varName}_rows = ${JSON.stringify(table.rows, null, 2)};`;
    return `${headersString}\n  ${rowsString}`;
  }).join('\n\n  ');
  const sectionsString = sections.join('\n');

  let templateContent = await fs.readFile(TEMPLATE_PATH, 'utf-8');
  templateContent = templateContent.replace('// <!-- NAV_LINKS_PLACEHOLDER -->', navLinksString);
  templateContent = templateContent.replace('// <!-- DATA_TABLES_PLACEHOLDER -->', dataTablesString);
  templateContent = templateContent.replace('{/* <!-- SECTIONS_PLACEHOLDER --> */}', sectionsString);
  templateContent = templateContent.replace(/<br>/g, '<br />');

  // Ensure the target directory exists before writing
  const outputDir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(outputDir, { recursive: true });

  await fs.writeFile(OUTPUT_PATH, templateContent);
  console.log(`✅ Successfully generated page at: ${OUTPUT_PATH}`);
}

main().catch(err => console.error('❌ Error during page generation:', err));