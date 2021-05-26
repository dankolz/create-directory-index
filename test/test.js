
require('mocha')
var expect = require('chai').expect
var assert = require('chai').assert

const createIndex = require('../index')

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