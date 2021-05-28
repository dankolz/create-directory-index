#!/usr/local/bin/node
const isSSH = require('./looks-like-ssh-path')
const createSSHOptions = require('./create-ssh-options')


let argv = require('minimist')(process.argv.slice(2), {
	boolean: ['f', 'formatted']
});

if(argv.help) {
	console.error(`
Creates an index for a directory. The command has the format:

create-directory-index <options> <directory_path>


Options:

-f
--formatted Format JSON to be more human readable
	`)	
	
	
	return
}

if(argv._.length == 0) {
	console.log('Must specify a directory to index.')
	console.log(JSON.stringify(argv))
	return
}

let formatted = false
if(argv.f || argv.formatted) {
	formatted = true
}

const path = require('path')
let createIndex = require('./index')
let fullPath = argv._[0]

let options = {
	directoryPath: fullPath,
	fullPath: fullPath
}
if(isSSH(fullPath)) {
	options = createSSHOptions(fullPath)	
}
createIndex(options.directoryPath, options).then(data => {
	if(formatted) {
		console.log(JSON.stringify(data, null, '\t'))
	}
	else {
		console.log(JSON.stringify(data))
	}
}).catch(error => {
	console.error(error)
})

