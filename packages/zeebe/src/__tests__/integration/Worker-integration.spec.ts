import { ZBClient } from '../..'
import { cancelProcesses } from '../../lib/cancelProcesses'
import { CreateProcessInstanceResponse } from '../../lib/interfaces-grpc-1.0'

process.env.ZEEBE_NODE_LOG_LEVEL = process.env.ZEEBE_NODE_LOG_LEVEL || 'NONE'
jest.setTimeout(30000)
const zbc = new ZBClient()
let wf: CreateProcessInstanceResponse | undefined
let processId1: string
let processId2: string
let processId3: string

beforeAll(async () => {
	const res1 = await zbc.deployProcess(
		'./src/__tests__/testdata/hello-world.bpmn'
	)
	processId1 = res1.processes[0].bpmnProcessId
	await cancelProcesses(processId1)
	const res2 = await zbc.deployProcess(
		'./src/__tests__/testdata/hello-world-complete.bpmn'
	)
	processId2 = res2.processes[0].bpmnProcessId
	await cancelProcesses(processId2)
	const res3 = await zbc.deployProcess(
		'./src/__tests__/testdata/conditional-pathway.bpmn'
	)
	processId3 = res3.processes[0].bpmnProcessId
	await cancelProcesses(processId3)
})

afterEach(async () => {
	if (wf?.processInstanceKey) {
		await zbc.cancelProcessInstance(wf.processInstanceKey).catch((e) => e)
	}
})

afterAll(async () => {
	await cancelProcesses(processId1)
	await cancelProcesses(processId2)
	await cancelProcesses(processId3)
	await zbc.close()
})

test('Can service a task', (done) => {
	zbc
		.createProcessInstance({
			bpmnProcessId: processId1,
			variables: {},
		})
		.then((res) => {
			wf = res
			zbc.createWorker({
				taskType: 'console-log',
				taskHandler: async (job) => {
					expect(job.processInstanceKey).toBe(wf?.processInstanceKey)
					const res1 = await job.complete(job.variables)
					done(null)
					return res1
				},
				loglevel: 'NONE',
			})
		})
})

test('Can service a task with complete.success', (done) => {
	zbc
		.createProcessInstance({
			bpmnProcessId: processId2,
			variables: {},
		})
		.then((res) => {
			wf = res
			zbc.createWorker({
				taskType: 'console-log-complete',
				taskHandler: async (job) => {
					expect(job.processInstanceKey).toBe(wf?.processInstanceKey)
					const res1 = await job.complete(job.variables)
					done(null)
					return res1
				},
				loglevel: 'NONE',
			})
		})
})

test('Can update process variables with complete.success()', async () => {
	wf = await zbc.createProcessInstance({
		bpmnProcessId: processId3,
		variables: {
			conditionVariable: true,
		},
	})
	const wfi = wf?.processInstanceKey
	expect(wfi).toBeTruthy()
	zbc.createWorker({
		taskType: 'wait',
		taskHandler: async (job) => {
			expect(job.processInstanceKey).toBe(wfi)
			return job.complete({
				conditionVariable: false,
			})
		},
		loglevel: 'NONE',
	})

	await new Promise((resolve) =>
		zbc.createWorker({
			taskType: 'pathB',
			taskHandler: async (job) => {
				expect(job.processInstanceKey).toBe(wfi)
				expect(job.variables.conditionVariable).toBe(false)
				const res1 = await job.complete(job.variables)
				wf = undefined
				resolve(null)
				return res1
			},
			loglevel: 'NONE',
		})
	)
})
