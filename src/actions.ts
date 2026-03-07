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
			self.log('debug', String(options.channelUuid))
			if (options.channelUuid) {
				void SwitchChannel(self, String(options.channelUuid))
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
			void SwitchChannel(self, '2147483647') // 0x7fffffff
		},
	}

	actions['getChannels'] = {
		name: 'Refresh Channel List',
		options: [],
		callback: () => {
			void GetNodes(self).then(async () => GetChannels(self))
		},
	}

	actions['getConnectedChannel'] = {
		name: 'Get Connected Channel',
		options: [],
		callback: () => {
			void GetCurrentChannel(self)
		},
	}

	actions['getAccessToken'] = {
		name: 'Refresh Access Token',
		options: [],
		callback: () => {
			void GetAccessToken(self)
		},
	}

	self.setActionDefinitions(actions)
}
