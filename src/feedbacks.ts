import { combineRgb } from '@companion-module/base'
import type { CompanionFeedbackDefinition } from '@companion-module/base'
import type { XDIPInstance } from './main.js'

export function UpdateFeedbacks(self: XDIPInstance): void {
	const feedbacks: Record<string, CompanionFeedbackDefinition> = {}

	feedbacks['currentChannel'] = {
		type: 'boolean',
		name: 'Change colors based on selected channel',
		description: 'Sets the background according to which channel is selected',
		options: [
			{
				type: 'dropdown',
				label: 'Channel',
				id: 'channelUuid',
				default: self.nodes[0].id,
				choices: self.nodes,
			},
		],
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		callback: async function (feedback) {
			let channel = feedback.options.channelUuid
			let currentChannel = self.currentChannel

			//find the uuid in self.channels using channel
			let currentChannelObj = self.channels.find((element) => element.channel === currentChannel)

			if (currentChannelObj) {
				let currentChannelUUID = currentChannelObj.uuid

				console.log('Current channel: ' + currentChannel)
				console.log('Feedback channel: ' + channel)
				console.log('Current channel UUID: ' + currentChannelUUID)

				if (currentChannelUUID === channel) {
					return true
				}
			}

			return false
		},
	}

	self.setFeedbackDefinitions(feedbacks)
}
