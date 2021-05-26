#!/usr/local/bin/node
let argv = require('minimist')(process.argv.slice(2));
const path = require('path')
let createIndex = require('./index')
const pathReducer = require('./entries-by-path-reducer')
const sanitize = (name) => {
	name = name.split('\\').join('\\\\')
	name = name.split('"').join('\\"')
	name = name.split("'").join("\\'")
	name = name.split('$').join('\\$')
	name = name.split(' ').join('\\ ')
	name = name.split(':').join('\\:')
	name = name.split('(').join('\\(')
	name = name.split(')').join('\\)')
	return name
}

if(argv.help) {
	console.error(`
Outputs a script which will copy files from the first directory to the second directory if missing or newer. The command has the format:

create-update-directory-commands <options> <source_directory_path> <destination_directory_path>

Options:

-v
--vo=true Versbose Output - creates echo commands to trac progress
--verbose-output=true

-n
--no-overwrite=true Will not overwrite a destination file
	`)	
	
	
	return
}

/*
argv._ = argv._.filter(entry => {
	if(entry.indexOf('--') == 0 && entry.length > 2 && entry[2] != '-' && entry.indexOf('=') < 0) {
		argv[entry.substring[2]] = true
		return false
	}
	return true
})
*/

if(argv._.length != 2) {
	console.log('Must specify a directores to update.')
	console.log(JSON.stringify(argv))
	return
}
let verboseOutput = false
if(argv.vo) {
	verboseOutput = true
}
if(argv['v']) {
	verboseOutput = true
}
if(argv['verbose-output']) {
	verboseOutput = true
}

let noOverwrite = false
if(argv['n']) {
	noOverwrite = true
}
if(argv['no-overwrite']) {
	noOverwrite = true
}

let sourceDir = path.resolve(argv._[0])
let destDir = path.resolve(argv._[1])

let pSource = createIndex(sourceDir)
let pDest = createIndex(destDir)

let createdDirs = {}

function createCopyStatement(key) {
	let result = ''
	let src = sanitize(path.join(sourceDir, key))
	let dst = sanitize(path.join(destDir, key))
	if(verboseOutput) {
		result += `echo cp ${src} ${dst}\n`
	}
	result += `cp ${src} ${dst}\n`
	return result
}

function createCopyStatementWithDir(key) {
	let dst = path.join(destDir, key)
	let dir = path.parse(dst).dir
	if(!createdDirs[dir]) {
		let result = ''
		createdDirs[dir] = true
		let san = sanitize(dir)
		if(verboseOutput) {
			result += `echo mkdir -p ${san}\n`	
		}
		result += `mkdir -p ${san}\n`
		result += createCopyStatement(key)
		return result
	}
	return createCopyStatement(key)
}

Promise.all([pSource, pDest]).then(indexes => {
	let destPathMap = indexes[1].entries.reduce(pathReducer, {})
	
	for(let sourceEntry of indexes[0].entries) {
		let key = sourceEntry.path
		let destEntry = destPathMap[key]
		
		if(!destEntry) {
			console.log(createCopyStatementWithDir(key))
		}
		else if(!noOverwrite) {
			if(sourceEntry.time > destEntry.time) {
				console.log(createCopyStatement(key))
			}
		}
	}
	

}).catch(error => {
	console.error(error)
})