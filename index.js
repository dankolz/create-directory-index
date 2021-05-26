const { spawn } = require("child_process");
const addCallbackToPromise = require('add-callback-to-promise')
const path = require('path')
const parser = require('./parse-time-size-path-entry')

let createIndex = (directoryPath, callback) => {
	directoryPath = path.resolve(directoryPath)

	//`find ${directoryPath} -type f -printf "%T@ %s %P\n"`
	const findProcess = spawn("find", [directoryPath, "-type", "f", "-printf", "%T@ %s %P\\n"]);
	let p = new Promise((resolve, reject) => {
		// Some code here
		let result = ''
		let errResult = ''
		findProcess.stdout.on('data', data => {
			result += data
		})
		findProcess.stderr.on('data', data => {
			errResult += data
		})

		findProcess.on('error', error => {
			return reject(error)
		})
		findProcess.on('close', code => {
			if(errResult && !result) {
				return reject(new Error(errResult))
			}
			let entries = result.split('\n').map(parser)
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