node-shipwire
=============

Node.js library to communicate with the Shipwire API

#Features as of 0.0.3

- Order Tracking and Status
- Inventory

#Upcoming features

– Rate Quotes
- Fulfillment Services


#Install

`npm install --save node-shipwire`

#Usage

	var Shipwire = require('node-shipwire');
	var shipwire = new Shipwire(USERNAME, PASSWORD);
	
	shipwire.trackAll(function(err, orders) {
		//array of orders;
	})
	
#Methods

##Shipwire

	new Shipwire(username, password, options)

Sets your credentials and connection settings, and returns a `node-shipwire` object to use for your requests.

**Username** - String *(required)*

Your Shipwire account username, typically an email.

**Password** - String *(required)*

Your Shipwire account password.

**Options** - Object *(optional)*

- `sandbox` - Boolean. Whether to use the sandboxed environment, or production environment. Default: `false`
- `test` - Boolean. Whether to use Shipwire's Test server (which returns properly formatted sample responses), or the Production server, which returns responses based on the data in your account. Default `false`

##Track

###trackAll

	shipwire.trackAll(options, callback)
	
**Options** - Object *(optional)*

- `raw` - Boolean. Whether to return the raw XML response. Otherwise returns JSON. Default: `false`
- `multiple` - Boolean. Whether to return an array or a single order. Default: `true`
- `bookmark` - Number. `1` returns all orders, `2` returns orders since last request, `3` return all orders since last request, and resets the counter. Default: `1`

**Callback** - Function *(required)*

- err - Object. Returns error object if applicable, otherwise null.
- orders - Array. Returns an array of orders. If `options.multiple` is set to `false`, only the first order is returned.


###trackByOrderNumber

	shipwire.trackByOrderNumber(orderNumber, options, callback)
	
**orderNumber** - String *(required)*

The order number to use. This is generally an id submitted along with an order to Shipwire.
	
**Options** - Object *(optional)*

- `raw` - Boolean. Whether to return the raw XML response. Otherwise returns JSON. Default: `false`
- `multiple` - Boolean. Whether to return an array or a single order. Default: `false`

**Callback** - Function *(required)*

- err - Object. Returns error object if applicable, otherwise null.
- orders - Object. Returns an order object. If `options.multiple` is set to `true`, the value is contained within an array.


###trackById

	shipwire.trackById(id, options, callback)
	
**id** - String *(required)*

The Shipwire ID to use. This is an id generated by Shipwire.
	
**Options** - Object *(optional)*

- `raw` - Boolean. Whether to return the raw XML response. Otherwise returns JSON. Default: `false`
- `multiple` - Boolean. Whether to return an array or a single order. Default: `false`

**Callback** - Function *(required)*

- err - Object. Returns error object if applicable, otherwise null.
- orders - Object. Returns an order object. If `options.multiple` is set to `true`, the value is contained within an array.


##Inventory

###inventoryStatus

	shipwire.inventoryStatus(options, callback)
	
**Options** - Object *(optional)*

- `warehouse` - String. Which warehouse should be search, otherwise all are searched. Valid options are `"TOR"`, `"CHI"`, `"LAX"`, `"PHL"`, `"VAN"`, `"UK"`, `"HKG"`
- `warehouseCountry` - String. Which set of warehouses should be searched. Valid options are `"CA"`, `"US"`, `"GB"`, `"HK"`
- `productCodes` - Array or String. Can be an array of product SKUs to search. Can also be a single SKU as a string.
- `includeEmpty` - Boolean. If true, all products, even which have never had inventory, will be returned. Default: `false`
- `raw` - Boolean. Whether to return the raw XML response. Otherwise returns JSON. Default: `false`
- `multiple` - Boolean. Whether to return an array or a single order. Default: `true`

**Callback** - Function *(required)*

- err - Object. Returns error object if applicable, otherwise null.
- orders - Array. Returns an array of inventory objects. If `options.multiple` is set to `false`, just the first inventory object is returned.

##Tests

_Coming soon._

##Contributing

Currently, the library isn't very feature rich or mature. If you'd like to offer improvements:

1. Fork it
2. Create your feature branch `git checkout -b feature-name`
3. Commit your changes `git commit -am 'Add feature'`
4. Push the branch `git push origin feature-name`
5. Create a pull request
