const { downloadArtifact } = require('@electron/get');
const extract = require('extract-zip');
const path = require('path');
const fs = require('fs');

process.env.ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/";

async function go() {
  try {
    console.log("Downloading electron from mirror...");
    const zipPath = await downloadArtifact({
      version: '34.2.0',
      artifactName: 'electron',
      platform: 'win32',
      arch: 'x64',
      mirrorOptions: {
        mirror: 'https://npmmirror.com/mirrors/electron/'
      }
    });
    console.log("Downloaded to", zipPath);

    const distPath = path.join(__dirname, 'node_modules', 'electron', 'dist');
    if (!fs.existsSync(distPath)) fs.mkdirSync(distPath, {recursive:true});

    console.log("Extracting...");
    await extract(zipPath, { dir: distPath });
    
    fs.writeFileSync(path.join(__dirname, 'node_modules', 'electron', 'path.txt'), 'electron.exe');
    console.log("Done!");
  } catch (err) {
    console.error("Error:", err);
  }
}
go();
