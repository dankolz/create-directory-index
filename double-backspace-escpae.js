const escape = (str) => {
	if(!str || typeof str !== 'string') {
		return str
	}
	return str.split('\\\\').join('\\\\\\\\')
}

module.exports = escape