// app/api/download/route.ts

import { NextResponse } from 'next/server'; // Removed NextRequest import
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

// 1. Remove the '_req' argument entirely since it is not used.
export async function GET() {
  try {
    const filename = 'secret-document.pdf';
    const filePath = path.join(process.cwd(), 'private_data', filename);

    const stats = await fs.promises.stat(filePath);
    const nodeStream = fs.createReadStream(filePath);

    // Casting to global ReadableStream to satisfy NextResponse type definition
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="${filename}"`);
    headers.append('Content-Type', 'application/pdf');
    headers.append('Content-Length', stats.size.toString());

    return new NextResponse(webStream, {
      status: 200,
      headers,
    });

  } catch (error: unknown) { // Use 'unknown' for safety
    
    // 2. Type Guard: Check if it is a Node.js System Error (which has .code)
    if (isNodeError(error)) {
      if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'File not found.' }, { status: 404 });
      }
    }

    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// Helper Type Guard to tell TypeScript "This error has a .code property"
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}