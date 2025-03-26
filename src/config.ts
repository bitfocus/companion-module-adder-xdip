import { Regex } from '@companion-module/base'
import type { SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	ipAddress: string
	port: number
	password: string
	enablePolling: boolean
	pollingInterval: number
	verbose: boolean
}

export function GetConfigFields(): SomeCompanionConfigField[] {
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
			regex: Regex.PORT,
			required: true,
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'Receiver Access Password',
			width: 6,
			default: '',
		},
		{
			type: 'static-text',
			id: 'hr1',
			width: 12,
			label: ' ',
			value: '<hr />',
		},
		{
			type: 'checkbox',
			id: 'enablePolling',
			label: 'Enable Polling',
			width: 6,
			default: true,
		},
		{
			type: 'number',
			id: 'pollingInterval',
			label: 'Polling Interval (milliseconds)',
			width: 6,
			default: 1000,
			min: 100,
			max: 10000,
		},
		{
			type: 'static-text',
			id: 'hr2',
			width: 12,
			label: ' ',
			value: '<hr />',
		},
		{
			type: 'static-text',
			id: 'info2',
			label: 'Verbose Logging',
			width: 12,
			value: 'Enabling this option will put more detail in the log, which can be useful for troubleshooting purposes.',
		},
		{
			type: 'checkbox',
			id: 'verbose',
			label: 'Enable Verbose Logging',
			default: false,
			width: 12,
		},
	]
}
