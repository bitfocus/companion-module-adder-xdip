import { InstanceBase, runEntrypoint, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdateVariableDefinitions } from './variables.js'
import { InitConnection } from './api.js'

export class XDIPInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	accessToken!: string // Access token for API
	nodes: any[]
	pollingInterval!: NodeJS.Timeout // Polling interval for API
	channels: any[] // List of channels
	currentChannel!: any // Current channel

	constructor(internal: unknown) {
		super(internal)

		this.nodes = [{ id: '0', label: 'No nodes available' }]
		this.channels = []
		this.currentChannel = null
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions

		await InitConnection(this) // Initialize connection
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config

		await InitConnection(this)
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(XDIPInstance, UpgradeScripts)
