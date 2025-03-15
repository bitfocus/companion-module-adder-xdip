export function updateActions() {
	console.log('updateActions')
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
		callback: (action) => {
			this.log('info', 'Disconnecting receiver')
			this.switchChannel('2147483647') // 0x7fffffff
		},
	}

	actions['getChannels'] = {
		name: 'Refresh Channel List',
		callback: (action) => {
			this.getNodes().then(this.getChannels())
		},
	}

	actions['getConnectedChannel'] = {
		name: 'Get Connected Channel',
		callback: (action) => {
			this.getCurrentChannel()
		},
	}

	actions['getAccessToken'] = {
		name: 'Refresh Access Token',
		callback: (action) => {
			this.getAccessToken()
		},
	}

	this.setActionDefinitions(actions)
}
