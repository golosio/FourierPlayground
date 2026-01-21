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

const N = 2048;
const IMAGE_N = 512;
const SIGMA_SCALE = 20;

let freqRe = new Float32Array(N);
let freqIm = new Float32Array(N);

const freqStrip = document.getElementById("freqStrip");
const freqPlot  = document.getElementById("freqPlot");
const realStrip = document.getElementById("realStrip");
const realPlot  = document.getElementById("realPlot");

const sigmaSlider = document.getElementById("sigma");

const ctxFS = freqStrip.getContext("2d");
const ctxFP = freqPlot.getContext("2d");
const ctxRS = realStrip.getContext("2d");
const ctxRP = realPlot.getContext("2d");

// --- Mouse interaction ---
let mouseDown = false;
let x0 = 0;
let amp = 0;

freqStrip.addEventListener("mousedown", e => {
  const r = freqStrip.getBoundingClientRect();
  x0 = Math.round(e.clientX - r.left);
  amp = 0;
  mouseDown = true;
  requestAnimationFrame(tick);
});

window.addEventListener("mouseup", () => mouseDown = false);

function tick() {
  if (!mouseDown) return;
  amp += 0.05;
  addGaussian1D(x0, amp);
  drawFrequency();
  requestAnimationFrame(tick);
}

// --- Add Gaussian in Fourier space ---
function addGaussian1D(x0, amp) {
  const sigma = sigmaSlider.value / SIGMA_SCALE;
  //const k0 = Math.floor(x0 * N / IMAGE_N);
  const k0 = Math.floor(x0);
    
  let reS = fftshift1D(freqRe);

  for (let k = 0; k < N; k++) {
    const dk = k - k0;
    reS[k] += amp * Math.exp(-(dk*dk)/(2*sigma*sigma));
  }

  freqRe = fftshift1D(reS);
}

// --- Drawing ---
function drawGrayStrip(ctx, data) {
  const h = ctx.canvas.height;
  const w = ctx.canvas.width;

  let min = Math.min(...data);
  let max = Math.max(...data);
  const scale = max > min ? 255/(max-min) : 1;

  const img = ctx.createImageData(w, h);
  for (let x = 0; x < w; x++) {
    const v = Math.round((data[x]-min)*scale);
    for (let y = 0; y < h; y++) {
      const i = 4*(y*w + x);
      img.data[i+0] = v;
      img.data[i+1] = v;
      img.data[i+2] = v;
      img.data[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function drawPlot(ctx, data) {
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.beginPath();
  ctx.moveTo(0, ctx.canvas.height/2);

  let max = Math.max(...data.map(v=>Math.abs(v))) || 1;
  for (let x = 0; x < ctx.canvas.width; x++) {
    const y = ctx.canvas.height/2
            - data[x] / max * ctx.canvas.height/2;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawFrequency() {
  const reS = fftshift1D(freqRe);
  const slice = Array.from(reS.slice(0, IMAGE_N));

  drawGrayStrip(ctxFS, slice);
  drawPlot(ctxFP, slice);

  drawReal();
}

function drawReal() {
  let re = fftshift1D(freqRe);
  let im = new Float32Array(N);

  fft1d(re, im, true);
  re = fftshift1D(re);

  const slice = Array.from(re.slice(0, IMAGE_N));

  drawGrayStrip(ctxRS, slice);
  drawPlot(ctxRP, slice);
}

// --- Clear ---
document.getElementById("clear").onclick = () => {
  freqRe.fill(0);
  freqIm.fill(0);
  drawFrequency();
};

// --- Play sound ---
const audioCtx = new AudioContext();

document.getElementById("play").onclick = () => {
  let re = fftshift1D(freqRe);
  let im = new Float32Array(N);
  fft1d(re, im, true);

  let iter = 10;
  const buf = audioCtx.createBuffer(1, iter*N, audioCtx.sampleRate);
  const out = buf.getChannelData(0);


  let max = Math.max(...re.map(v=>Math.abs(v))) || 1;
  for (let i = 0; i < iter*N; i++) out[i] = 0.9*re[i%N]/max;

  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  
  src.connect(audioCtx.destination);
  src.start();

};

drawFrequency();
