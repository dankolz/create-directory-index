let reducer = (acc, entry) => {
	if(!acc) {
		acc = {}
	}
	acc[entry.path] = entry
	return acc
}

module.exports = reducer