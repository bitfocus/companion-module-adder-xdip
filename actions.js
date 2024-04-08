export function updateActions() {
	let actions = {}

	actions['switchChannel'] = {
		name: 'Switch Channel',
		options: [
			{
				type: 'dropdown',
				label: 'Channel',
				id: 'channelUuid',
				default: '',
				choices: this.nodes,
			},
		],
		callback: ({ options }) => {
			console.log(options.channelUuid)
			this.switchChannel(options.channelUuid)
		},
	}

	actions['disconnectReceiver'] = {
		name: 'Disconnect Receiver',
		callback: ({}) => {
			this.log('info', 'Disconnecting receiver')
			this.switchChannel('2147483647') // 0x7fffffff
		},
	}

	actions['getChannels'] = {
		name: 'Refresh Channel List',
		callback: ({}) => {
			this.getNodes().then(this.getChannels())
		},
	}

	actions['getConnectedChannel'] = {
		name: 'Get Connected Channel',
		callback: ({}) => {
			this.getCurrentChannel()
		},
	}

	actions['getAccessToken'] = {
		name: 'Refresh Access Token',
		callback: ({}) => {
			this.getAccessToken()
		},
	}

	this.setActionDefinitions(actions)
}
