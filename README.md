shipwire
=============

Node.js library to communicate with the Shipwire API

### Note: this library is no in development as Shipwire's XML API (V2) has been superceded by their recently released REST API (V3). This library will not be compatible with API V3.

##Features

###Current

- [Order Tracking and Status](#track)
- [Inventory](#inventory)
- [Rate Quotes](#rate-request)
- Conversion of XML responses to JSON (using [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js))


##Install

	npm install --save shipwire

##Usage

	var Shipwire = require('shipwire');
	var shipwire = new Shipwire(USERNAME, PASSWORD);

	shipwire.trackAll(function(err, orders) {
		//array of orders;
	})

##Methods

###Shipwire

	new Shipwire(username, password, options)

Sets your credentials and connection settings, and returns a `shipwire` object to use for your requests.

**username** - String *(required)*.
Your Shipwire account username, typically an email.

**password** - String *(required)*.
Your Shipwire account password.

**options** - Object *(optional)*

- `sandbox` - Boolean. Whether to use the sandboxed environment, or production environment. Default: `false`
- `test` - Boolean. Whether to use Shipwire's Test server (which returns properly formatted sample responses), or the Production server, which returns responses based on the data in your account. Default: `false`

###Track

####trackAll

	shipwire.trackAll(options, callback)

**options** - Object *(optional)*

- `raw` - Boolean. Whether to return the raw XML response. Otherwise returns JSON. Default: `false`
- `bookmark` - Number. `1` returns all orders, `2` returns orders since the last bookmark, `3` return all orders since bookmark, and resets the bookmark to the current time. Default: `1`

**callback** - Function *(required)*

- err - Object. Returns error object if applicable, otherwise null.
- orders - Array. Returns an array of orders.


####trackByOrderNumber

	shipwire.trackByOrderNumber(orderNumber, options, callback)

**orderNumber** - String *(required)*

The order number to use. This is generally an id submitted along with an order to Shipwire.

**options** - Object *(optional)*

- `raw` - Boolean. Whether to return the raw XML response. Otherwise returns JSON. Default: `false`

**callback** - Function *(required)*

- err - Object. Returns error object if applicable, otherwise null.
- orders - Object. Returns an order object.


####trackById

	shipwire.trackById(id, options, callback)

**id** - String *(required)*

The Shipwire ID to use. This is an id generated by Shipwire.

**options** - Object *(optional)*

- `raw` - Boolean. Whether to return the raw XML response. Otherwise returns JSON. Default: `false`

**callback** - Function *(required)*

- err - Object. Returns error object if applicable, otherwise null.
- orders - Object. Returns an order object.


###Inventory

####inventoryStatus

	shipwire.inventoryStatus(options, callback)

**options** - Object *(optional)*

- `warehouse` - String. Which warehouse should be search, otherwise all are searched. Valid options are `"TOR"`, `"CHI"`, `"LAX"`, `"PHL"`, `"VAN"`, `"UK"`, `"HKG"`
- `warehouseCountry` - String. Which set of warehouses should be searched. Valid options are `"CA"`, `"US"`, `"GB"`, `"HK"`
- `productCodes` - Array or String. Can be an array of product SKUs to search. Can also be a single SKU as a string.
- `includeEmpty` - Boolean. If true, all products, even which have never had inventory, will be returned. Default: `false`
- `raw` - Boolean. Whether to return the raw XML response. Otherwise returns JSON. Default: `false`

**callback** - Function *(required)*

- err - Object. Returns error object if applicable, otherwise null.
- products - Array. Returns an array of products.


###Rate Request

####rateRequest

	shipwire.rateRequest(orders, options, callback)

**orders** - Array or Object *(required)*

Can be a single order object or an array of order objects. An order object is formatted like so:

	{
		id: "12578",//a custom id for the order. String
		products: [//an array of products; can also be a single object
			{
				code: "sun-0001",//SKU code for the product
				quantity: 2//quantity of items. Number, optional, default: 1
			}
		],
		shippingAddress: {
			fullName: "Bob Loblaw.",//individual or company name. String, optional.
			company: "Bob Loblaw's Law Blog",//up to 25 characters. String, optional.
			address1: "151 Sterling Road",//address line 1. String.
			address2: "#2",//address line 2. String, optional.
			city: "Toronto",//city. String.
			province: "ON",//"state", "province", "region" are interchangeable. If state or prov, use 2-letter code, otherwise, full name. String.
			country: "CA",//2-letter ISO code. String, optional.
			postalCode: "M6R 2B2", //"zip", and "postal code" are interchangeable. String.
			commercial: true,//Is it a business address? Boolean, optional, default: false.
			POBox: ""//Is it a POBox?null by default. Boolean or null, optional, default: null.
		},
		warehouse: "00"//optimal warehouse. Possible values are: "TOR", "LAX", "VAN", "PHL", "CHI", "REN, "UK", "HKG", and "00". String, optional, default: "00".
	}

**options** - Object *(optional)*

- `raw` - Boolean. Whether to return the raw XML response. Otherwise, returns JSON. Default: `false`

**callback** - Function *(required)*

- err - Object. Returns error object if applicable, otherwise null.
- orders - Array or Object. Returns orders with shipping quotes as well as the original order attached. If an array was passed as the `orders` argument, an array will be returned. Otherwise, a single object will be returned.


##Tests

Run `npm test` to run the tests with [mocha.](https://github.com/visionmedia/mocha)
Tests will also run automatically before `git commit`

##Issues and Feature Requests

If you have issues to report, or issues to request, use the issue tracker in Github.

##Contributing

Currently, the library isn't very feature rich or mature. If you'd like to offer improvements:

1. Fork it
2. Create your feature branch `git checkout -b feature-name`
3. Commit your changes `git commit -am 'Add feature'` \*
4. Push the branch `git push origin feature-name`
5. Create a pull request

\* Prior to a commit, linting and testing will be performed automatically using [precommit-hook](https://github.com/nlf/precommit-hook)


##Contact

Have a question? I'm on twitter: [@dhritzkiv](https://twitter.com/dhritzkiv)


##License

[MIT](License)
