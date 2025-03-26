import type { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'

import type { XDIPInstance } from './main.js'

export function UpdateVariableDefinitions(self: XDIPInstance): void {
	const variables: CompanionVariableDefinition[] = []

	variables.push(
		{
			name: 'Receiver Name',
			variableId: 'receiverName',
		},
		{
			name: 'Receiver Description',
			variableId: 'receiverDescription',
		},
		{
			name: 'Connected Channel ID',
			variableId: 'channelId',
		},
		{
			name: 'Connected Channel Name',
			variableId: 'channelName',
		},
		{
			name: 'Access Token State',
			variableId: 'tokenStatus',
		},
	)

	self.setVariableDefinitions(variables)
}

export function CheckVariables(self: XDIPInstance): void {
	const variableValues: CompanionVariableValues = {}

	//set variable values here

	self.setVariableValues(variableValues)
}
