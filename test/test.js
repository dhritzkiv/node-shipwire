var assert = require("assert");

var Shipwire = require("../index.js");//node-shipwire;
var shipwire = new Shipwire("daniel.hritzkiv@gmail.com", "rTh-B4h-aSA-f6y", {
	sandbox: true,//beta or real life
	test: false
});

var validOrderNumber = "21";//String, please.
var validShipwireID = "1394587839-108974-1";

var maxTimeout = 1e4;//10 seconds

/*shipwire.trackAll({
	raw: true
}, function(err, raw) {
	console.log(raw);
});*/


/*shipwire.trackAll({
	raw: false,
	bookmark: 1
}, function(err, orders) {
	console.log(orders);
});*/

/*shipwire.trackByOrderNumber(21, {
	
}, function(err, order) {
	console.log(order);
})*/

/*shipwire.inventoryStatus({
	includeEmpty: true,
	warehouseCountry: "US",
	productCodes: ["sun-0001"]
}, function(err, status) {
	console.log(status);
});*/

/*shipwire.trackByOrderNumber({
	raw: true
}, function(err, order) {
	console.log(order);
})*/

/*shipwire.trackAll({
	raw: false,
	bookmark: 1
}, function(err, orders) {
	console.log(orders);
});*/

describe('Shipwire', function(){
	describe('#trackAll()', function(){
		this.timeout(maxTimeout);
		
		it('should return an array', function(done) {
			
			shipwire.trackAll(function(err, orders) {
				assert.equal(true, Array.isArray(orders));//is array;
				assert.equal(true, !!orders.length);
				done();
			})
			
		})
		
		it('should return a raw xml string', function(done) {
			
			shipwire.trackAll({
				raw: true
			}, function(err, orders) {
				assert.equal(true, /^<\?xml/g.test(orders));//string starts with 
				done();
			})
			
		})
	});
	
	describe('#trackByOrderNo()', function(){
		this.timeout(maxTimeout);
		
		it('should throw an error when there\'s no id', function() {
			this.timeout(10);
			assert.throws(function() {
				shipwire.trackByOrderNumber(function(err, order) {
					//do nothing;	
				})
			}, Error);
		});
		
		it('should return an order', function(done) {
			shipwire.trackByOrderNumber(validOrderNumber, function(err, order) {
				assert.equal(true, order && !Array.isArray(order));//object and not an array;
				done();
			})
		});
		
		it('should return an order in xml', function(done) {
			shipwire.trackByOrderNumber(validOrderNumber, {
				raw: true
			}, function(err, order) {
				assert.equal(true, /^<\?xml/g.test(order));//passes as xml
				done();
			})
		});
		
		it('should return undefined as there is no such order', function(done) {
			shipwire.trackByOrderNumber("____", function(err, order) {
				assert.equal(true, order === undefined);//object and not an array;
				done();
			})
		});
		
		it('should return xml even though there is no such order', function(done) {
			shipwire.trackByOrderNumber("____", {
				raw: true
			}, function(err, order) {
				assert.equal(true, /^<\?xml/g.test(order));//object and not an array;
				done();
			})
		});
	});
	
	describe('#trackById()', function(){
		this.timeout(maxTimeout);
		
		it('should throw an error when there\'s no id', function() {
			this.timeout(10);
			assert.throws(function() {
				shipwire.trackById(function(err, order) {
					//do nothing;	
				})
			}, Error);
		});
		
		it('should return an order', function(done) {
			shipwire.trackById(validShipwireID, function(err, order) {
				assert.equal(true, order && !Array.isArray(order));//object and not an array;
				done();
			})
		});
		
		it('should return an order in xml', function(done) {
			shipwire.trackById(validShipwireID, {
				raw: true
			}, function(err, order) {
				assert.equal(true, /^<\?xml/g.test(order));//passes as xml
				done();
			})
		});
		
		it('should return undefined as there is no such order', function(done) {
			shipwire.trackById("_!__", function(err, order) {
				assert.equal(true, order === undefined);//object and not an array;
				done();
			})
		});
		
		it('should return xml even though there is no such order', function(done) {
			shipwire.trackById("_!__", {
				raw: true
			}, function(err, order) {
				assert.equal(true, /^<\?xml/g.test(order));//object and not an array;
				done();
			})
		});
	});
	
	describe('#inventoryStatus()', function(){
		this.timeout(maxTimeout);
		
		it('should return an inventory status', function(done) {
			shipwire.inventoryStatus(function(err, products) {
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			})
		});
		
		it('should return products response in xml', function(done) {
			shipwire.inventoryStatus({
				raw: true
			}, function(err, products) {
				assert.equal(true, /^<\?xml/g.test(products));//passes as xml
				done();
			})
		});
		
		it('should return products from US warehouses', function(done) {
			shipwire.inventoryStatus({
				warehouseCountry: "US"
			}, function(err, products) {
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			})
		});
		
		/*it('should return products from LA warehouse', function(done) {
			shipwire.inventoryStatus({
				warehouse: "LAX"
			}, function(err, products) {
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			})
		});*///for some reason, if a product hasn't arrived at a particular warehouse, a particular query for that warehouse won't return the product (despite other queries for that product including that warehouse as a property of the product);
		
		it('should return products based on array of SKUs', function(done) {
			shipwire.inventoryStatus({
				productCodes: ["sun-0001"]
			}, function(err, products) {
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			})
		});
		
		it('should return products based on array of SKUs and warehouseCountry string', function(done) {
			shipwire.inventoryStatus({
				productCodes: ["sun-0001"],
				warehouseCountry: "US"
			}, function(err, products) {
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			})
		});
		
		it('should return products based on single SKUs as string', function(done) {
			shipwire.inventoryStatus({
				productCodes: "sun-0001"
			}, function(err, products) {
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			})
		});
		
		it('should return products based on single SKUs as string, and format should be XML string', function(done) {
			shipwire.inventoryStatus({
				productCodes: "sun-0001",
				raw: true
			}, function(err, products) {
				assert.equal(true, !!products && /^<\?xml/g.test(products));
				done();
			})
		});
		
		it('should return all products, even those without any inventory, and format should be XML string', function(done) {
			shipwire.inventoryStatus({
				includeEmpty: true,
				raw: true
			}, function(err, products) {
				assert.equal(true, !!products && /^<\?xml/g.test(products));
				done();
			})
		});
	});
})