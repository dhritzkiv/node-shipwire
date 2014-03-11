var https = require('https');

var xml2js = require('xml2js');
var xmlParser = xml2js.Parser();

function parseXML(string, next) {
	xmlParser.parseString(string, function (err, result) {
		if (err) {
			return next(err);
		}
		//console.log(result);
		//console.log(body);
		if (!result.TrackingUpdateResponse.Order) {
			return next(null, []);
		}

		next(null, result.TrackingUpdateResponse.Order.map(function(order) {
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
		}));
	});
}

function Shipwire(options) {

	if (!options) {
		throw new Error("Options not supplied for Shipwire");
	}

	options.username;
	options.password;
	options.production = typeof options.production != "undefined" ? !!options.production : false;
	options.server = options.production ? "Production" : "Test"; //Test or Production
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
	requestBody += '<Username>' + this.options.username + '</Username>\n';
	requestBody += '<Password>' + this.options.password + '</Password>\n';
	requestBody += '<Server>' + this.options.server + '</Server>\n';

	for (var i = 0; i < options.additionalFields.length; i++) {
		var field = options.additionalFields[i];
		requestBody += '<' + field.key + '>' + field.value + '</' + field.key + '>';
	}

	requestBody += '</' + options.type + '>\n';

	return requestBody;
}

Shipwire.prototype._makeRequest = function(requestOptions, requestBody, next) {

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
	options.multiple = typeof options.multiple !== "undefined" ? options.multiple : false;
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
			json = options.multiple ? json : json[0];
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
	options.multiple = typeof options.multiple !== "undefined" ? options.multiple : true;//return array

	return Shipwire.prototype._track.call(this, options, next);
}

Shipwire.prototype.trackById = function(id, options, next) {

	if (!id) {
		throw new Error("No ID provided.")
	}

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options.id = id;
	options.multiple = typeof options.multiple !== "undefined" ? options.multiple : false;//return just one;
	return Shipwire.prototype._track.call(this, options, next);
}


Shipwire.prototype.trackByOrderNumber = function(id, options, next) {

	if (!id) {
		throw new Error("No ID provided.")
	}

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	options.orderNo = id;
	options.multiple = typeof options.multiple !== "undefined" ? options.multiple : false;//return just one;
	return Shipwire.prototype._track.call(this, options, next);
}

module.exports = Shipwire;