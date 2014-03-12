var https = require('https');

var xml2js = require('xml2js');
var xmlParser = xml2js.Parser();

function parseXML(string, next) {
	xmlParser.parseString(string, function (err, result) {
		if (err) {
			return next(err);
		}

		if (result.TrackingUpdateResponse) {

			var orders = result.TrackingUpdateResponse.Order;

			if (!orders || !orders.length) { //array of orders;
				return next(null, []);
			}

			orders = orders.map(function(order) {
				var thisOrder = order["$"];
				if (order.TrackingNumber) {
					order.TrackingNumber = order.TrackingNumber.map(function(item) {
						var thisTrackingNumber = item["$"];
						thisTrackingNumber.trackingNumber = item["_"].replace(/[^a-zA-Z0-9\-\_]/g, "");
						return thisTrackingNumber;
					})
					thisOrder.trackingNumber = order.TrackingNumber[0];
				}
				return thisOrder;
			});

			next(null, orders);
		}

		if (result.InventoryUpdateResponse) {
			var products = result.InventoryUpdateResponse.Product;

			if (!products || !products.length) {
				return next(null, []);
			}
			products = products.map(function(product) {
				var thisProduct = product["$"];
				return thisProduct;
			});

			next(null, products);
		}

	});
}

function Shipwire(username, password, options) {

	if (!username || !password) {
		throw new Error("Options not supplied for Shipwire");
	}
	
	this.username = username;
	this.password = password;

	options = options || {};
	options.test = options.test || false;
	options.server = options.test ? "Test" : "Production"; //Test or Production, default to production
	options.sandbox = typeof options.sandbox != "undefined" ? !!options.sandbox : false;

	var requestOptions = {
		port: 443,//https
		method: 'POST',
		headers: {
			"Content-Type": "application/xml"
		}
	}

	requestOptions.host = options.sandbox ? 'api.beta.shipwire.com' : 'api.shipwire.com';

	this.requestOptions = requestOptions;
	this.options = options;

	return this;
}

Shipwire.prototype._newRequestBody = function(options) {
	var requestBody = '<?xml version="1.0" encoding="UTF-8"?>\n';

	requestBody += '<!DOCTYPE ' + options.type + ' SYSTEM "http://www.shipwire.com/exec/download/' + options.type + '.dtd">\n'
	requestBody += '<' + options.type + '>\n';
	requestBody += '\t<Username>' + this.username + '</Username>\n';
	requestBody += '\t<Password>' + this.password + '</Password>\n';
	requestBody += '\t<Server>' + this.options.server + '</Server>\n';

	for (var i = 0; i < options.additionalFields.length; i++) {//forEach instead of for loop?
		var field = options.additionalFields[i];
		requestBody += '\t<' + field.key + '>' + field.value + '</' + field.key + '>\n';

		//handle booleans?
	}

	requestBody += '</' + options.type + '>\n';

	return requestBody;
}

Shipwire.prototype._makeRequest = function(requestOptions, requestBody, next) {
	//console.log(requestBody);
	var responseBody = "";
	var req = https.request(requestOptions, function(res) {
		res.setEncoding('utf-8');
		res.on('data', function(chunk) {
			responseBody += chunk;
		})

		res.on('end', function() {
			next(null, responseBody);
		})
	})

	req.on('error', function(err) {
		console.log('http req error: ' + err.message || err);
		return next(err);
	})

	req.write(requestBody);
	req.end();//end request, proceed to response
}

Shipwire.prototype._track = function(options, next) {
	options = options || {};
	//options._multiple = options._multiple;
	options.bookmark;//1, 2, or 3;
	options.orderNo;
	options.id;


	var requestBodyOptions = {
		type: "TrackingUpdate"
	};

	requestBodyOptions.additionalFields = [];

	if (typeof options.orderNo !== "undefined") {
		requestBodyOptions.additionalFields.push({
			key: "OrderNo",
			value: options.orderNo
		});
	}

	if (typeof options.id !== "undefined") {
		requestBodyOptions.additionalFields.push({
			key: "ShipwireId",
			value: options.id
		});
	}

	if (typeof options.bookmark !== "undefined") {
		requestBodyOptions.additionalFields.push({
			key: "Bookmark",
			value: options.bookmark
		});
	}

	var requestBody = Shipwire.prototype._newRequestBody.call(this, requestBodyOptions);

	var requestOptions = this.requestOptions;
	requestOptions.path = '/exec/TrackingServices.php';

	this._makeRequest(requestOptions, requestBody, function(err, body) {
		if (err) {
			return next(err);
		}

		if (options.raw) {
			return next(null, body);
		}

		parseXML(body, function(err, json) {
			json = options._multiple ? json : json[0];
			return next(err, json);
		})
	});

}

Shipwire.prototype.trackAll = function(options, next) {
	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options.bookmark = options.bookmark || 1;
	options._multiple = true;//return array

	return Shipwire.prototype._track.call(this, options, next);
}

Shipwire.prototype.trackById = function(id, options, next) {

	if (!id || typeof id !== "string") {//use arguments.length?
		throw new Error("No ID provided.")
	}

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options.id = id;
	options._multiple = false;//return just one;
	return Shipwire.prototype._track.call(this, options, next);
}


Shipwire.prototype.trackByOrderNumber = function(id, options, next) {

	if (!id || typeof id !== "string") {
		throw new Error("No ID provided.")
	}

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options.orderNo = id;
	options._multiple = false;//return just one;
	return Shipwire.prototype._track.call(this, options, next);
}

Shipwire.prototype.inventoryStatus = function(options, next) {

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}
	
	options._multiple = true;
	options.raw = options.raw || false;

	var requestBodyOptions = {
		type: "InventoryUpdate"
	}

	requestBodyOptions.additionalFields = [];

	if (options.warehouse) {
		requestBodyOptions.additionalFields.push({
			key: "Warehouse",
			value: options.warehouse
		});
	}

	if (options.warehouseCountry) {
		requestBodyOptions.additionalFields.push({
			key: "WarehouseCountry",
			value: options.warehouseCountry
		});
	}

	if (options.productCodes) {
		if (Array.isArray(options.productCodes) && options.productCodes.length) {
			options.productCodes.forEach(function(code) {
				requestBodyOptions.additionalFields.push({
					key: "ProductCode",
					value: code
				});
			})
		} else {
			requestBodyOptions.additionalFields.push({
				key: "ProductCode",
				value: options.productCodes
			});
		}
	}

	if (options.includeEmpty) {// better term?
		//if true, all products, even which have never had inventory, will be returned;
		requestBodyOptions.additionalFields.push({
			key: "IncludeEmpty",
			value: true
		});
	}

	var requestBody = Shipwire.prototype._newRequestBody.call(this, requestBodyOptions);

	var requestOptions = this.requestOptions;
	requestOptions.path = '/exec/InventoryServices.php';

	this._makeRequest(requestOptions, requestBody, function(err, body) {
		if (err) {
			return next(err);
		}

		if (options.raw) {
			return next(null, body);
		}

		parseXML(body, function(err, json) {
			json = options._multiple ? json : json[0];
			return next(err, json);
		})
	});

	//Warehouse: CHI, LAX, PHL, VAN, TOR, UK, or HKG
	//WarehouseCountry: US, CA, GB, or HK//2-letter ISO-3166-2 code
	//ProductCode: [SKU]//multiple
	//IncludeEmpty: Bool
}


module.exports = Shipwire;