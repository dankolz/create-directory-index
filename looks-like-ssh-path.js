const isSSH = (path) => {
	let colon = path.indexOf(':')
	let slash = path.indexOf('/')
	
	if(colon > -1) {
		if(slash < 0) {
			return true
		}
		if(colon < slash) {
			return true
		}

	}
	return false
}

module.exports = isSSH