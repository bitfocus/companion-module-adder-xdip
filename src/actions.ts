import type { CompanionActionDefinition } from '@companion-module/base'
import type { XDIPInstance } from './main.js'
import { SwitchChannel, GetNodes, GetChannels, GetCurrentChannel, GetAccessToken } from './api.js'

export function UpdateActions(self: XDIPInstance): void {
	const actions: Record<string, CompanionActionDefinition> = {}

	actions['switchChannel'] = {
		name: 'Switch Channel',
		options: [
			{
				type: 'dropdown',
				label: 'Channel',
				id: 'channelUuid',
				default: self.nodes[0].id,
				choices: self.nodes,
			},
		],
		callback: (action) => {
			const options = action.options
			console.log(options.channelUuid)
			if (options.channelUuid) {
				SwitchChannel(self, String(options.channelUuid))
			} else {
				self.log('warn', 'Channel UUID is undefined')
			}
		},
	}

	actions['disconnectReceiver'] = {
		name: 'Disconnect Receiver',
		options: [],
		callback: () => {
			self.log('info', 'Disconnecting Receiver.')
			SwitchChannel(self, '2147483647') // 0x7fffffff
		},
	}

	actions['getChannels'] = {
		name: 'Refresh Channel List',
		options: [],
		callback: () => {
			GetNodes(self).then(() => GetChannels(self))
		},
	}

	actions['getConnectedChannel'] = {
		name: 'Get Connected Channel',
		options: [],
		callback: () => {
			GetCurrentChannel(self)
		},
	}

	actions['getAccessToken'] = {
		name: 'Refresh Access Token',
		options: [],
		callback: () => {
			GetAccessToken(self)
		},
	}

	self.setActionDefinitions(actions)
}
