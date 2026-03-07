import { InstanceStatus } from '@companion-module/base'
import type { XDIPInstance } from './main.js'
import { fetch, Agent } from 'undici'

export async function InitConnection(self: XDIPInstance): Promise<void> {
	if (self.config.verbose) {
		self.log('debug', `Initializing Connection...`)
	}

	await GetAccessToken(self)
	await Promise.all([GetNodes(self), GetChannels(self), GetCurrentChannel(self)])
	void StartPolling(self)
}

export async function GetAccessToken(self: XDIPInstance): Promise<void> {
	if (self.config.verbose) {
		self.log('debug', `Getting Access Token...`)
	}

	const authData = { accessPassword: self.config.password }
	try {
		const response = await FetchRequest(self, 'api/nodes/self/access', { body: authData })
		if (response && response.accessToken) {
			self.accessToken = response.accessToken
			self.log('info', 'Access token received')
			self.log('debug', response)
			self.setVariableValues({ tokenStatus: 'Valid' })
		}
	} catch (error: any) {
		self.log('error', `Failed to get access token: ${error.message}`)
	}
}

export async function GetChannels(self: XDIPInstance): Promise<void> {
	if (self.config.verbose) {
		self.log('debug', `Getting Channels...`)
	}
	return FetchRequest(self, 'api/channels')
}

export async function GetNodes(self: XDIPInstance): Promise<void> {
	if (self.config.verbose) {
		self.log('debug', `Getting Nodes...`)
	}
	return FetchRequest(self, 'api/nodes/selected')
}

export async function GetCurrentChannel(self: XDIPInstance): Promise<void> {
	if (self.config.verbose) {
		self.log('debug', `Getting Current Channel...`)
	}
	return FetchRequest(self, 'api/channels/connected')
}

export async function SwitchChannel(self: XDIPInstance, channelUuid: string): Promise<void> {
	if (self.config.verbose) {
		self.log('debug', `Switching Channel...`)
	}

	const switchChannel = LookupChannel(self, channelUuid)
	if (switchChannel != null) {
		const cmd = `api/channels/${switchChannel}/switch`
		self.log('info', `Switching to Channel ${switchChannel}`)
		void FetchRequest(self, cmd, { body: {} })
	} else {
		self.log('warn', `Unable to find channel number for ${channelUuid}`)
	}
}

async function FetchRequest(self: XDIPInstance, cmd: string, postOptions?: { body: object }): Promise<any> {
	const isPost = postOptions !== undefined
	const url = `https://${self.config.ipAddress}:${self.config.port}/${cmd}`

	if (self.config.verbose) {
		self.log('debug', `Fetching URL: ${url}`)
	}

	try {
		const response = await fetch(url, {
			method: isPost ? 'POST' : 'GET',
			headers: {
				'Content-Type': 'application/json',
				...(self.accessToken ? { Authorization: `Bearer ${self.accessToken}` } : {}),
			},
			body: isPost ? JSON.stringify(postOptions?.body) : undefined,
			dispatcher: new Agent({ connect: { rejectUnauthorized: false } }), // 👈 Proper way to bypass SSL verification
		})

		const data = response.status !== 204 ? await response.json() : {}
		if (!response.ok) {
			self.log('debug', `Response not OK: status ${response.status} ${response.statusText}`)
		} else {
			self.updateStatus(InstanceStatus.Ok)
			ProcessResult(self, { statusCode: response.status, body: data, requestUrl: { pathname: cmd } })
			return data
		}
	} catch (error) {
		self.log('debug', String(error))
		ProcessError(self, error)
		return null
	}
}

async function StartPolling(self: XDIPInstance): Promise<void> {
	if (self.pollingInterval) clearInterval(self.pollingInterval)

	if (self.config.enablePolling) {
		//make sure polling interval is greater than 100
		if (self.config.pollingInterval < 100) {
			self.config.pollingInterval = 100
		}
		self.log('info', `Polling enabled, interval: ${self.config.pollingInterval}ms`)
		self.pollingInterval = setInterval(() => {
			void GetCurrentChannel(self)
		}, self.config.pollingInterval)
	}
}

function LookupChannel(self: XDIPInstance, lookupUuid: string): string | null {
	if (self.config.verbose) {
		self.log('debug', `Lookup channel for: ${lookupUuid}`)
	}

	if (lookupUuid == '2147483647') {
		// disconnect 0x7fffffff
		return '2147483647'
	}

	try {
		const obj = self.channels.find((o) => o.uuid == lookupUuid)
		if (self.config.verbose) {
			self.log('debug', `${lookupUuid} is Channel: ${obj.channel}`)
		}
		return obj.channel
	} catch (_e) {
		if (self.config.verbose) {
			self.log('debug', `Unable to find channel for: ${lookupUuid}`)
		}
		return null
	}
}

function LookupName(self: XDIPInstance, lookupCh: string): string | null {
	let name = null
	let uuid = null

	if (lookupCh == '2147483647') {
		// disconnect 0x7fffffff
		return 'No channel connected'
	}

	try {
		const obj = self.channels.find((o) => o.channel == lookupCh)
		uuid = obj.uuid
		if (self.config.verbose) {
			self.log('debug', `Lookup uuid for channel: ${lookupCh} = ${uuid}`)
		}
	} catch (_e) {
		if (self.config.verbose) {
			self.log('debug', `Unable to find uuid for channel: ${lookupCh}`)
		}
		return null
	}

	try {
		const obj = self.nodes.find((p) => p.id == uuid)
		name = obj.label
		if (self.config.verbose) {
			self.log('debug', `Lookup name for uuid: ${uuid} = ${name}`)
		}
	} catch (_e) {
		if (self.config.verbose) {
			self.log('debug', `Unable to find name for uuid: ${uuid}`)
		}
		return null
	}

	return name
}

function ProcessResult(self: XDIPInstance, response: any): void {
	if (!response || !response.statusCode) {
		self.log('warn', 'Invalid response received.')
		return
	}

	switch (response.statusCode) {
		case 200:
		case 204:
			self.updateStatus(InstanceStatus.Ok)
			if (response.statusCode === 200) {
				ProcessData(self, response.requestUrl.pathname, response.body)
			}
			if (response.statusCode === 204 && self.config.enablePolling !== true) {
				void GetCurrentChannel(self)
			}
			break
		default:
			self.updateStatus(InstanceStatus.UnknownError, `Unexpected HTTP status code: ${response.statusCode}`)
			self.log('warn', `Unexpected HTTP status code: ${response.statusCode}`)
			self.currentChannel = null
			self.log('debug', JSON.stringify(response))
	}
}

function ProcessData(self: XDIPInstance, pathname: string, body: any): void {
	self.log('debug', `Processing data for ${pathname}`)

	switch (pathname) {
		case 'api/nodes/self/access':
			if (typeof body === 'object') {
				if (body.accessToken.length > 0) {
					self.accessToken = body.accessToken
					self.log('info', 'Access token received')
					self.setVariableValues({
						tokenStatus: 'Valid',
					})
				}
			}
			break
		case 'api/nodes/selected':
			if (typeof body === 'object' && body != null) {
				self.nodes = []

				for (let i = 0; i < body.length; i++) {
					const uuid = body[i].uuid
					let name = body[i].name.trim()
					if (name.length == 0) {
						name = 'Name not set! ' + i
					}
					const description = body[i].description.trim()
					const type = body[i].type
					if (type == 'transmitter' || uuid === 'self') {
						if (uuid == 'self') {
							self.nodes.splice(i, 0, {
								id: uuid,
								label: 'Local Console',
							})
							self.setVariableValues({
								receiverName: name,
								receiverDescription: description,
							})
						} else {
							self.nodes.splice(i, 0, {
								id: uuid,
								label: name + ' (' + description + ')',
							})
						}
					}
				}

				//now sort the array, making sure the local device is first in the list
				self.nodes.sort((a, b) => {
					return a.id === 'self' ? -1 : a.label.localeCompare(b.label)
				})

				self.nodes.splice(0, 0, {
					id: '0',
					label: '(Select a Channel)',
				})

				self.updateActions()
				self.updateFeedbacks()
			}
			break
		case 'api/channels':
			if (typeof body === 'object' && body != null) {
				self.channels = []
				for (let i = 0; i < body.length; i++) {
					// self.log('debug',result.data[i])
					self.channels.splice(i, 0, {
						channel: body[i].id,
						uuid: body[i].nodes[0].nodeUuid,
					})
				}
			}
			break
		case 'api/channels/connected':
			if (typeof body === 'object' && body != null) {
				if ('id' in body) {
					self.currentChannel = body.id
					self.setVariableValues({
						channelName: LookupName(self, self.currentChannel) ?? '',
						channelId: self.currentChannel,
					})
					self.log('info', 'Connected to Channel ' + self.currentChannel)
				}
			} else {
				self.log('info', 'No channel connected')
				self.currentChannel = null
			}
			break
		default:
			break
	}

	self.updateStatus(InstanceStatus.Ok)

	self.checkFeedbacks()
}

function ProcessError(self: XDIPInstance, error: any): void {
	if (!error) return
	self.log('error', `Connection failed (${error.message || 'General HTTP failure'})`)
	self.updateStatus(InstanceStatus.Disconnected)
}
