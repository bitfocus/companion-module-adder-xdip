const { combineRgb } = require('@companion-module/base')

export function updateFeedbacks() {
		let self = this
		let feedbacks = {}

		const foregroundColor = combineRgb(255, 255, 255) // White
		const backgroundColorRed = combineRgb(255, 0, 0) // Red

		feedbacks['currentChannel'] = {
			type: 'boolean',
			name: 'Change colors based on selected channel',
			description: 'Sets the background according to which channel is selected',
			options: [
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'channelUuid',
					default: '',
					choices: self.nodes,
				},
			],
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: async function (feedback) {
				let channel = feedback.options.channelUuid
				let currentChannel = self.currentChannel

				if (currentChannel === channel) {
					return true
				}

				return false
			},
		}

		self.setFeedbackDefinitions(feedbacks)
	}