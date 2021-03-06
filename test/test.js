/*global describe,it*/

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var expectedTestResponse = JSON.parse(fs.readFileSync(path.join(__dirname, "/expectedTestCall.json")));

var username = "daniel.hritzkiv@gmail.com";
var password = "rTh-B4h-aSA-f6y";

var Shipwire = require("../");//shipwire;
var shipwire = new Shipwire(username, password, {
	sandbox: true,//beta or real life
	test: false
});

var shipwireTest = new Shipwire(username, password, {
	sandbox: true,
	test: true
});

var shipwireFailProd = new Shipwire(username, password, {
	sandbox: false,
	test: true
});

var validOrderNumber = 21;
var validShipwireID = "1394587839-108974-1";

var maxTimeout = 1e4;//10 seconds
var slowTime = 1e3;//1 second

var order = {
	id: "12579",
	products: [
		{
			code: "sun-0001",
			quantity: 1//Number. Default to 1;
		},
		{
			code: "Scanner-test",
			quantity: 2
		}
	],
	shippingAddress: {
		fullName: "Bob Loblaw.",//individual or company
		company: "Bob & Bob Law Inc.",//up to 25 characters
		address1: "123 Fake Street.",
		address2: "#2",
		city: "Beverly Hills",
		region: "CA",//If state or prov, use 2-letter code, otherwise, full name
		country: "CA",//2-letter ISO code
		zip: "90210", //"zip", and "postal code" are interchangeable
		commercial: false,//Boolean
		poBox: ""//null by default. Is it a Boolean?
	}
	//warehouse: "00", //default: 00, optimal warehouse
	//warehouseCountry: "US"
};

var order2 = {
	id: "12578",
	products: [
		{
			code: "sun-0001"
		}
	],
	shippingAddress: {
		fullName: "Bob Loblaw.",//individual or company
		company: "Dunsfold Park Ltd",//up to 25 characters
		address1: "Dunsfold Park",
		city: "Cranleigh",
		region: "Surrey",//"If state or prov, use 2-letter code, otherwise, full name
		country: "GB",//2-letter ISO code
		postalCode: "GU68TB", //"zip", and "postal code" are interchangeable
		commercial: true//Boolean
	},
	//warehouse: "00"//default: 00, optimal warehouse
	continent: "Europe"
};

var order3 = {
	id: "12579",
	products: [
		{
			code: "Scanner-test",
			quantity: 2
		}
	],
	shippingAddress: {
		fullName: "Toby Fünke.",//individual or company
		company: "",//up to 25 characters
		address1: "Never Nüdes München GmB & Co.",//fake address
		address2: "There are Dozens of us!",
		city: "München",
		region: "B",//If state or prov, use 2-letter code, otherwise, full name//fake region
		country: "ZZ",//2-letter ISO code//wrong country
		zip: "80000", //"zip", and "postal code" are interchangeable
		commercial: false,//Boolean
		poBox: ""//null by default. Is it a Boolean?
	},
	warehouse: "00" //default: 00, optimal warehouse
};

var order4 = {//bad address;
	id: "12578",
	products: [
		{
			code: "sun-0001"
		}
	],
	shippingAddress: {
		fullName: "Bob Loblaw.",//individual or company
		company: "Law Office",//up to 25 characters
		address1: "151 Sterling Road",
		address2: "#2",
		city: "Toronto",
		region: "ON",//If state or prov, use 2-letter code, otherwise, full name
		country: "U"//2-letter ISO code
		//postalCode: "M6R 2B2", //"zip", and "postal code" are interchangeable
		//commercial: true,//Boolean
		//poBox: ""//null by default. Is it a Boolean?
	},
	warehouse: "00"//default: 00, optimal warehouse
};

describe("Shipwire", function() {

	describe("New Shipwire instance", function() {
		it("should throw an error when username and/or passwords are missing", function() {
			assert.throws(function() {
				new Shipwire();
			}, Error);

			assert.throws(function() {
				new Shipwire({
					test: false,
					sandbox: true
				});
			}, Error);

			assert.throws(function() {
				new Shipwire("username");
			}, Error);

			assert.throws(function() {
				new Shipwire("username", {
					test: false,
					sandbox: true
				});
			}, Error);
		});
	});

	describe("#trackAll()", function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);

		it("should return an array", function(done) {
			shipwire.trackAll(function(err, orders) {
				assert.equal(err, null);
				assert.equal(true, Array.isArray(orders));//is array;
				done();
			});
		});

		it("should return a raw xml string", function(done) {
			shipwire.trackAll({
				raw: true
			}, function(err, orders) {
				assert.equal(err, null);
				assert.equal(true, /^<\?xml/g.test(orders));//string starts with
				done();
			});
		});

		it("should return an error", function(done) {

			shipwireFailProd.trackAll(function(err, orders) {
				assert.equal(true, Boolean(err));
				assert.equal(orders, undefined);
				done();
			});
		});
	});

	describe("#trackByOrderNo()", function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);


		it("should throw an error when no arguments are passed", function() {
			assert.throws(function() {
				shipwire.trackByOrderNumber();
			}, Error);
		});

		it("should return an error when there's no id", function(done) {
			this.timeout(10);
			shipwire.trackByOrderNumber(function(err, order) {
				assert.equal(true, Boolean(err));
				assert.equal(true, err instanceof Error);
				assert.equal(order, undefined);
				done();
			});
		});

		it("should return an order", function(done) {
			shipwire.trackByOrderNumber(validOrderNumber, function(err, orderTrackings) {
				assert.equal(err, null);
				assert.equal(true, Array.isArray(orderTrackings));//an array;
				done();
			});
		});

		it("should return an order in xml", function(done) {
			shipwire.trackByOrderNumber(validOrderNumber, {
				raw: true
			}, function(err, order) {
				assert.equal(err, null);
				assert.equal(true, /^<\?xml/g.test(order));//passes as xml
				done();
			});
		});

		it("should return undefined as there is no such order", function(done) {
			shipwire.trackByOrderNumber("____", function(err, orderTrackings) {
				assert.equal(err, null);
				assert.equal(0, orderTrackings.length);//an empty array;
				done();
			});
		});

		it("should return xml even though there is no such order", function(done) {
			shipwire.trackByOrderNumber("____", {
				raw: true
			}, function(err, order) {
				assert.equal(err, null);
				assert.equal(true, /^<\?xml/g.test(order));//raw xml;
				done();
			});
		});
	});

	describe("#trackById()", function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);

		it("should throw an error when no arguments are passed", function() {
			assert.throws(function() {
				shipwire.trackById();
			}, Error);
		});

		it("should return an error when there's no id", function(done) {
			this.timeout(10);
			shipwire.trackById(function(err, order) {
				assert.equal(true, Boolean(err));
				assert.equal(true, err instanceof Error);
				assert.equal(order, undefined);
				done();
			});
		});

		it("should return an order", function(done) {
			shipwire.trackById(validShipwireID, function(err, orderTrackings) {
				assert.equal(err, null);
				assert.equal(true, Array.isArray(orderTrackings));//an array of tracking information for an order;
				done();
			});
		});

		it("should return an order in xml", function(done) {
			shipwire.trackById(validShipwireID, {
				raw: true
			}, function(err, orderTrackings) {
				assert.equal(err, null);
				assert.equal(true, /^<\?xml/g.test(orderTrackings));//passes as xml
				done();
			});
		});

		it("should return an empty array as there is no such order", function(done) {
			shipwire.trackById("_!__", function(err, orders) {
				assert.equal(err, null);
				assert.equal(0, orders.length);//object and an empty array;
				done();
			});
		});

		it("should return xml even though there is no such order", function(done) {
			shipwire.trackById("_!__", {
				raw: true
			}, function(err, order) {
				assert.equal(err, null);
				assert.equal(true, /^<\?xml/g.test(order));//object and not an array;
				done();
			});
		});
	});

	describe("#inventoryStatus()", function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);

		it("should return an array of products", function(done) {
			shipwire.inventoryStatus(function(err, products) {
				assert.equal(err, null);
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			});
		});

		it("should return products response in xml", function(done) {
			shipwire.inventoryStatus({
				raw: true
			}, function(err, products) {
				assert.equal(err, null);
				assert.equal(true, /^<\?xml/g.test(products));//passes as xml
				done();
			});
		});

		it("should return an array of products from US warehouses", function(done) {
			shipwire.inventoryStatus({
				warehouseCountry: "US"
			}, function(err, products) {
				assert.equal(err, null);
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			});
		});

		/*it('should return products from LA warehouse', function(done) {
			shipwire.inventoryStatus({
				warehouse: "LAX"
			}, function(err, products) {
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			})
		});*///for some reason, querying a particular warehouse does not work, despite items showing as at the warehouse in the online dashboard. Also, querying by WarehouseCountry

		it("should return an array of products based on array of SKUs", function(done) {
			shipwire.inventoryStatus({
				productCodes: ["sun-0001"]
			}, function(err, products) {
				assert.equal(err, null);
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			});
		});

		it("should return an array of products based on array of SKUs and warehouseCountry string", function(done) {
			shipwire.inventoryStatus({
				productCodes: ["sun-0001"],
				warehouseCountry: "US"
			}, function(err, products) {
				assert.equal(err, null);
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			});
		});

		it("should return an array of products based on single SKUs as string", function(done) {
			shipwire.inventoryStatus({
				productCodes: "sun-0001"
			}, function(err, products) {
				assert.equal(err, null);
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			});
		});

		it("should return all products, even those without any inventory", function(done) {
			shipwire.inventoryStatus({
				includeEmpty: true
			}, function(err, products) {
				assert.equal(err, null);
				assert.equal(true, products && Array.isArray(products) && products.length > 0);
				done();
			});
		});
	});

	describe("#rateRequest()", function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);

		it("should return an error when there's no order", function(done) {
			shipwire.rateRequest(function(err, results) {
				assert.equal(true, Boolean(err));
				assert.equal(true, err instanceof Error);
				assert.equal(results, null);
				done();
			});
		});

		it("should return an array of orders with quotes and original orders in order", function(done) {
			shipwire.rateRequest([order, order2], function(err, results) {
				assert.equal(err, null);
				assert.equal(true, results && Array.isArray(results) && results.length > 0);
				assert.equal(true, results[0].order.id === order.id);
				done();
			});
		});

		it("should return a single order object with quotes and original order", function(done) {
			shipwire.rateRequest(order, function(err, result) {
				assert.equal(err, null);
				assert.equal(true, result && !Array.isArray(result));
				assert.equal(true, result.order.id === order.id);
				done();
			});
		});

		it("should return a single order object with quotes and original order", function(done) {
			shipwire.rateRequestByMethod(order, "INTL", function(err, result) {
				assert.equal(err, null);
				assert.equal(true, result && !Array.isArray(result));
				assert.equal(true, result.order.id === order.id);
				done();
			});
		});

		it("should return an error when an order has bad information", function(done) {
			shipwire.rateRequest(order3, function(err, result) {
				assert.equal(true, Boolean(err));
				assert.equal(true, err instanceof Error);
				assert.equal(result, undefined);
				done();
			});
		});

		it("should return an error when an order has bad address information", function(done) {
			shipwire.rateRequest(order4, function(err, result) {
				assert.equal(true, Boolean(err));
				assert.equal(true, err instanceof Error);
				assert.equal(result, undefined);
				done();
			});
		});
	});

	describe("xmlParsing", function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);

		it("should match expected results from test call", function(done) {

			shipwireTest.trackAll(function(err, orders) {
				assert.equal(err, null);
				assert.deepEqual(JSON.stringify(orders)[0], JSON.stringify(expectedTestResponse)[0]);
				done();
			});
		});

		it("should create Booleans from \"NO\", \"YES\", \"TRUE\", \"FALSE\"", function(done) {
			shipwireTest.trackAll(function(err, orders) {
				assert.equal(err, null);

				var containsBoolean = orders.every(function(order) {
					return Object.keys(order).some(function(key) {
						return typeof order[key] === "boolean";
					});
				});

				assert.equal(true, containsBoolean);
				done();
			});
		});

		it("should contain a date", function(done) {
			shipwireTest.trackAll(function(err, orders) {
				assert.equal(err, null);

				var containsDate = orders.every(function(order) {
					return Object.keys(order).some(function(key) {
						return order[key] instanceof Date;
					});
				});

				assert.equal(true, containsDate);
				done();
			});
		});
	});
});
