"use strict";

var https = require('https');

var xml2js = require('xml2js');
var xmlParser = xml2js.Parser();

/*
===========
Constructor
===========
*/

function Shipwire(username, password, options) {

	if (!username || typeof username !== "string" || !password || typeof password !== "string") {
		throw new Error("Credentials not supplied for Shipwire");
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
	};

	requestOptions.host = options.sandbox ? 'api.beta.shipwire.com' : 'api.shipwire.com';
	requestOptions.host = options.host || requestOptions.host;//allow overriding of host completely

	this.requestOptions = function() {
		return requestOptions;
	};
	this.options = options;

	return this;
}


/*
=========
Utilities
=========
*/


function cloneObject(object) {
	var clone = {};
	for (var key in object) {
		if (object.hasOwnProperty(key)) {
			clone[key] = object[key];
		}
	}
	return clone;
}

function parseXML(string, next) {

	function recursiveCast(object) {
		for (var key in object) {
			if (object.hasOwnProperty(key)) {
				object[key] = castValue(object[key]);
			}
		}

		return object;
	}

	function castValue(value) {

		if (typeof value === "object" && value.constructor === Object) {
			return recursiveCast(value);
		} else if (Array.isArray(value)) {
			return recursiveCast(value);
		}

		var dateMatch = value.match(/(\d{4})\-(\d{2})\-(\d{2})\s(\d{2}):(\d{2}):(\d{2})/);//"YYYY-MM-DD HH:MM:SS"
		if (dateMatch) {
			dateMatch.splice(0, 1);//disregard the fully matched string, return only matched groups
			dateMatch = dateMatch.map(function (number) {
				return number|0;//numbers as strings to integers
			});
			--dateMatch[1];//decrease month value, as JS months start at 0;
			var NewDate = Date.bind.apply(Date, [null].concat(dateMatch));
			value = new NewDate();//new Date from array
		}

		if (value === "NO" || value === "FALSE") {
			value = false;
		} else if (value === "YES" || value === "TRUE") {
			value = true;
		}

		return value;
	}

	function checkError(object) {

		if (object.Status.indexOf("Error") !== -1) {
			var error = new Error(object.ErrorMessage);
			return error;
		}
		return false;
	}

	function checkErrorInOrder(order) {
		var error = false;
		if (order.Errors) {
			error = new Error(order.Errors[0].Error);
		}
		if (order.Warnings) {
			error = new Error(order.Warnings[0].Warning);
		}
		return error;
	}

	function parseTracking(orders) {

		if (!orders || !orders.length) {
			return [];
		}

		var error;
		orders.some(function(order) {
			error = checkErrorInOrder(order);
			return !!error;
		});

		if (error) {
			return error;
		}

		orders = orders.map(function(order) {
			var thisOrder = order.$;

			thisOrder = recursiveCast(thisOrder);

			if (order.TrackingNumber) {
				order.TrackingNumber = order.TrackingNumber.map(function(item) {
					var thisTrackingNumber = item.$;
					thisTrackingNumber.trackingNumber = item._.replace(/[^a-zA-Z0-9\-\_]/g, "");
					return thisTrackingNumber;
				});
				thisOrder.trackingNumber = order.TrackingNumber[0];
			}
			return thisOrder;
		});

		return orders;
	}

	function parseInventory(products) {

		if (!products || !products.length) {
			return [];
		}

		products = products.map(function(product) {
			var thisProduct = product.$;
			return thisProduct;
		});

		return products;
	}

	function parseRateRequest(orders) {

		if (!orders || !orders.length) {
			return [];
		}

		var error;
		orders.some(function(order) {
			error = checkErrorInOrder(order);
			return !!error;
		});

		if (error) {
			return error;
		}

		orders = recursiveCast(orders);

		orders = orders.map(function(order) {
			var quotes = order.Quotes[0].Quote;

			if (!Array.isArray(quotes)) {
				return [];
			}

			quotes = quotes.map(function(method) {
				var newMethod = {
					method: method.$.method
				};

				newMethod.warehouse = {
					warehouse: method.Warehouse[0]._,
					code: method.Warehouse[0].$.code,
					region: method.Warehouse[0].$.region
				};

				newMethod.service = {
					name: method.Service[0]._,
					code: method.CarrierCode[0],
					trackable: method.Service[0].$.trackable,
					signatureRequired: method.Service[0].$.signatureRequired
				};

				var carrierMatch = method.Service[0]._.match(/(UPS|USPS|FedEx|Purolator|Canada\sPost)/g);
				if (carrierMatch) {
					newMethod.service.carrier = carrierMatch[0];
				} else {
					newMethod.service.carrier = method.Service[0]._.split(" ")[0];
				}

				function castCost(object) {

					var costObject = {
						total: parseFloat(object._)//,
						//currency: object.$.currency,
						//converted: object.$.converted
					};

					/*if (costObject.converted) {
						costObject.originalTotal = object.$.originalCost;
						costObject.originalCurrency = object.$.originalCurrency;
					}*/

					return costObject;
				}

				newMethod.cost = castCost(method.Cost[0]);

				["Freight", "Insurance", "Packaging", "Handling"].forEach(function(costType) {
					var matchingType = method.Subtotals[0].Subtotal.filter(function(item) {
						return item.$.type === costType;
					})[0];

					newMethod.cost[costType.toLowerCase()] = parseFloat(matchingType.Cost[0]._);//castCost(matchingType.Cost[0]);

					/*if (typeof matchingType.$.includedInCost != "undefined") {
						newMethod.cost[costType.toLowerCase()].includedInCost = matchingType.$.includedInCost;
					}*/
				});

				newMethod.deliveryEstimate = {
					minimum: parseInt(method.DeliveryEstimate[0].Minimum[0]._),
					maximum: parseInt(method.DeliveryEstimate[0].Maximum[0]._)
				};

				return newMethod;
			});

			//thisOrder
			var orderObject = {
				_sequence: order.$.sequence,
				quotes: quotes
			};

			return orderObject;
		});

		return orders;
	}

	xmlParser.parseString(string, function (err, result) {
		if (err) {
			return next(err);
		}

		var parsed;
		var error = checkError(result.TrackingUpdateResponse || result.InventoryUpdateResponse || result.RateResponse);

		if (error) {
			return next(error);
		}

		if (result.TrackingUpdateResponse) {
			parsed = parseTracking(result.TrackingUpdateResponse.Order);
		} else if (result.InventoryUpdateResponse) {
			parsed = parseInventory(result.InventoryUpdateResponse.Product);
		} else if (result.RateResponse) {
			parsed = parseRateRequest(result.RateResponse.Order);
		} else {
			return next(null, result);
		}

		if (parsed instanceof Error) {
			return next(parsed);
		}

		return next(null, parsed);
	});
}

function parseAddress(address) {

	var parsedAddress = {
		Company: address.company,
		Address1: address.address1,
		Address2: address.address2,
		Address3: address.address3,
		City: address.city,
		State: address.state,
		Country: address.country,
		Zip: address.zip || address.postalCode,
		Commercial: address.commercial,
		PoBox: address.poBox,
		Phone: address.phone,
		Email: address.email
	};

	if (address.fullName) {
		parsedAddress.Name = [
			{
				key: "Full",
				value: address.fullName
			}
		];
	}

	return parsedAddress;
}


function parseOrder(order) {
	var object = {
		key: "Order",
		attributes: [],
		value: []
	};

	if (order.id) {
		object.attributes.push({
			key: "id",
			value: order.id
		});
	}

	var shippingAddress = parseAddress(order.shippingAddress);

	var shippingAddressValues = [];
	for (var key in shippingAddress) {
		if (shippingAddress.hasOwnProperty(key) && !!shippingAddress[key]) {
			shippingAddressValues.push({
				key: key,
				value: shippingAddress[key]
			});
		}
	}

	object.value.push({
		key: "AddressInfo",
		attributes: [
			{
				key: "type",
				value: "ship"
			}
		],
		value: shippingAddressValues
	});

	order.products.forEach(function(item, index) {
		object.value.push({
			key: "Item",
			attributes: [
				{
					key: "num",
					value: index
				}
			],
			value: [
				{
					key: "Code",
					value: item.code
				},
				{
					key: "Quantity",
					value: typeof item.quantity !== "undefined"? item.quantity : 1
				}
			]
		});
	});

	if (order.shipping) {
		object.value.push({
			key: "Shipping",
			value: order.shipping
		});
	}

	if (order.method) {
		object.value.push({
			key: "Method",
			value: order.method
		});
	}

	object.value.push({
		key: "Warehouse",
		value: order.warehouse || "00"
	});

	if (order.warehouseContinents) {
		if (!Array.isArray(order.warehouseContinents)) {
			order.warehouseContinents = [order.warehouseContinents];
		}
		object.value.push({
			key: "WarehouseContinents",
			value: order.warehouseContinents.map(function(continent) {
				return {
					key: "Continent",
					value: continent.replace(/\s/,"_").toUpperCase()
				};
			})
		});
	}

	if (order.warehouseCountry) {
		object.value.push({
			key: "WarehouseCountry",
			value: order.warehouseCountry
		});
	}

	return object;
}

Shipwire.prototype._newRequestBody = function(options) {

	var requestBody = '<?xml version="1.0" encoding="UTF-8"?>\r\n';

	requestBody += '<!DOCTYPE ' + options.type + ' SYSTEM "http://www.shipwire.com/exec/download/' + options.type + '.dtd">\r\n';
	requestBody += '<' + options.type + '>\r\n';
	requestBody += '\t<Username><![CDATA[' + this.username + ']]></Username>\r\n';
	requestBody += '\t<Password><![CDATA[' + this.password + ']]></Password>\r\n';
	requestBody += '\t<Server>' + this.options.server + '</Server>\r\n';//not needed for rate request. Do check for type "RateRequest"?

	function forEachAttribute(attribute) {
		return " " + attribute.key + "=\"" + attribute.value + "\"";
	}

	function forEachField(field) {
		var localBody = "\t";

		if (field.value === false) {
			return;
		} else if (field.value === true) {//strict true, or strict false. Do we need false?

			localBody += '<' + field.key;

			if (field.attributes && Array.isArray(field.attributes)) {
				localBody += field.attributes.forEach(forEachAttribute);
			}

			localBody += '/>';

		} else if (Array.isArray(field.value)) {

			localBody += '<' + field.key;

			if (field.attributes) {
				field.attributes.forEach(function (attribute) {
					localBody += forEachAttribute(attribute);
				});
			}

			localBody += '>';

			field.value.forEach(function(value) {
				localBody += forEachField(value);
			});

			localBody += '</' + field.key + '>';

		} else {

			localBody += '<' + field.key;

			if (field.attributes) {
				localBody += field.attributes.forEach(forEachAttribute);
			}

			localBody += '><![CDATA[' + field.value + ']]></' + field.key + '>';

		}

		localBody += '\r\n';
		return localBody;
	}

	options.additionalFields.forEach(function(field) {
		var localBody = forEachField(field);
		requestBody += localBody;
	});

	requestBody += '</' + options.type + '>\n';

	return requestBody;
};

Shipwire.prototype._makeRequest = function(requestOptions, requestBody, next) {

	var responseBody = "";
	var req = https.request(requestOptions, function(res) {

		if (res.statusCode === 500) {
			var error = new Error("Shipwire server error");
			error.code = 500;
			return next(error);
		}

		res.setEncoding('utf-8');
		res.on('data', function(chunk) {
			responseBody += chunk;
		});

		res.on('end', function() {
			next(null, responseBody);
		});
	});

	req.on('socket', function(socket) {

		socket.setTimeout(1e4);//10 seconds;

		socket.once('timeout', function() {
			socket.destroy();
		});
	});

	req.on('error', function(err) {
		//console.log('http req error: ' + err);
		return next(err);
	});

	req.write(requestBody);
	req.end();//end request, proceed to response
};

/*
========
Tracking
========
*/

Shipwire.prototype._track = function(options, next) {

	options = options || {};

	var requestBodyOptions = {
		type: "TrackingUpdate",
		additionalFields: []
	};

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

	var requestOptions = this.requestOptions();
	requestOptions.path = '/exec/TrackingServices.php';

	this._makeRequest(requestOptions, requestBody, function(err, body) {

		if (err) {
			return next(err);
		}

		if (options.raw) {
			return next(null, body);
		}

		parseXML(body, function(err, json) {

			if (err) {
				return next(err);
			}

			json = options._multiple ? json : json[0];
			return next(null, json);
		});
	});

};

Shipwire.prototype.trackAll = function(options, next) {
	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options.bookmark = options.bookmark || 1;
	options._multiple = true;//return array

	return Shipwire.prototype._track.call(this, options, next);
};

Shipwire.prototype.trackById = function(id, options, next) {

	if (!id) {
		throw new Error("No arguments passed");
	}

	if (!(id && typeof id === "string" || typeof id === "number")) {//use arguments.length?
		return id(new Error("No ID provided."));//next is id;
	}

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options.id = id;
	options._multiple = true;//return an array of tracking information, as each order may have multiple tracking numbers
	return Shipwire.prototype._track.call(this, options, next);
};

Shipwire.prototype.trackByOrderNumber = function(id, options, next) {

	if (!id) {
		throw new Error("No arguments passed");
	}

	if (!(id && typeof id === "string" || typeof id === "number")) {
		return id(new Error("No ID provided."));//next is id;
	}

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options.orderNo = id;
	options._multiple = true;//return an array of tracking information, as each order may have multiple tracking numbers
	return Shipwire.prototype._track.call(this, options, next);
};

/*
================
Inventory Status
================
*/

Shipwire.prototype.inventoryStatus = function(options, next) {

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options._multiple = true;
	options.raw = options.raw || false;

	var requestBodyOptions = {
		type: "InventoryUpdate",
		additionalFields: []
	};

	if (options.warehouse) {
		requestBodyOptions.additionalFields.push({
			key: "Warehouse",
			value: options.warehouse //Warehouse: CHI, LAX, PHL, VAN, TOR, UK, or HKG
		});
	}

	if (options.warehouseCountry) {
		requestBodyOptions.additionalFields.push({
			key: "WarehouseCountry",
			value: options.warehouseCountry //WarehouseCountry: US, CA, GB, or HK//2-letter ISO-3166-2 code
		});
	}

	if (options.productCodes) {
		if (Array.isArray(options.productCodes) && options.productCodes.length) {
			options.productCodes.forEach(function(code) {
				requestBodyOptions.additionalFields.push({
					key: "ProductCode",
					value: code
				});
			});
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
			value: true //IncludeEmpty: Boolean
		});
	}

	var requestBody = Shipwire.prototype._newRequestBody.call(this, requestBodyOptions);

	var requestOptions = this.requestOptions();
	requestOptions.path = '/exec/InventoryServices.php';

	this._makeRequest(requestOptions, requestBody, function(err, body) {
		if (err) {
			return next(err);
		}

		if (options.raw) {
			return next(null, body);
		}

		parseXML(body, function(err, json) {
			if (err) {
				return next(err);
			}

			json = options._multiple ? json : json[0];
			return next(err, json);
		});
	});
};


/*
============
Rate Request
============
*/

Shipwire.prototype._rateRequest = function(orders, options, next) {
	options = options || {};

	var requestBodyOptions = {
		type: "RateRequest",
		additionalFields: [
			/*{
				currency: "CAD"
			}*/
		]
	};

	orders.forEach(function(order) {
		requestBodyOptions.additionalFields.push(parseOrder(order));
	});

	var requestBody = Shipwire.prototype._newRequestBody.call(this, requestBodyOptions);

	var requestOptions = this.requestOptions();
	requestOptions.path = '/exec/RateServices.php';

	this._makeRequest(requestOptions, requestBody, function(err, body) {
		if (err) {
			return next(err);
		}

		if (options.raw) {
			return next(null, body);
		}

		parseXML(body, function(err, json) {

			if (err) {
				return next(err);
			}

			if (json && Array.isArray(json)) {
				json = json.map(function(order) {
					order.order = Array.isArray(orders) ? orders[order._sequence - 1] : orders;
					delete order._sequence;
					return order;
				});

				json = options._multiple ? json : json[0];
			}

			return next(err, json);
		});
	});
};

Shipwire.prototype.rateRequest = function(orders, options, next) {

	if (!arguments.length || typeof orders !== "object" || (!Array.isArray(orders) ? typeof orders.shippingAddress === "undefined" : typeof orders[0].shippingAddress === "undefined")) {
		//throw new Error("no orders passed in");
		return orders(new Error("no orders passed in"));//next = orders;
	}//this if statement is a bit complicated. Any better way of checking, without giving up the convenience of 'orders' being an Array or Object?

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options._multiple = true;
	options.raw = options.raw || false;

	if (!Array.isArray(orders)) {
		orders = [orders];
		options._multiple = false;
	}

	return Shipwire.prototype._rateRequest.call(this, orders, options, next);
};


Shipwire.prototype.rateRequestByMethod = function(orders, method, options, next) {

	if (!arguments.length || typeof orders !== "object" || typeof method !== "string" || (!Array.isArray(orders) ? typeof orders.shippingAddress === "undefined" : typeof orders[0].shippingAddress === "undefined")) {
		//throw new Error("no orders passed in");
		return orders(new Error("no orders passed in"));//next = orders;
	}//this if statement is a bit complicated. Any better way of checking, without giving up the convenience of 'orders' being an Array or Object?

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options._multiple = true;
	options.raw = options.raw || false;

	if (!Array.isArray(orders)) {
		orders = [orders];
		options._multiple = false;
	}

	orders = orders.map(function(order) {
		order.method = method.toUpperCase();
		return order;
	});

	return Shipwire.prototype._rateRequest.call(this, orders, options, next);
};

module.exports = Shipwire;
