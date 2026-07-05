const sharp = require('sharp');
const path = require('path');

async function removeBg(inputPath, outputPath, threshold = 12) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const n = width * height;

  const bg = new Uint8Array(n); // 1 = background
  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qHead = 0, qTail = 0;

  function idx(x, y) { return y * width + x; }
  function colorAt(i) {
    const o = i * channels;
    return [data[o], data[o + 1], data[o + 2]];
  }
  function dist(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  }

  // Seed with all border pixels
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const i = idx(x, y);
      if (!visited[i]) { visited[i] = 1; bg[i] = 1; queue[qTail++] = i; }
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) {
      const i = idx(x, y);
      if (!visited[i]) { visited[i] = 1; bg[i] = 1; queue[qTail++] = i; }
    }
  }

  while (qHead < qTail) {
    const i = queue[qHead++];
    const x = i % width, y = (i / width) | 0;
    const c = colorAt(i);
    const neighbors = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = idx(nx, ny);
      if (visited[ni]) continue;
      const nc = colorAt(ni);
      if (dist(c, nc) <= threshold) {
        visited[ni] = 1;
        bg[ni] = 1;
        queue[qTail++] = ni;
      }
    }
  }

  // Build alpha channel: background -> 0, else keep original alpha
  const out = Buffer.from(data);
  for (let i = 0; i < n; i++) {
    if (bg[i]) {
      out[i * channels + 3] = 0;
    }
  }

  await sharp(out, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);

  const bgCount = bg.reduce((a, b) => a + b, 0);
  console.log(path.basename(inputPath), '-> removed', bgCount, '/', n, 'px (' + (100 * bgCount / n).toFixed(1) + '%)');
}

const [, , input, output, threshold] = process.argv;
removeBg(input, output, threshold ? Number(threshold) : undefined).catch((e) => {
  console.error(e);
  process.exit(1);
});
