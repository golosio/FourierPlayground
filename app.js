/*
Copyright (C) 2026 Bruno Golosio

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const FULL_N = 512;
const IMAGE_SCALE = 2;
const IMAGE_N = FULL_N / IMAGE_SCALE;

const CROP_SCALE = 8;
const CROP_N = FULL_N / CROP_SCALE;

const SIGMA_SCALE = 20;

const NMIN = (FULL_N - CROP_N) / 2 + 0.5;
const NMAX = (FULL_N + CROP_N) / 2 + 0.5;

const freqCanvas = document.getElementById("freqCanvas");
const imgCanvas  = document.getElementById("imgCanvas");
const freqCtx = freqCanvas.getContext("2d");
const imgCtx  = imgCanvas.getContext("2d");

const sigmaSlider = document.getElementById("sigma");
const clearBtn = document.getElementById("clear");

let freqRe = new Float32Array(FULL_N * FULL_N);
let freqIm = new Float32Array(FULL_N * FULL_N);

let mouseDown = false;
let fx0 = 0, fy0 = 0;
let amplitude = 0;

// --- mouse interaction ---
freqCanvas.addEventListener("mousedown", e => {
  const rect = freqCanvas.getBoundingClientRect();
  fx0 = Math.round((e.clientX - rect.left));
  fy0 = Math.round((e.clientY - rect.top));
  amplitude = 0;
  mouseDown = true;
  requestAnimationFrame(tick);
});

window.addEventListener("mouseup", () => {
  mouseDown = false;
});

function tick() {
  if (!mouseDown) return;
  amplitude += 0.05;
  addGaussian(fx0, fy0, amplitude);
  updateViews();
  requestAnimationFrame(tick);
}

function fftshift(re, im, N) {
  const outRe = new Float32Array(re.length);
  const outIm = new Float32Array(im.length);

  const h = N / 2;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const xx = (x + h) % N;
      const yy = (y + h) % N;
      const i1 = y*N + x;
      const i2 = yy*N + xx;
      outRe[i2] = re[i1];
      outIm[i2] = im[i1];
    }
  }
  return [outRe, outIm];
}

function ifftshift(re, im, N) {
  // identical for even-sized arrays
  return fftshift(re, im, N);
}

// --- Gaussian addition ---
function addGaussian(fx0, fy0, amp) {
  const sigma = sigmaSlider.value / SIGMA_SCALE;

  const fxFull = Math.floor(fx0 * IMAGE_SCALE / CROP_SCALE + NMIN);
  const fyFull = Math.floor(fy0 * IMAGE_SCALE / CROP_SCALE + NMIN);

  // shift to centered frequency space
  let [reS, imS] = fftshift(freqRe, freqIm, FULL_N);

  for (let y = 0; y < FULL_N; y++) {
    for (let x = 0; x < FULL_N; x++) {
      const dx = x - fxFull;
      const dy = y - fyFull;
      const g = amp * Math.exp(-(dx*dx + dy*dy) / (2*sigma*sigma));
      reS[y*FULL_N + x] += g;
    }
  }

  // unshift back to storage format
  [freqRe, freqIm] = fftshift(reS, imS, FULL_N);
}

// --- Rendering ---
function updateViews() {
  drawFrequency();
  drawImage();
}

function drawCenterCross(ctx, N) {
  ctx.save();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 1;

  const h = N / 2;

  // vertical line
  ctx.beginPath();
  ctx.moveTo(h + 0.5, 0);
  ctx.lineTo(h + 0.5, N);
  ctx.stroke();

  // horizontal line
  ctx.beginPath();
  ctx.moveTo(0, h + 0.5);
  ctx.lineTo(N, h + 0.5);
  ctx.stroke();

  ctx.restore();
}

function drawFrequency() {
  const [reS, imS] = fftshift(freqRe, freqIm, FULL_N);

  // --- first pass: find min/max in cropped region ---
  let min = Infinity;
  let max = -Infinity;

  for (let y = 0; y < IMAGE_N; y++) {
    for (let x = 0; x < IMAGE_N; x++) {
      const yy = Math.floor(y * CROP_N / IMAGE_N + NMIN);
      const xx = Math.floor(x * CROP_N / IMAGE_N + NMIN);
      const v = Math.abs(reS[yy*FULL_N + xx]);
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  
  console.log(min+5, max+5);
  const scale = (max > min) ? 255 / (max - min) : 1;

  // --- second pass: draw ---
  const img = freqCtx.createImageData(IMAGE_N, IMAGE_N);

  for (let y = 0; y < IMAGE_N; y++) {
    for (let x = 0; x < IMAGE_N; x++) {
      const yy = Math.floor(y * CROP_N / IMAGE_N + NMIN);
      const xx = Math.floor(x * CROP_N / IMAGE_N + NMIN);

      const v = Math.abs(reS[yy*FULL_N + xx]);
      const c = Math.round((v - min) * scale);

      const i = 4*(y*IMAGE_N + x);
      img.data[i+0] = c;
      img.data[i+1] = c;
      img.data[i+2] = c;
      img.data[i+3] = 255;
    }
  }

  freqCtx.putImageData(img, 0, 0);
  drawCenterCross(freqCtx, IMAGE_N);
}

function drawImage() {
  let [re, im] = ifftshift(freqRe, freqIm, FULL_N);

  re = re.slice();
  im = im.slice();

  fft2d(re, im, FULL_N, true);

  [re, im] = fftshift(re, im, FULL_N);

  // downsample
  let min = Infinity, max = -Infinity;
  const img = imgCtx.createImageData(IMAGE_N, IMAGE_N);

  for (let y = 0; y < IMAGE_N; y++) {
    for (let x = 0; x < IMAGE_N; x++) {
      const v = re[(y*IMAGE_SCALE)*FULL_N + (x*IMAGE_SCALE)];
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  const scale = 255 / (max - min);

  for (let y = 0; y < IMAGE_N; y++) {
    for (let x = 0; x < IMAGE_N; x++) {
      const v = re[(y*IMAGE_SCALE)*FULL_N + (x*IMAGE_SCALE)];
      const c = Math.round((v - min) * scale);
      const i = 4*(y*IMAGE_N + x);
      img.data[i+0] = c;
      img.data[i+1] = c;
      img.data[i+2] = c;
      img.data[i+3] = 255;
    }
  }

  imgCtx.putImageData(img, 0, 0);
  drawCenterCross(imgCtx, IMAGE_N);
}

// --- Clear ---
clearBtn.onclick = () => {
  freqRe.fill(0);
  freqIm.fill(0);
  updateViews();
};

updateViews();
