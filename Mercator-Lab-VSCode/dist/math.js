/* Mercator Lab — spherical model, kilometres, degrees at public boundaries. */
(function(root){
'use strict';
const R=6371.0088, RAD=Math.PI/180, LIMIT=85.0511287798066;
function local(lat,lon=0){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>=90||Math.abs(lon)>180) throw new RangeError('Latitude must be inside (-90,90); longitude inside [-180,180].');
 const p=lat*RAD,c=Math.cos(p),k=1/c,K=k*k;
 return {lat,lon,k,K,linearPercent:(k-1)*100,areaPercent:(K-1)*100,x:R*lon*RAD,y:R*Math.asinh(Math.tan(p))};
}
function strip(lat,area=1000){
 if(!Number.isFinite(lat)||Math.abs(lat)>80||!Number.isFinite(area)||area<=0||area>1e6)throw new RangeError('Invalid experiment');
 // Equal-area longitude/latitude cell; north-south size sqrt(A), longitude width solved exactly.
 const d=Math.sqrt(area)/R/2,p=lat*RAD,lo=p-d,hi=p+d;
 const dl=area/(R*R*(Math.sin(hi)-Math.sin(lo)));
 const projected=R*R*dl*(Math.asinh(Math.tan(hi))-Math.asinh(Math.tan(lo)));
 const K=local(lat).K;
 return {lat,area,low:lo/RAD,high:hi/RAD,lonWidth:dl/RAD,projected,K:projected/area,localK:K,approx:area*K,errorPercent:(area*K/projected-1)*100};
}
function wrap(x){return ((x+180)%360+360)%360-180;}
function polygons(g){if(g.type==='Feature')return polygons(g.geometry);if(g.type==='FeatureCollection')return g.features.flatMap(polygons);if(g.type==='GeometryCollection')return g.geometries.flatMap(polygons);return g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];}
function vec(p){const a=p[0]*RAD,b=p[1]*RAD;return [Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b)];}
function mid(a,b,t){const u=vec(a),v=vec(b),theta=Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0))));if(theta<1e-12)return a.slice();const s=Math.sin(theta),A=Math.sin((1-t)*theta)/s,B=Math.sin(t*theta)/s,w=u.map((x,i)=>A*x+B*v[i]);return [Math.atan2(w[1],w[0])/RAD,Math.atan2(w[2],Math.hypot(w[0],w[1]))/RAD];}
function boundaryAreas(g,step=.1){
 // Independent line integrals: -∮sin(phi)dλ and -∮asinh(tan(phi))dλ.
 // Short great-circle segments, unwrapped Δλ; no polar-enclosing polygons.
 let sphere=0,plane=0;
 for(const poly of polygons(g))for(let j=0;j<poly.length;j++){
  const ring=poly[j];let a=0,b=0;
  for(let i=1;i<ring.length;i++){
   const u=vec(ring[i-1]),v=vec(ring[i]);const ang=Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,k)=>s+x*v[k],0))))/RAD;
   const n=Math.max(1,Math.ceil(ang/step));let q=ring[i-1];
   for(let m=1;m<=n;m++){
    const p=m===n?ring[i]:mid(ring[i-1],ring[i],m/n),dl=wrap(p[0]-q[0])*RAD;
    if(Math.abs(p[1])>89.999||Math.abs(q[1])>89.999)return {sphere:NaN,plane:NaN,K:NaN};
    a-=dl*(Math.sin(p[1]*RAD)+Math.sin(q[1]*RAD))/2;
    b-=dl*(Math.asinh(Math.tan(p[1]*RAD))+Math.asinh(Math.tan(q[1]*RAD)))/2;q=p;
   }
  }
  sphere+=(j===0?1:-1)*Math.abs(a)*R*R;plane+=(j===0?1:-1)*Math.abs(b)*R*R;
 }
 return {sphere,plane,K:plane/sphere};
}
root.MercatorMath={R,RAD,LIMIT,local,strip,wrap,polygons,mid,boundaryAreas};
})(globalThis);
