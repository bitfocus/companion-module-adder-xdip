var instance_skel = require('../../instance_skel')

var debug
var log

function instance(system, id, config) {
	var self = this

	// super-constructor
	instance_skel.apply(this, arguments)

	return self
}

instance.prototype.updateConfig = function (config) {
	var self = this
	self.config = config
	self.setupVariables()
	self.getAccessToken()
	self.actions()
}

instance.prototype.init = function () {
	var self = this

	debug = self.debug
	log = self.log

	self.channels = []
	self.nodes = []
	self.currentChannel = ''
	self.accessToken = ''
	
	self.setupVariables()
	self.getAccessToken()
	self.getNodes()
	self.getChannels()
	self.actions()
}

instance.prototype.setupVariables = function () {
	var self = this

	var moduleVariables = []

	moduleVariables.push(
		{
			label: 'Connected channel id',
			name: 'channelId',
		},
		{
			label: 'Connected channel name',
			name: 'channelName',
		},
		{
			label: 'Access token state',
			name: 'tokenStatus',
		}
	)

	self.setVariableDefinitions(moduleVariables)
	self.setVariable('channelId', null)
	self.setVariable('channelName', null)
	self.setVariable('tokenStatus', 'Invalid!')
}

instance.prototype.config_fields = function () {
	var self = this
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module is for the Adder XDIP Receiver. Add a new module connection for each receiver in your system. The Receiver Access Password is required to change channels.',
		},
		{
			type: 'textinput',
			id: 'ipAddress',
			label: 'Receiver IP Address',
			width: 6,
			regex: self.REGEX_IP,
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Receiver Port (default 8443)',
			width: 6,
			default: '8443',
			regex: self.REGEX_PORT,
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'Receiver Access Password',
			width: 6,
			default: '',
		},
	]
}

instance.prototype.destroy = function () {
	var self = this
	debug('destroy', self.id)
}

instance.prototype.actions = function (system) {
	var self = this

	self.setActions({
		switchChannel: {
			label: 'Switch Channel',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channelUuid',
					default: '',
					choices: self.nodes,
				},
			],
		},
		disconnectReceiver: {
			label: 'Disconnect Receiver',
		},
		getChannels: {
			label: 'Refresh Channel List',
		},
		getConnectedChannel: {
			label: 'Get Connected Channel',
		},
		getAccessToken: {
			label: 'Refresh Access Token',
		},
	})
}

instance.prototype.action = function (action) {
	var self = this
	const opt = action.options
	var cmd = ''

	switch (action.action) {
		case 'switchChannel': {
			var switchChannel = self.lookupChannel(opt.channelUuid)
			if (switchChannel != null) {
				cmd = 'https://' + self.config.ipAddress + ':' + self.config.port + '/api/channels/' + switchChannel + '/switch'
				console.log('Switching to channel ' + switchChannel)
				self.log('debug', 'Switching to channel ' + switchChannel)
				self.switchChannel(cmd)
				self.getCurrentChannel()
			} else {
				self.log('warn','Unable to find channel number for ' + opt.channelUuid)
			}
			break
		}
		case 'disconnectReceiver': {
			cmd = 'https://' + self.config.ipAddress + ':' + self.config.port + '/api/channels/2147483647/switch'
			console.log('Disconnect receiver')
			self.log('debug', 'Disconnecting receiver')
			self.switchChannel(cmd)
			self.getCurrentChannel()
			break
		}
		case 'getChannels': {
			self.getNodes()
			self.getChannels()
			break
		}
		case 'getConnectedChannel': {
			self.getCurrentChannel()
			break
		}
		case 'getAccessToken': {
			self.getAccessToken()
			break
		}
		default:
			break
	}
}

instance.prototype.switchChannel = function (cmd) {
	var self = this
	// POST /channels/{id}/switch

	console.log(cmd)
	// console.log(self.accessToken)

	if (self.accessToken == '') {
		console.log('missing access token')
		self.log('warn','Unable to switch channel, missing access token')
		return
	}

	var header = []

	header['Content-Type'] = 'application/json'
	header['Authorization'] = 'Bearer ' + self.accessToken

	// console.log(header)

	self.system.emit(
		'rest',
		cmd,
		'',
		function (err, result) {
			if (err !== null) {
				console.log('HTTP Request failed (' + result.error.code + ')')
				self.status(self.STATUS_ERROR, result.error.code)
			} else if (result.response.statusCode == 204) {
				console.log('switched to channel')
				self.status(self.STATUS_OK)
			} else {
				console.log('error ' + result.response.statusCode)
				self.log('warn','Unable to switch to channel')
			}
		},
		header,
		{ connection: {
			rejectUnauthorized: false,
			}
		}
	)
}

instance.prototype.getChannels = function () {
	// returns channel number and associated uuid
	var self = this

	var cmd = 'https://' + self.config.ipAddress + ':' + self.config.port + '/api/channels'

	var header = []
	header['Content-Type'] = 'application/json'
	console.log(cmd)

	self.system.emit(
		'rest_get',
		cmd,
		function (err, result) {
			if (err !== null) {
				console.log('HTTP Request failed (' + result.error.code + ')')
				self.status(self.STATUS_ERROR, result.error.code)
			} else if (result.response.statusCode == 200) {
				self.status(self.STATUS_OK)
				// console.log(result.data)
				if (typeof result.data === 'object' && result.data != null) {
					self.channels = []
					for (var i = 0; i < result.data.length; i++) {
						// console.log(result.data[i])
						self.channels.splice(i, 0, {
							channel: result.data[i].id,
							uuid: result.data[i].nodes[0].nodeUuid,
						})
					}
					console.log(self.channels)
				}
			} else {
				console.log('error: ' + result.response.statusCode)
				self.status(self.STATUS_ERROR, result.response.statusCode)
				self.log('warn', 'Unable to connect')
			}
		},
		header,
		{ connection: {
			rejectUnauthorized: false,
			}
		}
	)
}

instance.prototype.getNodes = function () {
	// returns node uuid and associated labels
	var self = this

	var cmd = 'https://' + self.config.ipAddress + ':' + self.config.port + '/api/nodes/selected'

	var header = []
	header['Content-Type'] = 'application/json'
	console.log(cmd)
	
	self.system.emit(
		'rest_get',
		cmd,
		function (err, result) {
			if (err !== null) {
				console.log('HTTP Request failed (' + result.error.code + ')')
				self.status(self.STATUS_ERROR, result.error.code)
			} else if (result.response.statusCode == 200) {
				self.status(self.STATUS_OK)
				console.log(result.data)
				if (typeof result.data === 'object' && result.data != null) {
					self.nodes = []
					for (var i = 0; i < result.data.length; i++) {
						uuid = result.data[i].uuid
						name = result.data[i].name.trim()
						if (name.length == 0) {
							name = 'Name not set! ' + i
						}
						description =  result.data[i].description.trim()
						// console.log(uuid)
						//if (uuid != 'self') {
						self.nodes.splice(i, 0, {
							id: uuid,
							label: name + ' (' + description + ')',
						})
						//}
					}
					console.log(self.nodes)
					self.actions()
				}
			} else {
				console.log('error: ' + result.response.statusCode)
				self.status(self.STATUS_ERROR, result.response.statusCode)
				self.log('warn', 'Unable to connect')
			}
		},
		header,
		{ connection: {
			rejectUnauthorized: false,
			}
		}
	)
}

instance.prototype.getCurrentChannel = function () {
	var self = this

	var cmd = 'https://' + self.config.ipAddress + ':' + self.config.port + '/api/channels/connected'

	var header = []
	header['Content-Type'] = 'application/json'
	console.log(cmd)

	self.system.emit(
		'rest_get',
		cmd,
		function (err, result) {
			if (err !== null) {
				console.log('HTTP Request failed (' + result.error.code + ')')
				self.status(self.STATUS_ERROR, result.error.code)
			} else if (result.response.statusCode == 200) {
				console.log('status:' + result.response.statusCode)
				self.status(self.STATUS_OK)
				if (typeof result.data === 'object' && result.data != null) {
					if ('id' in result.data) {
						self.currentChannel = result.data.id
						console.log('Connected to channel ' + self.currentChannel)
						self.setVariable('channelName', self.lookupName(self.currentChannel))
						self.setVariable('channelId', self.currentChannel)
						self.log('debug', 'Connected to channel ' + self.currentChannel)
					}
				} else {
					console.log(result.data)
					self.log('debug', 'No channel connected')
					self.currentChannel = null
				}
			} else {
				console.log('error: ' + result.response.statusCode)
				self.status(self.STATUS_ERROR, result.response.statusCode)
				self.log('warn', 'Unable to connect to receiver')
				self.currentChannel = null
			}
		},
		header,
		{ connection: {
			rejectUnauthorized: false,
			}
		}
	)
}

instance.prototype.getAccessToken = function (cmd) {
	var self = this
	var header = []
	header['Content-Type'] = 'application/json'	

	try {
		authData = JSON.parse('{"accessPassword":"' + self.config.password.toString() + '"}')
	} catch (e) {
		console.log(e.message)
		return
	}

	var cmd = 'https://' + self.config.ipAddress + ':' + self.config.port + '/api/nodes/self/access'
	console.log(authData)
	console.log(cmd)

	self.system.emit(
		'rest', 
		cmd,
		authData,
		function (err, result) {
			if (err !== null) {
				console.log('HTTP Request failed (' + result.error.code + ')')
				self.status(self.STATUS_ERROR, result.error.code)
			} else if (result.response.statusCode == 200) {
				self.status(self.STATUS_OK)
				if (typeof result.data === 'object' && result.data != null) {
					// console.log(result.data)
					if (result.data.accessToken != null) {
						self.accessToken = result.data.accessToken.toString()
						console.log(self.accessToken)
						self.setVariable('tokenStatus', 'Valid')
						self.log('debug','Access Token received')
					}
				}
			} else {
				console.log('error: ' + result.response.statusCode)
				self.status(self.STATUS_ERROR, result.response.statusCode)
				self.log('warn', 'Unable to retrieve access token, check password')
				self.setVariable('tokenStatus', 'Invalid!')
			}
		},
		header,
		{ connection: {
			rejectUnauthorized: false,
			}
		}
	)
}

instance.prototype.lookupChannel = function (lookupUuid) {
	var self = this
	console.log('Lookup channel for: ' + lookupUuid)

	try {
		let obj = self.channels.find(o => o.uuid == lookupUuid)
		console.log(lookupUuid + ' is channel ' + obj.channel)
		return obj.channel
	} catch (e) {
		console.log('Unable to find channel for ' + lookupUuid)
		return null
	}
}

instance.prototype.lookupName = function (lookupCh) {
	var self = this
	var name = null
	var uuid = null

	if (lookupCh == '2147483647') {
		// disconnect
		return 'No channel connected'
	}

	try {
		let obj = self.channels.find(o => o.channel == lookupCh)
		uuid = obj.uuid
		console.log('Lookup uuid for channel: ' + lookupCh + ' = ' + uuid)
	} catch (e) {
		console.log('Unable to find uuid for channel ' + lookupCh)
		return null
	}

	try {
		let obj = self.nodes.find(p => p.id == uuid)
		name = obj.label
		console.log('Lookup name for channel: ' + lookupCh + ' = ' + name)
	} catch (e) {
		console.log('Unable to find label for channel ' + lookupCh)
		return null
	}

	return name
}

instance_skel.extendedBy(instance)
exports = module.exports = instance

