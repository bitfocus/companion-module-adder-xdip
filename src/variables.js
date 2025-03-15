export function updateVariables() {
	let variables = []

	variables.push(
		{
			name: 'Connected channel id',
			variableId: 'channelId',
		},
		{
			name: 'Connected channel name',
			variableId: 'channelName',
		},
		{
			name: 'Access token state',
			variableId: 'tokenStatus',
		},
	)

	this.setVariableDefinitions(variables)
	this.setVariableValues({
		channelId: null,
		channelName: null,
		tokenStatus: 'Invalid!',
	})
}
