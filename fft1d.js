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

function fft1d(re, im, inverse=false) {
  const n = re.length;
  if (n <= 1) return;

  const evenRe = new Float32Array(n/2);
  const evenIm = new Float32Array(n/2);
  const oddRe  = new Float32Array(n/2);
  const oddIm  = new Float32Array(n/2);

  for (let i = 0; i < n/2; i++) {
    evenRe[i] = re[2*i];
    evenIm[i] = im[2*i];
    oddRe[i]  = re[2*i+1];
    oddIm[i]  = im[2*i+1];
  }

  fft1d(evenRe, evenIm, inverse);
  fft1d(oddRe, oddIm, inverse);

  const sign = inverse ? 1 : -1;
  for (let k = 0; k < n/2; k++) {
    const t = sign * 2 * Math.PI * k / n;
    const c = Math.cos(t);
    const s = Math.sin(t);

    const tr = c*oddRe[k] - s*oddIm[k];
    const ti = s*oddRe[k] + c*oddIm[k];

    re[k]       = evenRe[k] + tr;
    im[k]       = evenIm[k] + ti;
    re[k+n/2]   = evenRe[k] - tr;
    im[k+n/2]   = evenIm[k] - ti;
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= 2;
      im[i] /= 2;
    }
  }
}

function fftshift1D(a) {
  const n = a.length;
  const h = n/2;
  const out = new Float32Array(n);
  out.set(a.subarray(h), 0);
  out.set(a.subarray(0, h), h);
  return out;
}
