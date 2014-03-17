'use strict';

var fs = require('fs');
var http = require('http');

var username = "daniel.hritzkiv@gmail.com";
var password = "rTh-B4h-aSA-f6y";

var Shipwire = require("../index.js");//node-shipwire;
var shipwire = new Shipwire(username, password, {
	sandbox: true,//beta or real life
	test: false
});

var order = {
	id: "12579",
	items: [
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
		fullName: "Bob S.",//individual or company
		company: "",//up to 25 characters
		address1: "321 Foo bar lane",
		address2: "#2",
		city: "Toronto",
		province: "Ontario",//"state", "province", "region" are interchangeable. If state or prov, use 2-letter code, otherwise, full name
		country: "CA",//2-letter ISO code
		postalCode: "M5V2L2", //"zip", and "postal code" are interchangeable
		commercial: false,//Boolean
		poBox: ""//null by default. Is it a Boolean?
	},
	warehouse: "00" //default: 00, optimal warehouse
};

var order2 = {
	id: "12578",
	items: [
		{
			code: "sun-0001",
			quantity: 1//Number. Default to 1;
		}
	],
	shippingAddress: {
		fullName: "Bob S.",//individual or company
		company: "",//up to 25 characters
		address1: "321 Foo bar lane",
		address2: "#2",
		city: "Toronto",
		province: "Ontario",//"state", "province", "region" are interchangeable. If state or prov, use 2-letter code, otherwise, full name
		country: "CA",//2-letter ISO code
		postalCode: "M5V2L2", //"zip", and "postal code" are interchangeable
		commercial: false,//Boolean
		poBox: ""//null by default. Is it a Boolean?
	},
	warehouse: "00" //default: 00, optimal warehouse
};

http.createServer(function(req, res) {
	shipwire.rateRequest([order, order2], {
		raw: true,
		sorter: ""//string or function//needed? or let the user do it?
	}, function(err, results) {
		if (err) {
			console.log(err);
		}
		//fs.writeFileSync(__dirname + '/rateReqResponse.json', JSON.stringify(results, null, '\t'));
		console.log(results);
		res.end(results);
	});
}).listen(3013);

/*
<Order id="12579">
    <Warehouse>0</Warehouse>
    <AddressInfo type="ship">
        <Address1>321 Foo bar lane</Address1>
        <Address2>Apartment #2</Address2>
        <City>Nowhere</City>
        <State>CA</State>
        <Country>US</Country>
        <Zip>12345</Zip>
    </AddressInfo>
    <Item num="0">
        <Code>12345</Code>
        <Quantity>1</Quantity>
    </Item>
</Order>
*/