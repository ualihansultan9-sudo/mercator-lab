import fs from 'node:fs';
import path from 'node:path';
const out='offline';fs.mkdirSync(path.join(out,'vendor'),{recursive:true});
for(const f of fs.readdirSync('dist'))if(/\.(html|css|js|zip)$/.test(f))fs.copyFileSync(path.join('dist',f),path.join(out,f));
for(const [src,dst] of [['node_modules/d3/dist/d3.min.js','d3.min.js'],['node_modules/topojson-client/dist/topojson-client.min.js','topojson-client.min.js']])fs.copyFileSync(src,path.join(out,'vendor',dst));
const world=fs.readFileSync('node_modules/world-atlas/countries-110m.json','utf8');JSON.parse(world);fs.writeFileSync(path.join(out,'vendor/world.js'),'window.MERCATOR_WORLD='+world+';');
for(const f of fs.readdirSync(out).filter(f=>f.endsWith('.html'))){
  const file=path.join(out,f),html=fs.readFileSync(file,'utf8').replace('<script src="app.js">','<script src="vendor/d3.min.js"></script><script src="vendor/topojson-client.min.js"></script><script src="vendor/world.js"></script><script src="app.js">');
  fs.writeFileSync(file,html);
}
for(const pkg of ['d3','topojson-client','world-atlas'])fs.copyFileSync('node_modules/'+pkg+'/LICENSE',path.join(out,'vendor',pkg+'-LICENSE.txt'));
console.log('Open offline/index.html. All pages and geographic textures use local bundled data.');
