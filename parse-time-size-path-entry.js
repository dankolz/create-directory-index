let parse = (entry) => {
	let i0 = entry.indexOf(' ')
	let i1 = entry.indexOf(' ', i0 + 1)
	
	let item = {
		time: parseInt(entry.substring(0, i0)),
		path: entry.substring(i1 + 1)
	}
	try {
		item.size = parseInt(entry.substring(i0 + 1, i1))
	} catch(e) {}
	return item

}

module.exports = parse