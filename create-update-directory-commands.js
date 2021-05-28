#!/usr/local/bin/node
let argv = require('minimist')(process.argv.slice(2), {
	boolean: ['vo', 'verbose-output', 'dont-overwrite', 'v', 'n']
});
const path = require('path')
const isSSH = require('./looks-like-ssh-path')
const createSSHOptions = require('./create-ssh-options')


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
--vo Versbose Output - creates echo commands to trac progress
--verbose-output

-n no-clobbler (don't overwrite)
--dont-overwrite Will not overwrite a destination file
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
if(argv.vo || argv.v || argv['verbose-output']) {
	verboseOutput = true
}

let noOverwrite = false
if(argv['n'] || argv['dont-overwrite']) {
	noOverwrite = true
}

let sourcePath = argv._[0]
let destPath = argv._[1]

function createOptions(path) {
	let options = {
		directoryPath: path,
		fullPath: path,
		type: 'fs'
	}
	if(isSSH(path)) {
		options = createSSHOptions(path)	
	}
	return options
}

let sourceOptions = createOptions(sourcePath)
let destOptions = createOptions(destPath)

let pSource = createIndex(sourceOptions.directoryPath, sourceOptions)
let pDest = createIndex(destOptions.directoryPath, destOptions)

let createdDirs = {}
let srcResolve
if(sourceOptions.type == 'fs') {
	srcResolve = (p) => path.resolve(p)
}
else {
	srcResolve = (p) => p
}

let destResolve
if(destOptions.type == 'fs') {
	destResolve = (p) => path.resolve(p)
}
else {
	destResolve = (p) => p
}

let createDirStatements = ""
let cpFileStatements = ""

function createCopyStatement(key) {
	let result = ''
	let src = sanitize(srcResolve(path.join(sourceOptions.directoryPath, key)))
	let dst = sanitize(destResolve(path.join(destOptions.directoryPath, key)))
	let pgm	
	let keepVerbose = true
	if(sourceOptions.type = 'ssh') {
		pgm = 'put'
		keepVerbose = false
	}
	else if(destOptions.type = 'ssh') {
		pgm = 'get'
		keepVerbose = false
	}
	else {
		pgm = 'cp'
	}
	
//	let srcPrefix = sourceOptions.type == 'ssh' ? sourceOptions.server + ':' : ''	
//	let dstPrefix = destOptions.type == 'ssh' ? destOptions.server + ':' : ''	
//	let cmd = `${pgm} ${srcPrefix}${src} ${dstPrefix}${dst}`
	let cmd = `${pgm} ${src} ${dst}`
	if(verboseOutput && keepVerbose) {
		result += `echo ${cmd}\n`
	}
	cpFileStatements += `${cmd}\n`
}

function createCopyStatementWithDir(key) {
	let dst = path.join(destOptions.directoryPath, key)
	let dir = path.parse(dst).dir
	if(!createdDirs[dir]) {
		let result = ''
		createdDirs[dir] = true
		let san = sanitize(destResolve(dir))
		
		let cmd 
		if(destOptions.type == 'ssh') {
			cmd = `ssh ${destOptions.server} mkdir -p ${san}\n`
		}	
		else {
			cmd = `mkdir -p ${san}\n`
		}
		if(verboseOutput) {
			result += `echo ${cmd}`	
		}
		createDirStatements += cmd
	}
	createCopyStatement(key)
}

Promise.all([pSource, pDest]).then(indexes => {
	let destPathMap = indexes[1].entries.reduce(pathReducer, {})
	
	for(let sourceEntry of indexes[0].entries) {
		let key = sourceEntry.path
		let destEntry = destPathMap[key]
		
		if(!destEntry) {
			createCopyStatementWithDir(key)
		}
		else if(!noOverwrite) {
			if(sourceEntry.time > destEntry.time) {
				createCopyStatement(key)
			}
		}
	}
	
	console.log(createDirStatements)
	let isSFTP = sourceOptions.type == 'ssh' || destOptions.type == 'ssh'
	if(isSFTP) {
		let server = sourceOptions.server || destOptions.server
		console.log(`sftp ${server} << EOF`)
	}
	console.log(cpFileStatements)
	if(isSFTP) {
		console.log('EOF')
	}
	

}).catch(error => {
	console.error(error)
})