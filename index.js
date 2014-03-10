var https = require('https');

var xml2js = require('xml2js');
var xmlParser = xml2js.Parser();

function parseXML(string, next) {
//transform XML to JSON and return
	xmlParser.parseString(string, function (err, result) {
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

Shipwire.prototype.trackAll = function(options, next) {
	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	var requestBody = this._newRequestBody({
		type: "TrackingUpdate",
		additionalFields: [
			{
				key: "Bookmark",
				value: "1"
			}
		]
	});

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
			return next(err, json);
		})
	})
}

Shipwire.prototype.trackById = function(id, options, next) {

	if (!id) {
		throw new Error("No ID provided.")
	}

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	var requestBody = this._newRequestBody({
		type: "TrackingUpdate",
		additionalFields: [
			{
				key: "ShipwireId",
				value: id
			}
		]
	});

	var requestOptions = this.requestOptions;
	requestOptions.path = '/exec/TrackingServices.php';

	this._makeRequest(requestOptions, requestBody, function(err, body) {
		if (err) {
			return next(err);
		}

		if (options.raw) {
			return next(null, body);
		}

		//transform XML to JSON and return
		parseXML(body, function(err, json) {
			if (json) {
				return next(err, json[0]);
			}
			return next(err, null);
		})
	})
}


Shipwire.prototype.trackByOrderNumber = function(id, options, next) {

	if (!id) {
		throw new Error("No ID provided.")
	}

	if (!next) {//if typeof options is a function?
		next = options;
		options = {};
	}

	var requestBody = this._newRequestBody({
		type: "TrackingUpdate",
		additionalFields: [
			{
				key: "OrderNo",
				value: id
			}
		]
	});

	var requestOptions = this.requestOptions;
	requestOptions.path = '/exec/TrackingServices.php';

	this._makeRequest(requestOptions, requestBody, function(err, body) {
		if (err) {
			return next(err);
		}

		if (options.raw) {
			return next(null, body);
		}

		//transform XML to JSON and return
		parseXML(body, function(err, json) {
			if (json) {
				return next(err, json[0]);
			}
			return next(err, null);
		})
	})
}

/*function shipwireRequest(next) {


	var body = '<?xml version="1.0" encoding="UTF-8"?>\
	<!DOCTYPE TrackingUpdate SYSTEM "http://www.shipwire.com/exec/download/TrackingUpdate.dtd">\
	<TrackingUpdate>\
		<Username>daniel.hritzkiv@gmail.com</Username>\
		<Password>rTh-B4h-aSA-f6y</Password>\
		<Server>Production</Server>\
		<OrderNo>85</OrderNo>\
	</TrackingUpdate>';

	//<Bookmark>1</Bookmark>\ //1: all results, 2: since last time, 3: since last time + reset to start



}*/

module.exports = Shipwire;