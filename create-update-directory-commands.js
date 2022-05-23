#!/usr/local/bin/node
let argv = require('minimist')(process.argv.slice(2), {
	boolean: ['vo', 'verbose-output', 'dont-overwrite', 'v', 'n']
});
const path = require('path')
const isSSH = require('./looks-like-ssh-path')
const createSSHOptions = require('./create-ssh-options')
const fs = require('fs')
const readline = require('readline');

let createIndex = require('./index')
const pathReducer = require('./entries-by-path-reducer')
const sanitize = (name) => {
	name = name.split('\\').join('\\\\')
	name = name.split('"').join('\\"')
	name = name.split("'").join("\\'")
	name = name.split('$').join('\\$')
	name = name.split(' ').join('\\ ')
	name = name.split(':').join('\\:')
	name = name.split(';').join('\\;')
	name = name.split('(').join('\\(')
	name = name.split(')').join('\\)')
	name = name.split('?').join('\\?')
	name = name.split('&').join('\\&')
	name = name.split('|').join('\\|')
	name = name.split('[').join('\\[')
	name = name.split(']').join('\\]')
	name = name.split('#').join('\\#')
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

--source-index Instead of calculating the source index, use an index file
--destination-index Instead of calculating the destination index, use an index file
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

let sourceIndex = argv['source-index']
let destinationIndex = argv['destination-index']

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

function parseIndex(location) {
	let p = new Promise((resolve, reject) => {
		let streamingEntries
		if(location.endsWith('ndjson') || location.endsWith('jsonl')) {
			let fileStream = fs.createReadStream(location)
			let readJson = readline.createInterface({
				input: fileStream,
				console: false
			})
			readJson.on('line', function(line) {
				if(!line) {
					return
				}
				try {
					let obj = JSON.parse(line)
					if(obj.format == 'streaming-entries-header') {
						streamingEntries = obj
						streamingEntries.entries = []
					}
					else if(obj.format == 'entry') {
						streamingEntries.entries.push(obj)
					}

				}
				catch(e) {
					reject(e)
				}
			})
			fileStream.on('close', code =>{
				resolve(streamingEntries)
			})
		}	
		else {
			resolve(JSON.parse(fs.readFileSync(location)))
		}

	})
	
	return p

}

let sourceOptions = createOptions(sourcePath)
let destOptions = createOptions(destPath)

let pSource 
let pDest 

async function createIndexes() {
	if(sourceIndex) {
		pSource = parseIndex(sourceIndex)
	}
	else {
		pSource = createIndex(sourceOptions.directoryPath, sourceOptions)
	}
	if(destinationIndex) {
		pDest = parseIndex(destinationIndex)
	}
	else {
		pDest = createIndex(destOptions.directoryPath, destOptions)
	}
}

createIndexes()


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
let dirsToCreate = []

function createCopyStatement(key) {
	let src = sanitize(srcResolve(path.join(sourceOptions.directoryPath, key)))
	let dst = sanitize(destResolve(path.join(destOptions.directoryPath, key)))
	let pgm	
	let keepVerbose = true
	if(sourceOptions.type == 'ssh') {
		pgm = 'get'
		keepVerbose = false
	}
	else if(destOptions.type == 'ssh') {
		pgm = 'put'
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
		cpFileStatements += `echo ${cmd}\n`
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
			dirsToCreate.push(san)
		}	
		else {
			cmd = `mkdir -p ${san}\n`
		}
		if(verboseOutput && cmd) {
			result += `echo ${cmd}`	
		}
		if(cmd) {
			createDirStatements += cmd
		}
		
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
	
	if(dirsToCreate.length > 0) {
		let cums = []
		let cum = ''
		while(dirsToCreate.length > 0) {
			cum += dirsToCreate.pop() + ' '
			if(cum.length > 98000) {
				cums.push(cum)
				cum = ''
			}
		}
		cums.push(cum)
		cums.forEach(servers => {
			cmd = `ssh ${destOptions.server} mkdir -p ${servers}\n`
			createDirStatements += cmd
		})
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

