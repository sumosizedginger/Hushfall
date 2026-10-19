# Third-party notices

Hushfall is a proprietary game (see LICENSE). This file lists the third-party software that SHIPS inside a build of it, and reproduces the licence each one requires. Everything else the game is made of (its code, maps, painted art, synthesized audio and text) is original to the project: no stock, downloaded or generated art, no sampled audio, no classic-game assets.

## What ships

| package | version | licence | where |
|---|---|---|---|
| three | 0.186.1 | MIT | the 3D renderer, bundled into the game by Vite (the only production dependency) |

Vite (MIT) writes the build and may place a few lines of its own helper code in it. The tools that make the game and are NOT part of a build: p5.js and p5.brush (the art baker), pngjs (image files for the tools), puppeteer (the headless-browser checks) and vite itself. The baked art in assets/baked is the baker's own output, original to the project.

The audit that keeps this file honest is node tools/dev/license-audit.mjs (and tests/licences.test.js): it fails if a production dependency is not on the permissive list, if one is missing from this file, if the shipped source imports a dev-only package, or if a page loads anything from a CDN or a font host.

## three

The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
