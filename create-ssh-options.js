let createOptions = (path) => {
	
	let colon = path.indexOf(':')
	let slash = path.indexOf('/')
	

	return {
		type: 'ssh',
		server: path.substring(0, colon),
		directoryPath: path.substring(colon + 1),
		fullPath: path
	}
}

module.exports = createOptions