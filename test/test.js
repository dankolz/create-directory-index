
require('mocha')
var expect = require('chai').expect
var assert = require('chai').assert

const createIndex = require('../index')
const doubleBackspaceEscape = require('../double-backspace-escpae')

describe("standard parsing and execution", function() {
	it('one directory', function(done) {
		createIndex('/tmp/one').then(result => {

			console.log(result)
			done()
		})
//		assert.equal(
//		)
		
	})
})
describe("unit tests", function() {
	it('double backspace escape', function() {
		assert.equal(doubleBackspaceEscape('\\\\'), '\\\\\\\\')
		
	})
})