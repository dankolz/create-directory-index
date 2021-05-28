const { spawn } = require("child_process");
const addCallbackToPromise = require('add-callback-to-promise')
const path = require('path')
const parser = require('./parse-time-size-path-entry')
const readline = require('readline');

let createIndex = (directoryPath, options = {}, callback) => {

	options = Object.assign({
		type: 'fs'
	}, options)
	
	//`find ${directoryPath} -type f -printf "%T@ %s %P\n"`
	
	let findProcess 
	if(options.type == 'fs') {
		directoryPath = path.resolve(directoryPath)
		findProcess = spawn("find", [directoryPath, "-type", "f", "-printf", "%T@ %s %P\\n"]);
	}
	else if(options.type == 'ssh') {
		findProcess = spawn("ssh", [options.server, `find ${directoryPath} -type f -printf "%T@ %s %P\\n"`]);
	}

	let p = new Promise((resolve, reject) => {
		let entries = []
		let errResult = ''
		
		
		let readFind = readline.createInterface({
			input: findProcess.stdout,
			console: false
		})
		readFind.on('line', function(line) {
			try {
				entries.push(parser(line))
			} catch(e) { 
				errResult += e.toString()
			}
		})
		findProcess.stderr.on('data', data => {
			errResult += data
		})

		findProcess.on('error', error => {
			return reject(error)
		})
		findProcess.on('close', code => {
			if(errResult && entries.length == 0) {
				return reject(new Error(errResult))
			}
			let resultObject = {
				creationDate: new Date(),
				entries: entries
			}
			resolve(resultObject)
		})
	})
	return addCallbackToPromise(p, callback)
}

module.exports = createIndex