import {test} from 'node:test';
import assert from 'node:assert/strict';
import {upgradeCatalog,estimateUpgrade} from '../netlify/lib/upgrade-catalog.mjs';
test('borders follow perimeter while area equipment follows surface, retaining fixed installation cost',()=>{
 const wood=upgradeCatalog.find(x=>x.id==='wood'),drip=upgradeCatalog.find(x=>x.id==='drip');
 assert.equal(estimateUpgrade(wood,{size:3}).amount_kopecks,400000);
 assert.equal(estimateUpgrade(wood,{size:7}).amount_kopecks,750000);
 assert.equal(estimateUpgrade(drip,{size:6}).amount_kopecks,1050000);
 assert.throws(()=>estimateUpgrade(wood,{size:-1}));
});
