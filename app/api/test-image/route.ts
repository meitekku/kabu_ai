import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  const targetImagePath = join(process.cwd(), 'public/uploads/post_images/2025/05/名称未設定_B73RfhJL.png');
  const uploadsDir = join(process.cwd(), 'public/uploads');
  const postImagesDir = join(uploadsDir, 'post_images');
  const yearDir = join(postImagesDir, '2025');
  const monthDir = join(yearDir, '05');
  
  return NextResponse.json({
    targetImageExists: existsSync(targetImagePath),
    directories: {
      uploads: existsSync(uploadsDir),
      postImages: existsSync(postImagesDir),
      year2025: existsSync(yearDir),
      month05: existsSync(monthDir)
    },
    paths: {
      targetImage: targetImagePath,
      uploads: uploadsDir,
      postImages: postImagesDir,
      year2025: yearDir,
      month05: monthDir
    },
    cwd: process.cwd()
  });
} 