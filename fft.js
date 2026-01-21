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

function fft1d(re, im, inverse) {
  const n = re.length;
  if (n <= 1) return;

  const evenRe = new Float32Array(n / 2);
  const evenIm = new Float32Array(n / 2);
  const oddRe  = new Float32Array(n / 2);
  const oddIm  = new Float32Array(n / 2);

  for (let i = 0; i < n / 2; i++) {
    evenRe[i] = re[2 * i];
    evenIm[i] = im[2 * i];
    oddRe[i]  = re[2 * i + 1];
    oddIm[i]  = im[2 * i + 1];
  }

  fft1d(evenRe, evenIm, inverse);
  fft1d(oddRe,  oddIm,  inverse);

  const sign = inverse ? 1 : -1;
  for (let k = 0; k < n / 2; k++) {
    const theta = sign * 2 * Math.PI * k / n;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const tre = cos * oddRe[k] - sin * oddIm[k];
    const tim = sin * oddRe[k] + cos * oddIm[k];

    re[k]       = evenRe[k] + tre;
    im[k]       = evenIm[k] + tim;
    re[k+n/2]   = evenRe[k] - tre;
    im[k+n/2]   = evenIm[k] - tim;
  }
}

function fft2d(re, im, N, inverse=false) {
  // rows
  for (let y = 0; y < N; y++) {
    const r = new Float32Array(N);
    const i = new Float32Array(N);
    for (let x = 0; x < N; x++) {
      r[x] = re[y*N + x];
      i[x] = im[y*N + x];
    }
    fft1d(r, i, inverse);
    for (let x = 0; x < N; x++) {
      re[y*N + x] = r[x];
      im[y*N + x] = i[x];
    }
  }

  // columns
  for (let x = 0; x < N; x++) {
    const r = new Float32Array(N);
    const i = new Float32Array(N);
    for (let y = 0; y < N; y++) {
      r[y] = re[y*N + x];
      i[y] = im[y*N + x];
    }
    fft1d(r, i, inverse);
    for (let y = 0; y < N; y++) {
      re[y*N + x] = r[y];
      im[y*N + x] = i[y];
    }
  }

  if (inverse) {
    const scale = 1 / (N * N);
    for (let k = 0; k < re.length; k++) {
      re[k] *= scale;
      im[k] *= scale;
    }
  }
}
