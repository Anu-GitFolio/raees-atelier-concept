import {copyFile} from 'node:fs/promises';
await copyFile('node_modules/axe-core/axe.min.js','public/axe.min.js');
console.log('Local accessibility audit ready at /__qa/ (excluded from production).');
