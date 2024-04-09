// Adder XDIP v2

import { InstanceBase, InstanceStatus, Regex, runEntrypoint, TCPHelper } from '@companion-module/base'
import { updateActions } from './actions.js'
import { updateVariables } from './variables.js'
import got, { Options } from 'got'

class XDIP extends InstanceBase {
	constructor(internal) {
		super(internal)

		this.updateActions = updateActions.bind(this)
		this.updateVariables = updateVariables.bind(this)
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value:
					'This module is for the Adder XDIP Receiver. Add a new module connection for each receiver in your system. The Receiver Access Password is required to change channels.',
			},
			{
				type: 'textinput',
				id: 'ipAddress',
				label: 'Receiver IP Address',
				width: 6,
				regex: Regex.IP,
				required: true,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Receiver Port (default 8443)',
				width: 6,
				default: '8443',
				regex: Regex.Port,
				required: true,
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

	async destroy() {
		debug('destroy', this.id)
	}

	async init(config) {
		console.log('init XDIP')
		this.config = config
		this.channels = []
		this.nodes = []
		this.currentChannel = ''
		this.accessToken = ''

		this.gotOptions = {
			prefixUrl: 'https://' + this.config.ipAddress + ':' + this.config.port,
			responseType: 'json',
			throwHttpErrors: false,
			https: {
				rejectUnauthorized: false,
			},
			headers: {
				'Content-Type': 'application/json',
			},
		}

		this.updateVariables()
		this.updateActions()
		this.getAccessToken().then(this.getNodes()).then(this.getChannels()).then(this.getCurrentChannel())
	}

	async configUpdated(config) {
		console.log('configUpdated')

		this.config = config
		console.log(this.config)
		this.updateVariables()
		this.getAccessToken().then(this.getNodes()).then(this.getChannels()).then(this.getCurrentChannel())
	}

	async gotGet(cmd) {
		try {
			var response = await got.get(cmd, this.gotOptions)
			if (response.statusCode == 200) {
				this.updateStatus(InstanceStatus.Ok)
				this.processResult(response)
			} else {
				this.updateStatus(
					InstanceStatus.UnknownError,
					`Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`
				)
				this.log('warn', `Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`)
				return null
			}
		} catch (error) {
			console.log(error.message)
			this.processError(error)
			return null
		}
	}

	async gotPost(cmd, postOptions) {
		try {
			var response = await got.post(cmd, postOptions)

			if (response.statusCode == 200 || response.statusCode == 204) {
				this.updateStatus(InstanceStatus.Ok)
				this.processResult(response)
			} else {
				this.updateStatus(
					InstanceStatus.UnknownError,
					`Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`
				)
				this.log('warn', `Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`)
				return null
			}
		} catch (error) {
			console.log(error.message)
			this.processError(error)
			return null
		}
	}

	processResult(response) {
		switch (response.statusCode) {
			case 200:
				// console.log('success')
				this.updateStatus(InstanceStatus.Ok)
				this.processData(response.requestUrl.pathname, response.body)
				break
			case 204:
				// success with no content
				this.updateStatus(InstanceStatus.Ok)
				this.getCurrentChannel()
				break
			default:
				this.updateStatus(InstanceStatus.UnknownError, `Unexpected HTTP status code: ${response.statusCode}`)
				this.log('warn', `Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`)
				this.currentChannel = null
				break
		}
	}

	processData(pathname, body) {
		console.log('process: ' + pathname)
		// console.log(body)
		// console.log(typeof body + ' length: ' + body.length)

		switch (pathname) {
			case '/api/nodes/self/access':
				if (typeof body === 'object') {
					if (body.accessToken.length > 0) {
						this.accessToken = body.accessToken
						this.log('info', 'Access token received')
						this.setVariableValues({
							tokenStatus: 'Valid!',
						})
						// console.log(this.accessToken)
					}
				}
				break
			case '/api/nodes/selected':
				if (typeof body === 'object' && body != null) {
					this.nodes = []
					var uuid
					var name
					var description

					for (var i = 0; i < body.length; i++) {
						uuid = body[i].uuid
						name = body[i].name.trim()
						if (name.length == 0) {
							name = 'Name not set! ' + i
						}
						description = body[i].description.trim()
						//if (uuid != 'self') {
						this.nodes.splice(i, 0, {
							id: uuid,
							label: name + ' (' + description + ')',
						})
						//}
					}
					console.log(this.nodes)
					this.updateActions()
				}
				break
			case '/api/channels':
				if (typeof body === 'object' && body != null) {
					this.channels = []
					for (var i = 0; i < body.length; i++) {
						// console.log(result.data[i])
						this.channels.splice(i, 0, {
							channel: body[i].id,
							uuid: body[i].nodes[0].nodeUuid,
						})
					}
					console.log(this.channels)
				}
				break
			case '/api/channels/connected':
				if (typeof body === 'object' && body != null) {
					if ('id' in body) {
						this.currentChannel = body.id
						this.setVariableValues({
							channelName: this.lookupName(this.currentChannel),
							channelId: this.currentChannel,
						})
						this.log('info', 'Connected to channel ' + this.currentChannel)
					}
				} else {
					this.log('info', 'No channel connected')
					this.currentChannel = null
				}
				break
			default:
				break
		}
	}

	processError(error) {
		if (error !== null) {
			if (error.code !== undefined) {
				this.log('error', 'Connection failed (' + error.message + ')')
			} else {
				this.log('error', 'general HTTP failure')
			}
			this.updateStatus(InstanceStatus.Disconnected)
		}
	}

	switchChannel(channelUuid) {
		// POST /channels/{id}/switch

		var switchChannel = this.lookupChannel(channelUuid)
		// console.log(switchChannel)
		if (switchChannel != null) {
			var cmd = 'api/channels/' + switchChannel + '/switch'
			this.log('info', 'Switching to channel ' + switchChannel)
		} else {
			this.log('warn', 'Unable to find channel number for ' + opt.channelUuid)
			return
		}

		console.log(cmd)
		// console.log(this.accessToken)

		if (this.accessToken == '') {
			this.log('warn', 'Unable to switch channel, missing access token')
			return
		}

		this.gotOptions.headers.Authorization = 'Bearer ' + this.accessToken
		// console.log(this.gotOptions)

		this.gotPost(cmd, this.gotOptions)
	}

	async getChannels() {
		// returns channel number and associated uuid
		console.log('getChannels')
		this.gotGet('api/channels')
	}

	async getNodes() {
		// node uuid and associated labels
		console.log('getNodes')
		this.gotGet('api/nodes/selected')
	}

	async getCurrentChannel() {
		console.log('getCurrentChannel')
		this.gotGet('api/channels/connected')
	}

	async getAccessToken() {
		console.log('getAccessToken')
		var getURL = 'api/nodes/self/access'

		try {
			var authData = '{ "accessPassword": "' + this.config.password + '" }'
		} catch (e) {
			console.log(e.message)
			return
		}

		// console.log(this.gotOptions)
		// console.log(authData)
		// console.log(getURL)

		var tokenOptions = { ...this.gotOptions }
		tokenOptions.body = authData

		// console.log(tokenOptions)
		// console.log(this.gotOptions)

		this.gotPost(getURL, tokenOptions)
	}

	lookupChannel(lookupUuid) {
		console.log('Lookup channel for: ' + lookupUuid)

		if (lookupUuid == '2147483647') {
			// disconnect 0x7fffffff
			return '2147483647'
		}

		try {
			let obj = this.channels.find((o) => o.uuid == lookupUuid)
			console.log(lookupUuid + ' is channel ' + obj.channel)
			return obj.channel
		} catch (e) {
			console.log('Unable to find channel for: ' + lookupUuid)
			return null
		}
	}

	lookupName(lookupCh) {
		var self = this
		var name = null
		var uuid = null

		if (lookupCh == '2147483647') {
			// disconnect 0x7fffffff
			return 'No channel connected'
		}

		try {
			let obj = this.channels.find((o) => o.channel == lookupCh)
			uuid = obj.uuid
			console.log('Lookup uuid for channel: ' + lookupCh + ' = ' + uuid)
		} catch (e) {
			console.log('Unable to find uuid for channel ' + lookupCh)
			return null
		}

		try {
			let obj = this.nodes.find((p) => p.id == uuid)
			name = obj.label
			console.log('Lookup name for channel: ' + lookupCh + ' = ' + name)
		} catch (e) {
			console.log('Unable to find label for channel ' + lookupCh)
			return null
		}

		return name
	}
}

runEntrypoint(XDIP, [])
