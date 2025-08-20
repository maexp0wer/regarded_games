// app/api/download/route.ts

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

export async function GET(req: NextRequest) {
  try {
    const filename = 'secret-document.pdf';
    const filePath = path.join(process.cwd(), 'private_data', filename);

    // --- BEST PRACTICE: STREAMING ---

    // 1. Get file stats to set the Content-Length header
    // This is important for the browser to show a download progress bar
    const stats = await fs.promises.stat(filePath);

    // 2. Create a Node.js readable stream from the file
    const nodeStream = fs.createReadStream(filePath);

    // 3. Convert the Node.js stream to a Web standard ReadableStream
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    // 4. Set the headers
    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="${filename}"`);
    headers.append('Content-Type', 'application/pdf');
    headers.append('Content-Length', stats.size.toString());

    // 5. Return the response with the stream as the body
    return new NextResponse(webStream, {
      status: 200,
      headers,
    });

  } catch (error) {
    // Check if the error is because the file doesn't exist
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}