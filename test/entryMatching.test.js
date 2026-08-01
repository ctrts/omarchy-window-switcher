const assert = require('node:assert/strict')
const matching = require('../model/EntryMatching.js')

const entries = [
  { id: 'org.mozilla.firefox', name: 'Firefox', startupClass: 'firefox' },
  { id: 'com.visualstudio.code', name: 'Visual Studio Code', startupClass: 'Code' },
  { id: 'org.example.foo', name: 'Foo One', startupClass: '' },
  { id: 'com.example.foo', name: 'Foo Two', startupClass: '' }
]

assert.equal(matching.findDesktopEntry('org.mozilla.firefox', entries).name, 'Firefox')
assert.equal(matching.findDesktopEntry('code', entries).name, 'Visual Studio Code')
assert.equal(matching.findDesktopEntry('foo', entries), null, 'ambiguous suffixes do not guess')
assert.equal(matching.findDesktopEntry('', entries), null)
assert.equal(matching.normalizeDesktopId('Firefox.desktop'), 'firefox')
assert.equal(matching.normalizeMatchId('application://Some_App'), 'some-app')
assert.equal(matching.entryName({ id: 'x', name: 'X' }), 'X')

console.log('ok - entry matching')
