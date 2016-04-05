'use strict';

var fs = require('fs');
var manifest = require('../src/manifest.json');
var pkg = require('../package.json');

manifest.version = pkg.version;
manifest.description = pkg.description;

fs.writeFileSync(__dirname + '/../src/manifest.json', JSON.stringify(manifest, null, 2));
