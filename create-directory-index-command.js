#!/usr/local/bin/node
let argv = require('minimist')(process.argv.slice(2));

if(argv.help) {
	console.error(`
Creates an index for a directory. The command has the format:

create-directory-index <directory_path>
	`)	
	
	
	return
}

if(argv._.length == 0) {
	console.log('Must specify a directory to index.')
	return
}

const path = require('path')
let createIndex = require('./index')
createIndex(path.resolve(argv._[0])).then(data => {
	console.log(JSON.stringify(data))
}).catch(error => {
	console.error(error)
})

