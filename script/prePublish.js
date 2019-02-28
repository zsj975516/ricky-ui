const fs = require('fs')
const path = require('path')

const packPath = path.resolve(__dirname, '../package.json')

const pack = JSON.parse(fs.readFileSync(packPath).toString())

const version = pack.version.split('\.')

version[2]++

pack.version = version.join('\.')

fs.writeFileSync(packPath, JSON.stringify(pack, null, 2))
